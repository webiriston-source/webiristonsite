import type { VercelRequest, VercelResponse } from "@vercel/node";

const DB_KEYS = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NO_SSL",
];

function envHealth() {
  return {
    admin: Boolean(process.env.ADMIN_LOGIN && process.env.ADMIN_PASSWORD),
    session: Boolean(process.env.SESSION_SECRET),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    db: DB_KEYS.some((k) => Boolean(process.env[k])),
  };
}

function replyJson(res: VercelResponse, status: number, payload: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET");
    res.end();
    return;
  }

  const wantHealth = req.query?.health === "1" || req.query?.health === "true";
  if (wantHealth) {
    replyJson(res, 200, { ok: true, env: envHealth(), vercel: Boolean(process.env.VERCEL) });
    return;
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    replyJson(res, 200, { isAdmin: false });
    return;
  }

  const { getAdminSession } = await import("../../serverless/auth");
  const session = getAdminSession(req, sessionSecret);
  replyJson(res, 200, { isAdmin: Boolean(session?.isAdmin) });
}
