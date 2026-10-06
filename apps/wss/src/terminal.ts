import type Docker from "dockerode";

export type Session = {
  write: (data: Buffer) => void;
  resize: (cols: number, rows: number) => Promise<void>;
  close: () => void;
};

export type SessionHooks = {
  onOutput: (chunk: Buffer) => void;
  onExit: () => void;
  onError: (reason: string) => void;
};

export async function attachTerminal(
  container: Docker.Container,
  hooks: SessionHooks,
): Promise<Session> {
  const exec = await container.exec({
    Cmd: ["/bin/bash", "-l"],
    User: "coder",
    WorkingDir: "/workspace",
    Tty: true,
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    // Exec env is additive — the container's PATH/HOME/USER survive.
    Env: ["TERM=xterm-256color"],
  });

  // Tty:true here as well: this is the flag that stops docker-modem from
  // prefixing every frame with the 8-byte stream multiplex header.
  const stream = await exec.start({ hijack: true, stdin: true, Tty: true });

  let exited = false;
  const finish = (reason?: string) => {
    if (exited) return;
    exited = true;
    if (reason) hooks.onError(reason);
    else hooks.onExit();
  };

  stream.on("data", (chunk: Buffer) => hooks.onOutput(chunk));
  stream.on("end", () => finish());
  stream.on("close", () => finish());
  stream.on("error", () => finish("stream_error"));

  return {
    write: (data) => {
      if (!exited) stream.write(data);
    },
    resize: async (cols, rows) => {
      await exec.resize({ h: rows, w: cols });
    },
    close: () => {
      if (exited) return;
      exited = true;
      // Closing the hijack socket hangs up the pty — bash gets SIGHUP and dies.
      stream.destroy();
    },
  };
}
