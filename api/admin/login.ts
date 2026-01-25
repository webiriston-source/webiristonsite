import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withDb } from "../../shared/db.js";
import { users } from "../../shared/schema.js";
import { readJsonBody, sendJson, methodNotAllowed } from "../../serverless/http.js";
import { createAdminSessionToken, setAdminSessionCookie } from "../../serverless/auth.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    return sendJson(res, 500, { error: "Сервер не настроен для авторизации" });
  }

  try {
    const body = await readJsonBody<{ login?: string; password?: string }>(req);
    if (!body?.login || !body?.password) {
      return sendJson(res, 400, { error: "Validation error", message: "Login and password required" });
    }

    const { login, password } = body;

    // Find user in database
    const user = await withDb(async (db) => {
      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.username, login))
        .limit(1);

      return found || null;
    });

    if (!user) {
      console.warn("[api] admin_login_failed", { login, reason: "user_not_found" });
      return sendJson(res, 401, { error: "Неверный логин или пароль" });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn("[api] admin_login_failed", { login, reason: "invalid_password" });
      return sendJson(res, 401, { error: "Неверный логин или пароль" });
    }

    console.info("[api] admin_login_success", { login, userId: user.id });

    // Create session token and set cookie
    const token = createAdminSessionToken(sessionSecret);
    setAdminSessionCookie(res, token);
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("Error during login:", error);
    return sendJson(res, 500, { error: "Internal server error" });
  }
}
