import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const contactMessages = pgTable("contact_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertContactMessageSchema = createInsertSchema(contactMessages).pick({
  name: true,
  email: true,
  message: true,
}).extend({
  email: z.string().email("Введите корректный email"),
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  message: z.string().min(10, "Сообщение должно содержать минимум 10 символов"),
});

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type ContactMessage = typeof contactMessages.$inferSelect;

export interface Project {
  id: string;
  title: string;
  description: string;
  fullDescription: string;
  image: string;
  technologies: string[];
  liveUrl?: string;
  problems?: string;
  solutions?: string;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  category: "frontend" | "backend" | "database" | "tools";
  experience: string;
  related: string[];
}

export const estimationRequestSchema = z.object({
  projectType: z.string().min(1, "Выберите тип проекта"),
  features: z.array(z.string()),
  designComplexity: z.string().min(1, "Выберите сложность дизайна"),
  urgency: z.string().min(1, "Выберите срочность"),
  budget: z.string().optional(),
  contactName: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  contactEmail: z.string().email("Введите корректный email"),
  contactTelegram: z.string().optional(),
  description: z.string().optional(),
});

export type EstimationRequest = z.infer<typeof estimationRequestSchema>;
