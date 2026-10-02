import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import { prisma } from "@repo/db";

const COOKIE = "session";
const MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function getSession(token: string | undefined) {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: sha256(token),
    },
    include: {
      user: {
        include: {
          githubAccounts: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  return session;
}

export async function destroySession(token: string | undefined, res: Response) {
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  res.clearCookie(COOKIE, { path: "/" });
}

export async function pruneExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
