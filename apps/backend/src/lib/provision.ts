import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { prisma } from "@repo/db";
import { decrypt } from "../crypto";
import { storagePrefixSchema } from "../validations";
import { getDocker } from "./docker";
import { cloneRepository } from "./git";
import { getEnv } from "./env";
import { restoreSnapshot } from "./storage";

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

    const container = await getDocker().createContainer({
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
      HostConfig: {
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
        // Only honoured on overlay2/xfs; harmless elsewhere.
        StorageOpt: { size: `${workspace.diskLimitMb}m` },
        AutoRemove: false,
        RestartPolicy: { Name: "no" },
      },
    });

    await container.start();

    const info = await container.inspect();
    const hostPort = info.NetworkSettings.Ports?.[portKey]?.[0]?.HostPort;
    if (!hostPort) throw new Error("docker did not publish a host port");

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
