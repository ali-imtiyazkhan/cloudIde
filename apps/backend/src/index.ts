import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { join, resolve } from "node:path";
import { getEnv } from "./lib/env";
import { provisionWorkspace } from "./lib/provision";
import { closeQueue, startSnapshotWorker } from "./lib/queue";
import { deleteSnapshots, saveSnapshot } from "./lib/storage";
import { storagePrefixSchema } from "./validations";
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
      // Stop already flipped the row to STOPPED; this tar → PutObject
      // overwrites the previous snapshot. BullMQ retries transient failures
      // (3×, exponential backoff) — the workspace row is untouched either way.
      // storagePrefix comes from the DB but is still parsed: it is joined
      // into a filesystem path here, so it gets the same validation as
      // resolveMount gives it.
      await saveSnapshot(
        workspaceId,
        join(
          resolve(getEnv().STORAGE_ROOT),
          storagePrefixSchema.parse(storagePrefix),
        ),
      );
      break;
    case "delete":
      // Scoped to workspaceId only — the shared project directory
      // (storagePrefix) belongs to the project and must survive.
      await deleteSnapshots(workspaceId);
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
