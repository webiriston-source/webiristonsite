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

export type TelegramInlineButton = {
  text: string;
  callback_data?: string;
  url?: string;
};

type TelegramApiResult<T = unknown> = {
  ok: boolean;
  reason?: string;
  data?: T;
};

export async function sendContactToTelegram(data: {
  name: string;
  email: string;
  telegram?: string;
  message?: string;
  scoring: string;
  referralCode?: string;
  referrerTelegramId?: string;
  referrerUsername?: string;
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
  const referralInfo =
    data.referrerTelegramId || data.referrerUsername || data.referralCode
      ? `\n\n🤝 Реферал:\nКод: ${data.referralCode || "—"}\nReferrer ID: ${data.referrerTelegramId || "—"}\nReferrer: ${data.referrerUsername || "—"}`
      : "";

  return sendTelegramMessage(`${text}${referralInfo}`);
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
  referralCode?: string;
  referrerTelegramId?: string;
  referrerUsername?: string;
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
  const referralInfo =
    data.referrerTelegramId || data.referrerUsername || data.referralCode
      ? `\n\n🤝 Реферал:\nКод: ${data.referralCode || "—"}\nReferrer ID: ${data.referrerTelegramId || "—"}\nReferrer: ${data.referrerUsername || "—"}`
      : "";

  return sendTelegramMessage(`${text}${referralInfo}`);
}

async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn("Telegram credentials not configured.");
    return { ok: false, reason: "missing_credentials" };
  }

  return sendTelegramDirectMessage(chatId, text, { parse_mode: "HTML" });
}

async function telegramApiRequest<T = unknown>(method: string, payload: Record<string, unknown>): Promise<TelegramApiResult<T>> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { ok: false, reason: "missing_credentials" };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const responseData = (await response.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
    if (!response.ok || !responseData?.ok) {
      const description = responseData?.description || `telegram_error_${response.status}`;
      return { ok: false, reason: description };
    }
    return { ok: true, data: responseData.result };
  } catch (error) {
    console.error("Telegram API request failed:", error);
    return { ok: false, reason: "telegram_exception" };
  }
}

export async function sendTelegramDirectMessage(
  chatId: string,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    inline_keyboard?: TelegramInlineButton[][];
    disable_web_page_preview?: boolean;
  }
): Promise<TelegramSendResult> {
  const reply_markup = options?.inline_keyboard ? { inline_keyboard: options.inline_keyboard } : undefined;
  const result = await telegramApiRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options?.parse_mode,
    disable_web_page_preview: options?.disable_web_page_preview ?? true,
    reply_markup,
  });
  return { ok: result.ok, reason: result.reason };
}

export async function sendTelegramPhoto(
  chatId: string,
  photoUrl: string,
  caption: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    inline_keyboard?: TelegramInlineButton[][];
  }
): Promise<TelegramSendResult> {
  const reply_markup = options?.inline_keyboard ? { inline_keyboard: options.inline_keyboard } : undefined;
  const result = await telegramApiRequest("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: options?.parse_mode,
    reply_markup,
  });
  return { ok: result.ok, reason: result.reason };
}

export async function editTelegramMessage(
  chatId: string,
  messageId: number,
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    inline_keyboard?: TelegramInlineButton[][];
  }
): Promise<TelegramSendResult> {
  const reply_markup = options?.inline_keyboard ? { inline_keyboard: options.inline_keyboard } : undefined;
  const result = await telegramApiRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options?.parse_mode,
    reply_markup,
  });
  return { ok: result.ok, reason: result.reason };
}

export async function answerTelegramCallbackQuery(
  callbackQueryId: string,
  text?: string
): Promise<TelegramSendResult> {
  const result = await telegramApiRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
  return { ok: result.ok, reason: result.reason };
}

export async function sendTelegramBroadcast(
  chatIds: string[],
  text: string,
  options?: {
    parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
    inline_keyboard?: TelegramInlineButton[][];
  }
): Promise<{ success: number; failed: number; blocked: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  let blocked = 0;
  const errors: string[] = [];

  for (const chatId of chatIds) {
    const result = await sendTelegramDirectMessage(chatId, text, options);
    if (result.ok) {
      success += 1;
      continue;
    }

    const reason = result.reason || "unknown_error";
    if (reason.includes("bot was blocked") || reason.includes("chat not found") || reason.includes("user is deactivated")) {
      blocked += 1;
    } else {
      failed += 1;
    }
    errors.push(`${chatId}: ${reason}`);
  }

  return { success, failed, blocked, errors };
}
