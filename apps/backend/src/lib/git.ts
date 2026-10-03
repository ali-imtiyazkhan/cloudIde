import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CLONE_TIMEOUT_MS = 120_000;

type CloneOptions = {
  /** Validated clone URL stored at import time (came from the GitHub API). */
  cloneUrl: string;
  /** Decrypted GitHub access token — never appears in argv. */
  token: string;
  /** Directory the repository is cloned into (bind-mounted as /workspace). */
  destDir: string;
};

/**
 * Clones the repository into destDir so the workspace container starts with
 * the project's files already in place.
 *
 * The token is passed only through the child's environment using git's
 * `GIT_CONFIG_*` mechanism, never on the command line, so it cannot leak
 * through `ps` output or shell history.
 *
 * Note: files land on the host owned by the host user. On macOS Docker
 * Desktop this is fine (the VM proxies writes as the primary user); on a
 * Linux host the container's `coder` user may need matching uid/GID or an
 * in-container clone — revisit when deploying off macOS.
 */
export async function cloneRepository({ cloneUrl, token, destDir }: CloneOptions) {
  // A workspace restart reuses the same storage — only clone once.
  if (existsSync(join(destDir, ".git"))) return;

  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");

  try {
    await execFileAsync("git", ["clone", "--", cloneUrl, destDir], {
      timeout: CLONE_TIMEOUT_MS,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "http.extraHeader",
        GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
      },
    });
  } catch (error) {
    // Leave the directory clean so the next attempt starts fresh instead
    // of tripping over a half-written .git directory.
    await emptyDir(destDir);
    throw error;
  }
}

async function emptyDir(dir: string) {
  const entries = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    entries.map((entry) => rm(join(dir, entry), { recursive: true, force: true })),
  );
}
