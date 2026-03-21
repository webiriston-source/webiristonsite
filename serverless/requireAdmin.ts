import type { VercelRequest, VercelResponse } from "../shared/vercel-types";
import { sendJson } from "./http";
import { getAdminSession } from "./auth";

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  const session = getAdminSession(req, sessionSecret);
  if (!session?.isAdmin) {
    sendJson(res, 401, { error: "Unauthorized" });
    return false;
  }

  return true;
}
