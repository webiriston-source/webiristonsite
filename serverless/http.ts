import type { VercelRequest, VercelResponse } from "@vercel/node";

export async function readJsonBody<T>(req: VercelRequest): Promise<T | null> {
  if (req.body) {
    return req.body as T;
  }

  if (!req.readable) {
    return null;
  }

  let raw = "";
  for await (const chunk of req) {
    raw += typeof chunk === "string" ? chunk : chunk.toString("utf8");
  }

  if (!raw.trim()) return null;
  return JSON.parse(raw) as T;
}

export function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.status(405).setHeader("Allow", allowed.join(", "));
  res.end();
}
