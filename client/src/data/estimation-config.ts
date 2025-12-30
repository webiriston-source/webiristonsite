export interface ProjectType {
  id: string;
  label: string;
  basePrice: number;
  baseDays: number;
}

export interface Feature {
  id: string;
  label: string;
  price: number;
  days: number;
}

export interface DesignComplexity {
  id: string;
  label: string;
  description: string;
  coefficient: number;
}

export interface Urgency {
  id: string;
  label: string;
  description: string;
  coefficient: number;
  daysMultiplier: number;
}

export const projectTypes: ProjectType[] = [
  { id: "landing", label: "Лендинг", basePrice: 15000, baseDays: 5 },
  { id: "website", label: "Корпоративный сайт", basePrice: 40000, baseDays: 14 },
  { id: "ecommerce", label: "Интернет-магазин", basePrice: 80000, baseDays: 30 },
  { id: "saas", label: "SaaS-платформа", basePrice: 150000, baseDays: 60 },
  { id: "webapp", label: "Веб-приложение", basePrice: 100000, baseDays: 45 },
  { id: "telegram-bot", label: "Telegram-бот", basePrice: 25000, baseDays: 10 },
  { id: "other", label: "Другое", basePrice: 30000, baseDays: 14 },
];

export const features: Feature[] = [
  { id: "auth", label: "Авторизация / Регистрация", price: 15000, days: 3 },
  { id: "admin", label: "Админ-панель", price: 25000, days: 7 },
  { id: "payment", label: "Онлайн-оплата", price: 20000, days: 5 },
  { id: "profile", label: "Личный кабинет", price: 20000, days: 5 },
  { id: "integrations", label: "Интеграции (API, CRM, и т.д.)", price: 15000, days: 4 },
  { id: "multilang", label: "Мультиязычность", price: 10000, days: 3 },
];

export const designComplexities: DesignComplexity[] = [
  { 
    id: "basic", 
    label: "Базовый", 
    description: "Шаблонный дизайн, минимальная кастомизация",
    coefficient: 1.0 
  },
  { 
    id: "modern", 
    label: "Современный", 
    description: "Уникальный дизайн, анимации, адаптивность",
    coefficient: 1.3 
  },
  { 
    id: "premium", 
    label: "Премиум + UX", 
    description: "Авторский дизайн, глубокая проработка UX",
    coefficient: 1.6 
  },
];

export const urgencies: Urgency[] = [
  { 
    id: "relaxed", 
    label: "Не срочно", 
    description: "Гибкие сроки, приоритет качества",
    coefficient: 0.9,
    daysMultiplier: 1.2
  },
  { 
    id: "standard", 
    label: "Стандарт", 
    description: "Обычные сроки выполнения",
    coefficient: 1.0,
    daysMultiplier: 1.0
  },
  { 
    id: "urgent", 
    label: "Срочно", 
    description: "Ускоренная разработка, приоритетная работа",
    coefficient: 1.5,
    daysMultiplier: 0.6
  },
];

export interface EstimationResult {
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
}

export function calculateEstimate(
  projectTypeId: string,
  selectedFeatures: string[],
  designId: string,
  urgencyId: string
): EstimationResult {
  const projectType = projectTypes.find(p => p.id === projectTypeId);
  const design = designComplexities.find(d => d.id === designId);
  const urgency = urgencies.find(u => u.id === urgencyId);

  if (!projectType || !design || !urgency) {
    return { minPrice: 0, maxPrice: 0, minDays: 0, maxDays: 0 };
  }

  let totalPrice = projectType.basePrice;
  let totalDays = projectType.baseDays;

  for (const featureId of selectedFeatures) {
    const feature = features.find(f => f.id === featureId);
    if (feature) {
      totalPrice += feature.price;
      totalDays += feature.days;
    }
  }

  totalPrice = totalPrice * design.coefficient * urgency.coefficient;
  totalDays = Math.ceil(totalDays * urgency.daysMultiplier);

  const priceVariance = 0.2;
  const daysVariance = 0.15;

  return {
    minPrice: Math.round(totalPrice * (1 - priceVariance)),
    maxPrice: Math.round(totalPrice * (1 + priceVariance)),
    minDays: Math.max(1, Math.round(totalDays * (1 - daysVariance))),
    maxDays: Math.round(totalDays * (1 + daysVariance)),
  };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

export function formatDays(days: number): string {
  const lastDigit = days % 10;
  const lastTwoDigits = days % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${days} дней`;
  }
  
  if (lastDigit === 1) {
    return `${days} день`;
  }
  
  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${days} дня`;
  }
  
  return `${days} дней`;
}
