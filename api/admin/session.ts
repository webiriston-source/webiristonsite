import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson, methodNotAllowed } from "../../serverless/http";
import { getAdminSession } from "../../serverless/auth";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return methodNotAllowed(res, ["GET"]);
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return sendJson(res, 200, { isAdmin: false });
  }

  const session = getAdminSession(req, sessionSecret);
  return sendJson(res, 200, { isAdmin: Boolean(session?.isAdmin) });
}
