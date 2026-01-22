# MyDevSite

Проект: **Vite + React** (клиент) + **Express** (API) + **PostgreSQL/Drizzle**.

## Запуск локально

### 1) Требования
- Node.js **20+**
- PostgreSQL **14+** (или Docker)

### 2) Перейди в папку с `package.json`
После распаковки открой именно папку, где лежит `package.json`:

```bash
cd MyDevSite
```

### 3) Настрой `.env`
Скопируй пример и заполни значения:

```bash
cp .env.example .env
```

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

Минимально нужно:
- `DATABASE_URL`
- `ADMIN_LOGIN`, `ADMIN_PASSWORD`
- `SESSION_SECRET`

### 4) Подними PostgreSQL (вариант с Docker)

```bash
docker run --name mydevsite-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydevsite \
  -p 5432:5432 -d postgres:16
```

Если порт **5432** занят (часто уже стоит локальный Postgres), используй другой порт, например **5433**:

```bash
docker run --name mydevsite-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mydevsite \
  -p 5433:5432 -d postgres:16
```

И в `.env` поставь:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/mydevsite
```

> В текущей версии проекта **pgcrypto не требуется** — UUID генерируется на стороне приложения.

### Быстрый старт для Windows (рекомендуется)

Если у тебя ошибки подключения к БД вроде `28P01` (неверный пароль) или порт занят — запусти готовый скрипт:

```bat
script\setup-local-db.bat
```

Он поднимет Postgres в Docker на порту **5433** и обновит `DATABASE_URL` в `.env` (с бэкапом `.env.bak.*`).

### 5) Установи зависимости

```bash
npm install
```

### 6) Применить схему в БД (Drizzle)

```bash
npm run db:push
```

### Если PostgreSQL пока недоступен

Для локальной демонстрации можно запустить проект без БД: добавь в `.env` строку:

```env
STORAGE_MODE=file
```

Тогда заявки из форм будут сохраняться в файл `storage/local-store.json` и отображаться в админке.

### 7) Запуск в dev

```bash
npm run dev
```

Открой:
- Сайт: http://localhost:5000
- Админка: http://localhost:5000/admin/login

## Деплой на Vercel

> Важно: это не «чистый» Next.js. На Vercel фронт отдаётся как **static** (Vite build), а API — как **Serverless Function** (`/api/index.ts`).

### 1) Подготовь базу
Удобно использовать Neon/Supabase/Render Postgres (любой PostgreSQL).
Дополнительные расширения не требуются.

### 2) Импорт в Vercel
- Build Command: `npm run build`
- Output Directory: `dist/public`

### 3) Env vars в Vercel
Добавь в Project → Settings → Environment Variables:
- `DATABASE_URL`
- `ADMIN_LOGIN`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- (опционально) `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

### 4) Применить схему в прод-базе
Локально запусти (временно подставив `DATABASE_URL` от прод-базы):

```bash
npm run db:push
```

## Что исправлено в этом архиве
- Удалены Replit-артефакты из поставки (в исходном zip были `node_modules/` и `.local/`). Добавлен `.gitignore`.
- Добавлены скрипты очистки: `script/cleanup-replit.sh` и `script/cleanup-replit.bat`.
- Исправлены merge-конфликты в `vite.config.ts` и удалён лишний корневой `index.html` с конфликтом. Используется `client/index.html`.
- `vite.config.ts` и `server/vite.ts` переведены на корректный ESM-совместимый `__dirname` (через `fileURLToPath`).
- `npm run dev` теперь без `NODE_ENV=...` (кроссплатформенно). `npm start` использует `cross-env` для Windows.
- Добавлена автозагрузка `.env` через `dotenv` (чтобы `DATABASE_URL` подхватывался локально без ручного экспорта переменных).
- `vercel.json`: выставлен `outputDirectory: dist/public` + добавлены rewrites для `/api/* -> /api` и SPA fallback.
