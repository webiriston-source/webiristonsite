import { 
  type User, type InsertUser, 
  type Lead, type InsertLead,
  type Project, type InsertProject,
  users, leads, projects
} from "../shared/schema";
import { db, isDatabaseConfigured } from "./db";
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
    const [user] = await db!.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db!.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db!.insert(users).values(insertUser).returning();
    return user;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const [lead] = await db!
      .insert(leads)
      .values({ id: randomUUID(), ...insertLead })
      .returning();
    return lead;
  }

  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    let query = db!.select().from(leads);
    
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
      return await db!
        .select()
        .from(leads)
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt));
    }
    
    return await db!.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: string): Promise<Lead | undefined> {
    const [lead] = await db!.select().from(leads).where(eq(leads.id, id));
    return lead || undefined;
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead | undefined> {
    const [lead] = await db!
      .update(leads)
      .set({ status, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return lead || undefined;
  }

  async getLeadStats(): Promise<LeadStats> {
    const allLeads = await db!.select().from(leads);
    
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
    return await db!.select().from(projects).orderBy(projects.sortOrder);
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db!.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db!.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db!
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await db!.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }
}

class MemoryStorage implements IStorage {
  private users: User[] = [];
  private leads: Lead[] = [];
  private projects: Project[] = [];

  async getUser(id: string): Promise<User | undefined> {
    return this.users.find((user) => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.users.find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = { id: randomUUID(), ...insertUser };
    this.users.push(user);
    return user;
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const now = new Date();
    const lead: Lead = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...insertLead,
      status: insertLead.status ?? "new",
      scoring: insertLead.scoring ?? "C",
      message: insertLead.message ?? null,
      telegram: insertLead.telegram ?? null,
      projectType: insertLead.projectType ?? null,
      features: insertLead.features ?? null,
      designComplexity: insertLead.designComplexity ?? null,
      urgency: insertLead.urgency ?? null,
      budget: insertLead.budget ?? null,
      description: insertLead.description ?? null,
      estimatedMinPrice: insertLead.estimatedMinPrice ?? null,
      estimatedMaxPrice: insertLead.estimatedMaxPrice ?? null,
      estimatedMinDays: insertLead.estimatedMinDays ?? null,
      estimatedMaxDays: insertLead.estimatedMaxDays ?? null,
      referralCode: insertLead.referralCode ?? null,
      referrerTelegramId: insertLead.referrerTelegramId ?? null,
      referrerUsername: insertLead.referrerUsername ?? null,
      referralSource: insertLead.referralSource ?? null,
      projectFinalAmount: insertLead.projectFinalAmount ?? null,
      projectStatus: insertLead.projectStatus ?? "lead",
    };
    this.leads.unshift(lead);
    return lead;
  }

  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    let results = [...this.leads];
    if (filters?.type) {
      results = results.filter((lead) => lead.type === filters.type);
    }
    if (filters?.status) {
      results = results.filter((lead) => lead.status === filters.status);
    }
    if (filters?.scoring) {
      results = results.filter((lead) => lead.scoring === filters.scoring);
    }
    if (filters?.startDate) {
      results = results.filter((lead) => lead.createdAt >= filters.startDate!);
    }
    if (filters?.endDate) {
      results = results.filter((lead) => lead.createdAt <= filters.endDate!);
    }
    return results;
  }

  async getLead(id: string): Promise<Lead | undefined> {
    return this.leads.find((lead) => lead.id === id);
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead | undefined> {
    const lead = this.leads.find((entry) => entry.id === id);
    if (!lead) return undefined;
    lead.status = status;
    lead.updatedAt = new Date();
    return lead;
  }

  async getLeadStats(): Promise<LeadStats> {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScoring: Record<string, number> = {};

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    let thisMonth = 0;
    let lastMonth = 0;

    for (const lead of this.leads) {
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
      total: this.leads.length,
      byType,
      byStatus,
      byScoring,
      thisMonth,
      lastMonth,
    };
  }

  async getProjects(): Promise<Project[]> {
    return [...this.projects].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.find((project) => project.id === id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const now = new Date();
    const project: Project = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...insertProject,
      liveUrl: insertProject.liveUrl ?? null,
      problems: insertProject.problems ?? null,
      solutions: insertProject.solutions ?? null,
      sortOrder: insertProject.sortOrder ?? null,
      isVisible: insertProject.isVisible ?? null,
    };
    this.projects.push(project);
    return project;
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.find((entry) => entry.id === id);
    if (!project) return undefined;
    Object.assign(project, projectData, { updatedAt: new Date() });
    return project;
  }

  async deleteProject(id: string): Promise<boolean> {
    const index = this.projects.findIndex((entry) => entry.id === id);
    if (index === -1) return false;
    this.projects.splice(index, 1);
    return true;
  }
}

class ResilientStorage implements IStorage {
  private primary: IStorage | null;
  private fallback: IStorage;
  private useFallback = false;

  constructor(primary: IStorage | null, fallback: IStorage) {
    this.primary = primary;
    this.fallback = fallback;
  }

  private async run<T>(
    operation: string,
    primaryCall: () => Promise<T>,
    fallbackCall: () => Promise<T>
  ): Promise<T> {
    if (!this.primary || this.useFallback) {
      return await fallbackCall();
    }
    try {
      return await primaryCall();
    } catch (error) {
      this.useFallback = true;
      console.error("[storage] fallback", {
        operation,
        error: error instanceof Error ? error.message : String(error),
      });
      return await fallbackCall();
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.run(
      "getUser",
      () => this.primary!.getUser(id),
      () => this.fallback.getUser(id)
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.run(
      "getUserByUsername",
      () => this.primary!.getUserByUsername(username),
      () => this.fallback.getUserByUsername(username)
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.run(
      "createUser",
      () => this.primary!.createUser(user),
      () => this.fallback.createUser(user)
    );
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    return this.run(
      "createLead",
      () => this.primary!.createLead(lead),
      () => this.fallback.createLead(lead)
    );
  }

  async getLeads(filters?: LeadFilters): Promise<Lead[]> {
    return this.run(
      "getLeads",
      () => this.primary!.getLeads(filters),
      () => this.fallback.getLeads(filters)
    );
  }

  async getLead(id: string): Promise<Lead | undefined> {
    return this.run(
      "getLead",
      () => this.primary!.getLead(id),
      () => this.fallback.getLead(id)
    );
  }

  async updateLeadStatus(id: string, status: string): Promise<Lead | undefined> {
    return this.run(
      "updateLeadStatus",
      () => this.primary!.updateLeadStatus(id, status),
      () => this.fallback.updateLeadStatus(id, status)
    );
  }

  async getLeadStats(): Promise<LeadStats> {
    return this.run(
      "getLeadStats",
      () => this.primary!.getLeadStats(),
      () => this.fallback.getLeadStats()
    );
  }

  async getProjects(): Promise<Project[]> {
    return this.run(
      "getProjects",
      () => this.primary!.getProjects(),
      () => this.fallback.getProjects()
    );
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.run(
      "getProject",
      () => this.primary!.getProject(id),
      () => this.fallback.getProject(id)
    );
  }

  async createProject(project: InsertProject): Promise<Project> {
    return this.run(
      "createProject",
      () => this.primary!.createProject(project),
      () => this.fallback.createProject(project)
    );
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined> {
    return this.run(
      "updateProject",
      () => this.primary!.updateProject(id, project),
      () => this.fallback.updateProject(id, project)
    );
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.run(
      "deleteProject",
      () => this.primary!.deleteProject(id),
      () => this.fallback.deleteProject(id)
    );
  }
}

const memoryStorage = new MemoryStorage();
const databaseStorage = isDatabaseConfigured ? new DatabaseStorage() : null;

export const storage = new ResilientStorage(databaseStorage, memoryStorage);
