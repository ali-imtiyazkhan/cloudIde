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
