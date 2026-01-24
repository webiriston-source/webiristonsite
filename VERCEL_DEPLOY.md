# Vercel: проверка деплоя и домена

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

- **Логин**: https://iristonweb.ru/admin/login → ввод логина/пароля → «Войти».
- **Форма связи**: отправка формы на сайте.
- **Оценка проекта**: отправка заявки на оценку.

Если ошибка `api/index` / `server/routes` исчезла — используется новый деплой. Если нет — домен всё ещё указывает на старый; повторите шаги 1–2.

---

## 6. Локальная проверка деплоя (опционально)

```bash
# Ответ должен быть 404 (нет handler для /api) или JSON от конкретного эндпоинта
curl -s -o /dev/null -w "%{http_code}" https://iristonweb.ru/api

# Логин (замените на свои данные)
curl -X POST https://iristonweb.ru/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"login":"...","password":"..."}'
```

Ожидание: для `GET /api` — 404; для `POST /api/admin/login` — 200 (успех) или 401 (неверный логин/пароль), но **не** 500 с `FUNCTION_INVOCATION_FAILED`.
