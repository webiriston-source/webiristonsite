import type { VercelRequest, VercelResponse } from "@vercel/node";
import { contactFormSchema } from "../shared/schema.ts";
import { calculateScoring } from "../server/scoring.ts";
import { storage } from "../server/storage.ts";
import { readJsonBody, sendJson, methodNotAllowed } from "../serverless/http.ts";
import { sendContactToTelegram } from "../serverless/telegram.ts";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

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
      const lead = await storage.createLead({
        type: "contact",
        status: "new",
        scoring,
        name,
        email,
        message,
      });
      leadId = lead.id;
    } catch (error) {
      console.error("Failed to store contact lead:", error);
    }

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
