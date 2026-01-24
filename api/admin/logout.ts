import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, methodNotAllowed } from "../../serverless/http.ts";
import { clearAdminSessionCookie } from "../../serverless/auth.ts";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  clearAdminSessionCookie(res);
  return sendJson(res, 200, { success: true });
}
