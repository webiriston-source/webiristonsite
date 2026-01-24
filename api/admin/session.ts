import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, methodNotAllowed } from "../../serverless/http";
import { getAdminSession } from "../../serverless/auth";

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

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const wantHealth = req.query?.health === "1" || req.query?.health === "true";
  if (wantHealth) {
    return sendJson(res, 200, { ok: true, env: envHealth(), vercel: Boolean(process.env.VERCEL) });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return sendJson(res, 200, { isAdmin: false });
  }

  const session = getAdminSession(req, sessionSecret);
  return sendJson(res, 200, { isAdmin: Boolean(session?.isAdmin) });
}
