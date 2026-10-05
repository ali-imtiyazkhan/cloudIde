import Docker from "dockerode";
import { getEnv } from "./env";

let cached: Docker | undefined;

export function getDocker() {
  if (!cached) {
    cached = new Docker({ socketPath: getEnv().DOCKER_SOCKET });
  }
  return cached;
}
