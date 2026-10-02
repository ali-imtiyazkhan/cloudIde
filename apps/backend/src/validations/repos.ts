// apps/backend/src/validations/repos.ts

import { z } from "zod";

export const importRepoSchema = z.object({
    githubId: z
        .number()
        .int()
        .positive()
        .describe("GitHub repository ID"),

    name: z
        .string()
        .min(1)
        .max(100)
        .describe("Repository name (e.g., 'my-project')"),

    fullName: z
        .string()
        .min(3)
        .max(200)
        .regex(/^[^/]+\/[^/]+$/, "Must be in format: owner/name")
        .describe("Full repository name (e.g., 'username/my-project')"),

    htmlUrl: z
        .string()
        .url()
        .describe("GitHub repository URL"),

    cloneUrl: z
        .string()
        .url()
        .regex(/\.git$/, "Must end with .git")
        .describe("Git clone URL"),

    description: z
        .string()
        .max(500)
        .nullable()
        .optional()
        .describe("Repository description (optional)"),

    visibility: z
        .enum(["PUBLIC", "PRIVATE"])
        .describe("Repository visibility"),

    isFork: z
        .boolean()
        .describe("Whether repository is a fork"),

    defaultBranch: z
        .string()
        .min(1)
        .max(100)
        .describe("Default branch name"),
});

export type ImportRepoInput = z.infer<typeof importRepoSchema>;
