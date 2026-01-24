import type { VercelRequest, VercelResponse } from "@vercel/node";
import { estimationRequestSchema } from "../shared/schema";
import { calculateScoring } from "../server/scoring";
import { storage } from "../server/storage";
import { readJsonBody, sendJson, methodNotAllowed } from "../serverless/http";
import { sendEstimateToTelegram } from "../serverless/telegram";

type EstimationPayload = {
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return methodNotAllowed(res, ["POST"]);
  }

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
      const lead = await storage.createLead({
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
      });
      leadId = lead.id;
    } catch (error) {
      console.error("Failed to store estimation lead:", error);
    }

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
