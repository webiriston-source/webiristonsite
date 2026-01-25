import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withDb } from "../shared/db.js";
import {
  users,
  leads,
  contactFormSchema,
  estimationRequestSchema,
  type InsertLead,
} from "../shared/schema.js";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { sendContactToTelegram, sendEstimateToTelegram } from "../serverless/telegram.js";

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
 * Set CORS headers
 */
function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Simple scoring calculation for contact messages
 */
function calculateContactScoring(message: string): "A" | "B" | "C" {
  const length = message.length;
  if (length > 200) return "B";
  if (length > 50) return "B";
  return "C";
}

/**
 * Simple scoring calculation for estimation requests
 */
function calculateEstimationScoring(data: {
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

/**
 * Handle contact form submission
 */
async function handleContact(
  body: unknown,
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; id: string } | { error: string; message: string }> {
  const parseResult = contactFormSchema.safeParse(body);

  if (!parseResult.success) {
    return {
      error: "Validation error",
      message: parseResult.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const { name, email, message } = parseResult.data;
  const scoring = calculateContactScoring(message);

  try {
    const lead = await db
      .insert(leads)
      .values({
        id: randomUUID(),
        type: "contact",
        status: "new",
        scoring,
        name,
        email,
        message,
      })
      .returning();

    // Send Telegram notification (non-blocking)
    sendContactToTelegram({
      name,
      email,
      message,
      scoring,
    }).catch((error) => {
      console.error("Failed to send Telegram notification:", error);
    });

    return { success: true, id: lead[0].id };
  } catch (error) {
    console.error("Failed to store contact lead:", error);
    return {
      error: "Database error",
      message: "Не удалось сохранить сообщение",
    };
  }
}

/**
 * Handle estimation request
 */
async function handleEstimate(
  body: unknown,
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; id: string } | { error: string; message: string }> {
  const parsedBody = body as Record<string, unknown>;
  const { estimation, ...requestData } = parsedBody as {
    estimation?: {
      minPrice: number;
      maxPrice: number;
      minDays: number;
      maxDays: number;
    };
  };

  const parseResult = estimationRequestSchema.safeParse(requestData);

  if (!parseResult.success) {
    return {
      error: "Validation error",
      message: parseResult.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  if (!estimation || typeof estimation.minPrice !== "number" || typeof estimation.maxPrice !== "number") {
    return {
      error: "Validation error",
      message: "Estimation data is required",
    };
  }

  const data = parseResult.data;
  const scoring = calculateEstimationScoring({
    budget: data.budget,
    projectType: data.projectType,
    urgency: data.urgency,
    features: data.features,
    description: data.description,
  });

  try {
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

    const lead = await db
      .insert(leads)
      .values({ id: randomUUID(), ...insertData })
      .returning();

    // Send Telegram notification (non-blocking)
    sendEstimateToTelegram({
      name: data.contactName,
      email: data.contactEmail,
      telegram: data.contactTelegram || undefined,
      projectType: data.projectType,
      features: data.features,
      designComplexity: data.designComplexity,
      urgency: data.urgency,
      budget: data.budget || undefined,
      description: data.description || undefined,
      scoring,
      estimation: {
        minPrice: estimation.minPrice,
        maxPrice: estimation.maxPrice,
        minDays: estimation.minDays,
        maxDays: estimation.maxDays,
      },
    }).catch((error) => {
      console.error("Failed to send Telegram notification:", error);
    });

    return { success: true, id: lead[0].id };
  } catch (error) {
    console.error("Failed to store estimation lead:", error);
    return {
      error: "Database error",
      message: "Не удалось сохранить заявку",
    };
  }
}

/**
 * Handle admin login
 */
async function handleLogin(
  body: unknown,
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; token: string } | { error: string; message: string }> {
  const parsedBody = body as { login?: string; password?: string };

  if (!parsedBody?.login || !parsedBody?.password) {
    return {
      error: "Validation error",
      message: "Login and password are required",
    };
  }

  const { login, password } = parsedBody;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, login))
      .limit(1);

    if (!user) {
      console.warn("[api] login_failed", { login, reason: "user_not_found" });
      return {
        error: "Authentication error",
        message: "Неверный логин или пароль",
      };
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.warn("[api] login_failed", { login, reason: "invalid_password" });
      return {
        error: "Authentication error",
        message: "Неверный логин или пароль",
      };
    }

    console.info("[api] login_success", { login, userId: user.id });

    // Generate simple token: base64(userId:timestamp)
    const timestamp = Date.now();
    const tokenData = `${user.id}:${timestamp}`;
    const token = Buffer.from(tokenData).toString("base64");

    return { success: true, token };
  } catch (error) {
    console.error("Error during login:", error);
    return {
      error: "Database error",
      message: "Произошла ошибка при входе",
    };
  }
}

/**
 * Handle get contacts (GET request)
 */
async function handleGetContacts(
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const contacts = await db
      .select()
      .from(leads)
      .where(eq(leads.type, "contact"))
      .orderBy(desc(leads.createdAt));

    return { success: true, data: contacts };
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список контактов",
    };
  }
}

/**
 * Handle get estimates (GET request)
 */
async function handleGetEstimates(
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const estimates = await db
      .select()
      .from(leads)
      .where(eq(leads.type, "estimation"))
      .orderBy(desc(leads.createdAt));

    return { success: true, data: estimates };
  } catch (error) {
    console.error("Failed to fetch estimates:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список оценок",
    };
  }
}

/**
 * Handle get all requests (GET request) - combines contacts and estimates
 */
async function handleGetRequests(
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const allLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt));

    return { success: true, data: allLeads };
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список заявок",
    };
  }
}

/**
 * Handle get analytics (GET request)
 */
async function handleGetAnalytics(
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true; data: unknown } | { error: string; message: string }> {
  try {
    const allLeads = await db.select().from(leads);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = allLeads.filter((lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= thisMonthStart;
    });

    const lastMonth = allLeads.filter((lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= lastMonthStart && leadDate <= lastMonthEnd;
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScoring: Record<string, number> = {};

    allLeads.forEach((lead) => {
      byType[lead.type] = (byType[lead.type] || 0) + 1;
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      byScoring[lead.scoring] = (byScoring[lead.scoring] || 0) + 1;
    });

    // Calculate average price for estimates
    const estimates = allLeads.filter((lead) => lead.type === "estimation" && lead.estimatedMinPrice && lead.estimatedMaxPrice);
    const avgMinPrice = estimates.length > 0
      ? Math.round(estimates.reduce((sum, lead) => sum + (lead.estimatedMinPrice || 0), 0) / estimates.length)
      : 0;
    const avgMaxPrice = estimates.length > 0
      ? Math.round(estimates.reduce((sum, lead) => sum + (lead.estimatedMaxPrice || 0), 0) / estimates.length)
      : 0;

    // Most popular project types
    const projectTypeCounts: Record<string, number> = {};
    allLeads.forEach((lead) => {
      if (lead.projectType) {
        projectTypeCounts[lead.projectType] = (projectTypeCounts[lead.projectType] || 0) + 1;
      }
    });

    const analytics = {
      total: allLeads.length,
      byType,
      byStatus,
      byScoring,
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      avgMinPrice,
      avgMaxPrice,
      projectTypeCounts,
    };

    return { success: true, data: analytics };
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return {
      error: "Database error",
      message: "Не удалось получить аналитику",
    };
  }
}

/**
 * Handle update lead status (PATCH request)
 */
async function handleUpdateLeadStatus(
  body: unknown,
  db: ReturnType<typeof import("drizzle-orm").drizzle>
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as { id?: string; status?: string };

  if (!parsedBody?.id || !parsedBody?.status) {
    return {
      error: "Validation error",
      message: "id and status are required",
    };
  }

  const validStatuses = ["new", "in_progress", "closed"];
  if (!validStatuses.includes(parsedBody.status)) {
    return {
      error: "Validation error",
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    };
  }

  try {
    await db
      .update(leads)
      .set({ status: parsedBody.status, updatedAt: new Date() })
      .where(eq(leads.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to update lead status:", error);
    return {
      error: "Database error",
      message: "Не удалось обновить статус заявки",
    };
  }
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.status(200).end();
    return;
  }

  // Allow GET, POST, and PATCH
  if (req.method !== "POST" && req.method !== "GET" && req.method !== "PATCH") {
    setCorsHeaders(res);
    res.status(405).setHeader("Allow", "GET, POST, PATCH").end();
    return;
  }

  setCorsHeaders(res);

  // Get action from query parameter
  let action: string | null = null;
  
  // Try req.query first (Vercel may parse it automatically)
  if (req.query?.action && typeof req.query.action === "string") {
    action = req.query.action;
  } else if (req.url) {
    // Parse from URL manually
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      action = url.searchParams.get("action");
    } catch {
      // Fallback: try to extract from query string directly
      const match = req.url.match(/[?&]action=([^&]+)/);
      action = match ? decodeURIComponent(match[1]) : null;
    }
  }

  if (!action || typeof action !== "string") {
    return sendJson(res, 400, {
      error: "Missing action",
      message: "Query parameter 'action' is required. Valid actions: contact, estimate, login, getContacts, getEstimates, getRequests, getAnalytics, updateLeadStatus",
    });
  }

  try {
    // Handle GET requests (getContacts, getEstimates)
    if (req.method === "GET") {
      let result: { success: true; data: unknown[] } | { error: string; message: string };

      switch (action) {
        case "getContacts": {
          result = await withDb(async (db) => handleGetContacts(db));
          break;
        }
        case "getEstimates": {
          result = await withDb(async (db) => handleGetEstimates(db));
          break;
        }
        case "getRequests": {
          result = await withDb(async (db) => handleGetRequests(db));
          break;
        }
        case "getAnalytics": {
          result = await withDb(async (db) => handleGetAnalytics(db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown GET action: ${action}. Valid GET actions: getContacts, getEstimates, getRequests, getAnalytics`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, result.data);
      } else {
        const status = result.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, result);
      }
    }

    // Handle PATCH requests (updateLeadStatus)
    if (req.method === "PATCH") {
      const body = await parseJsonBody(req);
      let result: { success: true } | { error: string; message: string };

      switch (action) {
        case "updateLeadStatus": {
          result = await withDb(async (db) => handleUpdateLeadStatus(body, db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown PATCH action: ${action}. Valid PATCH actions: updateLeadStatus`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, { success: true });
      } else {
        const status = result.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, result);
      }
    }

    // Handle POST requests (contact, estimate, login)
    const body = await parseJsonBody(req);

    // Route to appropriate handler using on-demand DB connection
    let result: { success: true; id?: string; token?: string } | { error: string; message: string };

    switch (action) {
      case "contact": {
        result = await withDb(async (db) => handleContact(body, db));
        break;
      }
      case "estimate": {
        result = await withDb(async (db) => handleEstimate(body, db));
        break;
      }
      case "login": {
        result = await withDb(async (db) => handleLogin(body, db));
        break;
      }
      default: {
        return sendJson(res, 400, {
          error: "Invalid action",
          message: `Unknown POST action: ${action}. Valid POST actions: contact, estimate, login`,
        });
      }
    }

    // Send response
    if ("success" in result && result.success) {
      if (action === "contact" || action === "estimate") {
        return sendJson(res, 201, {
          success: true,
          message: action === "contact" ? "Сообщение успешно отправлено" : "Заявка успешно отправлена",
          id: result.id,
        });
      } else {
        // Login action - return token
        return sendJson(res, 200, {
          success: true,
          message: "Вход выполнен успешно",
          token: result.token,
        });
      }
    } else {
      const status = result.error === "Validation error" ? 400 : result.error === "Authentication error" ? 401 : 500;
      return sendJson(res, status, result);
    }
  } catch (error) {
    console.error(`Error handling action '${action}':`, error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Произошла ошибка при обработке запроса",
    });
  }
}
