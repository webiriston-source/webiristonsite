import { 
  type User, type InsertUser, 
  type Lead, type InsertLead,
  type Project, type InsertProject,
  users, leads, projects
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createLead(lead: InsertLead): Promise<Lead>;
  getLeads(filters?: LeadFilters): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | undefined>;
  updateLeadStatus(id: string, status: string): Promise<Lead | undefined>;
  getLeadStats(): Promise<LeadStats>;
  
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
}

export interface LeadFilters {
  type?: string;
  status?: string;
  scoring?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface LeadStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byScoring: Record<string, number>;
  thisMonth: number;
  lastMonth: number;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db
      .insert(leads)
      .values({ id: randomUUID(), ...insertLead })
      .returning();
    return lead;
  }

  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    let query = db.select().from(leads);
    
    const conditions = [];
    
    if (filters?.type) {
      conditions.push(eq(leads.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(leads.status, filters.status));
    }
    if (filters?.scoring) {
      conditions.push(eq(leads.scoring, filters.scoring));
    }
    if (filters?.startDate) {
      conditions.push(gte(leads.createdAt, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(leads.createdAt, filters.endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(leads).where(and(...conditions)).orderBy(desc(leads.createdAt));
    }
    
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead | undefined> {
    const [lead] = await db
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async getLeadStats(): Promise<LeadStats> {
    const allLeads = await db.select().from(leads);
    
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScoring: Record<string, number> = {};
    let thisMonth = 0;
    let lastMonth = 0;
    
    for (const lead of allLeads) {
      byType[lead.type] = (byType[lead.type] || 0) + 1;
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      byScoring[lead.scoring] = (byScoring[lead.scoring] || 0) + 1;
      
      if (lead.createdAt >= startOfThisMonth) {
        thisMonth++;
      }
      if (lead.createdAt >= startOfLastMonth && lead.createdAt <= endOfLastMonth) {
        lastMonth++;
      }
    }
    
    return {
      total: allLeads.length,
      byType,
      byStatus,
      byScoring,
      thisMonth,
      lastMonth,
    };
  }

  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(projects.sortOrder);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
