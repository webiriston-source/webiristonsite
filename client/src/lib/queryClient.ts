import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // #region agent log
  const ingest = (msg: string, d: Record<string, unknown>, hyp: string) =>
    fetch("http://127.0.0.1:7242/ingest/b4f43000-b66f-41cc-aaa0-8a16f634d849", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "queryClient.ts:apiRequest",
        message: msg,
        data: d,
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: hyp,
      }),
    }).catch(() => {});
  ingest("apiRequest before fetch", { method, url, hasBody: !!data }, "H1");
  // #endregion

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (e) {
    // #region agent log
    ingest("apiRequest fetch failed", { error: String(e) }, "H1");
    // #endregion
    throw e;
  }

  // #region agent log
  ingest("apiRequest after fetch", { status: res.status, ok: res.ok, url }, "H2");
  // #endregion

  try {
    await throwIfResNotOk(res);
  } catch (e) {
    // #region agent log
    ingest("apiRequest throwIfResNotOk", { status: res.status, err: (e as Error).message }, "H2");
    // #endregion
    throw e;
  }
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    // #region agent log
    const ingest = (msg: string, d: Record<string, unknown>, hyp: string) =>
      fetch("http://127.0.0.1:7242/ingest/b4f43000-b66f-41cc-aaa0-8a16f634d849", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "queryClient.ts:getQueryFn",
          message: msg,
          data: d,
          timestamp: Date.now(),
          sessionId: "debug-session",
          hypothesisId: hyp,
        }),
      }).catch(() => {});
    ingest("getQueryFn before fetch", { url }, "H1");
    // #endregion

    const res = await fetch(url, { credentials: "include" });

    // #region agent log
    ingest("getQueryFn after fetch", { url, status: res.status, ok: res.ok }, "H2");
    if (url.includes("session")) ingest("getQueryFn session response", { status: res.status }, "H3");
    // #endregion

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
