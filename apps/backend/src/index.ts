import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { getEnv } from "./lib/env";
import { provisionWorkspace } from "./lib/provision";
import { closeQueue, startSnapshotWorker } from "./lib/queue";
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { projectsRouter } from "./routes/projects";
import { reposRouter } from "./routes/repos";
import { workspacesRouter } from "./routes/workspaces";

const env = getEnv();

const app = express();

app.use(cors({ origin: env.WEB_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRouter);
app.use("/auth", meRouter);
app.use("/repos", reposRouter);
app.use("/projects", projectsRouter);
app.use("/workspaces", workspacesRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  },
);

app.listen(env.PORT, () => {
  console.log(`backend on http://localhost:${env.PORT}`);
});

const worker = startSnapshotWorker(async (job) => {
  const { type, workspaceId, storagePrefix } = job.data;
  switch (type) {
    case "restore":
      // Full provisioning: restore-or-clone → container → RUNNING.
      // A failure here marks the row FAILED and lets BullMQ retry (3×).
      await provisionWorkspace(workspaceId);
      break;
    case "upload":
      // TODO (object storage): tar the project dir → cloud snapshot.
      console.log(`TODO upload ${storagePrefix} (workspace ${workspaceId})`);
      break;
    case "delete":
      // TODO (object storage): delete this workspace's snapshot objects.
      console.log(`TODO delete ${storagePrefix} (workspace ${workspaceId})`);
      break;
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    await worker.close(); // waits for the in-flight job
    await closeQueue();
    process.exit(0);
  });
}
