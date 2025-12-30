import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactMessageSchema } from "@shared/schema";
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

  return httpServer;
}
