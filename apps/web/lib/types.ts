export type SessionUser = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  githubLogin: string | null;
};

export type GithubRepo = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  description: string | null;
  visibility: "PUBLIC" | "PRIVATE";
  isFork: boolean;
  defaultBranch: string;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  pushedAt: string | null;
};

export type ReposResponse = {
  repos: GithubRepo[];
  pagination: {
    page: number;
    perPage: number;
    hasMore: boolean;
  };
};

export type WorkspaceStatus =
  | "PENDING"
  | "PROVISIONING"
  | "STARTING"
  | "RUNNING"
  | "STOPPED"
  | "SUSPENDED"
  | "FAILED"
  | "DELETED";

export type Workspace = {
  id: string;
  status: WorkspaceStatus;
  previewUrl: string | null;
  cpuLimit: number | null;
  memoryLimitMb: number | null;
  lastActiveAt: string;
  startedAt: string | null;
  stoppedAt: string | null;
};

export type WorkspaceStatusResponse = {
  status: WorkspaceStatus;
  docker: {
    running: boolean;
    exitCode: number | null;
    startedAt: string;
  } | null;
};

export type CreateWorkspaceResponse = {
  workspace: Workspace;
};

export type ImportedProject = {
  id: string;
  name: string;
  description: string | null;
  branch: string;
  storagePrefix: string;
  lastSyncedAt: string | null;
  createdAt: string;
  workspaceCount: number;
  latestWorkspace: Workspace | null;
  repository: {
    id: string;
    fullName: string;
    htmlUrl: string;
    visibility: "PUBLIC" | "PRIVATE";
    isFork: boolean;
    defaultBranch: string;
    description: string | null;
  };
};

export type ProjectsResponse = {
  projects: ImportedProject[];
};

export type ImportResponse = {
  repository: { id: string; fullName: string };
  project: { id: string; name: string };
};
