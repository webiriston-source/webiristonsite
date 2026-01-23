import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import MemoryStore from "memorystore";
import { randomUUID } from "crypto";
import { registerRoutes } from "./routes.js";
import { databaseUrlSource, isDatabaseConfigured, pool } from "./db.js";

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

  const requiredEnv = ["SESSION_SECRET"];
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
  if (!process.env.ADMIN_LOGIN || !process.env.ADMIN_PASSWORD) {
    console.warn("Admin credentials are not configured.");
  }
  if (!isDatabaseConfigured) {
    console.warn("Database is not configured. Falling back to in-memory storage.");
  } else {
    console.info(`Database configured via ${databaseUrlSource}.`);
  }

  // Basic middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req: any, res, next) => {
    const requestId = randomUUID();
    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      console.info(
        "[api] request",
        JSON.stringify({
          requestId,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          durationMs,
        })
      );
    });
    next();
  });

  const PgSession = connectPgSimple(session);
  const MemoryStoreSession = MemoryStore(session);
  let usePgSession = Boolean(pool);

  if (pool) {
    try {
      await pool.query("select 1");
    } catch (error) {
      usePgSession = false;
      console.error("Database connection failed. Falling back to memory sessions.", error);
    }
  }

  const sessionStore = usePgSession
    ? new PgSession({
        pool: pool!,
        tableName: "user_sessions",
        createTableIfMissing: true,
      })
    : new MemoryStoreSession({
        checkPeriod: 24 * 60 * 60 * 1000,
      });

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
      store: sessionStore,
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

  app.use((err: any, req: any, res: any, _next: any) => {
    const requestId = req?.requestId;
    console.error("[api] unhandled_error", requestId ? { requestId } : undefined, err);
    res.status(500).json({
      error: "Internal server error",
      requestId,
    });
  });
  return app;
}
