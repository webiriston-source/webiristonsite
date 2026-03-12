import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withDb } from "../shared/db";
import {
  users,
  leads,
  projects,
  contactFormSchema,
  estimationRequestSchema,
  type InsertLead,
  type InsertProject,
} from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
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
  db: any
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
  db: any
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
  db: any
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
  db: any
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
  db: any
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
  db: any
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
 * Handle get projects (GET request)
 */
async function handleGetProjects(
  db: any
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));

    return { success: true, data: allProjects };
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список проектов",
    };
  }
}

/**
 * Handle get analytics (GET request)
 */
import type { Lead } from "../shared/schema";

async function handleGetAnalytics(
  db: any
): Promise<{ success: true; data: unknown } | { error: string; message: string }> {
  try {
    const allLeads = (await (db as any).select().from(leads)) as Lead[];

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = allLeads.filter((lead: Lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= thisMonthStart;
    });

    const lastMonth = allLeads.filter((lead: Lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= lastMonthStart && leadDate <= lastMonthEnd;
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScoring: Record<string, number> = {};

    allLeads.forEach((lead: Lead) => {
      byType[lead.type] = (byType[lead.type] || 0) + 1;
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      byScoring[lead.scoring] = (byScoring[lead.scoring] || 0) + 1;
    });

    // Calculate average price for estimates
    const estimates = allLeads.filter(
      (lead: Lead) => lead.type === "estimation" && lead.estimatedMinPrice && lead.estimatedMaxPrice
    );
    const avgMinPrice =
      estimates.length > 0
        ? Math.round(
            estimates.reduce((sum: number, lead: Lead) => sum + (lead.estimatedMinPrice || 0), 0) / estimates.length
          )
        : 0;
    const avgMaxPrice =
      estimates.length > 0
        ? Math.round(
            estimates.reduce((sum: number, lead: Lead) => sum + (lead.estimatedMaxPrice || 0), 0) / estimates.length
          )
        : 0;

    // Most popular project types
    const projectTypeCounts: Record<string, number> = {};
    allLeads.forEach((lead: Lead) => {
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
  db: any
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
 * Handle get unread count (GET request)
 */
async function handleGetUnreadCount(
  db: any
): Promise<{ success: true; count: number } | { error: string; message: string }> {
  try {
    const unreadLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.status, "new"));

    return { success: true, count: unreadLeads.length };
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
    return {
      error: "Database error",
      message: "Не удалось получить количество непрочитанных заявок",
    };
  }
}

/**
 * Handle mark as read (PATCH request)
 */
async function handleMarkAsRead(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as { id?: string };

  if (!parsedBody?.id) {
    return {
      error: "Validation error",
      message: "id is required",
    };
  }

  try {
    // Mark as in_progress if it's new
    await db
      .update(leads)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(leads.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return {
      error: "Database error",
      message: "Не удалось отметить заявку как прочитанную",
    };
  }
}

/**
 * Handle add project (POST request)
 */
async function handleAddProject(
  body: unknown,
  db: any
): Promise<{ success: true; id: string } | { error: string; message: string }> {
  const parsedBody = body as {
    title?: string;
    description?: string;
    fullDescription?: string;
    image?: string;
    technologies?: string[];
    liveUrl?: string;
    problems?: string;
    solutions?: string;
  };

  if (!parsedBody?.title || !parsedBody?.description || !parsedBody?.fullDescription || !parsedBody?.image) {
    return {
      error: "Validation error",
      message: "title, description, fullDescription, and image are required",
    };
  }

  try {
    const project = await db
      .insert(projects)
      .values({
        id: randomUUID(),
        title: parsedBody.title,
        description: parsedBody.description,
        fullDescription: parsedBody.fullDescription,
        image: parsedBody.image,
        technologies: parsedBody.technologies || [],
        liveUrl: parsedBody.liveUrl || null,
        problems: parsedBody.problems || null,
        solutions: parsedBody.solutions || null,
        sortOrder: 0,
        isVisible: "true",
      })
      .returning();

    return { success: true, id: project[0].id };
  } catch (error) {
    console.error("Failed to add project:", error);
    return {
      error: "Database error",
      message: "Не удалось добавить проект",
    };
  }
}

/**
 * Handle update project (PATCH request)
 */
async function handleUpdateProject(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as {
    id?: string;
    title?: string;
    description?: string;
    fullDescription?: string;
    image?: string;
    technologies?: string[];
    liveUrl?: string;
    problems?: string;
    solutions?: string;
  };

  if (!parsedBody?.id) {
    return {
      error: "Validation error",
      message: "id is required",
    };
  }

  try {
    const updateData: Partial<InsertProject> = {};
    if (parsedBody.title) updateData.title = parsedBody.title;
    if (parsedBody.description) updateData.description = parsedBody.description;
    if (parsedBody.fullDescription) updateData.fullDescription = parsedBody.fullDescription;
    if (parsedBody.image) updateData.image = parsedBody.image;
    if (parsedBody.technologies) updateData.technologies = parsedBody.technologies;
    if (parsedBody.liveUrl !== undefined) updateData.liveUrl = parsedBody.liveUrl || null;
    if (parsedBody.problems !== undefined) updateData.problems = parsedBody.problems || null;
    if (parsedBody.solutions !== undefined) updateData.solutions = parsedBody.solutions || null;

    await db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to update project:", error);
    return {
      error: "Database error",
      message: "Не удалось обновить проект",
    };
  }
}

/**
 * Handle delete project (DELETE request via PATCH)
 */
async function handleDeleteProject(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as { id?: string };

  if (!parsedBody?.id) {
    return {
      error: "Validation error",
      message: "id is required",
    };
  }

  try {
    await db
      .delete(projects)
      .where(eq(projects.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return {
      error: "Database error",
      message: "Не удалось удалить проект",
    };
  }
}

/**
 * Handle upload image (POST request with base64 encoded image)
 * Accepts JSON body: { image: "data:image/png;base64,..." } or { image: "base64string" }
 */
async function handleUploadImage(
  body: unknown
): Promise<{ success: true; url: string } | { error: string; message: string; statusCode?: number }> {
  console.log("[uploadImage] Starting image upload handler");
  
  // CRITICAL: Check BLOB token availability at the start for debugging
  // Use ONLY BLOB_READ_WRITE_TOKEN (not VERCEL_BLOB_READ_WRITE_TOKEN)
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Explicit logging as requested
  console.log("[uploadImage] BLOB token present:", !!blobToken);
  console.log("[uploadImage] BLOB_READ_WRITE_TOKEN value:", blobToken ? `${blobToken.substring(0, 10)}...` : "true");
  
  // Log all environment variables that contain "BLOB" or "VERCEL" for debugging
  const blobRelatedVars = Object.keys(process.env).filter(
    (k) => k.includes("BLOB") || k.includes("VERCEL")
  );
  console.log("[uploadImage] All BLOB/VERCEL related env vars:", blobRelatedVars);
  
  // Log all process.env keys to see what's available (for debugging only)
  const allEnvKeys = Object.keys(process.env).sort();
  console.log("[uploadImage] Total env vars count:", allEnvKeys.length);
  console.log("[uploadImage] Sample env vars (first 20):", allEnvKeys.slice(0, 20));
  
  // Check if BLOB_READ_WRITE_TOKEN exists (must be exact name, not VERCEL_BLOB_READ_WRITE_TOKEN)
  if (!blobToken) {
    console.error("[uploadImage] BLOB_READ_WRITE_TOKEN is not set in environment variables");
    console.error("[uploadImage] Available env vars with BLOB/VERCEL:", blobRelatedVars);
    console.error("[uploadImage] NOTE: Variable must be named exactly 'BLOB_READ_WRITE_TOKEN' (not 'VERCEL_BLOB_READ_WRITE_TOKEN')");
    return {
      error: "Configuration error",
      message: "BLOB_READ_WRITE_TOKEN is missing. Please add it to Vercel environment variables with the exact name 'BLOB_READ_WRITE_TOKEN' (not 'VERCEL_BLOB_READ_WRITE_TOKEN') and redeploy. Check that it's set for Production/Preview environments.",
      statusCode: 500,
    };
  }
  
  console.log("[uploadImage] Using token: BLOB_READ_WRITE_TOKEN");
  console.log("[uploadImage] Token length:", blobToken.length, "chars");
  console.log("[uploadImage] Token preview:", `${blobToken.substring(0, 15)}...${blobToken.substring(blobToken.length - 5)}`);
  
  try {
    const parsedBody = body as { image?: string };

    // Validate that image is provided
    if (!parsedBody?.image || typeof parsedBody.image !== "string") {
      console.error("[uploadImage] Validation failed: image field missing or invalid");
      console.error("[uploadImage] Received body:", JSON.stringify(parsedBody).substring(0, 200));
      return {
        error: "Validation error",
        message: "Image data is required. Expected: { image: 'data:image/png;base64,...' }",
        statusCode: 400,
      };
    }

    console.log("[uploadImage] Image data received, length:", parsedBody.image.length);

    let base64Data: string;
    let fileContentType = "image/jpeg"; // Default

    // Parse data URL format: "data:image/png;base64,iVBORw0KGgo..."
    if (parsedBody.image.includes(",")) {
      const [header, data] = parsedBody.image.split(",");
      base64Data = data;

      // Extract content type from header: "data:image/png;base64"
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        fileContentType = mimeMatch[1];
      }
      console.log("[uploadImage] Parsed data URL, content type:", fileContentType);
    } else {
      // Assume it's raw base64 string
      base64Data = parsedBody.image;
      console.log("[uploadImage] Raw base64 string detected, using default content type:", fileContentType);
    }

    // Validate content type
    if (!fileContentType.startsWith("image/")) {
      console.error("[uploadImage] Invalid content type:", fileContentType);
      return {
        error: "Validation error",
        message: "File must be an image. Supported formats: image/jpeg, image/png, image/gif, image/webp",
        statusCode: 400,
      };
    }

    // Decode base64 to Buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(base64Data, "base64");
      console.log("[uploadImage] Base64 decoded successfully, buffer size:", fileBuffer.length, "bytes");
    } catch (decodeError) {
      console.error("[uploadImage] Failed to decode base64:", decodeError);
      if (decodeError instanceof Error) {
        console.error("[uploadImage] Decode error details:", decodeError.message, decodeError.stack);
      }
      return {
        error: "Validation error",
        message: "Invalid base64 image data",
        statusCode: 400,
      };
    }

    // Validate file size (max 4MB)
    if (fileBuffer.length > 4 * 1024 * 1024) {
      console.error("[uploadImage] File too large:", fileBuffer.length, "bytes");
      return {
        error: "File too large",
        message: `File size (${Math.round(fileBuffer.length / 1024)}KB) exceeds maximum allowed size of 4MB`,
        statusCode: 413,
      };
    }

    // Validate that buffer is not empty
    if (fileBuffer.length === 0) {
      console.error("[uploadImage] Empty buffer detected");
      return {
        error: "Validation error",
        message: "Image data is empty",
        statusCode: 400,
      };
    }

    // Generate unique filename with appropriate extension
    const extension = fileContentType.split("/")[1] || "jpg";
    const filename = `projects/${randomUUID()}.${extension}`;
    console.log("[uploadImage] Generated filename:", filename);

    // Upload to Vercel Blob
    // Explicitly pass token to ensure it's used correctly
    let blob;
    try {
      console.log("[uploadImage] Attempting to upload to Vercel Blob...");
      console.log("[uploadImage] Token available for upload:", !!blobToken);
      console.log("[uploadImage] Filename:", filename);
      console.log("[uploadImage] Buffer size:", fileBuffer.length, "bytes");
      console.log("[uploadImage] Content type:", fileContentType);
      
      // Explicitly pass token to put() function
      blob = await put(filename, fileBuffer, {
        access: "public",
        contentType: fileContentType,
        token: blobToken, // Explicitly pass token to ensure it's used
      });
      console.log("[uploadImage] Upload successful! URL:", blob.url);
    } catch (blobError) {
      console.error("[uploadImage] Failed to upload to Vercel Blob");
      console.error("[uploadImage] Error type:", blobError?.constructor?.name);
      console.error("[uploadImage] Error message:", blobError instanceof Error ? blobError.message : String(blobError));
      console.error("[uploadImage] Error stack:", blobError instanceof Error ? blobError.stack : "No stack trace");
      
      // Check if it's a token/authentication error
      if (blobError instanceof Error) {
        const errorMsg = blobError.message.toLowerCase();
        if (errorMsg.includes("token") || errorMsg.includes("unauthorized") || errorMsg.includes("forbidden") || errorMsg.includes("401") || errorMsg.includes("403")) {
          console.error("[uploadImage] Token authentication error detected");
          return {
            error: "Configuration error",
            message: "BLOB_READ_WRITE_TOKEN is invalid or expired. Please check Vercel environment variables and regenerate the token if needed.",
            statusCode: 500,
          };
        }
      }

      return {
        error: "Upload error",
        message: `Failed to upload image to storage: ${blobError instanceof Error ? blobError.message : "Unknown error"}`,
        statusCode: 500,
      };
    }

    console.log("[uploadImage] Upload completed successfully");
    return { success: true, url: blob.url };
  } catch (error) {
    console.error("[uploadImage] Unexpected error in upload handler");
    console.error("[uploadImage] Error type:", error?.constructor?.name);
    console.error("[uploadImage] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[uploadImage] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Provide detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      error: "Upload error",
      message: `Не удалось загрузить изображение: ${errorMessage}`,
      statusCode: 500,
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

  // Allow GET, POST, PATCH, and DELETE
  if (req.method !== "POST" && req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
    setCorsHeaders(res);
    res.status(405).setHeader("Allow", "GET, POST, PATCH, DELETE").end();
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
      message: "Query parameter 'action' is required. Valid actions: contact, estimate, login, getContacts, getEstimates, getRequests, getAnalytics, getUnreadCount, getProjects, updateLeadStatus, markAsRead, addProject, uploadImage",
    });
  }

  // Log request method and action for debugging
  console.log(`[API] ${req.method} request for action: ${action}`);
  
  // Log BLOB token availability at handler level for debugging
  if (action === "uploadImage") {
    console.log("[API] BLOB token present:", !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log("[API] BLOB_READ_WRITE_TOKEN exists:", typeof process.env.BLOB_READ_WRITE_TOKEN !== "undefined");
  }

  try {
    // Handle GET requests (getContacts, getEstimates)
    if (req.method === "GET") {
      let result: { success: true; data: unknown } | { error: string; message: string };

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
        case "getUnreadCount": {
          const countResult = await withDb(async (db) => handleGetUnreadCount(db));
          if ("success" in countResult && countResult.success) {
            return sendJson(res, 200, { count: countResult.count });
          } else {
            return sendJson(res, 500, countResult);
          }
        }
        case "getProjects": {
          result = await withDb(async (db) => handleGetProjects(db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown GET action: ${action}. Valid GET actions: getContacts, getEstimates, getRequests, getAnalytics, getUnreadCount, getProjects`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, result.data);
      } else {
        const errorResult = result as { error: string; message: string };
        const status = errorResult.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, errorResult);
      }
    }

    // Handle DELETE requests (deleteProject)
    if (req.method === "DELETE") {
      const body = await parseJsonBody(req);
      let result: { success: true } | { error: string; message: string };

      switch (action) {
        case "deleteProject": {
          result = await withDb(async (db) => handleDeleteProject(body, db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown DELETE action: ${action}. Valid DELETE actions: deleteProject`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, { success: true });
      } else {
        const errorResult = result as { error: string; message: string };
        const status = errorResult.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, errorResult);
      }
    }

    // Handle PATCH requests (updateLeadStatus, markAsRead, updateProject)
    if (req.method === "PATCH") {
      const body = await parseJsonBody(req);
      let result: { success: true } | { error: string; message: string };

      switch (action) {
        case "updateLeadStatus": {
          result = await withDb(async (db) => handleUpdateLeadStatus(body, db));
          break;
        }
        case "markAsRead": {
          result = await withDb(async (db) => handleMarkAsRead(body, db));
          break;
        }
        case "updateProject": {
          result = await withDb(async (db) => handleUpdateProject(body, db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown PATCH action: ${action}. Valid PATCH actions: updateLeadStatus, markAsRead, updateProject`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, { success: true });
      } else {
        const errorResult = result as { error: string; message: string };
        const status = errorResult.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, errorResult);
      }
    }

    // Handle POST requests (contact, estimate, login, addProject, uploadImage)
    const body = await parseJsonBody(req);

    // Special handling for uploadImage (base64 JSON)
    if (action === "uploadImage") {
      const uploadResult = await handleUploadImage(body);
      if ("success" in uploadResult && uploadResult.success) {
        return sendJson(res, 200, uploadResult);
      } else {
        const errorResult = uploadResult as { error: string; message: string; statusCode?: number };
        const statusCode = errorResult.statusCode || 400;
        return sendJson(res, statusCode, {
          error: errorResult.error,
          message: errorResult.message,
        });
      }
    }

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
      case "addProject": {
        result = await withDb(async (db) => handleAddProject(body, db));
        break;
      }
      default: {
        return sendJson(res, 400, {
          error: "Invalid action",
          message: `Unknown POST action: ${action}. Valid POST actions: contact, estimate, login, addProject, uploadImage`,
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
      } else if (action === "addProject") {
        return sendJson(res, 201, {
          success: true,
          message: "Проект успешно добавлен",
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
      const errorResult = result as { error: string; message: string };
      const status =
        errorResult.error === "Validation error" ? 400 : errorResult.error === "Authentication error" ? 401 : 500;
      return sendJson(res, status, errorResult);
    }
  } catch (error) {
    console.error(`Error handling action '${action}':`, error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Произошла ошибка при обработке запроса",
    });
  }
}
