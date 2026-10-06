"use client";

import { useEffect, useState } from "react";
import { API_URL, api } from "../lib/api";
import type { SessionUser } from "../lib/types";
import styles from "./page.module.css";

const ERROR_MESSAGES: Record<string, string> = {
  oauth_state: "Sign-in was cancelled or expired. Please try again.",
  token_exchange: "GitHub rejected the sign-in. Please try again.",
  profile_fetch: "We could not read your GitHub profile. Please try again.",
};

const FEATURES = [
  {
    title: "GitHub OAuth",
    body: "Sign in with GitHub. Your token is encrypted at rest and only used for repo access.",
    status: "Done",
  },
  {
    title: "Repository import",
    body: "Browse your GitHub repositories and import one into the platform in a click.",
    status: "Done",
  },
  {
    title: "Cloud workspaces",
    body: "Each project runs in its own isolated Docker container with CPU and memory limits.",
    status: "Next up",
  },
  {
    title: "Browser IDE",
    body: "File tree, Monaco editor and an xterm.js terminal — nothing installed locally.",
    status: "Planned",
  },
];

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error");
    if (code) {
      setError(
        ERROR_MESSAGES[code] ?? "Something went wrong. Please try again.",
      );
    }

    api<{ user: SessionUser | null }>("/auth/me")
      .then(({ user }) => {
        if (user) window.location.replace("/dashboard");
      })
      .catch(() => {
        // Not signed in — stay on the landing page.
      })
      .finally(() => setChecking(false));
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.logo}>
          <span className={styles.logoMark} />
          CloudIDE
        </span>
        <a className={styles.headerLink} href={`${API_URL}/auth/github`}>
          Sign in
        </a>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Cloud GitHub Development Platform</p>
          <h1>
            Your code lives in the cloud.
            <br />
            Your laptop stays light.
          </h1>
          <p className={styles.sub}>
            Connect GitHub, import a repository, and open it in a browser-based
            IDE backed by an isolated Docker workspace. No local clones, no
            local <code>node_modules</code>, no local containers.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.ctas}>
            <a
              className={styles.primary}
              href={`${API_URL}/auth/github`}
              aria-disabled={checking}
            >
              <GitHubIcon />
              Sign in with GitHub
            </a>
            <a className={styles.secondary} href="#features">
              How it works
            </a>
          </div>
        </section>

        <section className={styles.features} id="features">
          {FEATURES.map((feature) => (
            <article className={styles.card} key={feature.title}>
              <span
                className={`${styles.status} ${
                  feature.status === "Done"
                    ? styles.statusDone
                    : feature.status === "Next up"
                      ? styles.statusNext
                      : styles.statusPlanned
                }`}
              >
                {feature.status}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Storage persists. Compute is disposable.</p>
      </footer>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}
