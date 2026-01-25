import type { VercelRequest, VercelResponse } from "@vercel/node";
import { estimationRequestSchema, leads, type InsertLead } from "../shared/schema.js";
import { calculateScoring } from "../server/scoring.js";
import { withDb } from "../shared/db.js";
import { readJsonBody, sendJson, methodNotAllowed } from "../serverless/http.js";
import { sendEstimateToTelegram } from "../serverless/telegram.js";
import { randomUUID } from "crypto";

type EstimationPayload = {
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
};

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
    const body = await readJsonBody<Record<string, unknown>>(req);
    if (!body) {
      return sendJson(res, 400, { error: "Validation error", message: "Request body is required" });
    }

    const { estimation, ...requestData } = body as { estimation?: EstimationPayload };
    const parseResult = estimationRequestSchema.safeParse(requestData);

    if (!parseResult.success) {
      return sendJson(res, 400, {
        error: "Validation error",
        message: parseResult.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    if (!estimation || typeof estimation.minPrice !== "number" || typeof estimation.maxPrice !== "number") {
      return sendJson(res, 400, {
        error: "Validation error",
        message: "Estimation data is required",
      });
    }

    const data = parseResult.data;
    const scoring = calculateScoring({
      type: "estimation",
      budget: data.budget,
      projectType: data.projectType,
      urgency: data.urgency,
      features: data.features,
      description: data.description,
    });

    let leadId: string | null = null;
    try {
      // Use on-demand database connection
      const lead = await withDb(async (db) => {
        const insertData: InsertLead = {
          type: "estimation",
          status: "new",
          scoring,
          name: data.contactName,
          email: data.contactEmail,
          telegram: data.contactTelegram || null,
          projectType: data.projectType,
          features: data.features,
          designComplexity: data.designComplexity,
          urgency: data.urgency,
          budget: data.budget || null,
          description: data.description || null,
          estimatedMinPrice: estimation.minPrice,
          estimatedMaxPrice: estimation.maxPrice,
          estimatedMinDays: estimation.minDays,
          estimatedMaxDays: estimation.maxDays,
        };

        const [created] = await db
          .insert(leads)
          .values({ id: randomUUID(), ...insertData })
          .returning();

        return created;
      });

      leadId = lead.id;
    } catch (error) {
      console.error("Failed to store estimation lead:", error);
      // Continue even if DB fails - Telegram notification is more important
    }

    // Send to Telegram
    const telegramResult = await sendEstimateToTelegram({
      name: data.contactName,
      email: data.contactEmail,
      telegram: data.contactTelegram,
      projectType: data.projectType,
      features: data.features,
      designComplexity: data.designComplexity,
      urgency: data.urgency,
      budget: data.budget,
      description: data.description,
      scoring,
      estimation,
    });

    console.info("[api] sent_to_admin", {
      type: "estimation",
      sent_to_admin: telegramResult.ok,
      reason: telegramResult.reason || null,
    });

    return sendJson(res, 201, {
      success: true,
      message: "Заявка успешно отправлена",
      id: leadId,
      sentToAdmin: telegramResult.ok,
    });
  } catch (error) {
    console.error("Error processing estimation request:", error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Не удалось отправить заявку",
    });
  }
}
