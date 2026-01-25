import type { VercelRequest, VercelResponse } from "@vercel/node";
import { estimationRequestSchema, leads, type InsertLead } from "../shared/schema.js";
import { withDb } from "../shared/db.js";
import { randomUUID } from "crypto";

type EstimationPayload = {
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
};

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

/**
 * Simple scoring calculation for estimation requests
 */
function calculateScoring(data: {
  budget?: string;
  projectType?: string;
  urgency?: string;
  features?: string[];
  description?: string;
}): "A" | "B" | "C" {
  let score = 0;

  // Budget scoring
  if (data.budget) {
    const budget = data.budget.toLowerCase();
    if (budget.includes("500") || budget.includes("1000") || budget.includes("млн")) {
      score += 3;
    } else if (budget.includes("300") || budget.includes("200") || budget.includes("150")) {
      score += 2;
    } else if (budget.includes("100") || budget.includes("50")) {
      score += 1;
    }
  }

  // Project type scoring
  if (data.projectType) {
    const highValue = ["saas", "webapp", "ecommerce"];
    const mediumValue = ["website", "telegram-bot"];
    if (highValue.includes(data.projectType)) score += 2;
    else if (mediumValue.includes(data.projectType)) score += 1;
  }

  // Urgency scoring
  if (data.urgency === "urgent") score += 2;
  else if (data.urgency === "standard") score += 1;

  // Features scoring
  const featureCount = data.features?.length || 0;
  if (featureCount >= 4) score += 2;
  else if (featureCount >= 2) score += 1;

  // Description scoring
  const descLength = data.description?.length || 0;
  if (descLength > 200) score += 2;
  else if (descLength > 50) score += 1;

  if (score >= 7) return "A";
  if (score >= 4) return "B";
  return "C";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.status(200)
      .setHeader("Access-Control-Allow-Origin", "*")
      .setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
      .setHeader("Access-Control-Allow-Headers", "Content-Type")
      .end();
    return;
  }

  // Only allow POST
  if (req.method !== "POST") {
    res.status(405)
      .setHeader("Allow", "POST")
      .setHeader("Access-Control-Allow-Origin", "*")
      .end();
    return;
  }

  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  try {
    const body = await parseJsonBody<Record<string, unknown>>(req);
    if (!body) {
      return sendJson(res, 400, {
        error: "Validation error",
        message: "Request body is required",
      });
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
      budget: data.budget,
      projectType: data.projectType,
      urgency: data.urgency,
      features: data.features,
      description: data.description,
    });

    // Save to database using on-demand connection
    let leadId: string | null = null;
    try {
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
      // Continue even if DB fails
    }

    return sendJson(res, 201, {
      success: true,
      message: "Заявка успешно отправлена",
      id: leadId,
    });
  } catch (error) {
    console.error("Error processing estimation request:", error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Не удалось отправить заявку",
    });
  }
}
