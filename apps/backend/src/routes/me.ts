import { Router } from "express";
import { getSession } from "../session";

export const meRouter = Router();

/**
 * Not being signed in is a valid answer here, not an error, so this always
 * returns 200. The frontend can render either state without a try/catch.
 */
meRouter.get("/me", async (req, res) => {
  const session = await getSession(req.cookies?.session);

  if (!session) {
    return res.json({ user: null });
  }

  const github = session.user.githubAccounts[0];

  return res.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      githubLogin: github?.login ?? null,
      githubAvatarUrl: github?.avatarUrl ?? null,
    },
  });
});
