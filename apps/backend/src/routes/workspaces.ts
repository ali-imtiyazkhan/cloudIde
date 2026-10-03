import { mkdir } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { Router } from "express";
import { prisma, type WorkspaceStatus } from "@repo/db";
import type Docker from "dockerode";
import { decrypt } from "../crypto";
import { fail } from "../lib/http";
import { getDocker } from "../lib/docker";
import { cloneRepository } from "../lib/git";
import { generateSshKeyPair } from "../lib/ssh";
import { getEnv } from "../lib/env";
import { getSession } from "../session";
import {
  createWorkspaceSchema,
  storagePrefixSchema,
  workspaceIdSchema,
} from "../validations";

export const workspacesRouter = Router();

const ACTIVE: WorkspaceStatus[] = ["PENDING", "PROVISIONING", "STARTING", "RUNNING"];

const AUTH_KEYS_PATH = "/home/coder/.ssh/authorized_keys";

/** Matches the exact shape ssh-keygen emits — required before interpolating into a shell string. */
const OPENSSH_PUBLIC_KEY = /^ssh-ed25519 [A-Za-z0-9+/=]+ [A-Za-z0-9@._-]+$/;

/**
 * Overwrites authorized_keys inside the container, so there is exactly one
 * active IDE-connection key per workspace: each "Connect" replaces the
 * previous key, and Stop wipes the file entirely.
 */
async function setAuthorizedKeys(container: Docker.Container, publicKey: string) {
  const execObj = await container.exec({
    Cmd: ["/bin/sh", "-c", `printf '%s\\n' '${publicKey}' > ${AUTH_KEYS_PATH}`],
    User: "coder",
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await execObj.start({ hijack: false, stdin: false });
  await new Promise<void>((resolve) => {
    stream.on("data", () => {});
    stream.on("end", () => resolve());
    stream.on("error", () => resolve());
  });

  const info = await execObj.inspect();
  if (info.ExitCode !== 0) {
    throw new Error(`authorized_keys update exited with ${info.ExitCode}`);
  }
}

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

workspacesRouter.post("/", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const githubAccount = session.user.githubAccounts[0];
  if (!githubAccount) return fail(res, 403, "no_github_account", "No GitHub account is linked.");

  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid request body.");
  }

  const env = getEnv();

  const project = await prisma.project.findFirst({
    where: { id: parsed.data.projectId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      storagePrefix: true,
      repository: { select: { cloneUrl: true, fullName: true } },
    },
  });
  if (!project) return fail(res, 404, "project_not_found", "Project not found.");

  const running = await prisma.workspace.count({
    where: { userId: session.user.id, status: { in: ACTIVE } },
  });
  if (running >= env.MAX_ACTIVE_WORKSPACES) {
    return fail(res, 429, "quota_exceeded", `Limit of ${env.MAX_ACTIVE_WORKSPACES} active workspaces reached.`);
  }

  const cpuLimit = parsed.data.cpuLimit ?? env.WORKSPACE_CPU_LIMIT;
  const memoryLimitMb = parsed.data.memoryLimitMb ?? env.WORKSPACE_MEMORY_LIMIT_MB;
  const diskLimitMb = parsed.data.diskLimitMb ?? env.WORKSPACE_DISK_LIMIT_MB;

  const workspace = await prisma.workspace.create({
    data: { userId: session.user.id, projectId: project.id, status: "PROVISIONING", cpuLimit, memoryLimitMb, diskLimitMb },
  });

  try {
    const hostPath = await resolveMount(project.storagePrefix);

    // The storage directory starts empty — put the repository in it before
    // the container mounts it, so /workspace opens with the project's code.
    try {
      await cloneRepository({
        cloneUrl: project.repository.cloneUrl,
        token: decrypt(githubAccount.accessTokenEnc),
        destDir: hostPath,
      });
    } catch (error) {
      console.error(`clone of ${project.repository.fullName} failed:`, error);
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "FAILED" },
      });
      return fail(res, 502, "clone_failed", "Could not clone the repository into the workspace.");
    }

    const portKey = `${env.WORKSPACE_INTERNAL_PORT}/tcp`;
    const sshKey = `${env.WORKSPACE_SSH_INTERNAL_PORT}/tcp`;

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
        "cloudide.userId": session.user.id,
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
        NanoCpus: cpuLimit * 1_000_000_000,
        Memory: memoryLimitMb * 1024 * 1024,
        // Only honoured on overlay2/xfs; harmless elsewhere.
        StorageOpt: { size: `${diskLimitMb}m` },
        AutoRemove: false,
        RestartPolicy: { Name: "no" },
      },
    });

    await container.start();

    const info = await container.inspect();
    const hostPort = info.NetworkSettings.Ports?.[portKey]?.[0]?.HostPort;
    if (!hostPort) throw new Error("docker did not publish a host port");

    const previewUrl = `http://${env.WORKSPACE_BIND_IP}:${hostPort}`;

    const [updated] = await prisma.$transaction([
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
      prisma.container.create({
        data: {
          dockerId: container.id,
          image: env.WORKSPACE_IMAGE,
          status: "RUNNING",
          hostPath,
          internalPath: "/workspace",
          startedAt: new Date(),
          workspaceId: workspace.id,
        },
      }),
    ]);

    return res.status(201).json({ workspace: updated });
  } catch (error) {
    console.error("workspace provisioning failed:", error);
    await prisma.workspace.update({ where: { id: workspace.id }, data: { status: "FAILED" } });
    return fail(res, 502, "provision_failed", "Could not start the workspace container.");
  }
});

workspacesRouter.get("/", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const workspaces = await prisma.workspace.findMany({
    where: { userId: session.user.id, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true, branch: true } },
      container: { select: { dockerId: true, image: true, exitCode: true } },
    },
  });

  return res.json({ workspaces });
});

workspacesRouter.get("/:id/status", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const id = workspaceIdSchema.safeParse(req.params.id);
  if (!id.success) return fail(res, 400, "invalid_id", "Invalid workspace id.");

  const workspace = await prisma.workspace.findFirst({
    where: { id: id.data, userId: session.user.id },
    include: { container: true },
  });
  if (!workspace) return fail(res, 404, "workspace_not_found", "Workspace not found.");

  if (!workspace.container) {
    return res.json({ status: workspace.status, docker: null });
  }

  try {
    const info = await getDocker().getContainer(workspace.container.dockerId).inspect();
    const running = info.State.Running;

    if (!running && workspace.status === "RUNNING") {
      await prisma.$transaction([
        prisma.workspace.update({
          where: { id: workspace.id },
          data: { status: "STOPPED", stoppedAt: new Date() },
        }),
        prisma.container.update({
          where: { id: workspace.container.id },
          data: { status: "EXITED", exitCode: info.State.ExitCode, stoppedAt: new Date() },
        }),
      ]);
    }

    return res.json({
      status: running ? "RUNNING" : "STOPPED",
      docker: {
        running,
        exitCode: info.State.ExitCode,
        startedAt: info.State.StartedAt,
      },
    });
  } catch (error) {
    // Docker knows nothing about it, so the row is stale.
    console.error("container inspect failed:", error);
    await prisma.workspace.update({ where: { id: workspace.id }, data: { status: "FAILED" } });
    return fail(res, 502, "docker_unreachable", "Could not reach the Docker daemon.");
  }
});

workspacesRouter.post("/:id/connect", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const id = workspaceIdSchema.safeParse(req.params.id);
  if (!id.success) return fail(res, 400, "invalid_id", "Invalid workspace id.");

  const workspace = await prisma.workspace.findFirst({
    where: { id: id.data, userId: session.user.id },
    include: { container: true },
  });
  if (!workspace) return fail(res, 404, "workspace_not_found", "Workspace not found.");
  if (!workspace.container) return fail(res, 409, "no_container", "Workspace has no container.");

  const env = getEnv();
  const container = getDocker().getContainer(workspace.container.dockerId);

  let running: boolean;
  let sshHostPort: string | undefined;
  try {
    const info = await container.inspect();
    running = info.State.Running;
    sshHostPort = info.NetworkSettings.Ports?.[`${env.WORKSPACE_SSH_INTERNAL_PORT}/tcp`]?.[0]?.HostPort;
  } catch (error) {
    console.error("connect: container inspect failed:", error);
    return fail(res, 502, "docker_unreachable", "Could not reach the Docker daemon.");
  }

  if (!running) return fail(res, 409, "not_running", "Start the workspace first.");
  if (!sshHostPort) {
    return fail(
      res,
      409,
      "ssh_unavailable",
      "This workspace has no SSH port. Delete it and start a fresh one.",
    );
  }

  const alias = `cloudide-${workspace.id.slice(0, 8)}`;
  const { privateKey, publicKey } = await generateSshKeyPair(`cloudide-${workspace.id}`);

  if (!OPENSSH_PUBLIC_KEY.test(publicKey)) {
    console.error("connect: unexpected public key format");
    return fail(res, 500, "ssh_key_error", "Could not generate an SSH key.");
  }

  try {
    // One active key per workspace — issuing a new one revokes the last.
    await setAuthorizedKeys(container, publicKey);
  } catch (error) {
    console.error("connect: injecting authorized_keys failed:", error);
    return fail(res, 502, "ssh_setup_failed", "Could not configure SSH access to the workspace.");
  }

  return res.json({
    host: env.WORKSPACE_BIND_IP,
    port: Number(sshHostPort),
    user: "coder",
    hostAlias: alias,
    privateKey,
    publicKey,
    command: `ssh -i ~/.ssh/${alias} -p ${sshHostPort} coder@${env.WORKSPACE_BIND_IP}`,
    sshConfig: [
      `Host ${alias}`,
      `  HostName ${env.WORKSPACE_BIND_IP}`,
      `  Port ${sshHostPort}`,
      "  User coder",
      `  IdentityFile ~/.ssh/${alias}`,
      "  StrictHostKeyChecking accept-new",
    ].join("\n"),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  });
});

workspacesRouter.post("/:id/stop", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const id = workspaceIdSchema.safeParse(req.params.id);
  if (!id.success) return fail(res, 400, "invalid_id", "Invalid workspace id.");

  const workspace = await prisma.workspace.findFirst({
    where: { id: id.data, userId: session.user.id },
    include: { container: true },
  });
  if (!workspace) return fail(res, 404, "workspace_not_found", "Workspace not found.");
  if (!workspace.container) return fail(res, 409, "no_container", "Workspace has no container.");

  try {
    const container = getDocker().getContainer(workspace.container.dockerId);

    // Revoke outstanding IDE-connection keys before the box goes down.
    await setAuthorizedKeys(container, "").catch(() => undefined);

    await container.stop({ t: 10 });

    const info = await container.inspect();

    const [updated] = await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "STOPPED", stoppedAt: new Date() },
      }),
      prisma.container.update({
        where: { id: workspace.container.id },
        data: { status: "EXITED", exitCode: info.State.ExitCode, stoppedAt: new Date() },
      }),
      prisma.containerHistory.create({
        data: {
          workspaceId: workspace.id,
          dockerId: workspace.container.dockerId,
          image: workspace.container.image,
          exitCode: info.State.ExitCode,
          startedAt: workspace.startedAt ?? new Date(),
          stoppedAt: new Date(),
        },
      }),
    ]);

    return res.json({ workspace: updated });
  } catch (error) {
    console.error("workspace stop failed:", error);
    return fail(res, 502, "docker_error", "Could not stop the workspace container.");
  }
});

workspacesRouter.delete("/:id", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const id = workspaceIdSchema.safeParse(req.params.id);
  if (!id.success) return fail(res, 400, "invalid_id", "Invalid workspace id.");

  const workspace = await prisma.workspace.findFirst({
    where: { id: id.data, userId: session.user.id },
    include: { container: true },
  });
  if (!workspace) return fail(res, 404, "workspace_not_found", "Workspace not found.");

  if (workspace.container) {
    try {
      const container = getDocker().getContainer(workspace.container.dockerId);
      await container.stop({ t: 5 }).catch(() => undefined);
      await container.remove({ force: true });
    } catch (error) {
      console.error("container remove failed:", error);
    }
  }

  await prisma.workspace.update({ where: { id: workspace.id }, data: { status: "DELETED" } });

  return res.json({ ok: true });
});