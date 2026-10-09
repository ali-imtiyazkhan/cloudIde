import { Router } from "express";
import { prisma, type WorkspaceStatus } from "@repo/db";
import type Docker from "dockerode";
import { fail } from "../lib/http";
import { getDocker, isAlreadyStopped, isNoSuchContainer } from "../lib/docker";
import { generateSshKeyPair } from "../lib/ssh";
import { getEnv } from "../lib/env";
import { enqueueSnapJob } from "../lib/queue";
import { getSession } from "../session";
import {
  createWorkspaceSchema,
  workspaceIdSchema,
} from "../validations";

export const workspacesRouter = Router();

const ACTIVE: WorkspaceStatus[] = [
  "PENDING",
  "PROVISIONING",
  "STARTING",
  "RUNNING",
];

const AUTH_KEYS_PATH = "/home/coder/.ssh/authorized_keys";

/** Matches the exact shape ssh-keygen emits — required before interpolating into a shell string. */
const OPENSSH_PUBLIC_KEY = /^ssh-ed25519 [A-Za-z0-9+/=]+ [A-Za-z0-9@._-]+$/;

/**
 * Overwrites authorized_keys inside the container, so there is exactly one
 * active IDE-connection key per workspace: each "Connect" replaces the
 * previous key, and Stop wipes the file entirely.
 */
async function setAuthorizedKeys(
  container: Docker.Container,
  publicKey: string,
) {
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

workspacesRouter.post("/", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const githubAccount = session.user.githubAccounts[0];
  if (!githubAccount)
    return fail(res, 403, "no_github_account", "No GitHub account is linked.");

  const parsed = createWorkspaceSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(
      res,
      400,
      "invalid_body",
      parsed.error.issues[0]?.message ?? "Invalid request body.",
    );
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
  if (!project)
    return fail(res, 404, "project_not_found", "Project not found.");

  const running = await prisma.workspace.count({
    where: { userId: session.user.id, status: { in: ACTIVE } },
  });
  if (running >= env.MAX_ACTIVE_WORKSPACES) {
    return fail(
      res,
      429,
      "quota_exceeded",
      `Limit of ${env.MAX_ACTIVE_WORKSPACES} active workspaces reached.`,
    );
  }

  const cpuLimit = parsed.data.cpuLimit ?? env.WORKSPACE_CPU_LIMIT;
  const memoryLimitMb =
    parsed.data.memoryLimitMb ?? env.WORKSPACE_MEMORY_LIMIT_MB;
  const diskLimitMb = parsed.data.diskLimitMb ?? env.WORKSPACE_DISK_LIMIT_MB;

  // §10 Resume: Start on a project whose latest workspace is STOPPED or
  // FAILED reopens THAT row instead of creating a sibling. Snapshots are
  // keyed by workspaceId (§4.2) — a fresh row would look up
  // workspaces/<new-id>/snapshot.tar.gz, miss, and re-clone, stranding the
  // previous session's uncommitted work in the old row's snapshot.
  const latest = await prisma.workspace.findFirst({
    where: { projectId: project.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true },
  });
  const resumable =
    latest?.status === "STOPPED" || latest?.status === "FAILED";

  const workspace = resumable
    ? await prisma.workspace.update({
        where: { id: latest!.id },
        data: {
          status: "PROVISIONING",
          cpuLimit,
          memoryLimitMb,
          diskLimitMb,
          previewUrl: null,
          stoppedAt: null,
          startedAt: null,
        },
      })
    : await prisma.workspace.create({
        data: {
          userId: session.user.id,
          projectId: project.id,
          status: "PROVISIONING",
          cpuLimit,
          memoryLimitMb,
          diskLimitMb,
        },
      });

  // Provisioning runs in the BullMQ worker (`restore` job → provisionWorkspace):
  // the snapshot/restore half must land on disk before any container can
  // bind-mount /workspace, so it cannot happen inside this request.
  try {
    await enqueueSnapJob({
      type: "restore",
      workspaceId: workspace.id,
      storagePrefix: project.storagePrefix,
    });
  } catch (error) {
    console.error("enqueue of restore job failed:", error);
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: "FAILED" },
    });
    return fail(
      res,
      502,
      "queue_unavailable",
      "Could not schedule workspace provisioning.",
    );
  }

  return res.status(201).json({ workspace });
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
  if (!workspace)
    return fail(res, 404, "workspace_not_found", "Workspace not found.");

  if (!workspace.container) {
    return res.json({ status: workspace.status, docker: null });
  }

  try {
    const info = await getDocker()
      .getContainer(workspace.container.dockerId)
      .inspect();
    const running = info.State.Running;

    if (!running && workspace.status === "RUNNING") {
      await prisma.$transaction([
        prisma.workspace.update({
          where: { id: workspace.id },
          data: { status: "STOPPED", stoppedAt: new Date() },
        }),
        prisma.container.update({
          where: { id: workspace.container.id },
          data: {
            status: "EXITED",
            exitCode: info.State.ExitCode,
            stoppedAt: new Date(),
          },
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
    // The row is stale or the daemon is down — either way Docker cannot
    // confirm the container. FAILED puts the dashboard back on "Retry",
    // whose POST /workspaces re-provisions a fresh container.
    console.error("container inspect failed:", error);
    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: "FAILED" },
    });
    if (isNoSuchContainer(error)) {
      return fail(
        res,
        409,
        "container_missing",
        "The workspace container no longer exists. Start the workspace to create a new one.",
      );
    }
    return fail(
      res,
      502,
      "docker_unreachable",
      "Could not reach the Docker daemon.",
    );
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
  if (!workspace)
    return fail(res, 404, "workspace_not_found", "Workspace not found.");
  if (!workspace.container)
    return fail(res, 409, "no_container", "Workspace has no container.");

  const env = getEnv();
  const container = getDocker().getContainer(workspace.container.dockerId);

  let running: boolean;
  let sshHostPort: string | undefined;
  try {
    const info = await container.inspect();
    running = info.State.Running;
    sshHostPort =
      info.NetworkSettings.Ports?.[
        `${env.WORKSPACE_SSH_INTERNAL_PORT}/tcp`
      ]?.[0]?.HostPort;
  } catch (error) {
    console.error("connect: container inspect failed:", error);
    if (isNoSuchContainer(error)) {
      // Stale row — flip it so the dashboard offers "Retry" (re-provisions)
      // instead of a connect button that can never succeed.
      await prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "FAILED" },
      });
      return fail(
        res,
        409,
        "container_missing",
        "The workspace container no longer exists. Start the workspace to create a new one.",
      );
    }
    return fail(
      res,
      502,
      "docker_unreachable",
      "Could not reach the Docker daemon.",
    );
  }

  if (!running)
    return fail(res, 409, "not_running", "Start the workspace first.");
  if (!sshHostPort) {
    return fail(
      res,
      409,
      "ssh_unavailable",
      "This workspace has no SSH port. Delete it and start a fresh one.",
    );
  }

  const alias = `cloudide-${workspace.id.slice(0, 8)}`;
  const { privateKey, publicKey } = await generateSshKeyPair(
    `cloudide-${workspace.id}`,
  );

  if (!OPENSSH_PUBLIC_KEY.test(publicKey)) {
    console.error("connect: unexpected public key format");
    return fail(res, 500, "ssh_key_error", "Could not generate an SSH key.");
  }

  try {
    // One active key per workspace — issuing a new one revokes the last.
    await setAuthorizedKeys(container, publicKey);
  } catch (error) {
    console.error("connect: injecting authorized_keys failed:", error);
    return fail(
      res,
      502,
      "ssh_setup_failed",
      "Could not configure SSH access to the workspace.",
    );
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
    include: {
      container: true,
      project: { select: { storagePrefix: true } },
    },
  });
  if (!workspace)
    return fail(res, 404, "workspace_not_found", "Workspace not found.");
  if (!workspace.container)
    return fail(res, 409, "no_container", "Workspace has no container.");

  try {
    const container = getDocker().getContainer(workspace.container.dockerId);

    // Revoke outstanding IDE-connection keys before the box goes down.
    await setAuthorizedKeys(container, "").catch(() => undefined);

    try {
      await container.stop({ t: 10 });
    } catch (error) {
      // Idempotent stop: a container removed by hand (404, e.g. deleted in
      // Docker Desktop) and one that is already stopped (304) both mean the
      // box is down — fall through and reconcile the rows below. Anything
      // else is a real Docker failure.
      if (!isNoSuchContainer(error) && !isAlreadyStopped(error)) throw error;
    }

    // Read the exit code while Docker still knows the container; if it was
    // removed outright, keep whatever the row already recorded (null when
    // nobody ever saw it exit).
    const info = await container.inspect().catch(() => null);
    const exitCode = info ? info.State.ExitCode : workspace.container.exitCode;

    const [updated] = await prisma.$transaction([
      prisma.workspace.update({
        where: { id: workspace.id },
        data: { status: "STOPPED", stoppedAt: new Date() },
      }),
      prisma.container.update({
        where: { id: workspace.container.id },
        data: {
          status: "EXITED",
          exitCode,
          stoppedAt: new Date(),
        },
      }),
      prisma.containerHistory.create({
        data: {
          workspaceId: workspace.id,
          dockerId: workspace.container.dockerId,
          image: workspace.container.image,
          exitCode,
          startedAt: workspace.startedAt ?? new Date(),
          stoppedAt: new Date(),
        },
      }),
    ]);

    // Snapshot the project directory to cloud storage (handler is a no-op
    // until object storage lands). The stop already succeeded, so a queue
    // hiccup must not turn it into a failed request.
    await enqueueSnapJob({
      type: "upload",
      workspaceId: workspace.id,
      storagePrefix: workspace.project.storagePrefix,
    }).catch((error) => console.error("enqueue of upload job failed:", error));

    return res.json({ workspace: updated });
  } catch (error) {
    console.error("workspace stop failed:", error);
    return fail(
      res,
      502,
      "docker_error",
      "Could not stop the workspace container.",
    );
  }
});

workspacesRouter.delete("/:id", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) return fail(res, 401, "unauthorized", "Sign in to continue.");

  const id = workspaceIdSchema.safeParse(req.params.id);
  if (!id.success) return fail(res, 400, "invalid_id", "Invalid workspace id.");

  const workspace = await prisma.workspace.findFirst({
    where: { id: id.data, userId: session.user.id },
    include: {
      container: true,
      project: { select: { storagePrefix: true } },
    },
  });
  if (!workspace)
    return fail(res, 404, "workspace_not_found", "Workspace not found.");

  if (workspace.container) {
    try {
      const container = getDocker().getContainer(workspace.container.dockerId);
      await container.stop({ t: 5 }).catch(() => undefined);
      await container.remove({ force: true });
    } catch (error) {
      console.error("container remove failed:", error);
    }
  }

  await prisma.workspace.update({
    where: { id: workspace.id },
    data: { status: "DELETED" },
  });

  // Cloud cleanup is scoped to THIS workspace's snapshot objects (keyed by
  // workspaceId) — storagePrefix is the shared project directory and must
  // survive; it belongs to the project, not to one workspace.
  await enqueueSnapJob({
    type: "delete",
    workspaceId: workspace.id,
    storagePrefix: workspace.project.storagePrefix,
  }).catch((error) => console.error("enqueue of delete job failed:", error));

  return res.json({ ok: true });
});
