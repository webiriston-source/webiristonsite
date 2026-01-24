import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";
import { methodNotAllowed, sendJson } from "../../serverless/http";
import { requireAdmin } from "../../serverless/requireAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  if (!requireAdmin(req, res)) return;

  try {
    const stats = await storage.getLeadStats();
    return sendJson(res, 200, stats);
  } catch (error) {
    console.error("Error fetching lead stats:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
