import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../server/storage";
import { methodNotAllowed, readJsonBody, sendJson } from "../serverless/http";
import { requireAdmin } from "../serverless/requireAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    try {
      const projects = await storage.getProjects();
      return sendJson(res, 200, projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "POST") {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody<Record<string, unknown>>(req);
    if (!body) {
      return sendJson(res, 400, { error: "Project payload is required" });
    }

    try {
      const project = await storage.createProject(body as any);
      return sendJson(res, 201, project);
    } catch (error) {
      console.error("Error creating project:", error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "POST"]);
}
