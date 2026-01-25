# Полное решение загрузки изображений с диагностикой токена

## ✅ Что было исправлено

### 1. Улучшена проверка токена

Код теперь:
- ✅ Проверяет `BLOB_READ_WRITE_TOKEN` (приоритет)
- ✅ Проверяет `VERCEL_BLOB_READ_WRITE_TOKEN` (fallback)
- ✅ Логирует наличие токена в начале функции
- ✅ Показывает все переменные окружения, связанные с BLOB/VERCEL
- ✅ Предоставляет детальные сообщения об ошибках

### 2. Диагностическое логирование

Добавлено логирование:
```typescript
console.log("[uploadImage] BLOB token present:", !!blobToken);
console.log("[uploadImage] VERCEL_BLOB token present:", !!vercelBlobToken);
console.log("[uploadImage] All BLOB/VERCEL related env vars:", blobRelatedVars);
```

## 📋 Полный код `api/index.ts` (обработчик uploadImage)

```typescript
/**
 * Handle upload image (POST request with base64 encoded image)
 * Accepts JSON body: { image: "data:image/png;base64,..." } or { image: "base64string" }
 */
async function handleUploadImage(
  body: unknown
): Promise<{ success: true; url: string } | { error: string; message: string; statusCode?: number }> {
  console.log("[uploadImage] Starting image upload handler");
  
  // Check BLOB token availability at the start for debugging
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const vercelBlobToken = process.env.VERCEL_BLOB_READ_WRITE_TOKEN;
  
  console.log("[uploadImage] BLOB token present:", !!blobToken);
  console.log("[uploadImage] VERCEL_BLOB token present:", !!vercelBlobToken);
  
  // Log all environment variables that contain "BLOB" or "VERCEL"
  const blobRelatedVars = Object.keys(process.env).filter(
    (k) => k.includes("BLOB") || k.includes("VERCEL")
  );
  console.log("[uploadImage] All BLOB/VERCEL related env vars:", blobRelatedVars);
  
  // Try to use BLOB_READ_WRITE_TOKEN first, fallback to VERCEL_BLOB_READ_WRITE_TOKEN
  const tokenToUse = blobToken || vercelBlobToken;
  
  if (!tokenToUse) {
    console.error("[uploadImage] Neither BLOB_READ_WRITE_TOKEN nor VERCEL_BLOB_READ_WRITE_TOKEN is set");
    console.error("[uploadImage] Available env vars with BLOB/VERCEL:", blobRelatedVars);
    return {
      error: "Configuration error",
      message: "BLOB_READ_WRITE_TOKEN is missing. Please add it to Vercel environment variables and redeploy. Check that it's set for Production/Preview environments.",
      statusCode: 500,
    };
  }
  
  console.log("[uploadImage] Using token:", blobToken ? "BLOB_READ_WRITE_TOKEN" : "VERCEL_BLOB_READ_WRITE_TOKEN");
  console.log("[uploadImage] Token length:", tokenToUse.length, "chars");
  
  try {
    const parsedBody = body as { image?: string };

    // Validate that image is provided
    if (!parsedBody?.image || typeof parsedBody.image !== "string") {
      console.error("[uploadImage] Validation failed: image field missing or invalid");
      return {
        error: "Validation error",
        message: "Image data is required. Expected: { image: 'data:image/png;base64,...' }",
        statusCode: 400,
      };
    }

    // Parse data URL format: "data:image/png;base64,iVBORw0KGgo..."
    let base64Data: string;
    let fileContentType = "image/jpeg";
    
    if (parsedBody.image.includes(",")) {
      const [header, data] = parsedBody.image.split(",");
      base64Data = data;
      const mimeMatch = header.match(/data:([^;]+)/);
      if (mimeMatch) {
        fileContentType = mimeMatch[1];
      }
    } else {
      base64Data = parsedBody.image;
    }

    // Validate content type
    if (!fileContentType.startsWith("image/")) {
      return {
        error: "Validation error",
        message: "File must be an image. Supported formats: image/jpeg, image/png, image/gif, image/webp",
        statusCode: 400,
      };
    }

    // Decode base64 to Buffer
    let fileBuffer: Buffer;
    try {
      fileBuffer = Buffer.from(base64Data, "base64");
    } catch (decodeError) {
      console.error("[uploadImage] Failed to decode base64:", decodeError);
      return {
        error: "Validation error",
        message: "Invalid base64 image data",
        statusCode: 400,
      };
    }

    // Validate file size (max 4MB)
    if (fileBuffer.length > 4 * 1024 * 1024) {
      return {
        error: "File too large",
        message: `File size (${Math.round(fileBuffer.length / 1024)}KB) exceeds maximum allowed size of 4MB`,
        statusCode: 413,
      };
    }

    // Generate unique filename
    const extension = fileContentType.split("/")[1] || "jpg";
    const filename = `projects/${randomUUID()}.${extension}`;
    console.log("[uploadImage] Generated filename:", filename);

    // Upload to Vercel Blob
    let blob;
    try {
      console.log("[uploadImage] Attempting to upload to Vercel Blob...");
      console.log("[uploadImage] Token available for upload:", !!tokenToUse);
      
      blob = await put(filename, fileBuffer, {
        access: "public",
        contentType: fileContentType,
      });
      
      console.log("[uploadImage] Upload successful! URL:", blob.url);
    } catch (blobError) {
      console.error("[uploadImage] Failed to upload to Vercel Blob");
      console.error("[uploadImage] Error message:", blobError instanceof Error ? blobError.message : String(blobError));
      
      if (blobError instanceof Error) {
        const errorMsg = blobError.message.toLowerCase();
        if (errorMsg.includes("token") || errorMsg.includes("unauthorized") || errorMsg.includes("forbidden")) {
          return {
            error: "Configuration error",
            message: "BLOB_READ_WRITE_TOKEN is invalid or expired. Please check Vercel environment variables and regenerate the token if needed.",
            statusCode: 500,
          };
        }
      }

      return {
        error: "Upload error",
        message: `Failed to upload image to storage: ${blobError instanceof Error ? blobError.message : "Unknown error"}`,
        statusCode: 500,
      };
    }

    return { success: true, url: blob.url };
  } catch (error) {
    console.error("[uploadImage] Unexpected error:", error);
    return {
      error: "Upload error",
      message: `Не удалось загрузить изображение: ${error instanceof Error ? error.message : "Unknown error"}`,
      statusCode: 500,
    };
  }
}
```

## 🖥️ Полный код формы в React (`client/src/pages/admin/projects.tsx`)

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

          // Send to API as JSON with POST method
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

## 🔧 Инструкция по проверке переменной окружения в Vercel

### Метод 1: Через Vercel Dashboard

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Найдите переменную `BLOB_READ_WRITE_TOKEN`
5. Проверьте:
   - ✅ Имя: `BLOB_READ_WRITE_TOKEN` (без префикса `VERCEL_`)
   - ✅ Значение: токен установлен
   - ✅ Environment: **Production**, **Preview** (обязательно!)

### Метод 2: Через Vercel CLI

```bash
# Проверить все переменные
vercel env ls

# Проверить конкретную переменную
vercel env pull .env.local
cat .env.local | grep BLOB_READ_WRITE_TOKEN
```

### Метод 3: Через логи API

После загрузки изображения проверьте логи:
- Vercel Dashboard → Functions → `api/index`
- Ищите:
  - `[uploadImage] BLOB token present: true/false`
  - `[uploadImage] All BLOB/VERCEL related env vars: [...]`

## 🚨 Важно: Передеплой после добавления переменной

**КРИТИЧЕСКИ ВАЖНО:** После добавления переменной окружения нужно передеплоить проект!

```bash
# Через CLI
vercel --prod

# Или через Dashboard
Vercel Dashboard → Deployments → последний деплой → Redeploy
```

## ✅ Чек-лист

- [ ] Переменная называется `BLOB_READ_WRITE_TOKEN` (без префикса `VERCEL_`)
- [ ] Переменная установлена для **Production** и **Preview**
- [ ] Проект передеплоен после добавления переменной
- [ ] В логах видно `BLOB token present: true`
- [ ] В логах видно `Token available for upload: true`
- [ ] Нет ошибок "unauthorized" или "forbidden"

Подробная инструкция по устранению неполадок сохранена в `BLOB_TOKEN_TROUBLESHOOTING.md`.
