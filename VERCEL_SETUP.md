# Инструкция по настройке Vercel

## 1. Добавление переменных окружения в Vercel

### Шаг 1: Откройте настройки проекта
1. Зайдите на [vercel.com](https://vercel.com)
2. Выберите ваш проект `MyDevSite`
3. Перейдите в **Settings** → **Environment Variables**

### Шаг 2: Добавьте переменные

#### Обязательные переменные:

**`DATABASE_URL`** (или `POSTGRES_URL`)
```
postgresql://user:password@host:port/database?sslmode=require
```
- Получите эту строку из вашего провайдера PostgreSQL (например, Vercel Postgres, Supabase, Neon)
- Если используете Vercel Postgres, переменная создаётся автоматически

**`VITE_API_BASE`** (опционально, для фронтенда)
```
https://iristonweb.ru
```
- Если не указано, фронтенд будет использовать текущий origin (window.location.origin)

#### Опциональные переменные:

**`TELEGRAM_BOT_TOKEN`** и **`TELEGRAM_CHAT_ID`**
- Для уведомлений в Telegram при новых заявках

### Шаг 3: Примените изменения
- После добавления переменных, Vercel автоматически пересоберёт проект
- Или нажмите **Redeploy** вручную

## 2. Проверка деплоя

После деплоя проверьте:

1. **API работает:**
   ```bash
   curl -X POST https://iristonweb.ru/api/?action=contact \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"test@test.com","message":"Test message"}'
   ```

2. **Фронтенд использует правильный URL:**
   - Откройте DevTools → Network
   - Проверьте, что запросы идут на `https://iristonweb.ru/api/?action=...`
   - НЕ должно быть `localhost` или `127.0.0.1`

## 3. Создание первого админа в БД

После настройки БД, создайте первого пользователя:

```sql
-- Подключитесь к вашей PostgreSQL БД и выполните:

INSERT INTO users (id, username, password) 
VALUES (
  gen_random_uuid(),
  'admin',
  '$2b$10$YourHashedPasswordHere'
);
```

Чтобы получить хеш пароля, используйте Node.js:

```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash('your_password', 10);
console.log(hash);
```

Или используйте онлайн-генератор bcrypt (не рекомендуется для продакшена).

## 4. Структура проекта

```
MyDevSite/
├── api/
│   └── index.ts          # Единственная serverless-функция
├── client/               # React + Vite фронтенд
├── shared/
│   ├── schema.ts         # Drizzle схемы (users, leads)
│   └── db.ts            # On-demand подключения к БД
└── vercel.json          # Конфигурация Vercel
```

## 5. Лимиты Vercel Hobby Plan

- ✅ **1 Serverless Function** (api/index.ts) - укладываемся в лимит 12
- ✅ **On-demand DB connections** - нет idle-подключений
- ✅ **ESM синтаксис** - совместимо с Vercel

## 6. Troubleshooting

### Ошибка "Database URL not configured"
- Проверьте, что `DATABASE_URL` добавлен в Environment Variables
- Убедитесь, что переменная доступна для Production, Preview и Development

### Ошибка 404 на `/api/`
- Проверьте `vercel.json` - должен быть rewrite на `/api/index`
- Убедитесь, что файл `api/index.ts` существует

### Запросы идут на localhost
- Проверьте `.env` файл - должен быть `VITE_API_BASE=https://iristonweb.ru`
- Пересоберите фронтенд: `npm run build`
- Очистите кеш браузера

### Ошибка CORS
- API уже настроен на CORS (`Access-Control-Allow-Origin: *`)
- Если проблема остаётся, проверьте заголовки в Network tab
