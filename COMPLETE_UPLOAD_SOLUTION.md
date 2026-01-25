# Полное решение загрузки изображений - Проверка и исправление

## ✅ Текущее состояние кода

### 1. API эндпоинт (`api/index.ts`)

**✅ Обработчик `uploadImage` находится ТОЛЬКО в блоке POST** (строка 1048):

```typescript
// Handle POST requests (contact, estimate, login, addProject, uploadImage)
const body = await parseJsonBody(req);

// Special handling for uploadImage (base64 JSON)
if (action === "uploadImage") {
  const uploadResult = await handleUploadImage(body);
  if ("success" in uploadResult && uploadResult.success) {
    return sendJson(res, 200, uploadResult);
  } else {
    const statusCode = uploadResult.statusCode || 400;
    return sendJson(res, statusCode, {
      error: uploadResult.error,
      message: uploadResult.message,
    });
  }
}
```

**✅ Обработчик НЕ добавлен в GET действия** (строка 971):
```typescript
default: {
  return sendJson(res, 400, {
    error: "Invalid action",
    message: `Unknown GET action: ${action}. Valid GET actions: getContacts, getEstimates, getRequests, getAnalytics, getUnreadCount, getProjects`,
  });
}
```

**✅ Функция `handleUploadImage`** (строка 726):
- Принимает JSON с полем `image` (base64-строка)
- Конвертирует base64 в Buffer
- Загружает файл в Vercel Blob с помощью `@vercel/blob`
- Возвращает `{ success: true, url: "..." }`
- Логирует ошибки через `console.error`

### 2. Форма в React (`client/src/pages/admin/projects.tsx`)

**✅ Форма правильно настроена** (строка 44-103):
- Преобразует файл в base64 через `FileReader.readAsDataURL()`
- Отправляет POST-запрос: `method: "POST"`
- Использует заголовок: `Content-Type: application/json`
- Тело запроса: `{ "image": "data:image/...base64..." }`

### 3. Зависимости

**✅ `@vercel/blob` установлен** в `package.json` (версия ^0.25.1)

## 🔍 Диагностика проблемы "Unknown GET action: uploadImage"

Если вы получаете эту ошибку, это означает, что запрос приходит как **GET**, а не **POST**.

### Возможные причины:

1. **Старая версия кода задеплоена** - Vercel использует кеш
2. **Проблема с браузером** - кеш или редирект превращает POST в GET
3. **Проблема в коде формы** - где-то отправляется GET вместо POST

### Решение:

1. **Проверьте метод запроса в DevTools:**
   - Откройте DevTools → Network
   - Найдите запрос к `/api/?action=uploadImage`
   - Убедитесь, что Method = **POST** (не GET!)

2. **Передеплойте проект:**
   ```bash
   git add .
   git commit -m "Fix uploadImage: ensure POST only, add logging"
   git push origin main
   ```
   Или в Vercel Dashboard → Deployments → Redeploy

3. **Проверьте логи в Vercel:**
   - Vercel Dashboard → Functions → `api/index`
   - Ищите: `[API] POST request for action: uploadImage`
   - Если видите `[API] GET request for action: uploadImage` → проблема в клиенте

## 📋 Пример использования `put` из `@vercel/blob`

```typescript
import { put } from "@vercel/blob";

// Загрузка файла в Vercel Blob
const blob = await put(filename, fileBuffer, {
  access: "public",
  contentType: fileContentType,
});

// blob.url содержит URL загруженного файла
return { success: true, url: blob.url };
```

## 📝 Структура таблицы `projects`:

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

## ✅ Чек-лист проверки

- [x] `uploadImage` обрабатывается ТОЛЬКО в блоке POST (строка 1048)
- [x] `uploadImage` НЕ добавлен в список GET действий
- [x] Форма отправляет POST запрос с `method: "POST"`
- [x] Форма использует заголовок `Content-Type: application/json`
- [x] Тело запроса: `{ "image": "data:image/...base64..." }`
- [x] `@vercel/blob` установлен в `package.json`
- [ ] `BLOB_READ_WRITE_TOKEN` добавлен в Vercel как Secret
- [ ] Проект передеплоен после изменений
- [ ] В логах видно `[API] POST request for action: uploadImage`

## 🚀 Следующие шаги

1. **Убедитесь, что `BLOB_READ_WRITE_TOKEN` добавлен:**
   ```bash
   vercel env ls
   ```
   Или в Vercel Dashboard → Settings → Environment Variables

2. **Передеплойте проект:**
   ```bash
   git add .
   git commit -m "Fix uploadImage: ensure POST only"
   git push origin main
   ```

3. **Проверьте метод запроса в браузере:**
   - DevTools → Network → найдите запрос → проверьте Method = POST

4. **Проверьте логи в Vercel:**
   - Убедитесь, что видите `[API] POST request for action: uploadImage`

## 🔧 Если проблема сохраняется

Если после всех проверок ошибка сохраняется:

1. **Очистите кеш браузера:**
   - Ctrl+Shift+R (жесткая перезагрузка)
   - Или откройте в режиме инкогнито

2. **Проверьте, что нет редиректов:**
   - DevTools → Network → проверьте, нет ли редиректов с POST на GET

3. **Проверьте код формы еще раз:**
   - Убедитесь, что используется `method: "POST"` (не GET)
   - Убедитесь, что URL правильный: `/api/?action=uploadImage`

4. **Проверьте логи в Vercel:**
   - Если видите `[API] GET request` → проблема в клиенте
   - Если видите `[API] POST request` → проблема в обработчике
