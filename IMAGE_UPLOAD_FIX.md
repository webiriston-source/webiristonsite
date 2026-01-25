# Исправление загрузки изображений

## ✅ Что было исправлено:

### 1. **Обработка multipart/form-data**
- ✅ Добавлена библиотека `busboy` для парсинга multipart/form-data
- ✅ Обновлен обработчик `handleUploadImage` для работы с FormData
- ✅ Добавлена поддержка fallback на base64 (для обратной совместимости)
- ✅ Правильная обработка Buffer из request body

### 2. **Обработка ошибок**
- ✅ **400** - если файл не выбран или невалидный тип
- ✅ **413** - если размер файла > 4MB
- ✅ **500** - если загрузка в Blob не удалась

### 3. **Валидация**
- ✅ Проверка типа файла (только изображения)
- ✅ Проверка размера (макс. 4MB)
- ✅ Генерация уникального имени файла

## 📋 API эндпоинт:

### POST `/api/?action=uploadImage`

**Запрос (multipart/form-data):**
```
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="image.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary...--
```

**Успешный ответ (200):**
```json
{
  "success": true,
  "url": "https://blob.vercel-storage.com/projects/..."
}
```

**Ошибки:**
- **400** - файл не выбран или невалидный тип
- **413** - файл слишком большой (> 4MB)
- **500** - ошибка загрузки

## 🖥️ Пример формы в React:

```tsx
const uploadImageMutation = useMutation({
  mutationFn: async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("Файл должен быть изображением");
    }

    // Validate file size (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      throw new Error("Размер файла должен быть меньше 4MB");
    }

    // Create FormData
    const formData = new FormData();
    formData.append("file", file);

    // Send to API
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE || window.location.origin}/api/?action=uploadImage`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(errorData.message || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.success && data.url) {
      return data.url;
    } else {
      throw new Error(data.message || "Upload failed");
    }
  },
});
```

## 🔧 Настройка Vercel Blob:

### 1. Получить токен BLOB_READ_WRITE_TOKEN:

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Перейдите в ваш проект
3. Откройте **Storage** → **Blob**
4. Если Blob Storage еще не создан:
   - Нажмите **Create Database**
   - Выберите **Blob**
   - Создайте хранилище
5. Перейдите в **Settings** → **Tokens**
6. Создайте новый токен с правами **Read & Write**
7. Скопируйте токен

### 2. Добавить переменную окружения в Vercel:

1. В Vercel Dashboard → ваш проект → **Settings** → **Environment Variables**
2. Добавьте переменную:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: токен, полученный на шаге 1
   - **Environment**: Production, Preview, Development (или выберите нужные)
3. Нажмите **Save**

**Важно:** После добавления переменной окружения нужно передеплоить проект, чтобы изменения вступили в силу.

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

## 🎯 Результат:

- ✅ Загрузка изображений работает через multipart/form-data
- ✅ Правильная обработка ошибок с корректными статус-кодами
- ✅ Валидация типа и размера файла
- ✅ Изображения сохраняются в Vercel Blob Storage
- ✅ URL изображения возвращается и сохраняется в БД
