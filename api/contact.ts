import type { VercelRequest, VercelResponse } from "@vercel/node";
import { contactFormSchema, leads, type InsertLead } from "../shared/schema.js";
import { calculateScoring } from "../server/scoring.js";
import { withDb } from "../shared/db.js";
import { readJsonBody, sendJson, methodNotAllowed } from "../serverless/http.js";
import { sendContactToTelegram } from "../serverless/telegram.js";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";

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
    const body = await readJsonBody(req);
    const parseResult = contactFormSchema.safeParse(body);

    if (!parseResult.success) {
      return sendJson(res, 400, {
        error: "Validation error",
        message: parseResult.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    const { name, email, message } = parseResult.data;
    const scoring = calculateScoring({ type: "contact", message });

    let leadId: string | null = null;
    try {
      // Use on-demand database connection
      const lead = await withDb(async (db) => {
        const insertData: InsertLead = {
          type: "contact",
          status: "new",
          scoring,
          name,
          email,
          message,
        };

        const [created] = await db
          .insert(leads)
          .values({ id: randomUUID(), ...insertData })
          .returning();

        return created;
      });

      leadId = lead.id;
    } catch (error) {
      console.error("Failed to store contact lead:", error);
      // Continue even if DB fails - Telegram notification is more important
    }

    // Send to Telegram
    const telegramResult = await sendContactToTelegram({
      name,
      email,
      message,
      scoring,
    });

    console.info("[api] sent_to_admin", {
      type: "contact",
      sent_to_admin: telegramResult.ok,
      reason: telegramResult.reason || null,
    });

    return sendJson(res, 201, {
      success: true,
      message: "Сообщение успешно отправлено",
      id: leadId,
      sentToAdmin: telegramResult.ok,
    });
  } catch (error) {
    console.error("Error creating contact message:", error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Не удалось отправить сообщение",
    });
  }
}
