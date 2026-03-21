import type { VercelRequest, VercelResponse } from "@vercel/node";
import { withDb } from "../shared/db";
import {
  users,
  leads,
  projects,
  referralRewards,
  telegramSubscribers,
  contactFormSchema,
  estimationRequestSchema,
  projectStatusOptions,
  telegramFlowStateOptions,
  type InsertLead,
  type InsertProject,
  type TelegramFlowState,
} from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import {
  answerTelegramCallbackQuery,
  sendContactToTelegram,
  sendEstimateToTelegram,
  sendTelegramBroadcast,
  sendTelegramDirectMessage,
  sendTelegramPhoto,
} from "../serverless/telegram.js";
import type { ProjectStatus } from "../shared/schema";

/**
 * Parse JSON body from request
 */
async function parseJsonBody<T>(req: VercelRequest): Promise<T | null> {
  try {
    if (req.body) {
      return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    let raw = "";
    for await (const chunk of req as AsyncIterable<Buffer | string>) {
      raw += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    }
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Send JSON response
 */
function sendJson(res: VercelResponse, status: number, data: unknown) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

/**
 * Set CORS headers
 */
function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Simple scoring calculation for contact messages
 */
function calculateContactScoring(message: string): "A" | "B" | "C" {
  const length = message.length;
  if (length > 200) return "B";
  if (length > 50) return "B";
  return "C";
}

/**
 * Simple scoring calculation for estimation requests
 */
function calculateEstimationScoring(data: {
  budget?: string;
  projectType?: string;
  urgency?: string;
  features?: string[];
  description?: string;
}): "A" | "B" | "C" {
  let score = 0;

  // Budget scoring
  if (data.budget) {
    const budget = data.budget.toLowerCase();
    if (budget.includes("500") || budget.includes("1000") || budget.includes("млн")) {
      score += 3;
    } else if (budget.includes("300") || budget.includes("200") || budget.includes("150")) {
      score += 2;
    } else if (budget.includes("100") || budget.includes("50")) {
      score += 1;
    }
  }

  // Project type scoring
  if (data.projectType) {
    const highValue = ["saas", "webapp", "ecommerce"];
    const mediumValue = ["website", "telegram-bot"];
    if (highValue.includes(data.projectType)) score += 2;
    else if (mediumValue.includes(data.projectType)) score += 1;
  }

  // Urgency scoring
  if (data.urgency === "urgent") score += 2;
  else if (data.urgency === "standard") score += 1;

  // Features scoring
  const featureCount = data.features?.length || 0;
  if (featureCount >= 4) score += 2;
  else if (featureCount >= 2) score += 1;

  // Description scoring
  const descLength = data.description?.length || 0;
  if (descLength > 200) score += 2;
  else if (descLength > 50) score += 1;

  if (score >= 7) return "A";
  if (score >= 4) return "B";
  return "C";
}

function normalizeReferralUsername(username?: string | null): string | null {
  if (!username) return null;
  return username.startsWith("@") ? username : `@${username}`;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/** Vercel/UI often store env values with surrounding quotes — strip for reliable compare */
function normalizeEnvSecret(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  let s = value.trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

async function syncReferralRewardForLead(db: any, leadId: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) {
    return { updated: false, reason: "lead_not_found" as const };
  }

  if (!lead.referrerTelegramId || !lead.projectFinalAmount) {
    return { updated: false, reason: "missing_referral_or_amount" as const };
  }

  const rewardAmount = Math.round(lead.projectFinalAmount * 0.2);
  const rewardStatus = lead.projectStatus === "paid" || lead.projectStatus === "closed" ? "approved" : "pending";

  const [existing] = await db.select().from(referralRewards).where(eq(referralRewards.leadId, leadId)).limit(1);
  if (existing) {
    await db
      .update(referralRewards)
      .set({
        referrerTelegramId: lead.referrerTelegramId,
        rewardAmount,
        rewardPercent: 20,
        status: rewardStatus,
        updatedAt: new Date(),
      })
      .where(eq(referralRewards.leadId, leadId));
  } else {
    await db.insert(referralRewards).values({
      id: randomUUID(),
      leadId,
      referrerTelegramId: lead.referrerTelegramId,
      rewardPercent: 20,
      rewardAmount,
      status: rewardStatus,
    });
  }

  return {
    updated: true,
    rewardAmount,
    rewardStatus,
    referrerTelegramId: lead.referrerTelegramId,
    referrerUsername: lead.referrerUsername,
    lead,
  };
}

type TelegramUserInfo = {
  id: string;
  username?: string;
  first_name?: string;
  last_name?: string;
};

type TelegramFlowPayload = {
  postText?: string;
  calc?: {
    projectType?: string;
    features: string[];
    designComplexity?: string;
    urgency?: string;
  };
};

const tgProjectTypes: Array<{ id: string; label: string; basePrice: number; baseDays: number }> = [
  { id: "landing", label: "Лендинг", basePrice: 58000, baseDays: 7 },
  { id: "website", label: "Корпоративный сайт", basePrice: 154000, baseDays: 21 },
  { id: "ecommerce", label: "Интернет-магазин", basePrice: 320000, baseDays: 45 },
  { id: "saas", label: "SaaS-платформа", basePrice: 640000, baseDays: 90 },
  { id: "webapp", label: "Веб-приложение", basePrice: 448000, baseDays: 60 },
  { id: "telegram-bot", label: "Telegram-бот", basePrice: 77000, baseDays: 14 },
  { id: "other", label: "Другое", basePrice: 102000, baseDays: 21 },
];

const tgFeatures: Array<{ id: string; label: string; price: number; days: number }> = [
  { id: "auth", label: "Авторизация", price: 45000, days: 5 },
  { id: "admin", label: "Админ-панель", price: 102000, days: 14 },
  { id: "payment", label: "Онлайн-оплата", price: 64000, days: 7 },
  { id: "profile", label: "Личный кабинет", price: 77000, days: 10 },
  { id: "integrations", label: "Интеграции", price: 58000, days: 7 },
  { id: "multilang", label: "Мультиязычность", price: 38000, days: 5 },
];

const tgDesign: Array<{ id: string; label: string; coefficient: number }> = [
  { id: "basic", label: "Базовый", coefficient: 1.28 },
  { id: "modern", label: "Современный", coefficient: 1.79 },
  { id: "premium", label: "Премиум + UX", coefficient: 2.3 },
];

const tgUrgency: Array<{ id: string; label: string; coefficient: number; daysMultiplier: number }> = [
  { id: "relaxed", label: "Не срочно", coefficient: 1.22, daysMultiplier: 1.3 },
  { id: "standard", label: "Стандарт", coefficient: 1.28, daysMultiplier: 1.0 },
  { id: "urgent", label: "Срочно", coefficient: 2.05, daysMultiplier: 0.6 },
];

function buildReferralInlineKeyboard() {
  return [
    [{ text: "Открыть сайт", url: "https://iristonweb.ru/" }],
    [{ text: "Раздел «Контакты»", url: "https://iristonweb.ru/#contact" }],
  ];
}

/** Plain text (no HTML) to avoid entity parse errors in Bot API */
const REFERRAL_PROGRAM_INTRO = `Реферальная программа

Вы рекомендуете мои услуги знакомым и коллегам — это честное посредничество: вы помогаете мне с рекламой «сарафаном», а я благодарю вас бонусом.

Как это работает:
• Клиент переходит по вашей ссылке или указывает ваш Telegram при заявке.
• После оплаты и подтверждения проекта начисляется вознаграждение до 20% от финальной суммы договора (условия фиксируются индивидуально).

Вам не нужно «продавать» — достаточно порекомендовать. Подробности и актуальные условия — на сайте в разделе «Контакты» или напишите мне в личку.

Спасибо, что делитесь контактами!`;

const REFERRAL_CAPTION_MAX = 1000;

async function sendReferralProgramIntro(telegramUserId: string) {
  const keyboard = [...buildReferralInlineKeyboard()];
  const imageUrl = process.env.TELEGRAM_REFERRAL_IMAGE_URL?.trim();
  if (imageUrl) {
    const caption =
      REFERRAL_PROGRAM_INTRO.length <= REFERRAL_CAPTION_MAX
        ? REFERRAL_PROGRAM_INTRO
        : `${REFERRAL_PROGRAM_INTRO.slice(0, REFERRAL_CAPTION_MAX - 30)}\n\n(продолжение ниже)`;
    await sendTelegramPhoto(telegramUserId, imageUrl, caption, { inline_keyboard: keyboard });
    if (REFERRAL_PROGRAM_INTRO.length > REFERRAL_CAPTION_MAX) {
      const rest = REFERRAL_PROGRAM_INTRO.slice(REFERRAL_CAPTION_MAX - 30);
      await sendTelegramDirectMessage(telegramUserId, rest, { inline_keyboard: keyboard });
    }
  } else {
    await sendTelegramDirectMessage(telegramUserId, REFERRAL_PROGRAM_INTRO, { inline_keyboard: keyboard });
  }
}

function buildMainMenu(isAdmin: boolean) {
  const keyboard = [
    [{ text: "Заработать со мной (рефералка)", callback_data: "referral:info" }],
    [{ text: "Калькулятор проекта", callback_data: "calc:start" }],
  ];
  if (isAdmin) keyboard.unshift([{ text: "Сделать пост подписчикам", callback_data: "admin:post:start" }]);
  return keyboard;
}

function calculateTelegramEstimate(payload: TelegramFlowPayload["calc"]) {
  if (!payload?.projectType || !payload.designComplexity || !payload.urgency) return null;
  const projectType = tgProjectTypes.find((item) => item.id === payload.projectType);
  const design = tgDesign.find((item) => item.id === payload.designComplexity);
  const urgency = tgUrgency.find((item) => item.id === payload.urgency);
  if (!projectType || !design || !urgency) return null;

  let totalPrice = projectType.basePrice;
  let totalDays = projectType.baseDays;
  for (const featureId of payload.features || []) {
    const feature = tgFeatures.find((item) => item.id === featureId);
    if (feature) {
      totalPrice += feature.price;
      totalDays += feature.days;
    }
  }

  totalPrice = totalPrice * design.coefficient * urgency.coefficient;
  totalDays = Math.ceil(totalDays * urgency.daysMultiplier);
  return {
    minPrice: Math.round(totalPrice * 0.8),
    maxPrice: Math.round(totalPrice * 1.2),
    minDays: Math.max(1, Math.round(totalDays * 0.85)),
    maxDays: Math.round(totalDays * 1.15),
  };
}

function formatEstimateSummary(payload: TelegramFlowPayload["calc"]) {
  const estimate = calculateTelegramEstimate(payload);
  if (!estimate) return "Не удалось рассчитать оценку.";
  const projectType = tgProjectTypes.find((item) => item.id === payload?.projectType)?.label || "—";
  const design = tgDesign.find((item) => item.id === payload?.designComplexity)?.label || "—";
  const urgency = tgUrgency.find((item) => item.id === payload?.urgency)?.label || "—";
  const featureNames =
    payload?.features?.map((id) => tgFeatures.find((item) => item.id === id)?.label || id).join(", ") || "Без дополнительных функций";
  const formatPrice = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
  return [
    "📊 Предварительная оценка проекта",
    "",
    `Тип: ${projectType}`,
    `Функции: ${featureNames}`,
    `Дизайн: ${design}`,
    `Срочность: ${urgency}`,
    "",
    `💰 Стоимость: ${formatPrice(estimate.minPrice)} — ${formatPrice(estimate.maxPrice)}`,
    `⏱ Срок: ${estimate.minDays} — ${estimate.maxDays} дней`,
    "",
    "Эту оценку можно переслать заинтересованному лицу.",
    "Финальная цена уточняется после брифа.",
  ].join("\n");
}

function parseFlowPayload(raw: string | null): TelegramFlowPayload {
  if (!raw) return { calc: { features: [] } };
  try {
    const parsed = JSON.parse(raw) as TelegramFlowPayload;
    return {
      postText: parsed.postText,
      calc: {
        features: parsed.calc?.features || [],
        projectType: parsed.calc?.projectType,
        designComplexity: parsed.calc?.designComplexity,
        urgency: parsed.calc?.urgency,
      },
    };
  } catch {
    return { calc: { features: [] } };
  }
}

function isValidFlowState(state: string): state is TelegramFlowState {
  return (telegramFlowStateOptions as readonly string[]).includes(state);
}

async function upsertTelegramSubscriber(db: any, user: TelegramUserInfo) {
  const adminId = process.env.TELEGRAM_ADMIN_ID;
  const isAdmin = adminId ? String(adminId) === String(user.id) : false;
  const [existing] = await db
    .select()
    .from(telegramSubscribers)
    .where(eq(telegramSubscribers.telegramUserId, String(user.id)))
    .limit(1);

  if (existing) {
    await db
      .update(telegramSubscribers)
      .set({
        username: user.username || null,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
        isActive: "true",
        isAdmin: isAdmin ? "true" : existing.isAdmin,
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(telegramSubscribers.telegramUserId, String(user.id)));
    return { ...existing, isAdmin: isAdmin ? "true" : existing.isAdmin };
  }

  const [created] = await db
    .insert(telegramSubscribers)
    .values({
      id: randomUUID(),
      telegramUserId: String(user.id),
      username: user.username || null,
      firstName: user.first_name || null,
      lastName: user.last_name || null,
      isActive: "true",
      isAdmin: isAdmin ? "true" : "false",
      flowState: "menu",
      flowPayload: JSON.stringify({ calc: { features: [] } }),
      lastInteractionAt: new Date(),
    })
    .returning();
  return created;
}

async function setSubscriberState(db: any, telegramUserId: string, state: TelegramFlowState, payload: TelegramFlowPayload) {
  await db
    .update(telegramSubscribers)
    .set({
      flowState: state,
      flowPayload: JSON.stringify(payload),
      lastInteractionAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(telegramSubscribers.telegramUserId, telegramUserId));
}

async function withTelegramDbOptional<T>(fn: (db: any) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> {
  try {
    const value = await withDb(fn);
    return { ok: true, value };
  } catch (error) {
    console.error("[telegramWebhook] DB operation failed:", error);
    return { ok: false };
  }
}

function telegramUserIsAdminEnv(user: TelegramUserInfo): boolean {
  const adminId = process.env.TELEGRAM_ADMIN_ID;
  return adminId ? String(adminId) === String(user.id) : false;
}

async function notifyTelegramDbLimited(userId: string) {
  try {
    await sendTelegramDirectMessage(
      userId,
      "Сервис временно ограничен. Попробуйте позже или нажмите /start.",
      { inline_keyboard: [[{ text: "Меню", callback_data: "menu:open" }]] }
    );
  } catch (e) {
    console.error("[telegramWebhook] notify db limited failed:", e);
  }
}

async function handleTelegramWebhook(body: unknown): Promise<{ ok: true } | { error: string; message: string }> {
  const update = body as any;
  const callback = update?.callback_query;
  const message = update?.message;
  const from: TelegramUserInfo | undefined = callback?.from || message?.from;
  if (!from?.id) return { ok: true };

  const userId = String(from.id);
  const isAdminEnv = telegramUserIsAdminEnv(from);

  // /start: user-facing sends first (works without DB); then best-effort persist
  if (message?.text?.startsWith("/start")) {
    const parts = message.text.trim().split(/\s+/);
    const startPayload = parts[1] || "";
    try {
      if (startPayload.startsWith("ref")) {
        await sendReferralProgramIntro(userId);
      }
      await sendTelegramDirectMessage(userId, "Привет! Выберите действие:", {
        inline_keyboard: buildMainMenu(isAdminEnv),
      });
    } catch (e) {
      console.error("[telegramWebhook] /start send failed:", e);
    }
    await withTelegramDbOptional(async (db) => {
      await upsertTelegramSubscriber(db, from);
      await setSubscriberState(db, userId, "menu", { calc: { features: [] } });
    });
    return { ok: true };
  }

  const subResult = await withTelegramDbOptional(async (db) => upsertTelegramSubscriber(db, from));
  const subscriber = subResult.ok ? subResult.value : null;
  const isAdmin = subscriber ? subscriber.isAdmin === "true" : isAdminEnv;
  const currentPayload = subscriber ? parseFlowPayload(subscriber.flowPayload) : parseFlowPayload(null);
  const currentState: TelegramFlowState =
    subscriber && isValidFlowState(subscriber.flowState) ? subscriber.flowState : "menu";

  if (message?.text && currentState === "compose_post_waiting_text" && isAdmin) {
    const setOk = await withTelegramDbOptional(async (db) => {
      const payload: TelegramFlowPayload = { ...currentPayload, postText: message.text };
      await setSubscriberState(db, userId, "compose_post_confirm", payload);
    });
    if (!setOk.ok) {
      await notifyTelegramDbLimited(userId);
      return { ok: true };
    }
    try {
      await sendTelegramDirectMessage(userId, `Пост готов к отправке:\n\n${message.text}`, {
        inline_keyboard: [
          [{ text: "Отправить подписчикам", callback_data: "admin:post:confirm" }],
          [{ text: "Отмена", callback_data: "menu:open" }],
        ],
      });
    } catch (e) {
      console.error("[telegramWebhook] compose confirm send failed:", e);
    }
    return { ok: true };
  }

  if (!callback?.id || !callback?.data) return { ok: true };
  try {
    await answerTelegramCallbackQuery(callback.id);
  } catch (e) {
    console.error("[telegramWebhook] answerCallbackQuery failed:", e);
  }

  const data = String(callback.data);
  if (data === "referral:info") {
    try {
      await sendReferralProgramIntro(userId);
      await sendTelegramDirectMessage(userId, "Меню:", { inline_keyboard: buildMainMenu(isAdmin) });
    } catch (e) {
      console.error("[telegramWebhook] referral:info send failed:", e);
    }
    await withTelegramDbOptional(async (db) => {
      await upsertTelegramSubscriber(db, from);
    });
    return { ok: true };
  }

  if (data === "menu:open") {
    await withTelegramDbOptional(async (db) => {
      await setSubscriberState(db, userId, "menu", { calc: { features: [] } });
    });
    try {
      await sendTelegramDirectMessage(userId, "Главное меню:", { inline_keyboard: buildMainMenu(isAdmin) });
    } catch (e) {
      console.error("[telegramWebhook] menu:open send failed:", e);
    }
    return { ok: true };
  }

  if (data === "admin:post:start" && isAdmin) {
    const setOk = await withTelegramDbOptional(async (db) => {
      await setSubscriberState(db, userId, "compose_post_waiting_text", currentPayload);
    });
    if (!setOk.ok) {
      await notifyTelegramDbLimited(userId);
      return { ok: true };
    }
    try {
      await sendTelegramDirectMessage(userId, "Отправьте текст поста одним сообщением.");
    } catch (e) {
      console.error("[telegramWebhook] admin:post:start send failed:", e);
    }
    return { ok: true };
  }

  if (data === "admin:post:confirm" && isAdmin) {
    const text = currentPayload.postText;
    if (!text) return { ok: true };
    const broadcastResult = await withTelegramDbOptional(async (db) => {
      const recipients = await db
        .select()
        .from(telegramSubscribers)
        .where(eq(telegramSubscribers.isActive, "true"));
      const subscriberIds = recipients
        .filter((row: any) => row.telegramUserId !== userId)
        .map((row: any) => String(row.telegramUserId));
      const stats = await sendTelegramBroadcast(subscriberIds, text);
      for (const line of stats.errors) {
        if (line.includes("bot was blocked") || line.includes("chat not found") || line.includes("user is deactivated")) {
          const targetId = line.split(":")[0];
          if (targetId) {
            await db
              .update(telegramSubscribers)
              .set({ isActive: "false", updatedAt: new Date() })
              .where(eq(telegramSubscribers.telegramUserId, targetId));
          }
        }
      }
      await setSubscriberState(db, userId, "menu", { calc: { features: [] } });
      return stats;
    });
    if (!broadcastResult.ok) {
      await notifyTelegramDbLimited(userId);
      return { ok: true };
    }
    const stats = broadcastResult.value;
    try {
      await sendTelegramDirectMessage(
        userId,
        `Рассылка завершена.\nУспешно: ${stats.success}\nОшибки: ${stats.failed}\nЗаблокировали бота: ${stats.blocked}`,
        { inline_keyboard: buildMainMenu(true) }
      );
    } catch (e) {
      console.error("[telegramWebhook] broadcast summary send failed:", e);
    }
    return { ok: true };
  }

  const runCalcStep = async (fn: (db: any) => Promise<void>, send: () => Promise<unknown>) => {
    const ok = await withTelegramDbOptional(fn);
    if (!ok.ok) {
      await notifyTelegramDbLimited(userId);
      return { ok: true as const };
    }
    try {
      await send();
    } catch (e) {
      console.error("[telegramWebhook] calc step send failed:", e);
    }
    return { ok: true as const };
  };

  if (data === "calc:start") {
    return runCalcStep(
      async (db) => {
        await setSubscriberState(db, userId, "calc_project_type", { calc: { features: [] } });
      },
      async () =>
        sendTelegramDirectMessage(userId, "Шаг 1/4. Выберите тип проекта:", {
          inline_keyboard: tgProjectTypes.map((item) => [{ text: item.label, callback_data: `calc:type:${item.id}` }]),
        })
    );
  }

  if (data.startsWith("calc:type:")) {
    const projectType = data.replace("calc:type:", "");
    const payload: TelegramFlowPayload = { calc: { features: [], projectType } };
    return runCalcStep(
      async (db) => {
        await setSubscriberState(db, userId, "calc_features", payload);
      },
      async () => {
        const featureRows = tgFeatures.map((item) => [{ text: item.label, callback_data: `calc:feature:${item.id}` }]);
        featureRows.push([{ text: "Далее", callback_data: "calc:features:done" }]);
        await sendTelegramDirectMessage(userId, "Шаг 2/4. Выберите нужные функции (можно несколько):", {
          inline_keyboard: featureRows,
        });
      }
    );
  }

  if (data.startsWith("calc:feature:")) {
    const featureId = data.replace("calc:feature:", "");
    const selected = new Set(currentPayload.calc?.features || []);
    if (selected.has(featureId)) selected.delete(featureId);
    else selected.add(featureId);
    const payload: TelegramFlowPayload = {
      calc: { ...(currentPayload.calc || { features: [] }), features: Array.from(selected) },
    };
    return runCalcStep(
      async (db) => {
        await setSubscriberState(db, userId, "calc_features", payload);
      },
      async () =>
        sendTelegramDirectMessage(
          userId,
          `Функций выбрано: ${payload.calc?.features.length || 0}. Можно выбрать еще или нажать "Далее".`,
          { inline_keyboard: [[{ text: "Далее", callback_data: "calc:features:done" }]] }
        )
    );
  }

  if (data === "calc:features:done") {
    return runCalcStep(
      async (db) => {
        await setSubscriberState(db, userId, "calc_design", currentPayload);
      },
      async () =>
        sendTelegramDirectMessage(userId, "Шаг 3/4. Выберите сложность дизайна:", {
          inline_keyboard: tgDesign.map((item) => [{ text: item.label, callback_data: `calc:design:${item.id}` }]),
        })
    );
  }

  if (data.startsWith("calc:design:")) {
    const designComplexity = data.replace("calc:design:", "");
    const payload: TelegramFlowPayload = {
      calc: { ...(currentPayload.calc || { features: [] }), designComplexity },
    };
    return runCalcStep(
      async (db) => {
        await setSubscriberState(db, userId, "calc_urgency", payload);
      },
      async () =>
        sendTelegramDirectMessage(userId, "Шаг 4/4. Выберите срочность:", {
          inline_keyboard: tgUrgency.map((item) => [{ text: item.label, callback_data: `calc:urgency:${item.id}` }]),
        })
    );
  }

  if (data.startsWith("calc:urgency:")) {
    const urgency = data.replace("calc:urgency:", "");
    const payload: TelegramFlowPayload = {
      calc: { ...(currentPayload.calc || { features: [] }), urgency },
    };
    return runCalcStep(
      async (db) => {
        await setSubscriberState(db, userId, "calc_result", payload);
      },
      async () =>
        sendTelegramDirectMessage(userId, formatEstimateSummary(payload.calc), {
          inline_keyboard: [
            [{ text: "Новый расчет", callback_data: "calc:start" }],
            [{ text: "Меню", callback_data: "menu:open" }],
          ],
        })
    );
  }

  return { ok: true };
}

/**
 * Handle contact form submission
 */
async function handleContact(
  body: unknown,
  db: any
): Promise<{ success: true; id: string } | { error: string; message: string }> {
  const parseResult = contactFormSchema.safeParse(body);

  if (!parseResult.success) {
    return {
      error: "Validation error",
      message: parseResult.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  const { name, email, message, referralCode, referrerTelegramId, referrerUsername, referralSource } = parseResult.data;
  const scoring = calculateContactScoring(message);

  try {
    const lead = await db
      .insert(leads)
      .values({
        id: randomUUID(),
        type: "contact",
        status: "new",
        scoring,
        name,
        email,
        message,
        referralCode: referralCode || null,
        referrerTelegramId: referrerTelegramId || null,
        referrerUsername: normalizeReferralUsername(referrerUsername),
        referralSource: referralSource || null,
        projectStatus: "lead",
      })
      .returning();

    // Send Telegram notification (non-blocking)
    sendContactToTelegram({
      name,
      email,
      message,
      scoring,
      referralCode: referralCode || undefined,
      referrerTelegramId: referrerTelegramId || undefined,
      referrerUsername: normalizeReferralUsername(referrerUsername) || undefined,
    }).catch((error) => {
      console.error("Failed to send Telegram notification:", error);
    });

    return { success: true, id: lead[0].id };
  } catch (error) {
    console.error("Failed to store contact lead:", error);
    return {
      error: "Database error",
      message: "Не удалось сохранить сообщение",
    };
  }
}

/**
 * Handle estimation request
 */
async function handleEstimate(
  body: unknown,
  db: any
): Promise<{ success: true; id: string } | { error: string; message: string }> {
  const parsedBody = body as Record<string, unknown>;
  const { estimation, ...requestData } = parsedBody as {
    estimation?: {
      minPrice: number;
      maxPrice: number;
      minDays: number;
      maxDays: number;
    };
  };

  const parseResult = estimationRequestSchema.safeParse(requestData);

  if (!parseResult.success) {
    return {
      error: "Validation error",
      message: parseResult.error.issues.map((issue) => issue.message).join("; "),
    };
  }

  if (!estimation || typeof estimation.minPrice !== "number" || typeof estimation.maxPrice !== "number") {
    return {
      error: "Validation error",
      message: "Estimation data is required",
    };
  }

  const data = parseResult.data;
  const scoring = calculateEstimationScoring({
    budget: data.budget,
    projectType: data.projectType,
    urgency: data.urgency,
    features: data.features,
    description: data.description,
  });

  try {
    const insertData: InsertLead = {
      type: "estimation",
      status: "new",
      scoring,
      name: data.contactName,
      email: data.contactEmail,
      telegram: data.contactTelegram || null,
      projectType: data.projectType,
      features: data.features,
      designComplexity: data.designComplexity,
      urgency: data.urgency,
      budget: data.budget || null,
      description: data.description || null,
      estimatedMinPrice: estimation.minPrice,
      estimatedMaxPrice: estimation.maxPrice,
      estimatedMinDays: estimation.minDays,
      estimatedMaxDays: estimation.maxDays,
      referralCode: data.referralCode || null,
      referrerTelegramId: data.referrerTelegramId || null,
      referrerUsername: normalizeReferralUsername(data.referrerUsername),
      referralSource: data.referralSource || null,
      projectStatus: "lead",
    };

    const lead = await db
      .insert(leads)
      .values({ id: randomUUID(), ...insertData })
      .returning();

    // Send Telegram notification (non-blocking)
    sendEstimateToTelegram({
      name: data.contactName,
      email: data.contactEmail,
      telegram: data.contactTelegram || undefined,
      projectType: data.projectType,
      features: data.features,
      designComplexity: data.designComplexity,
      urgency: data.urgency,
      budget: data.budget || undefined,
      description: data.description || undefined,
      scoring,
      estimation: {
        minPrice: estimation.minPrice,
        maxPrice: estimation.maxPrice,
        minDays: estimation.minDays,
        maxDays: estimation.maxDays,
      },
      referralCode: data.referralCode || undefined,
      referrerTelegramId: data.referrerTelegramId || undefined,
      referrerUsername: normalizeReferralUsername(data.referrerUsername) || undefined,
    }).catch((error) => {
      console.error("Failed to send Telegram notification:", error);
    });

    return { success: true, id: lead[0].id };
  } catch (error) {
    console.error("Failed to store estimation lead:", error);
    return {
      error: "Database error",
      message: "Не удалось сохранить заявку",
    };
  }
}

/**
 * Handle admin login
 */
async function handleLogin(
  body: unknown
): Promise<
  { success: true; token: string } | { error: string; message: string; code?: string }
> {
  try {
    const parsedBody = body as { login?: string; password?: string };

    if (!parsedBody?.login || !parsedBody?.password) {
      return {
        error: "Validation error",
        message: "Login and password are required",
      };
    }

    const login = String(parsedBody.login).trim();
    const password = String(parsedBody.password).trim();
    const envLogin = normalizeEnvSecret(process.env.ADMIN_LOGIN);
    const envPassword = normalizeEnvSecret(process.env.ADMIN_PASSWORD);

    const issueEnvToken = () => {
      const tokenData = `env-admin:${Date.now()}`;
      return Buffer.from(tokenData).toString("base64");
    };

    // 1) Env credentials first — works even if DB is down (required on Vercel for reliable admin access)
    if (envLogin && envPassword && login === envLogin && password === envPassword) {
      console.info("[api] login_success_env", { login });
      return { success: true, token: issueEnvToken() };
    }

    // 2) Database users (bcryptjs — no native addon, stable on serverless)
    try {
      const token = await withDb(async (db) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, login))
          .limit(1);

        if (!user) return null;
        const isPasswordValid = await bcryptjs.compare(password, user.password);
        if (!isPasswordValid) return null;
        return Buffer.from(`${user.id}:${Date.now()}`).toString("base64");
      });

      if (token) {
        console.info("[api] login_success_db", { login });
        return { success: true, token };
      }
    } catch (error) {
      console.error("[api] login_db_error", error);
      return {
        error: "Service error",
        message: "Сервис авторизации временно недоступен. Попробуйте позже.",
        code: "db_unavailable",
      };
    }

    console.warn("[api] login_failed", { login, reason: "invalid_credentials" });
    return {
      error: "Authentication error",
      message: "Неверный логин или пароль",
    };
  } catch (error) {
    console.error("[api] login_unexpected", error);
    return {
      error: "Service error",
      message: "Сервис авторизации временно недоступен. Попробуйте позже.",
      code: "login_unexpected",
    };
  }
}

async function handleHealthCheck() {
  const payload: Record<string, unknown> = {
    ok: true,
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED),
      hasAdminEnvCredentials: Boolean(
        normalizeEnvSecret(process.env.ADMIN_LOGIN) && normalizeEnvSecret(process.env.ADMIN_PASSWORD)
      ),
      hasTelegramBotToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      hasTelegramAdminId: Boolean(process.env.TELEGRAM_ADMIN_ID),
      hasTelegramChatId: Boolean(process.env.TELEGRAM_CHAT_ID),
      hasTelegramReferralImageUrl: Boolean(process.env.TELEGRAM_REFERRAL_IMAGE_URL?.trim()),
    },
    db: {
      connected: false,
    },
  };

  try {
    await withDb(async (db) => {
      await db.select().from(users).limit(1);
    });
    payload.db = { connected: true };
  } catch (error) {
    payload.db = {
      connected: false,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }

  return payload;
}

/**
 * Handle get contacts (GET request)
 */
async function handleGetContacts(
  db: any
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const contacts = await db
      .select()
      .from(leads)
      .where(eq(leads.type, "contact"))
      .orderBy(desc(leads.createdAt));

    return { success: true, data: contacts };
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список контактов",
    };
  }
}

/**
 * Handle get estimates (GET request)
 */
async function handleGetEstimates(
  db: any
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const estimates = await db
      .select()
      .from(leads)
      .where(eq(leads.type, "estimation"))
      .orderBy(desc(leads.createdAt));

    return { success: true, data: estimates };
  } catch (error) {
    console.error("Failed to fetch estimates:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список оценок",
    };
  }
}

/**
 * Handle get all requests (GET request) - combines contacts and estimates
 */
async function handleGetRequests(
  db: any
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const allLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt));

    return { success: true, data: allLeads };
  } catch (error) {
    console.error("Failed to fetch requests:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список заявок",
    };
  }
}

/**
 * Handle get projects (GET request)
 */
async function handleGetProjects(
  db: any
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const allProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));

    return { success: true, data: allProjects };
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список проектов",
    };
  }
}

/**
 * Handle get analytics (GET request)
 */
import type { Lead } from "../shared/schema";

async function handleGetAnalytics(
  db: any
): Promise<{ success: true; data: unknown } | { error: string; message: string }> {
  try {
    const allLeads = (await (db as any).select().from(leads)) as Lead[];
    const allRewards = await (db as any).select().from(referralRewards);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = allLeads.filter((lead: Lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= thisMonthStart;
    });

    const lastMonth = allLeads.filter((lead: Lead) => {
      const leadDate = new Date(lead.createdAt);
      return leadDate >= lastMonthStart && leadDate <= lastMonthEnd;
    });

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScoring: Record<string, number> = {};

    allLeads.forEach((lead: Lead) => {
      byType[lead.type] = (byType[lead.type] || 0) + 1;
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
      byScoring[lead.scoring] = (byScoring[lead.scoring] || 0) + 1;
    });

    // Calculate average price for estimates
    const estimates = allLeads.filter(
      (lead: Lead) => lead.type === "estimation" && lead.estimatedMinPrice && lead.estimatedMaxPrice
    );
    const avgMinPrice =
      estimates.length > 0
        ? Math.round(
            estimates.reduce((sum: number, lead: Lead) => sum + (lead.estimatedMinPrice || 0), 0) / estimates.length
          )
        : 0;
    const avgMaxPrice =
      estimates.length > 0
        ? Math.round(
            estimates.reduce((sum: number, lead: Lead) => sum + (lead.estimatedMaxPrice || 0), 0) / estimates.length
          )
        : 0;

    // Most popular project types
    const projectTypeCounts: Record<string, number> = {};
    allLeads.forEach((lead: Lead) => {
      if (lead.projectType) {
        projectTypeCounts[lead.projectType] = (projectTypeCounts[lead.projectType] || 0) + 1;
      }
    });

    const analytics = {
      total: allLeads.length,
      byType,
      byStatus,
      byScoring,
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      avgMinPrice,
      avgMaxPrice,
      projectTypeCounts,
      referral: {
        leadsWithReferral: allLeads.filter((lead: Lead) => !!lead.referrerTelegramId || !!lead.referralCode).length,
        rewardsTotal: allRewards.length,
        rewardsApproved: allRewards.filter((reward: any) => reward.status === "approved").length,
        rewardsPaid: allRewards.filter((reward: any) => reward.status === "paid").length,
        rewardsPending: allRewards.filter((reward: any) => reward.status === "pending").length,
        totalRewardAmount: allRewards.reduce((sum: number, reward: any) => sum + (reward.rewardAmount || 0), 0),
      },
    };

    return { success: true, data: analytics };
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return {
      error: "Database error",
      message: "Не удалось получить аналитику",
    };
  }
}

/**
 * Handle update lead status (PATCH request)
 */
async function handleUpdateLeadStatus(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as { id?: string; status?: string };

  if (!parsedBody?.id || !parsedBody?.status) {
    return {
      error: "Validation error",
      message: "id and status are required",
    };
  }

  const validStatuses = ["new", "in_progress", "closed"];
  if (!validStatuses.includes(parsedBody.status)) {
    return {
      error: "Validation error",
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    };
  }

  try {
    await db
      .update(leads)
      .set({ status: parsedBody.status, updatedAt: new Date() })
      .where(eq(leads.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to update lead status:", error);
    return {
      error: "Database error",
      message: "Не удалось обновить статус заявки",
    };
  }
}

async function handleUpdateProjectLifecycle(
  body: unknown,
  db: any
): Promise<{ success: true; rewardCreated: boolean } | { error: string; message: string }> {
  const parsedBody = body as {
    id?: string;
    projectStatus?: ProjectStatus;
    projectFinalAmount?: unknown;
  };

  if (!parsedBody?.id || !parsedBody?.projectStatus) {
    return {
      error: "Validation error",
      message: "id and projectStatus are required",
    };
  }

  if (!projectStatusOptions.includes(parsedBody.projectStatus)) {
    return {
      error: "Validation error",
      message: `Invalid projectStatus. Must be one of: ${projectStatusOptions.join(", ")}`,
    };
  }

  const updates: Record<string, unknown> = { projectStatus: parsedBody.projectStatus, updatedAt: new Date() };
  if (parsedBody.projectFinalAmount !== undefined) {
    const parsedAmount = parsePositiveInt(parsedBody.projectFinalAmount);
    if (parsedAmount === null) {
      return {
        error: "Validation error",
        message: "projectFinalAmount must be a positive integer",
      };
    }
    updates.projectFinalAmount = parsedAmount;
  }

  try {
    await db.update(leads).set(updates).where(eq(leads.id, parsedBody.id));
    const rewardResult = await syncReferralRewardForLead(db, parsedBody.id);

    if (
      rewardResult.updated &&
      (parsedBody.projectStatus === "paid" || parsedBody.projectStatus === "closed") &&
      rewardResult.rewardStatus === "approved" &&
      rewardResult.referrerTelegramId
    ) {
      const usernamePart = rewardResult.referrerUsername ? ` (${rewardResult.referrerUsername})` : "";
      const text = [
        "🎉 Реферальный бонус подтвержден",
        "",
        `Ваш клиент по заявке #${parsedBody.id.slice(0, 8)} успешно оплатил и принял проект.`,
        `Сумма выплаты: ${new Intl.NumberFormat("ru-RU").format(rewardResult.rewardAmount)} ₽`,
        `Ставка: 20%`,
        "",
        "Статус: approved (готово к выплате)",
        `Реферер: ${rewardResult.referrerTelegramId}${usernamePart}`,
      ].join("\n");
      await sendTelegramDirectMessage(rewardResult.referrerTelegramId, text);
    }

    return { success: true, rewardCreated: rewardResult.updated };
  } catch (error) {
    console.error("Failed to update project lifecycle:", error);
    return {
      error: "Database error",
      message: "Не удалось обновить жизненный цикл проекта",
    };
  }
}

/**
 * Handle get unread count (GET request)
 */
async function handleGetUnreadCount(
  db: any
): Promise<{ success: true; count: number } | { error: string; message: string }> {
  try {
    const unreadLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.status, "new"));

    return { success: true, count: unreadLeads.length };
  } catch (error) {
    console.error("Failed to fetch unread count:", error);
    return {
      error: "Database error",
      message: "Не удалось получить количество непрочитанных заявок",
    };
  }
}

async function handleGetReferralRewards(
  db: any
): Promise<{ success: true; data: unknown[] } | { error: string; message: string }> {
  try {
    const rewards = await db.select().from(referralRewards).orderBy(desc(referralRewards.createdAt));
    return { success: true, data: rewards };
  } catch (error) {
    console.error("Failed to fetch referral rewards:", error);
    return {
      error: "Database error",
      message: "Не удалось получить список реферальных бонусов",
    };
  }
}

/**
 * Handle mark as read (PATCH request)
 */
async function handleMarkAsRead(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as { id?: string };

  if (!parsedBody?.id) {
    return {
      error: "Validation error",
      message: "id is required",
    };
  }

  try {
    // Mark as in_progress if it's new
    await db
      .update(leads)
      .set({ status: "in_progress", updatedAt: new Date() })
      .where(eq(leads.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to mark as read:", error);
    return {
      error: "Database error",
      message: "Не удалось отметить заявку как прочитанную",
    };
  }
}

/**
 * Handle add project (POST request)
 */
async function handleAddProject(
  body: unknown,
  db: any
): Promise<{ success: true; id: string } | { error: string; message: string }> {
  const parsedBody = body as {
    title?: string;
    description?: string;
    fullDescription?: string;
    image?: string;
    technologies?: string[];
    liveUrl?: string;
    problems?: string;
    solutions?: string;
  };

  if (!parsedBody?.title || !parsedBody?.description || !parsedBody?.fullDescription || !parsedBody?.image) {
    return {
      error: "Validation error",
      message: "title, description, fullDescription, and image are required",
    };
  }

  try {
    const project = await db
      .insert(projects)
      .values({
        id: randomUUID(),
        title: parsedBody.title,
        description: parsedBody.description,
        fullDescription: parsedBody.fullDescription,
        image: parsedBody.image,
        technologies: parsedBody.technologies || [],
        liveUrl: parsedBody.liveUrl || null,
        problems: parsedBody.problems || null,
        solutions: parsedBody.solutions || null,
        sortOrder: 0,
        isVisible: "true",
      })
      .returning();

    return { success: true, id: project[0].id };
  } catch (error) {
    console.error("Failed to add project:", error);
    return {
      error: "Database error",
      message: "Не удалось добавить проект",
    };
  }
}

/**
 * Handle update project (PATCH request)
 */
async function handleUpdateProject(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as {
    id?: string;
    title?: string;
    description?: string;
    fullDescription?: string;
    image?: string;
    technologies?: string[];
    liveUrl?: string;
    problems?: string;
    solutions?: string;
  };

  if (!parsedBody?.id) {
    return {
      error: "Validation error",
      message: "id is required",
    };
  }

  try {
    const updateData: Partial<InsertProject> = {};
    if (parsedBody.title) updateData.title = parsedBody.title;
    if (parsedBody.description) updateData.description = parsedBody.description;
    if (parsedBody.fullDescription) updateData.fullDescription = parsedBody.fullDescription;
    if (parsedBody.image) updateData.image = parsedBody.image;
    if (parsedBody.technologies) updateData.technologies = parsedBody.technologies;
    if (parsedBody.liveUrl !== undefined) updateData.liveUrl = parsedBody.liveUrl || null;
    if (parsedBody.problems !== undefined) updateData.problems = parsedBody.problems || null;
    if (parsedBody.solutions !== undefined) updateData.solutions = parsedBody.solutions || null;

    await db
      .update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to update project:", error);
    return {
      error: "Database error",
      message: "Не удалось обновить проект",
    };
  }
}

/**
 * Handle delete project (DELETE request via PATCH)
 */
async function handleDeleteProject(
  body: unknown,
  db: any
): Promise<{ success: true } | { error: string; message: string }> {
  const parsedBody = body as { id?: string };

  if (!parsedBody?.id) {
    return {
      error: "Validation error",
      message: "id is required",
    };
  }

  try {
    await db
      .delete(projects)
      .where(eq(projects.id, parsedBody.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to delete project:", error);
    return {
      error: "Database error",
      message: "Не удалось удалить проект",
    };
  }
}

/**
 * Handle upload image (POST request with base64 encoded image)
 * Accepts JSON body: { image: "data:image/png;base64,..." } or { image: "base64string" }
 */
async function handleUploadImage(
  body: unknown
): Promise<{ success: true; url: string } | { error: string; message: string; statusCode?: number }> {
  console.log("[uploadImage] Starting image upload handler");
  
  // CRITICAL: Check BLOB token availability at the start for debugging
  // Use ONLY BLOB_READ_WRITE_TOKEN (not VERCEL_BLOB_READ_WRITE_TOKEN)
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  
  // Explicit logging as requested
  console.log("[uploadImage] BLOB token present:", !!blobToken);
  console.log("[uploadImage] BLOB_READ_WRITE_TOKEN value:", blobToken ? `${blobToken.substring(0, 10)}...` : "true");
  
  // Log all environment variables that contain "BLOB" or "VERCEL" for debugging
  const blobRelatedVars = Object.keys(process.env).filter(
    (k) => k.includes("BLOB") || k.includes("VERCEL")
  );
  console.log("[uploadImage] All BLOB/VERCEL related env vars:", blobRelatedVars);
  
  // Log all process.env keys to see what's available (for debugging only)
  const allEnvKeys = Object.keys(process.env).sort();
  console.log("[uploadImage] Total env vars count:", allEnvKeys.length);
  console.log("[uploadImage] Sample env vars (first 20):", allEnvKeys.slice(0, 20));
  
  // Check if BLOB_READ_WRITE_TOKEN exists (must be exact name, not VERCEL_BLOB_READ_WRITE_TOKEN)
  if (!blobToken) {
    console.error("[uploadImage] BLOB_READ_WRITE_TOKEN is not set in environment variables");
    console.error("[uploadImage] Available env vars with BLOB/VERCEL:", blobRelatedVars);
    console.error("[uploadImage] NOTE: Variable must be named exactly 'BLOB_READ_WRITE_TOKEN' (not 'VERCEL_BLOB_READ_WRITE_TOKEN')");
    return {
      error: "Configuration error",
      message: "BLOB_READ_WRITE_TOKEN is missing. Please add it to Vercel environment variables with the exact name 'BLOB_READ_WRITE_TOKEN' (not 'VERCEL_BLOB_READ_WRITE_TOKEN') and redeploy. Check that it's set for Production/Preview environments.",
      statusCode: 500,
    };
  }
  
  console.log("[uploadImage] Using token: BLOB_READ_WRITE_TOKEN");
  console.log("[uploadImage] Token length:", blobToken.length, "chars");
  console.log("[uploadImage] Token preview:", `${blobToken.substring(0, 15)}...${blobToken.substring(blobToken.length - 5)}`);
  
  try {
    const parsedBody = body as { image?: string };

    // Validate that image is provided
    if (!parsedBody?.image || typeof parsedBody.image !== "string") {
      console.error("[uploadImage] Validation failed: image field missing or invalid");
      console.error("[uploadImage] Received body:", JSON.stringify(parsedBody).substring(0, 200));
      return {
        error: "Validation error",
        message: "Image data is required. Expected: { image: 'data:image/png;base64,...' }",
        statusCode: 400,
      };
    }

    console.log("[uploadImage] Image data received, length:", parsedBody.image.length);

    let base64Data: string;
    let fileContentType = "image/jpeg"; // Default

    // Parse data URL format: "data:image/png;base64,iVBORw0KGgo..."
    if (parsedBody.image.includes(",")) {
      const [header, data] = parsedBody.image.split(",");
      base64Data = data;

      // Extract content type from header: "data:image/png;base64"
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        fileContentType = mimeMatch[1];
      }
      console.log("[uploadImage] Parsed data URL, content type:", fileContentType);
    } else {
      // Assume it's raw base64 string
      base64Data = parsedBody.image;
      console.log("[uploadImage] Raw base64 string detected, using default content type:", fileContentType);
    }

    // Validate content type
    if (!fileContentType.startsWith("image/")) {
      console.error("[uploadImage] Invalid content type:", fileContentType);
      return {
        error: "Validation error",
        message: "File must be an image. Supported formats: image/jpeg, image/png, image/gif, image/webp",
        statusCode: 400,
      };
    }

    // Decode base64 to Buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(base64Data, "base64");
      console.log("[uploadImage] Base64 decoded successfully, buffer size:", fileBuffer.length, "bytes");
    } catch (decodeError) {
      console.error("[uploadImage] Failed to decode base64:", decodeError);
      if (decodeError instanceof Error) {
        console.error("[uploadImage] Decode error details:", decodeError.message, decodeError.stack);
      }
      return {
        error: "Validation error",
        message: "Invalid base64 image data",
        statusCode: 400,
      };
    }

    // Validate file size (max 4MB)
    if (fileBuffer.length > 4 * 1024 * 1024) {
      console.error("[uploadImage] File too large:", fileBuffer.length, "bytes");
      return {
        error: "File too large",
        message: `File size (${Math.round(fileBuffer.length / 1024)}KB) exceeds maximum allowed size of 4MB`,
        statusCode: 413,
      };
    }

    // Validate that buffer is not empty
    if (fileBuffer.length === 0) {
      console.error("[uploadImage] Empty buffer detected");
      return {
        error: "Validation error",
        message: "Image data is empty",
        statusCode: 400,
      };
    }

    // Generate unique filename with appropriate extension
    const extension = fileContentType.split("/")[1] || "jpg";
    const filename = `projects/${randomUUID()}.${extension}`;
    console.log("[uploadImage] Generated filename:", filename);

    // Upload to Vercel Blob
    // Explicitly pass token to ensure it's used correctly
    let blob;
    try {
      console.log("[uploadImage] Attempting to upload to Vercel Blob...");
      console.log("[uploadImage] Token available for upload:", !!blobToken);
      console.log("[uploadImage] Filename:", filename);
      console.log("[uploadImage] Buffer size:", fileBuffer.length, "bytes");
      console.log("[uploadImage] Content type:", fileContentType);
      
      // Explicitly pass token to put() function
      blob = await put(filename, fileBuffer, {
        access: "public",
        contentType: fileContentType,
        token: blobToken, // Explicitly pass token to ensure it's used
      });
      console.log("[uploadImage] Upload successful! URL:", blob.url);
    } catch (blobError) {
      console.error("[uploadImage] Failed to upload to Vercel Blob");
      console.error("[uploadImage] Error type:", blobError?.constructor?.name);
      console.error("[uploadImage] Error message:", blobError instanceof Error ? blobError.message : String(blobError));
      console.error("[uploadImage] Error stack:", blobError instanceof Error ? blobError.stack : "No stack trace");
      
      // Check if it's a token/authentication error
      if (blobError instanceof Error) {
        const errorMsg = blobError.message.toLowerCase();
        if (errorMsg.includes("token") || errorMsg.includes("unauthorized") || errorMsg.includes("forbidden") || errorMsg.includes("401") || errorMsg.includes("403")) {
          console.error("[uploadImage] Token authentication error detected");
          return {
            error: "Configuration error",
            message: "BLOB_READ_WRITE_TOKEN is invalid or expired. Please check Vercel environment variables and regenerate the token if needed.",
            statusCode: 500,
          };
        }
      }

      return {
        error: "Upload error",
        message: `Failed to upload image to storage: ${blobError instanceof Error ? blobError.message : "Unknown error"}`,
        statusCode: 500,
      };
    }

    console.log("[uploadImage] Upload completed successfully");
    return { success: true, url: blob.url };
  } catch (error) {
    console.error("[uploadImage] Unexpected error in upload handler");
    console.error("[uploadImage] Error type:", error?.constructor?.name);
    console.error("[uploadImage] Error message:", error instanceof Error ? error.message : String(error));
    console.error("[uploadImage] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Provide detailed error message
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return {
      error: "Upload error",
      message: `Не удалось загрузить изображение: ${errorMessage}`,
      statusCode: 500,
    };
  }
}

/**
 * Main handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    setCorsHeaders(res);
    res.status(200).end();
    return;
  }

  // Allow GET, POST, PATCH, and DELETE
  if (req.method !== "POST" && req.method !== "GET" && req.method !== "PATCH" && req.method !== "DELETE") {
    setCorsHeaders(res);
    res.status(405).setHeader("Allow", "GET, POST, PATCH, DELETE").end();
    return;
  }

  setCorsHeaders(res);

  // Get action from query parameter
  let action: string | null = null;
  
  // Try req.query first (Vercel may parse it automatically)
  if (req.query?.action && typeof req.query.action === "string") {
    action = req.query.action;
  } else if (req.url) {
    // Parse from URL manually
    try {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      action = url.searchParams.get("action");
    } catch {
      // Fallback: try to extract from query string directly
      const match = req.url.match(/[?&]action=([^&]+)/);
      action = match ? decodeURIComponent(match[1]) : null;
    }
  }

  if (!action || typeof action !== "string") {
    return sendJson(res, 400, {
      error: "Missing action",
          message: "Query parameter 'action' is required. Valid actions: contact, estimate, login, health, getContacts, getEstimates, getRequests, getAnalytics, getUnreadCount, getProjects, getReferralRewards, updateLeadStatus, updateProjectLifecycle, markAsRead, addProject, uploadImage, telegramWebhook",
    });
  }

  // Log request method and action for debugging
  console.log(`[API] ${req.method} request for action: ${action}`);
  
  // Log BLOB token availability at handler level for debugging
  if (action === "uploadImage") {
    console.log("[API] BLOB token present:", !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log("[API] BLOB_READ_WRITE_TOKEN exists:", typeof process.env.BLOB_READ_WRITE_TOKEN !== "undefined");
  }

  try {
    // Handle GET requests (getContacts, getEstimates)
    if (req.method === "GET") {
      let result: { success: true; data: unknown } | { error: string; message: string };

      switch (action) {
        case "getContacts": {
          result = await withDb(async (db) => handleGetContacts(db));
          break;
        }
        case "getEstimates": {
          result = await withDb(async (db) => handleGetEstimates(db));
          break;
        }
        case "getRequests": {
          result = await withDb(async (db) => handleGetRequests(db));
          break;
        }
        case "getAnalytics": {
          result = await withDb(async (db) => handleGetAnalytics(db));
          break;
        }
        case "getUnreadCount": {
          const countResult = await withDb(async (db) => handleGetUnreadCount(db));
          if ("success" in countResult && countResult.success) {
            return sendJson(res, 200, { count: countResult.count });
          } else {
            return sendJson(res, 500, countResult);
          }
        }
        case "getProjects": {
          result = await withDb(async (db) => handleGetProjects(db));
          break;
        }
        case "getReferralRewards": {
          result = await withDb(async (db) => handleGetReferralRewards(db));
          break;
        }
        case "health": {
          const health = await handleHealthCheck();
          return sendJson(res, 200, health);
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown GET action: ${action}. Valid GET actions: health, getContacts, getEstimates, getRequests, getAnalytics, getUnreadCount, getProjects, getReferralRewards`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, result.data);
      } else {
        const errorResult = result as { error: string; message: string };
        const status = errorResult.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, errorResult);
      }
    }

    // Handle DELETE requests (deleteProject)
    if (req.method === "DELETE") {
      const body = await parseJsonBody(req);
      let result: { success: true } | { error: string; message: string };

      switch (action) {
        case "deleteProject": {
          result = await withDb(async (db) => handleDeleteProject(body, db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown DELETE action: ${action}. Valid DELETE actions: deleteProject`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, { success: true });
      } else {
        const errorResult = result as { error: string; message: string };
        const status = errorResult.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, errorResult);
      }
    }

    // Handle PATCH requests (updateLeadStatus, markAsRead, updateProject)
    if (req.method === "PATCH") {
      const body = await parseJsonBody(req);
      let result: { success: true } | { error: string; message: string };

      switch (action) {
        case "updateLeadStatus": {
          result = await withDb(async (db) => handleUpdateLeadStatus(body, db));
          break;
        }
        case "markAsRead": {
          result = await withDb(async (db) => handleMarkAsRead(body, db));
          break;
        }
        case "updateProjectLifecycle": {
          result = await withDb(async (db) => handleUpdateProjectLifecycle(body, db));
          break;
        }
        case "updateProject": {
          result = await withDb(async (db) => handleUpdateProject(body, db));
          break;
        }
        default: {
          return sendJson(res, 400, {
            error: "Invalid action",
            message: `Unknown PATCH action: ${action}. Valid PATCH actions: updateLeadStatus, updateProjectLifecycle, markAsRead, updateProject`,
          });
        }
      }

      if ("success" in result && result.success) {
        return sendJson(res, 200, { success: true });
      } else {
        const errorResult = result as { error: string; message: string };
        const status = errorResult.error === "Validation error" ? 400 : 500;
        return sendJson(res, status, errorResult);
      }
    }

    // Handle POST requests (contact, estimate, login, addProject, uploadImage, telegramWebhook)
    const body = await parseJsonBody(req);

    // Special handling for uploadImage (base64 JSON)
    if (action === "uploadImage") {
      const uploadResult = await handleUploadImage(body);
      if ("success" in uploadResult && uploadResult.success) {
        return sendJson(res, 200, uploadResult);
      } else {
        const errorResult = uploadResult as { error: string; message: string; statusCode?: number };
        const statusCode = errorResult.statusCode || 400;
        return sendJson(res, statusCode, {
          error: errorResult.error,
          message: errorResult.message,
        });
      }
    }

    if (action === "telegramWebhook") {
      try {
        const webhookResult = await handleTelegramWebhook(body);
        if ("ok" in webhookResult && webhookResult.ok) {
          return sendJson(res, 200, { ok: true });
        }
        console.error("[telegramWebhook] unexpected result:", webhookResult);
      } catch (e) {
        console.error("[telegramWebhook] fatal:", e);
      }
      return sendJson(res, 200, { ok: true });
    }

    // Route to appropriate handler using on-demand DB connection
    let result: { success: true; id?: string; token?: string } | { error: string; message: string };

    switch (action) {
      case "contact": {
        result = await withDb(async (db) => handleContact(body, db));
        break;
      }
      case "estimate": {
        result = await withDb(async (db) => handleEstimate(body, db));
        break;
      }
      case "login": {
        result = await handleLogin(body);
        break;
      }
      case "addProject": {
        result = await withDb(async (db) => handleAddProject(body, db));
        break;
      }
      default: {
        return sendJson(res, 400, {
          error: "Invalid action",
          message: `Unknown POST action: ${action}. Valid POST actions: contact, estimate, login, addProject, uploadImage, telegramWebhook`,
        });
      }
    }

    // Send response
    if ("success" in result && result.success) {
      if (action === "contact" || action === "estimate") {
        return sendJson(res, 201, {
          success: true,
          message: action === "contact" ? "Сообщение успешно отправлено" : "Заявка успешно отправлена",
          id: result.id,
        });
      } else if (action === "addProject") {
        return sendJson(res, 201, {
          success: true,
          message: "Проект успешно добавлен",
          id: result.id,
        });
      } else {
        // Login action - return token
        return sendJson(res, 200, {
          success: true,
          message: "Вход выполнен успешно",
          token: result.token,
        });
      }
    } else {
      const errorResult = result as { error: string; message: string; code?: string };
      const status =
        errorResult.error === "Validation error"
          ? 400
          : errorResult.error === "Authentication error"
            ? 401
            : errorResult.error === "Service error"
              ? 503
              : 500;
      return sendJson(res, status, errorResult);
    }
  } catch (error) {
    console.error(`Error handling action '${action}':`, error);
    return sendJson(res, 500, {
      error: "Internal server error",
      message: "Произошла ошибка при обработке запроса",
    });
  }
}
