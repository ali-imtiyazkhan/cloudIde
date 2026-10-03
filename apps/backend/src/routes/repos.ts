import { Router } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "@repo/db";
import { getSession } from "../session";
import { decrypt } from "../crypto";
import { importRepoSchema } from "../validations";

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
};

reposRouter.get("/", async (req, res) => {
    try {
        const session = await getSession(req.cookies.session);
        if (!session) {
            return res.status(401).json({ error: "unauthorized" });
        }

        const githubAccount = session.user.githubAccounts[0];
        if (!githubAccount) {
            return res.status(403).json({ error: "no_github_account" });
        }

        const accessToken = decrypt(githubAccount.accessTokenEnc);

        const type = typeof req.query.type === "string" ? req.query.type : "all";
        const sort = typeof req.query.sort === "string" ? req.query.sort : "updated";
        const direction = typeof req.query.direction === "string" ? req.query.direction : "desc";
        const page = typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;
        const perPage = typeof req.query.per_page === "string" ? parseInt(req.query.per_page, 10) : 30;

        const validPage = Math.max(1, page);
        const validPerPage = Math.min(100, Math.max(1, perPage));

        const params = new URLSearchParams({
            type,
            sort,
            direction,
            page: validPage.toString(),
            per_page: validPerPage.toString(),
        });

        const githubRes = await fetch(`https://api.github.com/user/repos?${params}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "CloudIDE",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        if (!githubRes.ok) {
            console.error("GitHub API error:", githubRes.status, githubRes.statusText);
            return res.status(502).json({ error: "github_api_error" });
        }

        const repos = (await githubRes.json()) as GitHubRepo[];

        const linkHeader = githubRes.headers.get("link") ?? "";
        const hasMore = linkHeader.includes('rel="next"');

        const transformedRepos = repos.map((repo) => ({
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
        }));

        return res.json({
            repos: transformedRepos,
            pagination: {
                page: validPage,
                perPage: validPerPage,
                hasMore,
            },
        });
    } catch (error) {
        console.error("Error fetching repos:", error);
        return res.status(500).json({ error: "internal_error" });
    }
});

reposRouter.post("/repo", async (req, res) => {
    try {
        const session = await getSession(req.cookies.session);
        if (!session) {
            return res.status(401).json({ message: "Unauthorised Access" });
        }

        const githubAccount = session.user.githubAccounts[0];
        if (!githubAccount) {
            return res.status(403).json({ message: "Forbidden Access" });
        }

        // 1. Validate body FIRST (fullName is needed below)
        const parsed = importRepoSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid Request Body",
                errors: parsed.error.flatten().fieldErrors,
            });
        }

        const {
            githubId,
            name,
            fullName,
            htmlUrl,
            cloneUrl,
            description,
            visibility,
            isFork,
            defaultBranch,
        } = parsed.data;

        const owner = fullName.split("/")[0];
        if (!owner) {
            return res.status(400).json({
                message: "fullName must be in format: owner/name",
            });
        }

        // 2. Reject duplicates
        const existing = await prisma.repository.findFirst({
            where: {
                userId: session.user.id,
                OR: [{ githubId: BigInt(githubId) }, { fullName }],
            },
        });

        if (existing) {
            return res.status(409).json({
                message: "Repository already exists",
                repositoryId: existing.id,
            });
        }

        // 3. Verify repo exists on GitHub
        const accessToken = decrypt(githubAccount.accessTokenEnc);

        const githubRes = await fetch(`https://api.github.com/repos/${fullName}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github+json",
                "User-Agent": "CloudIDE",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        });

        if (!githubRes.ok) {
            return res.status(404).json({
                message: "Repository not found on GitHub",
                error: await githubRes.text(),
            });
        }

        // 4. Create Repository + Project atomically
        const projectId = randomUUID();

        const result = await prisma.$transaction(async (tx) => {
            const repository = await tx.repository.create({
                data: {
                    userId: session.user.id,
                    githubId: BigInt(githubId),
                    owner,
                    name,
                    fullName,
                    htmlUrl,
                    cloneUrl,
                    defaultBranch,
                    description: description ?? null,
                    visibility,
                    isFork,
                },
            });

            const project = await tx.project.create({
                data: {
                    id: projectId,
                    userId: session.user.id,
                    repositoryId: repository.id,
                    name,
                    branch: defaultBranch,
                    storagePrefix: `projects/${projectId}`,
                },
            });

            return { repository, project };
        });

        // 5. Respond
        return res.status(201).json({
            message: "Repository imported",
            repository: {
                id: result.repository.id,
                githubId: Number(result.repository.githubId),
                name: result.repository.name,
                fullName: result.repository.fullName,
                htmlUrl: result.repository.htmlUrl,
                cloneUrl: result.repository.cloneUrl,
                description: result.repository.description,
                visibility: result.repository.visibility,
                isFork: result.repository.isFork,
                defaultBranch: result.repository.defaultBranch,
                createdAt: result.repository.createdAt,
            },
            project: {
                id: result.project.id,
                name: result.project.name,
                branch: result.project.branch,
                storagePrefix: result.project.storagePrefix,
                createdAt: result.project.createdAt,
            },
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});
