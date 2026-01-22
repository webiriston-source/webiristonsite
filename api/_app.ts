import express from "express";
import session from "express-session";
import MemoryStore from "memorystore";
import { createServer } from "http";

import { registerRoutes } from "../server/routes.js";

/**
 * Vercel Serverless API
 * Catch-all function will route /api/* requests into this Express app.
 *
 * Note: Serverless functions are stateless; sessions live in memory per instance.
 * For production-grade auth, switch to JWT or a persistent session store.
 */

const app = express();

// Required on Vercel/any proxy so `req.secure` works for secure cookies
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const MemoryStoreSession = MemoryStore(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "change-me-in-vercel-env",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: new MemoryStoreSession({
      checkPeriod: 24 * 60 * 60 * 1000, // prune expired entries daily
    }),
  }),
);

const httpServer = createServer(app);

let initPromise: Promise<void> | null = null;
async function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      await registerRoutes(httpServer, app);
    })();
  }
  await initPromise;
}

export default async function handler(req: any, res: any) {
  await ensureInit();
  return app(req, res);
}
