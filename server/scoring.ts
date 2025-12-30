import type { Scoring } from "@shared/schema";

interface ScoringInput {
  type: "contact" | "estimation";
  budget?: string;
  projectType?: string;
  urgency?: string;
  features?: string[];
  description?: string;
  message?: string;
}

/**
 * Scoring система для автоматической оценки лидов
 * 
 * A - горячий лид (высокий бюджет, срочность, много функций)
 * B - тёплый лид (средние показатели)
 * C - холодный лид (низкий бюджет или минимум информации)
 * 
 * Факторы оценки:
 * - Бюджет клиента (высокий = +3, средний = +1)
 * - Сложность проекта (SaaS/webapp = +2, ecommerce = +1)
 * - Срочность (urgent = +2, standard = +1)
 * - Количество функций (>3 = +2, >1 = +1)
 * - Объём описания (>100 символов = +1)
 */
export function calculateScoring(input: ScoringInput): Scoring {
  let score = 0;
  
  if (input.type === "contact") {
    const messageLength = input.message?.length || 0;
    if (messageLength > 200) score += 2;
    else if (messageLength > 50) score += 1;
    
    return score >= 2 ? "B" : "C";
  }
  
  if (input.budget) {
    const budget = input.budget.toLowerCase();
    if (budget.includes("500") || budget.includes("1000") || budget.includes("млн") || budget.includes("million")) {
      score += 3;
    } else if (budget.includes("300") || budget.includes("200") || budget.includes("150")) {
      score += 2;
    } else if (budget.includes("100") || budget.includes("50")) {
      score += 1;
    }
  }
  
  if (input.projectType) {
    const highValueProjects = ["saas", "webapp", "ecommerce"];
    const mediumValueProjects = ["website", "telegram-bot"];
    
    if (highValueProjects.includes(input.projectType)) {
      score += 2;
    } else if (mediumValueProjects.includes(input.projectType)) {
      score += 1;
    }
  }
  
  if (input.urgency) {
    if (input.urgency === "urgent") score += 2;
    else if (input.urgency === "standard") score += 1;
  }
  
  const featureCount = input.features?.length || 0;
  if (featureCount >= 4) score += 2;
  else if (featureCount >= 2) score += 1;
  
  const descriptionLength = input.description?.length || 0;
  if (descriptionLength > 200) score += 2;
  else if (descriptionLength > 50) score += 1;
  
  if (score >= 7) return "A";
  if (score >= 4) return "B";
  return "C";
}

export function getScoringEmoji(scoring: Scoring): string {
  switch (scoring) {
    case "A": return "🔥";
    case "B": return "🟡";
    case "C": return "❄️";
    default: return "❓";
  }
}

export function getScoringLabel(scoring: Scoring): string {
  switch (scoring) {
    case "A": return "Горячий";
    case "B": return "Тёплый";
    case "C": return "Холодный";
    default: return "Неизвестно";
  }
}
