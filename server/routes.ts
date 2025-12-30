import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactMessageSchema, estimationRequestSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

async function sendToTelegram(name: string, email: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured. Message will only be saved locally.");
    return false;
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

  const text = `📩 Новое сообщение с сайта

Имя: ${name}
Email: ${email}
Сообщение: ${message}
Дата и время: ${formattedDate}`;

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
      const errorData = await response.json();
      console.error("Telegram API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send message to Telegram:", error);
    return false;
  }
}

interface EstimationData {
  projectType: string;
  features: string[];
  designComplexity: string;
  urgency: string;
  budget?: string;
  contactName: string;
  contactEmail: string;
  contactTelegram?: string;
  description?: string;
}

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

function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

async function sendEstimationToTelegram(data: EstimationData, estimation: EstimationResult): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return false;
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

  const featuresText = data.features.length > 0
    ? data.features.map(f => featureLabels[f] || f).join(", ")
    : "Не выбраны";

  const contactLines = [
    `Имя: ${data.contactName}`,
    `Email: ${data.contactEmail}`,
  ];
  if (data.contactTelegram) {
    contactLines.push(`Telegram: ${data.contactTelegram}`);
  }

  const projectLines = [
    `Тип: ${projectTypeLabels[data.projectType] || data.projectType}`,
    `Функции: ${featuresText}`,
    `Дизайн: ${designLabels[data.designComplexity] || data.designComplexity}`,
    `Срочность: ${urgencyLabels[data.urgency] || data.urgency}`,
  ];
  if (data.budget) {
    projectLines.push(`Бюджет клиента: ${data.budget}`);
  }
  if (data.description) {
    projectLines.push(`Описание: ${data.description}`);
  }

  const text = `📋 Новая заявка на оценку проекта

👤 Контакт:
${contactLines.join("\n")}

📦 Детали проекта:
${projectLines.join("\n")}

💰 Автооценка:
Стоимость: ${formatPrice(estimation.minPrice)} — ${formatPrice(estimation.maxPrice)}
Сроки: ${estimation.minDays}—${estimation.maxDays} дней

📅 Дата: ${formattedDate}`;

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
      const errorData = await response.json();
      console.error("Telegram API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send estimation to Telegram:", error);
    return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/contact", async (req, res) => {
    try {
      const parseResult = insertContactMessageSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        const validationError = fromError(parseResult.error);
        return res.status(400).json({ 
          error: "Validation error", 
          message: validationError.message 
        });
      }

      const { name, email, message } = parseResult.data;

      const telegramSent = await sendToTelegram(name, email, message);
      
      const savedMessage = await storage.createContactMessage(parseResult.data);
      
      return res.status(201).json({ 
        success: true, 
        message: "Сообщение успешно отправлено",
        id: savedMessage.id,
        telegramSent
      });
    } catch (error) {
      console.error("Error creating contact message:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: "Не удалось отправить сообщение" 
      });
    }
  });

  app.get("/api/contact", async (req, res) => {
    try {
      const messages = await storage.getContactMessages();
      return res.json(messages);
    } catch (error) {
      console.error("Error fetching contact messages:", error);
      return res.status(500).json({ 
        error: "Internal server error" 
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

      await sendEstimationToTelegram(parseResult.data, estimation);
      
      return res.status(201).json({ 
        success: true, 
        message: "Заявка успешно отправлена"
      });
    } catch (error) {
      console.error("Error processing estimation request:", error);
      return res.status(500).json({ 
        error: "Internal server error",
        message: "Не удалось отправить заявку" 
      });
    }
  });

  return httpServer;
}
