import type { Response } from "express";

/**
 * Every JSON error in this API uses the same shape:
 *   { "error": "<machine_code>", "message": "<human text>" }
 */
export function fail(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({ error: code, message });
}
