import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { registerRoutes } from "./routes.js";

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

  // Basic middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

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
