import type { VercelRequest, VercelResponse } from "@vercel/node";

function parseJson(input: unknown): unknown {
  if (input == null) return null;
  if (typeof input === "object" && !Buffer.isBuffer(input)) return input;
  const str = typeof input === "string" ? input : Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  if (!str.trim()) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

export async function readJsonBody<T>(req: VercelRequest): Promise<T | null> {
  const body = (req as { body?: unknown }).body;
  if (body !== undefined && body !== null) {
    const parsed = parseJson(body);
    return parsed as T | null;
  }

  if (typeof (req as { readable?: boolean }).readable === "boolean" && !(req as { readable?: boolean }).readable) {
    return null;
  }

  try {
    let raw = "";
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      raw += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }
    if (!raw.trim()) return null;
    const parsed = parseJson(raw);
    return parsed as T | null;
  } catch {
    return null;
  }
}

export function sendJson(res: VercelResponse, status: number, payload: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.status(405).setHeader("Allow", allowed.join(", "));
  res.end();
}
