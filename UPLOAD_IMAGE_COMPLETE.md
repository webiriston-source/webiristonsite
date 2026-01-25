# Полное решение загрузки изображений через base64

## ✅ Что было реализовано:

### 1. **API эндпоинт (`api/index.ts`)**
- ✅ Принимает base64 строку в JSON формате: `{ image: "data:image/png;base64,..." }`
- ✅ Декодирует base64 в Buffer
- ✅ Загружает в Vercel Blob Storage
- ✅ Возвращает URL изображения
- ✅ Детальное логирование всех этапов процесса
- ✅ Проверка наличия `BLOB_READ_WRITE_TOKEN`

### 2. **Обработка ошибок**
- ✅ **400** - если `image` не передан или невалидный формат
- ✅ **413** - если размер файла > 4MB (с указанием размера)
- ✅ **500** - если загрузка в Blob не удалась (с детальным сообщением в консоли)

### 3. **Форма в React (`client/src/pages/admin/projects.tsx`)**
- ✅ Преобразует файл в base64 через `FileReader.readAsDataURL()`
- ✅ Отправляет JSON: `{ image: "data:image/png;base64,..." }`
- ✅ Валидация типа и размера файла на клиенте

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

## 🔍 Как проверить, что токен доступен в API

### Метод 1: Через логи Vercel (рекомендуется)

1. **Откройте Vercel Dashboard:**
   - Ваш проект → **Functions** → `api/index`

2. **Попробуйте загрузить изображение:**
   - Откройте форму портфолио
   - Выберите изображение
   - Нажмите "Сохранить"

3. **Проверьте логи:**
   - Ищите строки, начинающиеся с `[uploadImage]`
   - ✅ Если видите: `BLOB_READ_WRITE_TOKEN found (length: X chars)` → токен установлен
   - ❌ Если видите: `BLOB_READ_WRITE_TOKEN is not set` → токен не установлен

### Метод 2: Через Vercel CLI

```bash
# Проверить переменные окружения
vercel env ls

# Или для конкретной переменной
vercel env pull .env.local
cat .env.local | grep BLOB_READ_WRITE_TOKEN
```

### Метод 3: Добавить тестовый эндпоинт (временно)

Добавьте в `api/index.ts` в switch для GET запросов:

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

Затем проверьте: `GET /api/?action=checkBlobToken`

## ⚠️ Решение проблем с токеном

### Проблема: Токен создан через CLI, но не работает

**Решение:**

1. **Убедитесь, что токен установлен для нужных окружений:**
   ```bash
   vercel env add BLOB_READ_WRITE_TOKEN production
   vercel env add BLOB_READ_WRITE_TOKEN preview
   ```

2. **Передеплойте проект:**
   - Vercel Dashboard → Deployments → Redeploy
   - Или сделайте новый коммит и пуш

3. **Проверьте логи после деплоя:**
   - Убедитесь, что в логах видно `BLOB_READ_WRITE_TOKEN found`

### Проблема: Ошибка "unauthorized" или "forbidden"

**Решение:**

1. **Создайте новый токен:**
   - Vercel Dashboard → Storage → Blob → Settings → Tokens
   - Create Token
   - Permissions: **Read & Write**
   - Скопируйте токен

2. **Обновите переменную окружения:**
   ```bash
   vercel env rm BLOB_READ_WRITE_TOKEN production
   vercel env add BLOB_READ_WRITE_TOKEN production
   # Вставьте новый токен
   ```

3. **Передеплойте проект**

## 📝 Что искать в логах

После загрузки изображения в логах должны быть:

```
[uploadImage] Starting image upload handler
[uploadImage] Image data received, length: X
[uploadImage] Parsed data URL, content type: image/png
[uploadImage] Base64 decoded successfully, buffer size: X bytes
[uploadImage] Generated filename: projects/xxx.png
[uploadImage] BLOB_READ_WRITE_TOKEN found (length: X chars)
[uploadImage] Attempting to upload to Vercel Blob...
[uploadImage] Upload successful! URL: https://...
[uploadImage] Upload completed successfully
```

Если видите ошибки:
- `BLOB_READ_WRITE_TOKEN is not set` → токен не установлен
- `Token authentication error detected` → токен неверный
- `Failed to upload to Vercel Blob` → проверьте детали ошибки

## 🎯 Итоговый результат

- ✅ Загрузка изображений работает через base64 JSON
- ✅ Нет проблем с multipart/form-data в Vercel
- ✅ Детальное логирование для отладки
- ✅ Правильная обработка ошибок с понятными сообщениями
- ✅ Валидация типа и размера файла
- ✅ Изображения сохраняются в Vercel Blob Storage
- ✅ URL изображения возвращается и сохраняется в БД

## 📚 Дополнительная документация

- `BLOB_TOKEN_DEBUG.md` - подробная инструкция по отладке токена
- `BASE64_UPLOAD_FIX.md` - описание исправлений
- `BLOB_SETUP.md` - настройка Vercel Blob Storage
