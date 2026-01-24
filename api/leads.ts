import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../server/storage.ts";
import { methodNotAllowed, sendJson } from "../serverless/http.ts";
import { requireAdmin } from "../serverless/requireAdmin.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  if (!requireAdmin(req, res)) return;

  try {
    const { type, status, scoring, startDate, endDate } = req.query;
    const filters: Record<string, unknown> = {};
    if (type) filters.type = type as string;
    if (status) filters.status = status as string;
    if (scoring) filters.scoring = scoring as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const leads = await storage.getLeads(filters);
    return sendJson(res, 200, leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
