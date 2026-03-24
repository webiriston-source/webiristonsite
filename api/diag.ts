import type { VercelRequest, VercelResponse } from "../shared/vercel-types";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const report: Record<string, unknown> = {
    ok: true,
    timestamp: Date.now(),
    nodeVersion: process.version,
    hasFetch: typeof fetch === "function",
  };

  const importAttempts: Array<{ key: string; specifier: string }> = [
    { key: "indexImportTs", specifier: "./index.ts" },
    { key: "indexImportJs", specifier: "./index.js" },
    { key: "sharedDbImportNoExt", specifier: "../shared/db" },
    { key: "sharedDbImportJs", specifier: "../shared/db.js" },
    { key: "telegramImportTs", specifier: "../serverless/telegram.ts" },
    { key: "telegramImportJs", specifier: "../serverless/telegram.js" },
  ];

  for (const attempt of importAttempts) {
    try {
      const mod = await import(attempt.specifier);
      report[attempt.key] = { ok: true, hasExports: Object.keys(mod || {}) };
    } catch (error) {
      report[attempt.key] = {
        ok: false,
        error: error instanceof Error ? error.message : "unknown_import_error",
      };
    }
  }

  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(report));
}

