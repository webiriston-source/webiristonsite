# Исправления админ-панели и форм

## ✅ Что было исправлено:

### 1. **Раздел «Заявки» (`/admin/leads`)**
- ✅ Добавлен API эндпоинт `getRequests` в `api/index.ts`
- ✅ Обновлена страница `client/src/pages/admin/leads.tsx` для использования `/api/?action=getRequests`
- ✅ Добавлен обработчик `updateLeadStatus` для изменения статуса заявок через PATCH запрос
- ✅ Теперь заявки отображаются корректно с фильтрацией и поиском

### 2. **Аналитика (`/admin/analytics`)**
- ✅ Добавлен API эндпоинт `getAnalytics` в `api/index.ts`
- ✅ Обновлена страница `client/src/pages/admin/analytics.tsx` для использования `/api/?action=getAnalytics`
- ✅ Аналитика теперь показывает:
  - Общую статистику (всего заявок, рост, конверсия)
  - Распределение по типам, статусам, scoring
  - Средние цены оценок
  - Популярные типы проектов

### 3. **Форма «Оценка проекта»**
- ✅ Форма уже отправляет все поля:
  - `projectType`, `features`, `designComplexity`, `urgency`
  - `budget`, `description`
  - `contactName`, `contactEmail`, `contactTelegram`
  - `estimation` (minPrice, maxPrice, minDays, maxDays)
- ✅ Все данные сохраняются в БД через `handleEstimate` в `api/index.ts`

### 4. **Пуш-уведомления админу**
- ✅ Добавлена отправка уведомлений в Telegram при создании новых заявок
- ✅ Используется существующий модуль `serverless/telegram.ts`
- ✅ Уведомления отправляются асинхронно (не блокируют ответ API)
- ✅ Для работы требуется настроить переменные окружения:
  - `TELEGRAM_BOT_TOKEN` - токен Telegram бота
  - `TELEGRAM_CHAT_ID` - ID чата для уведомлений

## 📋 Новые API эндпоинты:

### GET `/api/?action=getRequests`
Возвращает все заявки (контакты + оценки), отсортированные по дате создания.

**Ответ:**
```json
[
  {
    "id": "...",
    "type": "contact" | "estimation",
    "status": "new" | "in_progress" | "closed",
    "scoring": "A" | "B" | "C",
    "name": "...",
    "email": "...",
    ...
  }
]
```

### GET `/api/?action=getAnalytics`
Возвращает аналитику по заявкам.

**Ответ:**
```json
{
  "total": 100,
  "byType": { "contact": 50, "estimation": 50 },
  "byStatus": { "new": 30, "in_progress": 40, "closed": 30 },
  "byScoring": { "A": 20, "B": 50, "C": 30 },
  "thisMonth": 25,
  "lastMonth": 20,
  "avgMinPrice": 150000,
  "avgMaxPrice": 300000,
  "projectTypeCounts": { "webapp": 10, "website": 5, ... }
}
```

### PATCH `/api/?action=updateLeadStatus`
Обновляет статус заявки.

**Тело запроса:**
```json
{
  "id": "lead-id",
  "status": "new" | "in_progress" | "closed"
}
```

## 🔧 Настройка Telegram уведомлений:

1. Создайте бота через [@BotFather](https://t.me/botfather) в Telegram
2. Получите токен бота
3. Узнайте ID чата (можно использовать [@userinfobot](https://t.me/userinfobot))
4. Добавьте переменные окружения в Vercel:
   - `TELEGRAM_BOT_TOKEN` - токен бота
   - `TELEGRAM_CHAT_ID` - ID чата

## 📝 Структура данных:

Все заявки хранятся в таблице `leads` с полями:
- `type`: "contact" | "estimation"
- `status`: "new" | "in_progress" | "closed"
- `scoring`: "A" | "B" | "C"
- Для контактов: `name`, `email`, `message`
- Для оценок: все поля формы + `estimatedMinPrice`, `estimatedMaxPrice`, `estimatedMinDays`, `estimatedMaxDays`

## 🎯 Результат:

- ✅ Заявки отображаются в админ-панели
- ✅ Аналитика работает и показывает статистику
- ✅ Форма оценки сохраняет все данные
- ✅ Админ получает уведомления в Telegram при новых заявках
- ✅ Можно изменять статус заявок прямо из интерфейса
