# ✅ Миграция на единую Serverless-функцию завершена

## 📋 Что было сделано:

### 1. ✅ Создана единая API-функция
- **`api/index.ts`** - единственная serverless-функция для всех действий
- Поддерживает 3 действия через query-параметр: `contact`, `estimate`, `login`
- Использует on-demand подключения к БД (открыть → выполнить → закрыть)

### 2. ✅ Удалены все лишние файлы
- Удалены все отдельные API-файлы из `api/`
- Теперь только **1 функция** вместо 13+ (укладываемся в лимит Hobby plan)

### 3. ✅ Исправлен фронтенд
- Убраны все упоминания `localhost`
- Добавлена поддержка `VITE_API_BASE` из переменных окружения
- Обновлены все вызовы API на новый формат: `/api/?action=...`

### 4. ✅ Обновлены файлы конфигурации
- `.env.example` - добавлен `VITE_API_BASE`
- `vercel.json` - настроен только на `api/index.ts`

## 🚀 Использование API

### Contact (форма обратной связи)
```typescript
const response = await fetch('/api/?action=contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Иван Иванов',
    email: 'ivan@example.com',
    message: 'Привет! Хочу связаться с вами.',
  }),
});
```

### Estimate (запрос оценки)
```typescript
const response = await fetch('/api/?action=estimate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectType: 'webapp',
    features: ['auth', 'admin'],
    designComplexity: 'premium',
    urgency: 'standard',
    contactName: 'Петр Петров',
    contactEmail: 'petr@example.com',
    estimation: {
      minPrice: 250000,
      maxPrice: 350000,
      minDays: 30,
      maxDays: 45,
    },
  }),
});
```

### Login (вход в админ-панель)
```typescript
const response = await fetch('/api/?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    login: 'admin',
    password: 'your_password',
  }),
});
```

## 📁 Структура файлов

```
MyDevSite/
├── api/
│   └── index.ts              # ✅ Единственная serverless-функция
├── client/
│   └── src/
│       ├── lib/
│       │   └── queryClient.ts # ✅ Обновлён с API_BASE
│       ├── pages/
│       │   └── admin/
│       │       └── login.tsx  # ✅ Использует /api/?action=login
│       └── components/
│           └── sections/
│               ├── contact-section.tsx    # ✅ Использует /api/?action=contact
│               └── estimation-section.tsx # ✅ Использует /api/?action=estimate
├── shared/
│   ├── schema.ts             # ✅ Таблицы users, leads
│   └── db.ts                 # ✅ On-demand подключения
├── .env.example              # ✅ Добавлен VITE_API_BASE
├── vercel.json               # ✅ Настроен на api/index.ts
└── VERCEL_SETUP.md          # ✅ Инструкция по настройке
```

## ⚙️ Настройка переменных окружения

### Локально (`.env`):
```env
VITE_API_BASE=http://localhost:5000
DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

### На Vercel:
1. Settings → Environment Variables
2. Добавьте:
   - `DATABASE_URL` (или `POSTGRES_URL`) - строка подключения к PostgreSQL
   - `VITE_API_BASE` (опционально) - `https://iristonweb.ru`

## ✅ Проверка

После деплоя проверьте:

1. **API работает:**
   ```bash
   curl -X POST https://iristonweb.ru/api/?action=contact \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@test.com","message":"Test"}'
   ```

2. **Нет localhost в запросах:**
   - Откройте DevTools → Network
   - Все запросы должны идти на `https://iristonweb.ru/api/?action=...`

3. **Только 1 функция:**
   - В Vercel Dashboard → Functions
   - Должна быть только `api/index.ts`

## 🎯 Результат

- ✅ **1 Serverless Function** (вместо 13+)
- ✅ **Нет localhost** в запросах
- ✅ **On-demand DB connections** (нет idle-подключений)
- ✅ **Работает на Vercel Hobby plan**
