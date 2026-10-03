import { Router } from "express";
import { prisma } from "@repo/db";
import { fail } from "../lib/http";
import { getSession } from "../session";

export const projectsRouter = Router();

projectsRouter.get("/", async (req, res) => {
  const session = await getSession(req.cookies?.session);
  if (!session) {
    return fail(res, 401, "unauthorized", "Sign in to continue.");
  }

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      repository: {
        select: {
          fullName: true,
          htmlUrl: true,
          visibility: true,
          defaultBranch: true,
          description: true,
          isFork: true,
        },
      },
      workspaces: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          lastActiveAt: true,
          previewUrl: true,
        },
      },
      _count: { select: { workspaces: true } },
    },
  });

  return res.json({
    projects: projects.map((project) => {
      const active = project.workspaces[0] ?? null;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        branch: project.branch,
        storagePrefix: project.storagePrefix,
        lastSyncedAt: project.lastSyncedAt,
        createdAt: project.createdAt,
        repository: project.repository,
        workspaceCount: project._count.workspaces,
        latestWorkspace: active,
      };
    }),
  });
});
