import { createHash, createDecipheriv } from "node:crypto";
import { prisma } from "@repo/db";

const key = createHash("sha256").update(process.env.CRYPTO_KEY!).digest();
const row = await prisma.gitHubAccount.findFirstOrThrow();
const buf = Buffer.from(row.accessTokenEnc, "base64");
const dec = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
dec.setAuthTag(buf.subarray(12, 28));
const token = Buffer.concat([
  dec.update(buf.subarray(28)),
  dec.final(),
]).toString("utf8");

const body = `## Problem

\`POST /workspaces/:id/connect\` injects an ephemeral key into \`authorized_keys\`, and the key matched the private key exactly — but SSH always failed:

\`\`\`
User coder not allowed because account is locked
debug2: userauth_pubkey: disabled because of invalid user
coder@127.0.0.1: Permission denied (publickey)
\`\`\`

The \`ghcr.io/coder/code-server\` base image leaves the \`coder\` account with \`!\` in \`/etc/shadow\`, which locks it. \`sshd_config\` deliberately runs \`UsePAM no\` (containers have no init system), and with PAM off OpenSSH rejects **every** auth method for a locked account — public keys included. The injected key was never evaluated.

The \`docker exec\` call that writes \`authorized_keys\` does not authenticate, which is why nothing else in the flow surfaced this.

## Fix

Set the shadow password field to \`*\` — "no password set", but not locked:

\`\`\`dockerfile
RUN usermod -p '*' coder
\`\`\`

## Verification

- patched a running container in place, then: \`ssh -i ~/.ssh/<key> -p <port> coder@127.0.0.1\` → connected, \`/workspace\` listed
- fresh container built from this image → same result

Debugging note: this is only visible with \`sshd -d -o LogLevel=DEBUG3\` inside the container — the default log level hides the "account is locked" reason entirely.`;

const res = await fetch(
  "https://api.github.com/repos/ali-imtiyazkhan/cloudIde/pulls",
  {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "content-type": "application/json",
      "user-agent": "CloudIDE",
    },
    body: JSON.stringify({
      title:
        "Fix SSH authentication for workspace connections (locked account)",
      head: "tohid-khan02:fix/ssh-locked-account",
      base: "main",
      body,
    }),
  },
);

const json = (await res.json()) as Record<string, unknown>;
console.log(`HTTP ${res.status}`);
console.log(
  (json.html_url as string) ?? `error: ${JSON.stringify(json).slice(0, 400)}`,
);
await prisma.$disconnect();
