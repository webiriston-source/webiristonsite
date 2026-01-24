import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../../server/storage.ts";
import { methodNotAllowed, readJsonBody, sendJson } from "../../../serverless/http.ts";
import { requireAdmin } from "../../../serverless/requireAdmin.ts";

const allowedStatuses = ["new", "in_progress", "closed"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "PATCH") {
    return methodNotAllowed(res, ["PATCH"]);
  }

  if (!requireAdmin(req, res)) return;

  const leadId = req.query.id as string;
  if (!leadId) {
    return sendJson(res, 400, { error: "Lead id is required" });
  }

  const body = await readJsonBody<{ status?: string }>(req);
  if (!body?.status || !allowedStatuses.includes(body.status)) {
    return sendJson(res, 400, { error: "Invalid status" });
  }

  try {
    const lead = await storage.updateLeadStatus(leadId, body.status);
    if (!lead) {
      return sendJson(res, 404, { error: "Lead not found" });
    }
    return sendJson(res, 200, lead);
  } catch (error) {
    console.error("Error updating lead status:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
