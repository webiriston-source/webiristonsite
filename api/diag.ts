import type { VercelRequest, VercelResponse } from "../shared/vercel-types";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const report: Record<string, unknown> = {
    ok: true,
    timestamp: Date.now(),
    nodeVersion: process.version,
    hasFetch: typeof fetch === "function",
  };

  try {
    const mod = await import("./index.ts");
    report.indexImportOk = Boolean(mod?.default);
  } catch (error) {
    report.indexImportOk = false;
    report.indexImportError = error instanceof Error ? error.message : "unknown_import_error";
  }

  try {
    const db = await import("../shared/db");
    report.sharedDbImportOk = Boolean(db?.withDb);
  } catch (error) {
    report.sharedDbImportOk = false;
    report.sharedDbImportError = error instanceof Error ? error.message : "unknown_import_error";
  }

  try {
    const tg = await import("../serverless/telegram.ts");
    report.telegramImportOk = Boolean(tg?.sendTelegramDirectMessage);
  } catch (error) {
    report.telegramImportOk = false;
    report.telegramImportError = error instanceof Error ? error.message : "unknown_import_error";
  }

  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(report));
}

