import { z } from "zod";

export const createWorkspaceSchema = z.object({
  projectId: z.uuid(),
  cpuLimit: z.number().int().min(1).max(16).optional(),
  memoryLimitMb: z.number().int().min(512).max(32768).optional(),
  diskLimitMb: z.number().int().min(1024).max(204800).optional(),
});

export const workspaceIdSchema = z.uuid();


export const storagePrefixSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^[A-Za-z0-9][A-Za-z0-9/_-]*$/, "Invalid storage prefix")
  .refine((value) => !value.includes(".."), "Invalid storage prefix");

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

