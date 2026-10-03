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