import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Get API base URL from environment variable or use current origin
 * In production: https://iristonweb.ru
 * In development: http://localhost:5000 (or current origin)
 */
const API_BASE = import.meta.env.VITE_API_BASE || (typeof window !== "undefined" ? window.location.origin : "");

/**
 * Build full API URL
 */
function buildApiUrl(path: string): string {
  // If path already starts with http, return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  
  // Combine base URL with path
  return `${API_BASE}/${cleanPath}`;
}

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
  const fullUrl = buildApiUrl(url);

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (e) {
    throw e;
  }

  try {
    await throwIfResNotOk(res);
  } catch (e) {
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
    const path = queryKey.join("/") as string;
    const url = buildApiUrl(path);

    const res = await fetch(url, { credentials: "include" });

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
