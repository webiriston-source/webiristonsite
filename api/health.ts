import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, methodNotAllowed } from "../serverless/http";

const DB_KEYS = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NO_SSL",
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const env = {
    admin: Boolean(process.env.ADMIN_LOGIN && process.env.ADMIN_PASSWORD),
    session: Boolean(process.env.SESSION_SECRET),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    db: DB_KEYS.some((k) => Boolean(process.env[k])),
  };

  return sendJson(res, 200, {
    ok: true,
    env,
    vercel: Boolean(process.env.VERCEL),
  });
}
