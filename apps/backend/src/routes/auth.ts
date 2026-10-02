import { randomBytes } from "node:crypto";
import { Router, type Response } from "express";
import { prisma } from "@repo/db";
import { encrypt } from "../crypto";
import { getEnv } from "../lib/env";
import { createSession, destroySession } from "../session";

export const authRouter = Router();

const STATE_COOKIE = "oauth_state";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;

const fail = (res: Response, reason: string) =>
  res.redirect(`${getEnv().WEB_URL}/?error=${reason}`);

type Profile = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  email: string | null;
};

authRouter.get("/github", (_req, res) => {
  const env = getEnv();
  const state = randomBytes(16).toString("hex");

  res.cookie(STATE_COOKIE, state, { ...COOKIE_OPTS, maxAge: 600_000 });

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: "read:user user:email repo",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

authRouter.get("/github/callback", async (req, res) => {
  const env = getEnv();
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;
  const expected = req.cookies?.[STATE_COOKIE];

  res.clearCookie(STATE_COOKIE, { path: "/" });

  if (!code || !state || !expected || state !== expected) {
    return fail(res, "oauth_state");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_REDIRECT_URI,
    }),
  });

  const token = (await tokenRes.json()) as {
    access_token?: string;
    scope?: string;
  };

  if (!tokenRes.ok || !token.access_token) {
    return fail(res, "token_exchange");
  }

  const profileRes = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${token.access_token}`,
      accept: "application/vnd.github+json",
      "user-agent": "CloudIDE",
    },
  });

  if (!profileRes.ok) {
    return fail(res, "profile_fetch");
  }

  const profile = (await profileRes.json()) as Profile;
  const email = profile.email ?? `gh-${profile.id}@users.noreply.github.com`;
  const scopes = token.scope?.split(",").filter(Boolean) ?? [];

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: profile.name ?? profile.login,
      image: profile.avatar_url,
    },
    update: {
      name: profile.name ?? profile.login,
      image: profile.avatar_url,
    },
  });

  await prisma.gitHubAccount.upsert({
    where: { githubId: BigInt(profile.id) },
    create: {
      userId: user.id,
      githubId: BigInt(profile.id),
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      accessTokenEnc: encrypt(token.access_token),
      scopes,
    },
    update: {
      userId: user.id,
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      accessTokenEnc: encrypt(token.access_token),
      scopes,
    },
  });

  const { token: sessionToken, expiresAt } = await createSession(user.id);

  res.cookie("session", sessionToken, { ...COOKIE_OPTS, expires: expiresAt });
  res.redirect(`${env.WEB_URL}/dashboard`);
});

authRouter.post("/logout", async (req, res) => {
  await destroySession(req.cookies?.session, res);
  res.redirect(getEnv().WEB_URL);
});
