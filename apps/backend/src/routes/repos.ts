import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import { prisma } from "@repo/db";
import { decrypt } from "../crypto";
import { fail } from "../lib/http";
import { getSession } from "../session";
import { importRepoSchema, listReposQuerySchema } from "../validations";

export const reposRouter = Router();

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  owner: { login: string };
};

type GithubHeaders = Record<string, string>;

async function requireSession(req: Request, res: Response) {
  const session = await getSession(req.cookies?.session);
  if (!session) {
    fail(res, 401, "unauthorized", "Sign in to continue.");
    return null;
  }

  const githubAccount = session.user.githubAccounts[0];
  if (!githubAccount) {
    fail(res, 403, "no_github_account", "No GitHub account is linked.");
    return null;
  }

  return { session, githubAccount };
}

function githubHeaders(accessToken: string): GithubHeaders {
  return {
    authorization: `Bearer ${accessToken}`,
    accept: "application/vnd.github+json",
    "user-agent": "CloudIDE",
    "x-github-api-version": "2022-11-28",
  };
}

reposRouter.get("/", async (req, res) => {
  const ctx = await requireSession(req, res);
  if (!ctx) return;

  const query = listReposQuerySchema.safeParse(req.query);
  if (!query.success) {
    return fail(res, 400, "invalid_query", "Unsupported pagination or sort options.");
  }

  const { type, sort, direction, page, per_page } = query.data;
  const params = new URLSearchParams({
    type,
    sort,
    direction,
    page: String(page),
    per_page: String(per_page),
  });

  const githubRes = await fetch(`https://api.github.com/user/repos?${params}`, {
    headers: githubHeaders(decrypt(ctx.githubAccount.accessTokenEnc)),
  });

  if (!githubRes.ok) {
    console.error("GitHub API error:", githubRes.status, githubRes.statusText);
    return fail(res, 502, "github_api_error", "Could not reach GitHub.");
  }

  const repos = (await githubRes.json()) as GitHubRepo[];
  const hasMore = (githubRes.headers.get("link") ?? "").includes('rel="next"');

  return res.json({
    repos: repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      description: repo.description,
      visibility: repo.private ? "PRIVATE" : "PUBLIC",
      isFork: repo.fork,
      defaultBranch: repo.default_branch,
      language: repo.language,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      pushedAt: repo.pushed_at,
    })),
    pagination: { page, perPage: per_page, hasMore },
  });
});

reposRouter.post("/repo", async (req, res) => {
  const ctx = await requireSession(req, res);
  if (!ctx) return;

  const parsed = importRepoSchema.safeParse(req.body);
  if (!parsed.success) {
    return fail(
      res,
      400,
      "invalid_body",
      parsed.error.issues[0]?.message ?? "Invalid request body.",
    );
  }

  const { fullName } = parsed.data;

  // GitHub is the source of truth for every field we persist. Nothing from
  // the request body is trusted beyond the repository name.
  const githubRes = await fetch(`https://api.github.com/repos/${fullName}`, {
    headers: githubHeaders(decrypt(ctx.githubAccount.accessTokenEnc)),
  });

  if (githubRes.status === 404) {
    return fail(res, 404, "repo_not_found", "Repository not found on GitHub.");
  }
  if (!githubRes.ok) {
    return fail(res, 502, "github_api_error", "Could not reach GitHub.");
  }

  const repo = (await githubRes.json()) as GitHubRepo;
  const githubId = BigInt(repo.id);

  const existing = await prisma.repository.findFirst({
    where: {
      userId: ctx.session.user.id,
      OR: [{ githubId }, { fullName: repo.full_name }],
    },
    select: { id: true },
  });

  if (existing) {
    return fail(res, 409, "repo_already_imported", "Repository already exists.");
  }

  const projectId = randomUUID();

  const { repository, project } = await prisma.$transaction(async (tx) => {
    const created = await tx.repository.create({
      data: {
        userId: ctx.session.user.id,
        githubId,
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        htmlUrl: repo.html_url,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        description: repo.description,
        visibility: repo.private ? "PRIVATE" : "PUBLIC",
        isFork: repo.fork,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      },
    });

    const createdProject = await tx.project.create({
      data: {
        id: projectId,
        userId: ctx.session.user.id,
        repositoryId: created.id,
        name: repo.name,
        description: repo.description,
        branch: repo.default_branch,
        storagePrefix: `projects/${projectId}`,
      },
    });

    return { repository: created, project: createdProject };
  });

  return res.status(201).json({
    repository: {
      id: repository.id,
      githubId: Number(repository.githubId),
      owner: repository.owner,
      name: repository.name,
      fullName: repository.fullName,
      htmlUrl: repository.htmlUrl,
      cloneUrl: repository.cloneUrl,
      defaultBranch: repository.defaultBranch,
      description: repository.description,
      visibility: repository.visibility,
      isFork: repository.isFork,
      createdAt: repository.createdAt,
    },
    project: {
      id: project.id,
      name: project.name,
      branch: project.branch,
      storagePrefix: project.storagePrefix,
      createdAt: project.createdAt,
    },
  });
});
