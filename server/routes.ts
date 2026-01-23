import type { Express } from "express";
import { storage } from "./storage.ts";
import { contactFormSchema, estimationRequestSchema } from "../shared/schema.ts";
import { fromError } from "zod-validation-error";
import { calculateScoring, getScoringEmoji } from "./scoring.ts";

interface EstimationResult {
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
}

const projectTypeLabels: Record<string, string> = {
  landing: "Лендинг",
  website: "Корпоративный сайт",
  ecommerce: "Интернет-магазин",
  saas: "SaaS-платформа",
  webapp: "Веб-приложение",
  "telegram-bot": "Telegram-бот",
  other: "Другое",
};

const featureLabels: Record<string, string> = {
  auth: "Авторизация",
  admin: "Админ-панель",
  payment: "Онлайн-оплата",
  profile: "Личный кабинет",
  integrations: "Интеграции",
  multilang: "Мультиязычность",
};

const designLabels: Record<string, string> = {
  basic: "Базовый",
  modern: "Современный",
  premium: "Премиум + UX",
};

const urgencyLabels: Record<string, string> = {
  relaxed: "Не срочно",
  standard: "Стандарт",
  urgent: "Срочно",
};

const statusLabels: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  closed: "Закрыта",
};

function requireAdmin(req: any, res: any, next: any) {
  if (!req.session?.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

type TelegramSendResult = {
  ok: boolean;
  reason?: string;
};

async function sendToTelegram(
  type: "contact" | "estimation",
  data: {
    name: string;
    email: string;
    telegram?: string;
    message?: string;
    projectType?: string;
    features?: string[];
    designComplexity?: string;
    urgency?: string;
    budget?: string;
    description?: string;
  },
  scoring: string,
  estimation?: EstimationResult
): Promise<TelegramSendResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return { ok: false, reason: "missing_credentials" };
  }

  const now = new Date();
  const formattedDate = now.toLocaleString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow"
  });

  const scoringEmoji = getScoringEmoji(scoring as "A" | "B" | "C");
  let text = "";

  if (type === "contact") {
    text = `📩 Новое сообщение с сайта

${scoringEmoji} Scoring: ${scoring}

👤 Контакт:
Имя: ${data.name}
Email: ${data.email}${data.telegram ? `\nTelegram: ${data.telegram}` : ""}

💬 Сообщение:
${data.message}

📅 Дата: ${formattedDate}`;
  } else {
    const featuresText = data.features && data.features.length > 0
      ? data.features.map(f => featureLabels[f] || f).join(", ")
      : "Не выбраны";

    text = `📋 Новая заявка на оценку проекта

${scoringEmoji} Scoring: ${scoring}

👤 Контакт:
Имя: ${data.name}
Email: ${data.email}${data.telegram ? `\nTelegram: ${data.telegram}` : ""}

📦 Детали проекта:
Тип: ${projectTypeLabels[data.projectType || ""] || data.projectType}
Функции: ${featuresText}
Дизайн: ${designLabels[data.designComplexity || ""] || data.designComplexity}
Срочность: ${urgencyLabels[data.urgency || ""] || data.urgency}${data.budget ? `\nБюджет клиента: ${data.budget}` : ""}${data.description ? `\nОписание: ${data.description}` : ""}

💰 Автооценка:
Стоимость: ${formatPrice(estimation?.minPrice || 0)} — ${formatPrice(estimation?.maxPrice || 0)}
Сроки: ${estimation?.minDays}—${estimation?.maxDays} дней

📅 Дата: ${formattedDate}`;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      let errorData: unknown = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text().catch(() => null);
      }
      console.error("Telegram API error:", errorData);
      return { ok: false, reason: `telegram_error_${response.status}` };
    }

    return { ok: true };
  } catch (error) {
    console.error("Failed to send message to Telegram:", error);
    return { ok: false, reason: "telegram_exception" };
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  
  app.post("/api/contact", async (req, res) => {
    try {
      const parseResult = contactFormSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ 
          error: "Validation error", 
          message: validationError.message 
        });
      }

      const { name, email, message } = parseResult.data;
      
      const scoring = calculateScoring({
        type: "contact",
        message,
      });

      const lead = await storage.createLead({
        type: "contact",
        status: "new",
        scoring,
        name,
        email,
        message,
      });

      const telegramResult = await sendToTelegram("contact", { name, email, message }, scoring);
      console.info("[api] sent_to_admin", {
        requestId: (req as any).requestId,
        type: "contact",
        sent_to_admin: telegramResult.ok,
        reason: telegramResult.reason || null,
      });
      
      return res.status(201).json({ 
        success: true, 
        message: "Сообщение успешно отправлено",
        id: lead.id,
      });
    } catch (error) {
      console.error("Error creating contact message:", (req as any).requestId, error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: "Не удалось отправить сообщение" 
      });
    }
  });

  app.post("/api/estimate", async (req, res) => {
    try {
      const { estimation, ...requestData } = req.body;
      
      const parseResult = estimationRequestSchema.safeParse(requestData);
      
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ 
          error: "Validation error", 
          message: validationError.message 
        });
      }

      if (!estimation || typeof estimation.minPrice !== 'number' || typeof estimation.maxPrice !== 'number') {
        return res.status(400).json({
          error: "Validation error",
          message: "Estimation data is required"
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

      const telegramResult = await sendToTelegram(
        "estimation",
        {
          name: data.contactName,
          email: data.contactEmail,
          telegram: data.contactTelegram,
          projectType: data.projectType,
          features: data.features,
          designComplexity: data.designComplexity,
          urgency: data.urgency,
          budget: data.budget,
          description: data.description,
        },
        scoring,
        estimation
      );
      console.info("[api] sent_to_admin", {
        requestId: (req as any).requestId,
        type: "estimation",
        sent_to_admin: telegramResult.ok,
        reason: telegramResult.reason || null,
      });
      
      return res.status(201).json({ 
        success: true, 
        message: "Заявка успешно отправлена",
        id: lead.id,
      });
    } catch (error) {
      console.error("Error processing estimation request:", (req as any).requestId, error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: "Не удалось отправить заявку" 
      });
    }
  });

  app.get("/api/leads", requireAdmin, async (req, res) => {
    try {
      const { type, status, scoring, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      if (scoring) filters.scoring = scoring as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const leads = await storage.getLeads(filters);
      return res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/leads/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getLeadStats();
      return res.json(stats);
    } catch (error) {
      console.error("Error fetching lead stats:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/leads/:id", requireAdmin, async (req, res) => {
    try {
      const lead = await storage.getLead(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      return res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/leads/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status || !["new", "in_progress", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const lead = await storage.updateLeadStatus(req.params.id, status);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      return res.json(lead);
    } catch (error) {
      console.error("Error updating lead status:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects", requireAdmin, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      return res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", requireAdmin, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json(project);
    } catch (error) {
      console.error("Error fetching project:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/projects", requireAdmin, async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      return res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/projects/:id", requireAdmin, async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json(project);
    } catch (error) {
      console.error("Error updating project:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Project not found" });
      }
      return res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { login, password } = req.body;
      const adminLogin = process.env.ADMIN_LOGIN;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminLogin || !adminPassword) {
        console.error("ADMIN_LOGIN or ADMIN_PASSWORD environment variable is not set");
        return res.status(500).json({ error: "Сервер не настроен для авторизации" });
      }
      
      if (login === adminLogin && password === adminPassword) {
        req.session.isAdmin = true;
        console.info("[api] admin_login_success", {
          requestId: (req as any).requestId,
          login,
        });
        return res.json({ success: true });
      }
      
      console.warn("[api] admin_login_failed", {
        requestId: (req as any).requestId,
        login,
      });
      return res.status(401).json({ error: "Неверный логин или пароль" });
    } catch (error) {
      console.error("Error during login:", (req as any).requestId, error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.json({ success: true });
    });
  });

  app.get("/api/admin/session", async (req, res) => {
    return res.json({ isAdmin: req.session.isAdmin || false });
  });

  return;
}
