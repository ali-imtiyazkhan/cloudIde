import { z } from "zod";

/**
 * The owner segment must start alphanumeric or with an underscore so that
 * values like ".." can never reach the GitHub API URL path.
 */
const FULL_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]*\/[A-Za-z0-9._-]+$/;

export const importRepoSchema = z.object({
  fullName: z
    .string()
    .max(200)
    .regex(FULL_NAME, "Must be in format: owner/name")
    .describe("Repository to import (e.g. 'ali-imtiyazkhan/cloudIde')"),
});

export const listReposQuerySchema = z.object({
  type: z.enum(["all", "owner", "member", "public", "private"]).default("all"),
  sort: z.enum(["created", "updated", "pushed", "full_name"]).default("updated"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(30),
});

export type ImportRepoInput = z.infer<typeof importRepoSchema>;
export type ListReposQuery = z.infer<typeof listReposQuerySchema>;
