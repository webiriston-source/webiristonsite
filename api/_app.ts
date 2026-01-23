import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../server/app.js";

/**
 * Vercel Serverless API
 * Catch-all function will route /api/* requests into this Express app.
 */

let appPromise: Promise<ReturnType<typeof createApp>> | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appPromise) appPromise = createApp();
  const app = await appPromise;
  return app(req, res);
}
