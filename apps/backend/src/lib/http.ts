import type { Response } from "express";

export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({ error: code, message });
}
