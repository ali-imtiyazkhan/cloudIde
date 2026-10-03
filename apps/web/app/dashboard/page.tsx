"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import type {
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
import styles from "./page.module.css";

const PER_PAGE = 30;

/** Workspace statuses that mean "still coming up" — poll until they resolve. */
const TRANSITIONAL: WorkspaceStatus[] = ["PENDING", "PROVISIONING", "STARTING"];

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
  const [stoppingWorkspace, setStoppingWorkspace] = useState<string | null>(null);
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

  const loadRepos = useCallback(async (nextPage: number) => {
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
  }, [router]);

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
    if (pending?.latestWorkspace) void pollWorkspace(pending.latestWorkspace.id);
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
              className={styles.openIdeBtn}
              href={ws.previewUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open IDE ↗
            </a>
          )}
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoMark} />
          CloudIDE
        </Link>

        <div className={styles.user}>
          {user?.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className={styles.avatar} />
          )}
          <span className={styles.userName}>
            {user?.githubLogin ?? user?.name ?? "Account"}
          </span>
          <button className={styles.logout} onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

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
    </div>
  );
}
