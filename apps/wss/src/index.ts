import { z } from "zod";
import { getDocker } from "./docker";
import { getEnv } from "./env";
import { attachTerminal, type Session } from "./terminal";

const env = getEnv();
const expectedOrigin = new URL(env.WEB_ORIGIN).origin;
const workspaceIdSchema = z.uuid();

const resizeSchema = z.object({
  type: z.literal("resize"),
  cols: z.number().int().min(20).max(500),
  rows: z.number().int().min(5).max(300),
});

type ConnectionData = {
  workspaceId: string;
  session?: Session;
  pendingResize?: { cols: number; rows: number };
};

function parseResize(raw: string): { cols: number; rows: number } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const message = resizeSchema.safeParse(parsed);
  return message.success ? message.data : null;
}

const server: Bun.Server<ConnectionData> = Bun.serve({
  port: env.PORT,
  async fetch(req, server) {
    // Browsers always attach Origin to a WS handshake — reject foreign pages.
    // Non-browser clients (curl, wscat) send none; they still need a cookie.
    const origin = req.headers.get("origin");
    if (origin !== null && origin !== expectedOrigin) {
      return new Response("forbidden origin", { status: 403 });
    }

    const match = new URL(req.url).pathname.match(
      /^\/workspaces\/([^/]+)\/terminal$/,
    );
    const workspaceId = match?.[1];
    if (!workspaceId) {
      return new Response("not found", { status: 404 });
    }
    const parsedId = workspaceIdSchema.safeParse(workspaceId);
    if (!parsedId.success) {
      return new Response("invalid workspace id", { status: 400 });
    }

    // Auth + ownership + running state, decided by the existing backend:
    // no/bad session → 401 · not yours → 404 · not running → 409.
    const cookie = req.headers.get("cookie");
    if (!cookie) {
      return new Response("unauthorized", { status: 401 });
    }
    let statusRes: Response;
    try {
      statusRes = await fetch(
        `${env.BACKEND_URL}/workspaces/${parsedId.data}/status`,
        { headers: { cookie } },
      );
    } catch (error) {
      console.error("backend unreachable:", error);
      return new Response("backend unreachable", { status: 502 });
    }
    if (!statusRes.ok) {
      return new Response(await statusRes.text(), { status: statusRes.status });
    }
    const status = (await statusRes.json()) as {
      status: string;
      docker: { running: boolean } | null;
    };
    if (status.status !== "RUNNING" || !status.docker?.running) {
      return new Response("workspace not running", { status: 409 });
    }

    if (!server.upgrade(req, { data: { workspaceId: parsedId.data } })) {
      return new Response("websocket required", { status: 426 });
    }
    return undefined;
  },
  websocket: {
    async open(ws) {
      try {
        const container = getDocker().getContainer(
          `cloudide-ws-${ws.data.workspaceId}`,
        );
        const session = await attachTerminal(container, {
          onOutput: (chunk) => ws.send(chunk),
          onExit: () => {
            ws.send(JSON.stringify({ type: "exit" }));
            ws.close(1000, "exit");
          },
          onError: (reason) => {
            ws.send(JSON.stringify({ type: "error", reason }));
            ws.close(1011, reason);
          },
        });
        ws.data.session = session;
        if (ws.data.pendingResize) {
          const { cols, rows } = ws.data.pendingResize;
          session.resize(cols, rows).catch(() => {});
        }
      } catch (error) {
        console.error(
          `terminal attach failed for ${ws.data.workspaceId}:`,
          error,
        );
        ws.send(JSON.stringify({ type: "error", reason: "attach_failed" }));
        ws.close(1011, "attach_failed");
      }
    },
    message(ws, message) {
      const session = ws.data.session;
      if (typeof message !== "string") {
        // Binary frames are terminal stdin.
        session?.write(message);
        return;
      }
      // Text frames are the JSON control channel.
      const resize = parseResize(message);
      if (!resize) return;
      if (!session) {
        // The attach is still in flight — the client sends its first resize
        // the moment the socket opens. Remember it, apply once the shell is up.
        ws.data.pendingResize = resize;
        return;
      }
      session.resize(resize.cols, resize.rows).catch(() => {});
    },
    close(ws) {
      ws.data.session?.close();
    },
  },
});

console.log(`wss listening on port ${env.PORT}`);
