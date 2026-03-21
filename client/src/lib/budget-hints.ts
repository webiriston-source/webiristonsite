export type BudgetHint = {
  title: string;
  details: string;
};

function extractBudgetValue(rawBudget?: string): number | null {
  if (!rawBudget) return null;
  const normalized = rawBudget.toLowerCase().replace(/\s+/g, "").replace(/,/g, ".");
  const multiplier = normalized.includes("млн") || normalized.includes("million") ? 1000000 : 1000;
  const matches = normalized.match(/\d+(\.\d+)?/g);
  if (!matches?.length) return null;
  const maxNumber = Math.max(...matches.map((item) => Number(item)).filter((value) => Number.isFinite(value)));
  if (!Number.isFinite(maxNumber)) return null;

  // If user entered "100", we treat it as "100k" in typical project budget context.
  return maxNumber < 10000 ? Math.round(maxNumber * multiplier) : Math.round(maxNumber);
}

export function getBudgetHints(rawBudget?: string): BudgetHint[] {
  const budget = extractBudgetValue(rawBudget);
  if (!budget) {
    return [
      {
        title: "Укажите ориентир бюджета",
        details: "Например: 120 000, 300k или 1 млн. Мы покажем реалистичный вариант работ под этот бюджет.",
      },
    ];
  }

  if (budget < 120000) {
    return [
      { title: "MVP-лендинг", details: "Продающий лендинг, базовая аналитика и форма заявки." },
      { title: "Быстрый старт", details: "Сфокусируемся на главном функционале и поэтапном развитии." },
    ];
  }
  if (budget < 300000) {
    return [
      { title: "Корпоративный сайт", details: "Многостраничный сайт, CMS, SEO-базис и интеграция с мессенджерами." },
      { title: "MVP веб-сервиса", details: "Ключевые роли, простая админка и базовые бизнес-сценарии." },
    ];
  }
  if (budget < 700000) {
    return [
      { title: "Продвинутый продукт", details: "Личный кабинет, интеграции (CRM/API), расширенная аналитика." },
      { title: "Интернет-магазин", details: "Каталог, корзина, оплата и процессы управления заказами." },
    ];
  }

  return [
    { title: "Полноценный digital-продукт", details: "Глубокая проработка UX, масштабируемая архитектура, DevOps-практики." },
    { title: "Поэтапный roadmap", details: "MVP -> релиз -> развитие с приоритетом на ROI и скорость вывода на рынок." },
  ];
}
