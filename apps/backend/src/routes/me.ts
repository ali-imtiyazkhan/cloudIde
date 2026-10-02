import { Router } from "express";
import { getSession } from "../session";

export const meRouter = Router();

meRouter.get("/me", async (req, res) => {
  const session = await getSession(req.cookies?.session);

  if (!session) {
    return res.status(401).json({ user: null });
  }

  const github = session.user.githubAccounts[0];

  res.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      githubLogin: github?.login ?? null,
    },
  });
});
