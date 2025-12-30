import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
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

export const leads = pgTable("leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'contact' | 'estimation'
  status: text("status").notNull().default("new"), // 'new' | 'in_progress' | 'closed'
  scoring: text("scoring").notNull().default("C"), // 'A' | 'B' | 'C'
  
  name: text("name").notNull(),
  email: text("email").notNull(),
  telegram: text("telegram"),
  message: text("message"),
  
  projectType: text("project_type"),
  features: text("features").array(),
  designComplexity: text("design_complexity"),
  urgency: text("urgency"),
  budget: text("budget"),
  description: text("description"),
  
  estimatedMinPrice: integer("estimated_min_price"),
  estimatedMaxPrice: integer("estimated_max_price"),
  estimatedMinDays: integer("estimated_min_days"),
  estimatedMaxDays: integer("estimated_max_days"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  fullDescription: text("full_description").notNull(),
  image: text("image").notNull(),
  technologies: text("technologies").array().notNull(),
  liveUrl: text("live_url"),
  problems: text("problems"),
  solutions: text("solutions"),
  sortOrder: integer("sort_order").default(0),
  isVisible: text("is_visible").default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export interface Skill {
  id: string;
  name: string;
  icon: string;
  category: "frontend" | "backend" | "database" | "tools";
  experience: string;
  related: string[];
}

export const contactFormSchema = z.object({
  name: z.string().min(2, "Имя должно содержать минимум 2 символа"),
  email: z.string().email("Введите корректный email"),
  message: z.string().min(10, "Сообщение должно содержать минимум 10 символов"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

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

export const leadStatusOptions = ["new", "in_progress", "closed"] as const;
export type LeadStatus = typeof leadStatusOptions[number];

export const scoringOptions = ["A", "B", "C"] as const;
export type Scoring = typeof scoringOptions[number];

export const leadTypeOptions = ["contact", "estimation"] as const;
export type LeadType = typeof leadTypeOptions[number];
