# Исправление загрузки изображений через base64

## ✅ Что было исправлено:

### 1. **Переход на base64 вместо multipart/form-data**
- ✅ Убрана зависимость от `busboy` и multipart/form-data
- ✅ API теперь принимает base64 строку в JSON формате
- ✅ Форма в React преобразует файл в base64 перед отправкой
- ✅ Улучшена обработка ошибок с детальными сообщениями

### 2. **Обработка ошибок**
- ✅ **400** - если `image` не передан или невалидный формат
- ✅ **413** - если размер файла > 4MB (с указанием размера)
- ✅ **500** - если загрузка в Blob не удалась (с детальным сообщением)

### 3. **Валидация**
- ✅ Проверка наличия поля `image`
- ✅ Проверка формата base64
- ✅ Проверка типа файла (только изображения)
- ✅ Проверка размера (макс. 4MB)
- ✅ Автоматическое определение MIME типа из data URL

## 📋 API эндпоинт:

### POST `/api/?action=uploadImage`

**Запрос (JSON):**
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

Или просто base64 без префикса:
```json
{
  "image": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Успешный ответ (200):**
```json
{
  "success": true,
  "url": "https://blob.vercel-storage.com/projects/..."
}
```

**Ошибки:**
- **400** - `image` не передан, невалидный формат, или не изображение
- **413** - файл слишком большой (> 4MB)
- **500** - ошибка загрузки в Blob (с детальным сообщением)

## 🖥️ Код формы в React:

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

    // Convert file to base64
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string; // data:image/png;base64,...

          // Send to API as JSON
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE || window.location.origin}/api/?action=uploadImage`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image: base64,
              }),
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ 
              message: `Upload failed with status ${response.status}` 
            }));
            throw new Error(errorData.message || `Upload failed with status ${response.status}`);
          }

          const data = await response.json();
          if (data.success && data.url) {
            resolve(data.url);
          } else {
            throw new Error(data.message || "Upload failed");
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };

      reader.readAsDataURL(file);
    });
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
   - Введите имя (например, `my-blob-storage`)
   - Выберите регион
   - Нажмите **Create**
5. Перейдите в **Settings** → **Tokens**
6. Нажмите **Create Token**
7. Настройки токена:
   - **Name**: `blob-read-write-token`
   - **Permissions**: **Read & Write**
   - **Expires**: можно оставить "Never"
8. Нажмите **Create Token**
9. **ВАЖНО**: Скопируйте токен сразу - он показывается только один раз!

### 2. Добавить переменную окружения в Vercel:

1. В Vercel Dashboard → ваш проект → **Settings** → **Environment Variables**
2. Нажмите **Add New**
3. Заполните:
   - **Key**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: вставьте токен, скопированный на шаге 1
   - **Environment**: выберите нужные окружения:
     - ✅ Production
     - ✅ Preview
     - ✅ Development (опционально)
4. Нажмите **Save**

**Важно:** После добавления переменной окружения нужно передеплоить проект:
- В Vercel Dashboard → ваш проект → **Deployments**
- Нажмите на последний деплой → **Redeploy**

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

- ✅ Загрузка изображений работает через base64 JSON
- ✅ Нет проблем с multipart/form-data в Vercel
- ✅ Правильная обработка ошибок с детальными сообщениями
- ✅ Валидация типа и размера файла
- ✅ Изображения сохраняются в Vercel Blob Storage
- ✅ URL изображения возвращается и сохраняется в БД

## 🔍 Отладка:

Если загрузка не работает:

1. **Проверьте логи в Vercel:**
   - Vercel Dashboard → ваш проект → **Functions** → `api/index`
   - Ищите ошибки типа "BLOB_READ_WRITE_TOKEN is missing"

2. **Проверьте переменную окружения:**
   - Убедитесь, что `BLOB_READ_WRITE_TOKEN` добавлена
   - Проверьте, что она видна в нужных окружениях (Production, Preview)
   - Убедитесь, что проект передеплоен после добавления переменной

3. **Проверьте формат запроса:**
   - Откройте DevTools → Network
   - Найдите запрос к `/api/?action=uploadImage`
   - Проверьте, что body содержит `{ "image": "data:image/..." }`

4. **Проверьте размер файла:**
   - Максимальный размер: 4MB
   - Если файл больше, получите ошибку 413
