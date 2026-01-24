import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Minimal handler for /api and /api/ only.
 * Does NOT import server/routes. All real API lives in api/contact, api/admin/login, etc.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(404).setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      error: "Not Found",
      message: "Use /api/contact, /api/estimate, /api/admin/login, etc.",
    })
  );
}
