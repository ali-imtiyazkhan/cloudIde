import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_REDIRECT_URI: z.url(),
  CRYPTO_KEY: z.string().min(1),
  REDIS_URL: z.url(),
  S3_ENDPOINT: z.url().default("http://127.0.0.1:9000"),
  S3_BUCKET: z.string().min(1).default("cloudide-snapshots"),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),


  DOCKER_SOCKET: z.string().min(1).default("/var/run/docker.sock"),
  WORKSPACE_IMAGE: z.string().min(1).default("cloudide-workspace:latest"),
  // Loopback only. code-server runs with AUTH=none, so 0.0.0.0 would expose
  // an unauthenticated shell to anyone who can reach the port.
  WORKSPACE_BIND_IP: z.string().min(1).default("127.0.0.1"),
  WORKSPACE_INTERNAL_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(8080),
  WORKSPACE_SSH_INTERNAL_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(2222),
  STORAGE_ROOT: z.string().min(1).default(".workspaces"),
  WORKSPACE_CPU_LIMIT: z.coerce.number().int().min(1).max(16).default(2),
  WORKSPACE_MEMORY_LIMIT_MB: z.coerce
    .number()
    .int()
    .min(512)
    .max(32768)
    .default(4096),
  WORKSPACE_DISK_LIMIT_MB: z.coerce
    .number()
    .int()
    .min(1024)
    .max(204800)
    .default(20480),
  MAX_ACTIVE_WORKSPACES: z.coerce.number().int().min(1).max(50).default(5),
});

let cachedEnv: z.infer<typeof schema> | undefined;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = schema.parse(process.env);
  }
  return cachedEnv;
}
