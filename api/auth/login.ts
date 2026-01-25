import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withDb } from "../../shared/db.js";
import { users } from "../../shared/schema.js";
import { readJsonBody, sendJson, methodNotAllowed } from "../../serverless/http.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * CORS headers helper
 */
function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    setCorsHeaders(res);
    return methodNotAllowed(res, ["POST"]);
  }

  setCorsHeaders(res);

  try {
    const body = await readJsonBody<{ login?: string; password?: string }>(req);

    if (!body?.login || !body?.password) {
      return sendJson(res, 400, {
        error: "Validation error",
        message: "Login and password are required",
      });
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
      return sendJson(res, 401, {
        error: "Неверный логин или пароль",
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn("[api] admin_login_failed", { login, reason: "invalid_password" });
      return sendJson(res, 401, {
        error: "Неверный логин или пароль",
      });
    }

    console.info("[api] admin_login_success", { login, userId: user.id });

    // Return simple JSON response (no JWT or sessions as requested)
    return sendJson(res, 200, {
      success: true,
      message: "Вход выполнен успешно",
    });
  } catch (error) {
    console.error("Error during login:", error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Произошла ошибка при входе",
    });
  }
}
