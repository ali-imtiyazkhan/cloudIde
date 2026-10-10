import type Docker from "dockerode";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { prisma } from "@repo/db";
import { decrypt } from "../crypto";
import { storagePrefixSchema } from "../validations";
import { getDocker, isStorageOptUnsupported } from "./docker";
import { cloneRepository } from "./git";
import { getEnv } from "./env";
import { restoreSnapshot } from "./storage";

// Learned on the first create: graphdriver disk quota (StorageOpt.size)
// is not universal, and asking an unsupported daemon fails the whole
// create. Once proven false for this daemon, never send it again.
let storageOptSupported = true;

/** Resolves the workspace mount and refuses anything outside STORAGE_ROOT. */
async function resolveMount(storagePrefix: string) {
  const prefix = storagePrefixSchema.parse(storagePrefix);
  const root = resolve(getEnv().STORAGE_ROOT);
  const hostPath = resolve(join(root, prefix));

  if (hostPath !== root && !hostPath.startsWith(root + sep)) {
    throw new Error("storage path escapes STORAGE_ROOT");
  }

  await mkdir(hostPath, { recursive: true });
  return hostPath;
}

/**
 * Provisions a workspace that is sitting in PROVISIONING: restore (or clone)
 * the repository into the shared project directory, then create + start the
 * container and flip the row to RUNNING.
 *
 * Runs inside the BullMQ `restore` worker — the snapshot half of Type 3 must
 * land on disk *before* any container can bind-mount /workspace, so it can
 * never be fire-and-forget from the HTTP route.
 *
 * Throws on failure (after marking the row FAILED) so the worker applies its
 * retry policy: BullMQ attempts 3× with exponential backoff.
 */
export async function provisionWorkspace(workspaceId: string): Promise<void> {
  const env = getEnv();

  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId },
    select: {
      id: true,
      status: true,
      userId: true,
      cpuLimit: true,
      memoryLimitMb: true,
      diskLimitMb: true,
      project: {
        select: {
          storagePrefix: true,
          repository: { select: { cloneUrl: true, fullName: true } },
        },
      },
    },
  });
  // Deleted while queued, or a stalled retry after the job already finished.
  if (
    !workspace ||
    workspace.status === "DELETED" ||
    workspace.status === "RUNNING"
  ) {
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: workspace.userId },
    select: { githubAccounts: true },
  });
  const githubAccount = user?.githubAccounts[0];
  if (!githubAccount) {
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: "FAILED" },
    });
    throw new Error(`workspace ${workspace.id} has no GitHub account`);
  }

  try {
    const hostPath = await resolveMount(workspace.project.storagePrefix);

    // Cloud is truth, disk is cache (§4.3). Decision order:
    //   local .git exists      → cache hit, skip everything
    //   snapshot in the bucket → download + extract
    //   neither                → git clone (true cold start)
    // Must finish BEFORE createContainer — /workspace is bind-mounted at start.
    if (!existsSync(join(hostPath, ".git"))) {
      const restored = await restoreSnapshot(workspace.id, hostPath);
      if (!restored) {
        await cloneRepository({
          cloneUrl: workspace.project.repository.cloneUrl,
          token: decrypt(githubAccount.accessTokenEnc),
          destDir: hostPath,
        });
      }
    }

    const portKey = `${env.WORKSPACE_INTERNAL_PORT}/tcp`;
    const sshKey = `${env.WORKSPACE_SSH_INTERNAL_PORT}/tcp`;

    // The container name is deterministic (`cloudide-ws-<uuid>`), so a retried
    // job can collide with a half-created container from the previous attempt.
    await getDocker()
      .getContainer(`cloudide-ws-${workspace.id}`)
      .remove({ force: true })
      .catch(() => undefined);

    const hostConfig: Docker.HostConfig = {
      // Loopback only. Publishing 0.0.0.0 hands an unauthenticated
      // code-server shell to anyone who can reach the port.
      PortBindings: {
        [portKey]: [{ HostIp: env.WORKSPACE_BIND_IP, HostPort: "" }],
        // SSH for "Connect to VS Code / Cursor / Antigravity" — also
        // loopback-only; auth is the ephemeral key issued by the API.
        [sshKey]: [{ HostIp: env.WORKSPACE_BIND_IP, HostPort: "" }],
      },
      Binds: [`${hostPath}:/workspace`],
      NanoCpus:
        (workspace.cpuLimit ?? env.WORKSPACE_CPU_LIMIT) * 1_000_000_000,
      Memory: (workspace.memoryLimitMb ?? env.WORKSPACE_MEMORY_LIMIT_MB) * 1024 * 1024,
      AutoRemove: false,
      RestartPolicy: { Name: "no" },
    };

    // Disk quota via `StorageOpt.size` is honoured only on overlay2 over
    // xfs with 'pquota'. Everywhere else — notably Docker Desktop on
    // Windows/macOS — the daemon rejects the whole create with a 500, so
    // the first attempt includes it and a 500 with this message drops it
    // for the rest of the process.
    if (storageOptSupported) {
      hostConfig.StorageOpt = {
        size: `${workspace.diskLimitMb ?? env.WORKSPACE_DISK_LIMIT_MB}m`,
      };
    }

    const createOptions: Docker.ContainerCreateOptions = {
      Image: env.WORKSPACE_IMAGE,
      // workspace.id is a UUID, so this can never collide or inject.
      name: `cloudide-ws-${workspace.id}`,
      User: "coder",
      ExposedPorts: { [portKey]: {}, [sshKey]: {} },
      Env: [
        "PASSWORD=coder",
        "AUTH=none",
        `CLOUDIDE_WORKSPACE_ID=${workspace.id}`,
        `GIT_TERMINAL_PROMPT=0`,
      ],
      Labels: {
        "cloudide.managed": "true",
        "cloudide.workspaceId": workspace.id,
        "cloudide.userId": workspace.userId,
      },
      HostConfig: hostConfig,
    };

    let container: Docker.Container;
    try {
      container = await getDocker().createContainer(createOptions);
    } catch (error) {
      if (!storageOptSupported || !isStorageOptUnsupported(error)) {
        throw error;
      }
      storageOptSupported = false;
      delete hostConfig.StorageOpt;
      container = await getDocker().createContainer(createOptions);
    }

    await container.start();

    // Docker Desktop (Windows/macOS, WSL2 backend) returns from start()
    // before the host-side port proxy has bound, so an immediate inspect
    // sees an empty Ports map. Poll briefly; if the container dies instead,
    // surface its exit code and last log lines rather than a misleading
    // "did not publish a host port".
    let hostPort: string | undefined;
    const deadline = Date.now() + 10_000;
    for (;;) {
      const info = await container.inspect();
      hostPort = info.NetworkSettings.Ports?.[portKey]?.[0]?.HostPort;
      if (hostPort) break;
      if (!info.State.Running) {
        const logs = await container
          .logs({ stdout: true, stderr: true, tail: 20 })
          .catch(() => "");
        throw new Error(
          `workspace container exited (code ${info.State.ExitCode}): ${logs}`,
        );
      }
      if (Date.now() > deadline) {
        throw new Error("docker did not publish a host port");
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    const previewUrl = `http://${env.WORKSPACE_BIND_IP}:${hostPort}`;

    await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspace.id },
        data: {
          containerId: container.id,
          status: "RUNNING",
          previewUrl,
          startedAt: new Date(),
          lastActiveAt: new Date(),
        },
      }),
      // Upsert, not create: Container.workspaceId is @unique, and a resumed
      // workspace (Stop → Start on the same row) already owns a row from its
      // previous session — creating a second one throws P2002 and would mark
      // an otherwise healthy provision as FAILED.
      prisma.container.upsert({
        where: { workspaceId: workspace.id },
        create: {
          dockerId: container.id,
          image: env.WORKSPACE_IMAGE,
          status: "RUNNING",
          hostPath,
          internalPath: "/workspace",
          startedAt: new Date(),
          workspaceId: workspace.id,
        },
        update: {
          dockerId: container.id,
          image: env.WORKSPACE_IMAGE,
          status: "RUNNING",
          hostPath,
          internalPath: "/workspace",
          startedAt: new Date(),
          exitCode: null,
          stoppedAt: null,
        },
      }),
    ]);
  } catch (error) {
    console.error(`provisioning of ${workspace.id} failed:`, error);
    await prisma.workspace
      .update({ where: { id: workspace.id }, data: { status: "FAILED" } })
      .catch(() => undefined);
    throw error;
  }
}
