"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import styles from "./terminal-panel.module.css";

const WSS_URL = process.env.NEXT_PUBLIC_WSS_URL ?? "ws://localhost:4001";

type Props = { workspaceId: string };

type ServerMessage = { type: "exit" } | { type: "error"; reason: string };

export default function TerminalPanel({ workspaceId }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "connecting" | "open" | "ended" | "failed"
  >("connecting");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let opened = false;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace",
      theme: { background: "#03060c" },
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    fit.fit();

    const ws = new WebSocket(`${WSS_URL}/workspaces/${workspaceId}/terminal`);
    ws.binaryType = "arraybuffer";

    const sendResize = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }),
        );
      }
    };

    ws.onopen = () => {
      if (disposed) return;
      opened = true;
      setStatus("open");
      term.focus();
      sendResize();
    };

    ws.onmessage = (event) => {
      if (disposed) return;
      if (typeof event.data === "string") {
        // Text frames carry control messages from the service.
        try {
          const message = JSON.parse(event.data) as ServerMessage;
          if (message.type === "exit" || message.type === "error") {
            setStatus("ended");
          }
        } catch {
          // Ignore anything that isn't valid JSON.
        }
        return;
      }
      // Binary frames are raw pty output.
      term.write(new Uint8Array(event.data as ArrayBuffer));
    };

    ws.onclose = () => {
      if (disposed) return;
      setStatus(opened ? "ended" : "failed");
    };

    const inputSub = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data));
      }
    });
    const resizeSub = term.onResize(() => sendResize());

    const observer = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        // The panel can be momentarily zero-sized while hidden.
      }
    });
    observer.observe(host);

    return () => {
      disposed = true;
      observer.disconnect();
      inputSub.dispose();
      resizeSub.dispose();
      ws.close();
      term.dispose();
    };
  }, [workspaceId]);

  return (
    <div className={styles.panel}>
      <div ref={hostRef} className={styles.host} />
      {status !== "open" && (
        <div className={styles.overlay}>
          <p>
            {status === "connecting" && "Connecting…"}
            {status === "failed" &&
              "Connection rejected — check the workspace is running and you're logged in."}
            {status === "ended" && "Session ended."}
          </p>
        </div>
      )}
    </div>
  );
}
