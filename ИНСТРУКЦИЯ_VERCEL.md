# Пошаговая инструкция: деплой на Vercel (для новичков)

Делай шаги по порядку. Не пропускай.

---

## ЧАСТЬ 1. Отправить код на GitHub

### Шаг 1.1. Открой терминал в папке проекта

- В **Cursor** или **VS Code**: меню **Terminal** → **New Terminal** (или `Ctrl+Shift+``).
- Либо открой **PowerShell** или **cmd**, затем перейди в папку:
  ```text
  cd C:\Projects\MyDevSite
  ```

### Шаг 1.2. Проверь, что изменения есть

Введи:

```bash
git status
```

Должны быть изменённые файлы (например `vercel.json`, `api/admin/session.ts` и т.д.). Если всё чисто — значит, ты уже всё закоммитил; переходи к шагу 1.4.

### Шаг 1.3. Сохрани изменения в Git и отправь на GitHub

Введи по очереди (после каждой команды — Enter):

```bash
git add -A
```

```bash
git commit -m "vercel: rewrites, health check, session?health=1"
```

```bash
git push
```

Если попросит логин/пароль GitHub — введи. Если проект привязан к Vercel через GitHub, после `git push` Vercel сам начнёт новый деплой.

---

## ЧАСТЬ 2. Настройки в Vercel (сайт vercel.com)

### Шаг 2.1. Зайди в проект

1. Открой в браузере: **https://vercel.com**
2. Войди в аккаунт.
3. Найди проект **webiristonsite** и открой его (клик по названию).

### Шаг 2.2. Root Directory (корневая папка)

1. Вверху открой вкладку **Settings**.
2. Слева выбери **General**.
3. Прокрути до блока **Root Directory**.
4. Поле должно быть **пустым** или содержать только точку **`.`**.
5. Если там что-то другое (например `client` или `frontend`) — удали, оставь пусто, нажми **Save**.

### Шаг 2.3. Переменные окружения

1. В **Settings** слева выбери **Environment Variables**.
2. Проверь, что для **Production** есть переменные:
   - `ADMIN_LOGIN`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
   - `TELEGRAM_BOT_TOKEN` (если используешь Telegram)
   - `TELEGRAM_CHAT_ID` (если используешь Telegram)
   - `DATABASE_URL` или `POSTGRES_URL` (если используешь БД)
3. Если чего-то нет — нажми **Add**, введи **Name** и **Value**, выбери **Production**, сохрани.

---

## ЧАСТЬ 3. Редеплой с очисткой кэша

### Шаг 3.1. Открой список деплоев

1. В проекте **webiristonsite** открой вкладку **Deployments** (вверху).
2. Убедись, что виден **последний** деплой (тот, что только что создался после `git push`, или верхний в списке).

### Шаг 3.2. Редеплой

1. Справа у последнего деплоя нажми **три точки** (⋮).
2. Выбери **Redeploy**.
3. В окне включи опцию **Clear build cache** (или сними галочку **Use existing Build Cache**, если она есть).
4. Нажми **Redeploy**.
5. Дождись окончания сборки (зелёная галочка, статус **Ready**).

### Шаг 3.3. Сделать этот деплой продакшеном

1. У того же деплоя снова нажми **три точки** (⋮).
2. Выбери **Promote to Production**.
3. Убедись, что в **Production** (слева в фильтрах) теперь отображается именно этот деплой.

---

## ЧАСТЬ 4. Проверка, что API работает

### Шаг 4.1. Проверка через браузер

Открой в браузере **две** ссылки (по одной):

1. **Проверка конфигурации (health):**
   ```text
   https://iristonweb.ru/api/health
   ```
   Либо, если видишь «The page could not be found» / 404:
   ```text
   https://iristonweb.ru/api/admin/session?health=1
   ```

**Ожидание:** страница с текстом в формате JSON, например:
```json
{"ok":true,"env":{"admin":true,"session":true,"telegram":true,"db":true},"vercel":true}
```

- Если `env.admin`, `env.session`, `env.telegram`, `env.db` — все `true` (и ты используешь Telegram и БД), значит переменные настроены.
- Если какие-то `false` — добавь недостающие в **Settings → Environment Variables** и сделай **редеплой** (часть 3) заново.

2. **Логин в админку:**
   ```text
   https://iristonweb.ru/admin/login
   ```
   Введи логин и пароль (как в `ADMIN_LOGIN` / `ADMIN_PASSWORD`), нажми «Войти». Должно пустить в админ-панель, а не показать ошибку.

### Шаг 4.2. Проверка формы связи и оценки

1. Открой главную: **https://iristonweb.ru**
2. Отправь **форму обратной связи** (контакты + сообщение).
3. Отправь **заявку на оценку проекта** (если есть такой блок).

Оба запроса должны проходить без ошибки (успешное сообщение на экране).

---

## ЧАСТЬ 5. Если что-то не работает

### Всё `/api/*` даёт 404 («The page could not be found»)

- Ещё раз проверь **Root Directory** (часть 2.2): должно быть пусто или `.`.
- Сделай **редеплой с Clear build cache** (часть 3).
- Убедись, что в репозитории на GitHub есть папка **api** с файлами (например `api/health.ts`, `api/contact.ts`, `api/admin/login.ts`).

### Логин даёт 500 или «Сервер не настроен»

- В **Settings → Environment Variables** для **Production** должны быть заданы `ADMIN_LOGIN`, `ADMIN_PASSWORD`, `SESSION_SECRET`.
- После изменений — **редеплой с Clear build cache**.

### Форма связи / оценка не отправляются или ошибка

- Проверь **health** (шаг 4.1): если `env.telegram` или `env.db` — `false`, добавь `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` и/или `DATABASE_URL` / `POSTGRES_URL`, затем редеплой.

### Домен iristonweb.ru открывает старую версию

- В **Settings → Domains** проверь, что **iristonweb.ru** привязан к **Production**.
- Выполни **Promote to Production** (часть 3.3) для последнего деплоя и подожди 1–2 минуты.

---

## Краткий чеклист

- [ ] `git add -A` → `git commit -m "..."` → `git push`
- [ ] **Settings → General**: Root Directory пусто или `.`
- [ ] **Settings → Environment Variables**: все нужные переменные для Production
- [ ] **Deployments** → последний деплой → ⋮ → **Redeploy** с **Clear build cache**
- [ ] ⋮ → **Promote to Production**
- [ ] Открыть **https://iristonweb.ru/api/health** или **.../api/admin/session?health=1** — виден JSON с `ok: true` и `env`
- [ ] Проверить **https://iristonweb.ru/admin/login**, форму связи и оценку на сайте
