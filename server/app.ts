import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes.js";
import { pool } from "./db.js";

/**
 * Creates an Express app with all routes registered.
 * - Local dev uses server/index.ts to call app.listen(...)
 * - Vercel serverless uses api/index.ts and does NOT call listen
 */
export async function createApp() {
  const app = express();

  // Behind Vercel/any proxy we must trust proxy to make secure cookies work.
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  const requiredEnv = [
    "DATABASE_URL",
    "SESSION_SECRET",
    "ADMIN_LOGIN",
    "ADMIN_PASSWORD",
  ];
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn("Telegram credentials are not configured.");
  }

  // Basic middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  const PgSession = connectPgSimple(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "change-me-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: Boolean(process.env.VERCEL || process.env.NODE_ENV === "production"),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
      store: new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
    })
  );

  // Very light rate limit for API endpoints
  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  await registerRoutes(app);
  return app;
}
