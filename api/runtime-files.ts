import type { VercelRequest, VercelResponse } from "../shared/vercel-types";
import { existsSync, readdirSync } from "fs";

function safeList(path: string): string[] | string {
  try {
    if (!existsSync(path)) return "missing";
    return readdirSync(path).slice(0, 100);
  } catch (error) {
    return error instanceof Error ? error.message : "list_error";
  }
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const payload = {
    ok: true,
    timestamp: Date.now(),
    cwd: process.cwd(),
    varTask: safeList("/var/task"),
    varTaskApi: safeList("/var/task/api"),
    varTaskShared: safeList("/var/task/shared"),
    varTaskServerless: safeList("/var/task/serverless"),
  };

  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

