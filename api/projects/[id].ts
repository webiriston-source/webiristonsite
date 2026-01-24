import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";
import { methodNotAllowed, readJsonBody, sendJson } from "../../serverless/http";
import { requireAdmin } from "../../serverless/requireAdmin";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const projectId = req.query.id as string;
  if (!projectId) {
    return sendJson(res, 400, { error: "Project id is required" });
  }

  if (req.method === "GET") {
    if (!requireAdmin(req, res)) return;
    try {
      const project = await storage.getProject(projectId);
      if (!project) {
        return sendJson(res, 404, { error: "Project not found" });
      }
      return sendJson(res, 200, project);
    } catch (error) {
      console.error("Error fetching project:", error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "PATCH") {
    if (!requireAdmin(req, res)) return;
    const body = await readJsonBody<Record<string, unknown>>(req);
    if (!body) {
      return sendJson(res, 400, { error: "Project payload is required" });
    }

    try {
      const project = await storage.updateProject(projectId, body as any);
      if (!project) {
        return sendJson(res, 404, { error: "Project not found" });
      }
      return sendJson(res, 200, project);
    } catch (error) {
      console.error("Error updating project:", error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  if (req.method === "DELETE") {
    if (!requireAdmin(req, res)) return;
    try {
      const deleted = await storage.deleteProject(projectId);
      if (!deleted) {
        return sendJson(res, 404, { error: "Project not found" });
      }
      return sendJson(res, 200, { success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      return sendJson(res, 500, { error: "Internal server error" });
    }
  }

  return methodNotAllowed(res, ["GET", "PATCH", "DELETE"]);
}
