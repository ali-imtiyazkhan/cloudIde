import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  WEB_URL: z.url().default("http://localhost:3000"),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GITHUB_REDIRECT_URI: z.url(),
  CRYPTO_KEY: z.string().min(1),
});

let cachedEnv: z.infer<typeof schema> | undefined;

export function getEnv() {
  if (!cachedEnv) {
    cachedEnv = schema.parse(process.env);
  }
  return cachedEnv;
}
