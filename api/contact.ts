import type { VercelRequest, VercelResponse } from "@vercel/node";
import { contactFormSchema, leads, type InsertLead } from "../shared/schema.js";
import { withDb } from "../shared/db.js";
import { randomUUID } from "crypto";

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
 * Simple scoring calculation for contact messages
 */
function calculateScoring(message: string): "A" | "B" | "C" {
  const length = message.length;
  if (length > 200) return "B";
  if (length > 50) return "B";
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
    const body = await parseJsonBody(req);
    const parseResult = contactFormSchema.safeParse(body);

    if (!parseResult.success) {
      return sendJson(res, 400, {
        error: "Validation error",
        message: parseResult.error.issues.map((issue) => issue.message).join("; "),
      });
    }

    const { name, email, message } = parseResult.data;
    const scoring = calculateScoring(message);

    // Save to database using on-demand connection
    let leadId: string | null = null;
    try {
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
      // Continue even if DB fails
    }

    return sendJson(res, 201, {
      success: true,
      message: "Сообщение успешно отправлено",
      id: leadId,
    });
  } catch (error) {
    console.error("Error creating contact message:", error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Не удалось отправить сообщение",
    });
  }
}
