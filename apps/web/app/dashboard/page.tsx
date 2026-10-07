"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api, ApiError } from "../../lib/api";
import type {
  ConnectResponse,
  CreateWorkspaceResponse,
  GithubRepo,
  ImportedProject,
  ImportResponse,
  ProjectsResponse,
  ReposResponse,
  SessionUser,
  WorkspaceStatus,
  WorkspaceStatusResponse,
} from "../../lib/types";
import { SiteHeader } from "../../components/site-header";
import { SiteFooter } from "../../components/site-footer";
import styles from "./page.module.css";

const TerminalPanel = dynamic(() => import("../../components/terminal-panel"), {
  ssr: false,
});

const PER_PAGE = 30;

/** Workspace statuses that mean "still coming up" — poll until they resolve. */
const TRANSITIONAL: WorkspaceStatus[] = ["PENDING", "PROVISIONING", "STARTING"];

/** The user's choice of editor — all of them speak SSH Remote. */
type IdeId = "vscode" | "cursor" | "antigravity" | "jetbrains";

const IDES: { id: IdeId; name: string; steps: (alias: string) => string[] }[] =
  [
    {
      id: "vscode",
      name: "VS Code",
      steps: (alias) => [
        "Install the “Remote - SSH” extension (⇧⌘X → search “Remote - SSH”).",
        "⇧⌘P → “Remote-SSH: Connect to Host”.",
        `Pick “${alias}” — the project opens, running in the cloud.`,
      ],
    },
    {
      id: "cursor",
      name: "Cursor",
      steps: (alias) => [
        "Cursor uses the same SSH config as VS Code — nothing extra to install.",
        "⇧⌘P → “Remote-SSH: Connect to Host”.",
        `Pick “${alias}”.`,
      ],
    },
    {
      id: "antigravity",
      name: "Antigravity",
      steps: (alias) => [
        "Antigravity connects over standard SSH as well.",
        "Command palette → “Remote-SSH: Connect to Host”.",
        `Pick “${alias}”.`,
      ],
    },
    {
      id: "jetbrains",
      name: "JetBrains Gateway",
      steps: (alias) => [
        "Add the SSH config below to ~/.ssh/config first — Gateway reads it.",
        "Open JetBrains Gateway → New Connection → SSH.",
        `Select “${alias}” from the host list.`,
      ],
    },
  ];

/** Pulls the human `message` out of the API's `{ error, message }` bodies. */
function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    try {
      const body = JSON.parse(err.message) as { message?: string };
      if (body.message) return body.message;
    } catch {
      // Not JSON — fall through to the fallback.
    }
  }
  return fallback;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState<number | null>(null);
  const [startingProject, setStartingProject] = useState<string | null>(null);
  const [stoppingWorkspace, setStoppingWorkspace] = useState<string | null>(
    null,
  );
  const [connectFor, setConnectFor] = useState<string | null>(null);
  const [connectData, setConnectData] = useState<ConnectResponse | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [terminalFor, setTerminalFor] = useState<string | null>(null);
  const [selectedIde, setSelectedIde] = useState<IdeId>("vscode");
  const [copied, setCopied] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<Set<string>>(new Set());

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await api<ProjectsResponse>("/projects");
      setProjects(data.projects);
    } catch {
      setError("Could not load your projects.");
    } finally {
      setProjectsLoading(false);
    }
  }, []);

  const loadRepos = useCallback(
    async (nextPage: number) => {
      setReposLoading(true);
      setError(null);
      try {
        const data = await api<ReposResponse>(
          `/repos?type=all&sort=updated&direction=desc&page=${nextPage}&per_page=${PER_PAGE}`,
        );
        setRepos((prev) =>
          nextPage === 1 ? data.repos : [...prev, ...data.repos],
        );
        setPage(data.pagination.page);
        setHasMore(data.pagination.hasMore);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/");
          return;
        }
        setError("Could not load your GitHub repositories.");
      } finally {
        setReposLoading(false);
      }
    },
    [router],
  );

  /** Watches a workspace until it leaves the transitional states, then refreshes. */
  const pollWorkspace = useCallback(
    async (workspaceId: string) => {
      if (pollingRef.current.has(workspaceId)) return;
      pollingRef.current.add(workspaceId);
      try {
        for (let attempt = 0; attempt < 90; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          let status: WorkspaceStatus;
          try {
            ({ status } = await api<WorkspaceStatusResponse>(
              `/workspaces/${workspaceId}/status`,
            ));
          } catch {
            // The status endpoint marks rows FAILED on Docker errors itself;
            // a refresh below picks that up.
            break;
          }
          if (!TRANSITIONAL.includes(status)) break;
        }
      } finally {
        pollingRef.current.delete(workspaceId);
        void loadProjects();
      }
    },
    [loadProjects],
  );

  // If the dashboard loads while a workspace is still provisioning (e.g. the
  // page was reloaded mid-create), resume watching it.
  useEffect(() => {
    const pending = projects.find(
      (project) =>
        project.latestWorkspace &&
        TRANSITIONAL.includes(project.latestWorkspace.status),
    );
    if (pending?.latestWorkspace)
      void pollWorkspace(pending.latestWorkspace.id);
  }, [projects, pollWorkspace]);

  useEffect(() => {
    api<{ user: SessionUser | null }>("/auth/me")
      .then(({ user }) => {
        if (!user) {
          router.replace("/");
          return;
        }
        setUser(user);
        setAuthChecked(true);
        void loadProjects();
        void loadRepos(1);
      })
      .catch(() => router.replace("/"));
  }, [router, loadProjects, loadRepos]);

  async function importRepo(repo: GithubRepo) {
    setImporting(repo.id);
    setNotice(null);
    setError(null);
    try {
      await api<ImportResponse>("/repos/repo", {
        method: "POST",
        // The API only trusts `fullName` and re-reads every other field
        // from GitHub, so that is all we send.
        body: JSON.stringify({ fullName: repo.fullName }),
      });
      setNotice(`Imported ${repo.fullName}`);
      await loadProjects();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice(`${repo.fullName} is already imported.`);
        await loadProjects();
      } else if (err instanceof ApiError && err.status === 401) {
        router.replace("/");
      } else {
        setError(`Failed to import ${repo.fullName}.`);
      }
    } finally {
      setImporting(null);
    }
  }

  async function startWorkspace(projectId: string) {
    setStartingProject(projectId);
    setNotice(null);
    setError(null);
    try {
      const { workspace } = await api<CreateWorkspaceResponse>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ projectId }),
      });
      setNotice(
        workspace.status === "RUNNING"
          ? "Workspace is running."
          : "Workspace is starting…",
      );
      await loadProjects();
      if (TRANSITIONAL.includes(workspace.status)) {
        void pollWorkspace(workspace.id);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/");
        return;
      }
      setError(apiErrorMessage(err, "Failed to start the workspace."));
    } finally {
      setStartingProject(null);
    }
  }

  async function stopWorkspace(workspaceId: string) {
    setStoppingWorkspace(workspaceId);
    setNotice(null);
    setError(null);
    try {
      await api(`/workspaces/${workspaceId}/stop`, { method: "POST" });
      setNotice("Workspace stopped.");
      await loadProjects();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/");
        return;
      }
      setError(apiErrorMessage(err, "Failed to stop the workspace."));
    } finally {
      setStoppingWorkspace(null);
    }
  }

  async function openConnect(workspaceId: string) {
    setConnectFor(workspaceId);
    setConnectData(null);
    setConnectLoading(true);
    setError(null);
    try {
      const data = await api<ConnectResponse>(
        `/workspaces/${workspaceId}/connect`,
        { method: "POST" },
      );
      setConnectData(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/");
        return;
      }
      setError(apiErrorMessage(err, "Could not set up the IDE connection."));
      setConnectFor(null);
    } finally {
      setConnectLoading(false);
    }
  }

  function closeConnect() {
    setConnectFor(null);
    setConnectData(null);
    setCopied(null);
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      window.setTimeout(
        () => setCopied((current) => (current === label ? null : current)),
        1500,
      );
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  function downloadKey() {
    if (!connectData) return;
    const blob = new Blob([connectData.privateKey], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = connectData.hostAlias;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  function workspaceControls(project: ImportedProject) {
    const ws = project.latestWorkspace;
    const starting = startingProject === project.id;
    const stopping = stoppingWorkspace === ws?.id;

    if (starting || (ws && TRANSITIONAL.includes(ws.status))) {
      return (
        <span className={styles.wsProvisioning}>
          <span className={styles.spinnerSmall} />
          {ws ? "Provisioning…" : "Starting…"}
        </span>
      );
    }

    if (ws?.status === "RUNNING") {
      return (
        <span className={styles.wsControls}>
          {ws.previewUrl && (
            <a
              className={styles.connectBtn}
              href={ws.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open IDE
            </a>
          )}
          <button
            className={styles.connectBtn}
            onClick={() => setTerminalFor(ws.id)}
          >
            Terminal
          </button>
          <button
            className={styles.connectBtn}
            onClick={() => openConnect(ws.id)}
          >
            Connect…
          </button>
          <button
            className={styles.stopBtn}
            disabled={stopping}
            onClick={() => stopWorkspace(ws.id)}
          >
            {stopping ? "Stopping…" : "Stop"}
          </button>
        </span>
      );
    }

    // STOPPED, FAILED, or never started — offer a (re)start.
    return (
      <button
        className={styles.startBtn}
        disabled={starting}
        onClick={() => startWorkspace(project.id)}
      >
        {ws?.status === "FAILED" ? "Retry" : "Start"}
      </button>
    );
  }

  if (!authChecked) {
    return (
      <div className={styles.loading}>
        <span className={styles.spinner} />
        Checking your session…
      </div>
    );
  }

  const importedIds = new Set(
    projects.map((project) => project.repository.fullName),
  );
  const filteredRepos = repos.filter((repo) =>
    repo.fullName.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const activeIde = IDES.find((ide) => ide.id === selectedIde) ?? IDES[0]!;

  return (
    <div className={styles.page}>
      <SiteHeader
        actions={
          <div className="flex items-center gap-3">
            {user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-8 w-8 rounded-full border border-line object-cover"
              />
            )}
            <span className="hidden text-sm text-muted sm:inline">
              {user?.githubLogin ?? user?.name ?? "Account"}
            </span>
            <button
              className="rounded-lg border border-line bg-surface px-3.5 py-2 text-sm text-foreground transition-colors duration-200 hover:border-danger/55 hover:bg-danger/10 hover:text-danger"
              onClick={logout}
            >
              Sign out
            </button>
          </div>
        }
      />

      <main className={styles.main}>
        {notice && <div className={styles.notice}>{notice}</div>}
        {error && <div className={styles.errorBanner}>{error}</div>}

        <section>
          <div className={styles.sectionHead}>
            <h2>Projects</h2>
            <span className={styles.hint}>
              Imported repositories ready for a workspace
            </span>
          </div>

          {projectsLoading && projects.length === 0 ? (
            <div className={styles.empty}>Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className={styles.empty}>
              No projects yet. Import a repository below to get started.
            </div>
          ) : (
            <div className={styles.projectGrid}>
              {projects.map((project) => (
                <article className={styles.projectCard} key={project.id}>
                  <div className={styles.projectTop}>
                    <h3>{project.repository.fullName}</h3>
                    <span className={styles.badge}>{project.branch}</span>
                  </div>
                  {project.repository.description && (
                    <p className={styles.projectDesc}>
                      {project.repository.description}
                    </p>
                  )}
                  <div className={styles.projectMeta}>
                    <span className={styles.badgeMuted}>
                      {project.repository.visibility.toLowerCase()}
                    </span>
                    {project.repository.isFork && (
                      <span className={styles.badgeMuted}>fork</span>
                    )}
                    {workspaceControls(project)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className={styles.sectionHead}>
            <h2>GitHub repositories</h2>
            <input
              className={styles.search}
              type="search"
              placeholder="Filter repositories…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={styles.repoList}>
            {filteredRepos.map((repo) => {
              const imported = importedIds.has(repo.fullName);
              return (
                <div className={styles.repoRow} key={repo.id}>
                  <div className={styles.repoInfo}>
                    <a
                      className={styles.repoName}
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {repo.fullName}
                    </a>
                    {repo.description && (
                      <p className={styles.repoDesc}>{repo.description}</p>
                    )}
                    <div className={styles.repoMeta}>
                      {repo.language && <span>{repo.language}</span>}
                      <span>★ {repo.stargazersCount}</span>
                      {repo.visibility === "PRIVATE" && <span>private</span>}
                      {repo.isFork && <span>fork</span>}
                      <span className={styles.branch}>
                        {repo.defaultBranch}
                      </span>
                    </div>
                  </div>

                  <button
                    className={`${styles.importBtn} ${
                      imported ? styles.importedBtn : ""
                    }`}
                    disabled={imported || importing === repo.id}
                    onClick={() => importRepo(repo)}
                  >
                    {imported
                      ? "Imported"
                      : importing === repo.id
                        ? "Importing…"
                        : "Import"}
                  </button>
                </div>
              );
            })}

            {filteredRepos.length === 0 && !reposLoading && (
              <div className={styles.empty}>
                {repos.length === 0
                  ? "No repositories found for your GitHub account."
                  : "No repositories match your filter."}
              </div>
            )}
          </div>

          {hasMore && (
            <button
              className={styles.loadMore}
              disabled={reposLoading}
              onClick={() => loadRepos(page + 1)}
            >
              {reposLoading ? "Loading…" : "Load more"}
            </button>
          )}
        </section>
      </main>

      <SiteFooter />

      {terminalFor && (
        <div
          className={styles.modalOverlay}
          onClick={() => setTerminalFor(null)}
        >
          <div
            className={styles.modal}
            style={{ maxWidth: 760 }}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <h3>Terminal</h3>
              <button
                className={styles.modalClose}
                onClick={() => setTerminalFor(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <TerminalPanel workspaceId={terminalFor} />
          </div>
        </div>
      )}

      {connectFor && (
        <div className={styles.modalOverlay} onClick={closeConnect}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <h3>Connect your IDE</h3>
              <button
                className={styles.modalClose}
                onClick={closeConnect}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {connectLoading ? (
              <div className={styles.modalLoading}>
                <span className={styles.spinnerSmall} />
                Issuing an SSH key…
              </div>
            ) : (
              connectData && (
                <>
                  <div className={styles.ideChips}>
                    {IDES.map((ide) => (
                      <button
                        key={ide.id}
                        className={`${styles.ideChip} ${
                          selectedIde === ide.id ? styles.ideChipActive : ""
                        }`}
                        onClick={() => setSelectedIde(ide.id)}
                      >
                        {ide.name}
                      </button>
                    ))}
                  </div>

                  <ol className={styles.steps}>
                    {activeIde.steps(connectData.hostAlias).map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>

                  <div className={styles.connBlock}>
                    <div className={styles.connBlockHead}>
                      <span>1. Add to your SSH config</span>
                      <button
                        className={styles.copyBtn}
                        onClick={() =>
                          copyText(connectData.sshConfig, "config")
                        }
                      >
                        {copied === "config" ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <pre className={styles.codeBlock}>
                      {connectData.sshConfig}
                    </pre>
                  </div>

                  <div className={styles.connBlock}>
                    <div className={styles.connBlockHead}>
                      <span>2. Download your key</span>
                      <button className={styles.copyBtn} onClick={downloadKey}>
                        Download key
                      </button>
                    </div>
                    <p className={styles.keyNote}>
                      Move it to <code>~/.ssh/{connectData.hostAlias}</code> and
                      run <code>chmod 600</code> on it. One key per connection:
                      it is replaced on the next Connect and revoked when the
                      workspace stops.
                    </p>
                  </div>

                  <div className={styles.connBlock}>
                    <div className={styles.connBlockHead}>
                      <span>3. Or connect straight from a terminal</span>
                      <button
                        className={styles.copyBtn}
                        onClick={() => copyText(connectData.command, "command")}
                      >
                        {copied === "command" ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                    <pre className={styles.codeBlock}>
                      {connectData.command}
                    </pre>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
