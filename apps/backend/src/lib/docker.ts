import Docker from "dockerode";

import { getEnv } from "./env";

let cached: Docker | undefined;

export function getDocker() {
  if (cached) return cached;
  const docker = new Docker({ socketPath: getEnv().DOCKER_SOCKET });
  cached = docker;
  return docker;
}

export async function assertDockerReachable() {
  await getDocker().ping();
}

/**
 * Matches the daemon's own answers on a dockerode error. docker-modem tags
 * every non-success response with `statusCode`/`reason` (e.g. 404 /
 * "no such container") and repeats both in the message, so all three are
 * checked — transport failures (ECONNREFUSED, …) match none of them.
 */
function matchesDockerError(error: unknown, status: number, pattern: RegExp) {
  if (!error || typeof error !== "object") return false;
  const { statusCode, reason, message } = error as {
    statusCode?: number;
    reason?: string;
    message?: string;
  };
  return (
    statusCode === status || pattern.test(`${reason ?? ""} ${message ?? ""}`)
  );
}

/**
 * True when the daemon answered 404 — Docker knows nothing about this
 * container (removed by hand in Docker Desktop, `docker rm`, AutoRemove…).
 * The row referencing it is stale, not unreachable.
 */
export function isNoSuchContainer(error: unknown) {
  return matchesDockerError(error, 404, /no such container/i);
}

/**
 * True for the daemon's 304 "container already stopped": stop on a box that
 * is not running. An idempotent stop treats this as success.
 */
export function isAlreadyStopped(error: unknown) {
  return matchesDockerError(error, 304, /already stopped/i);
}

/**
 * True when the daemon rejected `--storage-opt size=` (graphdriver disk
 * quota). The option is only honoured on overlay2 over xfs with 'pquota';
 * Docker Desktop (Windows/macOS) and most Linux dev boxes answer 500, and
 * the *entire* create fails — it is not silently ignored. Matched on the
 * message alone: 500 is far too generic to flag every server error.
 */
export function isStorageOptUnsupported(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { message } = error as { message?: string };
  return /storage-opt is supported only/i.test(message ?? "");
}
