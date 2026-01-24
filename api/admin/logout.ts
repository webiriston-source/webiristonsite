import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, methodNotAllowed } from "../../serverless/http";
import { clearAdminSessionCookie } from "../../serverless/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  clearAdminSessionCookie(res);
  return sendJson(res, 200, { success: true });
}
