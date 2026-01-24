import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readJsonBody, sendJson, methodNotAllowed } from "../../serverless/http";
import { createAdminSessionToken, setAdminSessionCookie } from "../../serverless/auth";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  const adminLogin = process.env.ADMIN_LOGIN;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminLogin || !adminPassword || !sessionSecret) {
    return sendJson(res, 500, { error: "Сервер не настроен для авторизации" });
  }

  try {
    const body = await readJsonBody<{ login?: string; password?: string }>(req);
    if (!body?.login || !body?.password) {
      return sendJson(res, 400, { error: "Validation error", message: "Login and password required" });
    }

    if (body.login !== adminLogin || body.password !== adminPassword) {
      return sendJson(res, 401, { error: "Неверный логин или пароль" });
    }

    const token = createAdminSessionToken(sessionSecret);
    setAdminSessionCookie(res, token);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("Error during login:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
