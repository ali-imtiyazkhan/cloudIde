import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SshKeyPair = {
  /** OpenSSH PEM private key — returned to the client once, never stored. */
  privateKey: string;
  /** OpenSSH-format public line, e.g. `ssh-ed25519 AAAA... comment`. */
  publicKey: string;
};

/**
 * Generates an ephemeral ed25519 keypair using the host's ssh-keygen so the
 * public key is guaranteed to be in the exact format sshd accepts. Key files
 * live in a temp directory for the duration of the call and are removed
 * immediately afterwards — the private key only ever exists in memory and
 * in the one-time API response.
 */
export async function generateSshKeyPair(comment: string): Promise<SshKeyPair> {
  const dir = await mkdtemp(join(tmpdir(), "cloudide-ssh-"));
  const keyPath = join(dir, "id_ed25519");

  try {
    await execFileAsync("ssh-keygen", [
      "-t", "ed25519",
      "-q",
      "-N", "",
      "-C", comment,
      "-f", keyPath,
    ]);

    const [privateKey, publicKey] = await Promise.all([
      readFile(keyPath, "utf8"),
      readFile(`${keyPath}.pub`, "utf8"),
    ]);

    return { privateKey, publicKey: publicKey.trim() };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
