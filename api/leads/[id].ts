import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage.ts";
import { methodNotAllowed, sendJson } from "../../serverless/http.ts";
import { requireAdmin } from "../../serverless/requireAdmin.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  if (!requireAdmin(req, res)) return;

  const leadId = req.query.id as string;
  if (!leadId) {
    return sendJson(res, 400, { error: "Lead id is required" });
  }

  try {
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return sendJson(res, 404, { error: "Lead not found" });
    }
    return sendJson(res, 200, lead);
  } catch (error) {
    console.error("Error fetching lead:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
