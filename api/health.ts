import type { VercelRequest, VercelResponse } from "@vercel/node";

const DB_KEYS = [
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NO_SSL",
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).setHeader("Allow", "GET");
    res.end();
    return;
  }

  const env = {
    admin: Boolean(process.env.ADMIN_LOGIN && process.env.ADMIN_PASSWORD),
    session: Boolean(process.env.SESSION_SECRET),
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    db: DB_KEYS.some((k) => Boolean(process.env[k])),
  };

  res.status(200).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, env, vercel: Boolean(process.env.VERCEL) }));
}
