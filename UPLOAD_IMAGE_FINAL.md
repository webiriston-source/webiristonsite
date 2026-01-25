# Полное решение загрузки изображений

## ✅ Проверка текущей реализации

### 1. API эндпоинт (`api/index.ts`)

Обработчик `uploadImage` уже реализован и находится в блоке **POST** запросов (строка 1045):

```typescript
// Handle POST requests (contact, estimate, login, addProject, uploadImage)
const body = await parseJsonBody(req);

// Special handling for uploadImage (base64 JSON)
if (action === "uploadImage") {
  const uploadResult = await handleUploadImage(body);
  // ...
}
```

Функция `handleUploadImage`:
- ✅ Принимает JSON с полем `image` (base64)
- ✅ Конвертирует base64 в Buffer
- ✅ Загружает в Vercel Blob
- ✅ Возвращает URL изображения
- ✅ Имеет детальное логирование

### 2. Форма в React (`client/src/pages/admin/projects.tsx`)

Форма уже правильно настроена:
- ✅ Преобразует файл в base64 через `FileReader.readAsDataURL()`
- ✅ Отправляет POST запрос с JSON: `{ image: "data:image/png;base64,..." }`
- ✅ Использует правильный метод: `method: "POST"`

### 3. Зависимости

`@vercel/blob` уже установлен в `package.json` (версия ^0.25.1)

## 🔍 Диагностика проблемы "Invalid action: uploadImage"

Ошибка "Invalid action: uploadImage. Valid GET actions: ..." означает, что запрос приходит как **GET**, а не **POST**.

### Возможные причины:

1. **Кеширование старого кода** - Vercel может использовать старую версию
2. **Неправильный метод запроса** - где-то запрос отправляется как GET
3. **Проблема с деплоем** - код не был задеплоен

### Решение:

1. **Проверьте метод запроса в браузере:**
   - Откройте DevTools → Network
   - Найдите запрос к `/api/?action=uploadImage`
   - Убедитесь, что метод = **POST**

2. **Передеплойте проект:**
   ```bash
   git add .
   git commit -m "Fix uploadImage handler"
   git push origin main
   ```
   Или в Vercel Dashboard → Deployments → Redeploy

3. **Проверьте логи:**
   - Vercel Dashboard → Functions → `api/index`
   - Ищите строку: `[API] POST request for action: uploadImage`
   - Если видите `[API] GET request for action: uploadImage` → проблема в клиенте

## 📋 Структура таблицы `projects`:

```typescript
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  fullDescription: text("full_description").notNull(),
  image: text("image").notNull(), // URL изображения из Vercel Blob
  technologies: text("technologies").array().notNull(),
  liveUrl: text("live_url"),
  problems: text("problems"),
  solutions: text("solutions"),
  sortOrder: integer("sort_order").default(0),
  isVisible: text("is_visible").default("true"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## 🔧 Как проверить, что токен доступен в API

### Метод 1: Через логи Vercel

1. **Откройте Vercel Dashboard:**
   - Ваш проект → **Functions** → `api/index`

2. **Попробуйте загрузить изображение**

3. **Проверьте логи:**
   - Ищите: `[uploadImage] BLOB_READ_WRITE_TOKEN found (length: X chars)`
   - Если видите: `BLOB_READ_WRITE_TOKEN is not set` → токен не установлен

### Метод 2: Через Vercel CLI

```bash
vercel env ls
```

### Метод 3: Тестовый эндпоинт

Добавьте в `api/index.ts` в switch для GET:

```typescript
case "checkBlobToken": {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return sendJson(res, 200, {
    tokenExists: !!token,
    tokenLength: token?.length || 0,
    tokenPreview: token ? `${token.substring(0, 10)}...` : "not set",
  });
}
```

Проверьте: `GET /api/?action=checkBlobToken`

## 📝 Что делать, если ошибка сохраняется

1. **Проверьте метод запроса в DevTools:**
   - Network → найдите запрос → проверьте Method = POST

2. **Проверьте код формы:**
   - Убедитесь, что используется `method: "POST"`
   - Убедитесь, что используется правильный URL

3. **Очистите кеш браузера:**
   - Ctrl+Shift+R (жесткая перезагрузка)

4. **Передеплойте проект:**
   - Vercel Dashboard → Deployments → Redeploy

5. **Проверьте логи в Vercel:**
   - Ищите строку `[API] POST request for action: uploadImage`
   - Если видите GET → проблема в клиенте

## 🎯 Итоговый чек-лист

- [ ] `uploadImage` обрабатывается в блоке POST (строка 1045 в `api/index.ts`)
- [ ] Форма отправляет POST запрос с `method: "POST"`
- [ ] `@vercel/blob` установлен в `package.json`
- [ ] `BLOB_READ_WRITE_TOKEN` добавлен в Vercel
- [ ] Проект передеплоен после изменений
- [ ] В логах видно `[API] POST request for action: uploadImage`
- [ ] В логах видно `BLOB_READ_WRITE_TOKEN found`
