export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiOptions = Omit<RequestInit, "credentials" | "headers"> & {
  headers?: Record<string, string>;
};

/**
 * Fetch wrapper that talks to the Express API with the session cookie
 * included. The API sets cookies for `localhost`, and cookies ignore
 * ports, so the session travels between :3000 and :4000 in dev.
 */
export async function api<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { headers, ...init } = options;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }

  return (await res.json()) as T;
}
