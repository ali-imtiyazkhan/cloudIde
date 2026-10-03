import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { getEnv } from "./lib/env";
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
