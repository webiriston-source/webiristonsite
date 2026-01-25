# Полное решение загрузки изображений

## ✅ Проверка структуры кода

### 1. API эндпоинт (`api/index.ts`)

**Обработчик `uploadImage` находится ТОЛЬКО в блоке POST** (строка 1048):

```typescript
// Handle POST requests (contact, estimate, login, addProject, uploadImage)
const body = await parseJsonBody(req);

// Special handling for uploadImage (base64 JSON)
if (action === "uploadImage") {
  const uploadResult = await handleUploadImage(body);
  // ...
}
```

**Обработчик НЕ добавлен в GET действия** (строка 971):
```typescript
message: `Unknown GET action: ${action}. Valid GET actions: getContacts, getEstimates, getRequests, getAnalytics, getUnreadCount, getProjects`
```

### 2. Функция `handleUploadImage`

```typescript
async function handleUploadImage(
  body: unknown
): Promise<{ success: true; url: string } | { error: string; message: string; statusCode?: number }> {
  // Принимает JSON с полем image (base64)
  // Конвертирует base64 в Buffer
  // Загружает в Vercel Blob
  // Возвращает { success: true, url: "..." }
  // Логирует ошибки через console.error
}
```

### 3. Форма в React (`client/src/pages/admin/projects.tsx`)

Форма правильно настроена:
- ✅ Преобразует файл в base64 через `FileReader.readAsDataURL()`
- ✅ Отправляет POST запрос: `method: "POST"`
- ✅ Использует заголовок: `Content-Type: application/json`
- ✅ Тело запроса: `{ "image": "data:image/...base64..." }`

## 🔍 Диагностика проблемы

Если вы получаете ошибку "Unknown GET action: uploadImage", это означает, что запрос приходит как GET, а не POST.

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
   git commit -m "Fix uploadImage: ensure POST only"
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

## ✅ Чек-лист проверки

- [ ] `uploadImage` обрабатывается ТОЛЬКО в блоке POST (строка 1048)
- [ ] `uploadImage` НЕ добавлен в список GET действий
- [ ] Форма отправляет POST запрос с `method: "POST"`
- [ ] Форма использует заголовок `Content-Type: application/json`
- [ ] Тело запроса: `{ "image": "data:image/...base64..." }`
- [ ] `@vercel/blob` установлен в `package.json`
- [ ] `BLOB_READ_WRITE_TOKEN` добавлен в Vercel как Secret
- [ ] Проект передеплоен после изменений
- [ ] В логах видно `[API] POST request for action: uploadImage`

## 🚀 Следующие шаги

1. **Передеплойте проект:**
   ```bash
   git add .
   git commit -m "Fix uploadImage: ensure POST only, add logging"
   git push origin main
   ```

2. **Проверьте метод запроса в браузере:**
   - DevTools → Network → найдите запрос → проверьте Method

3. **Проверьте логи в Vercel:**
   - Убедитесь, что видите `[API] POST request for action: uploadImage`
