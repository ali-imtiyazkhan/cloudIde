import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4001),
  DOCKER_SOCKET: z.string().min(1).default("/var/run/docker.sock"),
  BACKEND_URL: z.url().default("http://localhost:4000"),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
});

let cached: z.infer<typeof schema> | undefined;

export function getEnv() {
  if (!cached) {
    cached = schema.parse(process.env);
  }
  return cached;
}
