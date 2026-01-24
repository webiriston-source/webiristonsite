# Vercel: проверка деплоя и домена

**Пошаговая инструкция для новичков:** см. файл **ИНСТРУКЦИЯ_VERCEL.md** в корне проекта.

---

## 0. Переменные окружения (обязательно)

На Vercel **нет** `.env` — значения задаются в **Settings → Environment Variables**. Для Production должны быть указаны:

| Переменная | Назначение |
|------------|------------|
| `ADMIN_LOGIN` | Логин админки |
| `ADMIN_PASSWORD` | Пароль админки |
| `SESSION_SECRET` | Секрет для cookie-сессии (длинная случайная строка) |
| `TELEGRAM_BOT_TOKEN` | Токен бота (опционально, для уведомлений) |
| `TELEGRAM_CHAT_ID` | ID чата (опционально) |
| `DATABASE_URL` или `POSTGRES_URL` и т.п. | Подключение к PostgreSQL (см. `server/db.ts`) |

Без `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `SESSION_SECRET` логин даёт 500. Без БД лиды хранятся в памяти (теряются между запросами).

После деплоя проверьте конфигурацию:

```bash
# Предпочтительно
curl -s https://iristonweb.ru/api/health

# Если /api/health возвращает 404 NOT_FOUND — запасной вариант (тот же формат)
curl -s "https://iristonweb.ru/api/admin/session?health=1"
```

Ожидание: `{"ok":true,"env":{"admin":true,"session":true,"telegram":true,"db":true},"vercel":true}`. Если какие-то `env.*` — `false`, добавьте соответствующие переменные и сделайте редеплой.

**Если оба URL дают 404**: проверьте **Root Directory** (должно быть пусто или `.`), что в деплое есть папка `api/`, и выполните редеплой с **Clear build cache**.

---

## Проблема

Ошибка `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server/routes' imported from /var/task/api/index.js` означает, что **работает старый** API‑обработчик (когда весь API был в `api/index` + Express + `server/routes`). Сейчас API разбит на отдельные функции (`api/admin/login`, `api/contact`, `api/estimate` и т.д.), файла `api/index.ts` в репозитории **нет**.

Если ошибка остаётся после редеплоя — почти всегда **production‑домен (iristonweb.ru) всё ещё привязан к старому деплою**, а не к новому.

---

## 1. Promote последнего деплоя в Production

1. [Vercel](https://vercel.com) → проект **webiristonsite** → **Deployments**.
2. Найдите **последний** деплой (после `git push` с удалением `api/index`).
3. Три точки (⋮) → **Promote to Production**.
4. Убедитесь, что в **Production** теперь именно этот деплой.

---

## 2. Привязка домена iristonweb.ru к нужному деплою

Если включено «Custom domains won't be assigned»:

1. **Settings** → **Domains**.
2. Найдите **iristonweb.ru**.
3. Убедитесь, что домен привязан к **Production** (или к конкретному деплою, который вы только что вывели в Production).
4. При необходимости измените привязку на нужный деплой.

---

## 3. Root Directory

1. **Settings** → **General** → **Root Directory**.
2. Должно быть **пусто** или **`.`**.  
3. Если указана подпапка (например, `frontend`), API в `api/` не подхватится — исправьте.

---

## 4. Редеплой с очисткой кэша

1. **Deployments** → последний деплой → ⋮ → **Redeploy**.
2. Включите **«Clear build cache»** (или снимите «Use existing Build Cache»).
3. Нажмите **Redeploy**.
4. После успешной сборки снова выполните **Promote to Production** для этого деплоя (если нужно).

---

## 5. Проверка

1. **Конфигурация на Vercel**: `curl -s https://iristonweb.ru/api/health` или, при 404, `curl -s "https://iristonweb.ru/api/admin/session?health=1"`. Все `env.admin`, `env.session`, `env.telegram`, `env.db` должны быть `true` (если используете Telegram и БД). Иначе добавьте переменные в Settings → Environment Variables и редеплой.
2. **Логин**: https://iristonweb.ru/admin/login → ввод логина/пароля → «Войти».
3. **Форма связи**: отправка формы на сайте.
4. **Оценка проекта**: отправка заявки на оценку.

Если ошибка `api/index` / `server/routes` исчезла — используется новый деплой. Если нет — домен всё ещё указывает на старый; повторите шаги 1–2. Если **все** `/api/*` дают 404 — проверьте Root Directory и редеплой с очисткой кэша.

---

## 6. Локальная проверка деплоя (опционально)

```bash
# Конфигурация (env.admin, env.session и т.д. без секретов)
curl -s https://iristonweb.ru/api/health
# или при 404:
curl -s "https://iristonweb.ru/api/admin/session?health=1"

# Логин (замените на свои данные)
curl -X POST https://iristonweb.ru/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"login":"...","password":"..."}'
```

Ожидание: `GET /api/health` или `GET /api/admin/session?health=1` — 200 и `{"ok":true,"env":{...}}`; `POST /api/admin/login` — 200 (успех) или 401 (неверный логин/пароль), но **не** 500 с `FUNCTION_INVOCATION_FAILED`.
