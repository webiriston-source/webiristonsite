import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContactMessageSchema } from "@shared/schema";
import { fromError } from "zod-validation-error";

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

      const message = await storage.createContactMessage(parseResult.data);
      
      return res.status(201).json({ 
        success: true, 
        message: "Сообщение успешно отправлено",
        id: message.id 
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
