"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import type {
  GithubRepo,
  ImportedProject,
  ImportResponse,
  ProjectsResponse,
  ReposResponse,
  SessionUser,
} from "../../lib/types";
import styles from "./page.module.css";

const PER_PAGE = 30;

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
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
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
        <a href="/" className={styles.logo}>
          <span className={styles.logoMark} />
          CloudIDE
        </a>

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
                    <span className={styles.workspaceSoon}>
                      Workspace · coming soon
                    </span>
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

          {notice && <div className={styles.notice}>{notice}</div>}
          {error && <div className={styles.errorBanner}>{error}</div>}

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
