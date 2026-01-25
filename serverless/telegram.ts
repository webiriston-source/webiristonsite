import { getScoringEmoji } from "../server/scoring.js";

type EstimationResult = {
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
};

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

export type TelegramSendResult = {
  ok: boolean;
  reason?: string;
};

export async function sendContactToTelegram(data: {
  name: string;
  email: string;
  telegram?: string;
  message?: string;
  scoring: string;
}): Promise<TelegramSendResult> {
  const scoringEmoji = getScoringEmoji(data.scoring as "A" | "B" | "C");
  const formattedDate = new Date().toLocaleString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  const text = `📩 Новое сообщение с сайта

${scoringEmoji} Scoring: ${data.scoring}

👤 Контакт:
Имя: ${data.name}
Email: ${data.email}${data.telegram ? `\nTelegram: ${data.telegram}` : ""}

💬 Сообщение:
${data.message}

📅 Дата: ${formattedDate}`;

  return sendTelegramMessage(text);
}

export async function sendEstimateToTelegram(data: {
  name: string;
  email: string;
  telegram?: string;
  projectType?: string;
  features?: string[];
  designComplexity?: string;
  urgency?: string;
  budget?: string;
  description?: string;
  scoring: string;
  estimation: EstimationResult;
}): Promise<TelegramSendResult> {
  const scoringEmoji = getScoringEmoji(data.scoring as "A" | "B" | "C");
  const formattedDate = new Date().toLocaleString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  const featuresText = data.features && data.features.length > 0
    ? data.features.map((feature) => featureLabels[feature] || feature).join(", ")
    : "Не выбраны";

  const text = `📋 Новая заявка на оценку проекта

${scoringEmoji} Scoring: ${data.scoring}

👤 Контакт:
Имя: ${data.name}
Email: ${data.email}${data.telegram ? `\nTelegram: ${data.telegram}` : ""}

📦 Детали проекта:
Тип: ${projectTypeLabels[data.projectType || ""] || data.projectType}
Функции: ${featuresText}
Дизайн: ${designLabels[data.designComplexity || ""] || data.designComplexity}
Срочность: ${urgencyLabels[data.urgency || ""] || data.urgency}${data.budget ? `\nБюджет клиента: ${data.budget}` : ""}${data.description ? `\nОписание: ${data.description}` : ""}

💰 Автооценка:
Стоимость: ${formatPrice(data.estimation.minPrice)} — ${formatPrice(data.estimation.maxPrice)}
Сроки: ${data.estimation.minDays}—${data.estimation.maxDays} дней

📅 Дата: ${formattedDate}`;

  return sendTelegramMessage(text);
}

async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return { ok: false, reason: "missing_credentials" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
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
