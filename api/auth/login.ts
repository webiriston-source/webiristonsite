import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withDb } from "../../shared/db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * Parse JSON body from request
 */
async function parseJsonBody<T>(req: VercelRequest): Promise<T | null> {
  try {
    if (req.body) {
      return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    let raw = "";
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      raw += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Send JSON response
 */
function sendJson(res: VercelResponse, status: number, data: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    res.status(405).setHeader("Allow", "POST");
    res.end();
    return;
  }

  try {
    const body = await parseJsonBody<{ login?: string; password?: string }>(req);

    if (!body?.login || !body?.password) {
      return sendJson(res, 400, {
        error: "Validation error",
        message: "Login and password are required",
      });
    }

    const { login, password } = body;

    // Find user in database using on-demand connection
    const user = await withDb(async (db) => {
      const [found] = await db
        .select()
        .from(users)
        .where(eq(users.username, login))
        .limit(1);

      return found || null;
    });

    if (!user) {
      console.warn("[api] login_failed", { login, reason: "user_not_found" });
      return sendJson(res, 401, {
        error: "Неверный логин или пароль",
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn("[api] login_failed", { login, reason: "invalid_password" });
      return sendJson(res, 401, {
        error: "Неверный логин или пароль",
      });
    }

    console.info("[api] login_success", { login, userId: user.id });

    // Return simple JSON response (no sessions, JWT, or cookies)
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
