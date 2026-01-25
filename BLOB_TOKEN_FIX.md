# Исправление проблемы с BLOB_READ_WRITE_TOKEN

## ✅ Что было исправлено

### 1. Улучшена проверка токена
- ✅ Используется **только** `BLOB_READ_WRITE_TOKEN` (не `VERCEL_BLOB_READ_WRITE_TOKEN`)
- ✅ Явная передача токена в функцию `put()` из `@vercel/blob`
- ✅ Детальное логирование для диагностики
- ✅ Проверка токена в начале main handler

### 2. Диагностическое логирование
Добавлено логирование:
```typescript
console.log("[uploadImage] BLOB token present:", !!blobToken);
console.log("[uploadImage] BLOB_READ_WRITE_TOKEN value:", blobToken ? `${blobToken.substring(0, 10)}...` : "undefined");
console.log("[uploadImage] All BLOB/VERCEL related env vars:", blobRelatedVars);
```

### 3. Явная передача токена
Токен теперь явно передается в `put()`:
```typescript
blob = await put(filename, fileBuffer, {
  access: "public",
  contentType: fileContentType,
  token: blobToken, // Explicitly pass token
});
```

## 📋 Полный код `api/index.ts` (обработчик uploadImage)

Код уже обновлен с:
- ✅ Проверкой `BLOB_READ_WRITE_TOKEN` в начале функции
- ✅ Явной передачей токена в `put()`
- ✅ Детальным логированием
- ✅ Обработкой ошибок

## 🖥️ Пример формы в React (`client/src/pages/admin/projects.tsx`)

Форма уже правильно настроена:

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

## 🔧 Инструкция по проверке переменной окружения в Vercel

### Метод 1: Через Vercel Dashboard (рекомендуется)

1. **Откройте Vercel Dashboard:**
   - [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Выберите ваш проект

2. **Проверьте переменные окружения:**
   - Перейдите в **Settings** → **Environment Variables**
   - Найдите переменную `BLOB_READ_WRITE_TOKEN`

3. **Проверьте настройки:**
   - ✅ **Имя:** Должно быть точно `BLOB_READ_WRITE_TOKEN` (не `VERCEL_BLOB_READ_WRITE_TOKEN`)
   - ✅ **Значение:** Токен должен быть установлен
   - ✅ **Environment:** Должно быть выбрано **Production** и **Preview** (обязательно!)

4. **Если переменной нет или она неправильная:**
   - Нажмите **Add New**
   - **Key:** `BLOB_READ_WRITE_TOKEN` (точно так!)
   - **Value:** Вставьте токен из Blob Storage → Settings → Tokens
   - **Environment:** Выберите **Production** и **Preview**
   - Нажмите **Save**

5. **Передеплойте проект:**
   - Vercel Dashboard → **Deployments**
   - Нажмите на последний деплой → **Redeploy**
   - Или сделайте новый коммит и пуш

### Метод 2: Через Vercel CLI

```bash
# Проверить все переменные
vercel env ls

# Проверить конкретную переменную
vercel env pull .env.local
cat .env.local | grep BLOB_READ_WRITE_TOKEN

# Добавить переменную для Production
vercel env add BLOB_READ_WRITE_TOKEN production
# Вставьте токен, когда попросит

# Добавить переменную для Preview
vercel env add BLOB_READ_WRITE_TOKEN preview
# Вставьте токен, когда попросит

# Передеплой
vercel --prod
```

### Метод 3: Через логи API

После загрузки изображения проверьте логи:
- Vercel Dashboard → **Functions** → `api/index`
- Ищите строки:
  - `[API] BLOB token present: true/false`
  - `[uploadImage] BLOB token present: true/false`
  - `[uploadImage] All BLOB/VERCEL related env vars: [...]`

## 🚨 Важно: Имя переменной

**КРИТИЧЕСКИ ВАЖНО:** Переменная должна называться точно **`BLOB_READ_WRITE_TOKEN`** (без префикса `VERCEL_`).

❌ **НЕПРАВИЛЬНО:**
- `VERCEL_BLOB_READ_WRITE_TOKEN`
- `BLOB_TOKEN`
- Любое другое имя

✅ **ПРАВИЛЬНО:**
- `BLOB_READ_WRITE_TOKEN`

## 🔍 Диагностика проблемы

Если `BLOB token present: false`, проверьте:

1. **Имя переменной:**
   - Должно быть точно `BLOB_READ_WRITE_TOKEN`
   - Проверьте в Vercel Dashboard → Settings → Environment Variables

2. **Окружение:**
   - Переменная должна быть установлена для **Production** и **Preview**
   - Если установлена только для Development, она не будет доступна в production

3. **Передеплой:**
   - После добавления/изменения переменной нужно передеплоить проект
   - Vercel Dashboard → Deployments → Redeploy

4. **Логи:**
   - Проверьте логи в Vercel Dashboard → Functions → `api/index`
   - Ищите строку: `[uploadImage] All BLOB/VERCEL related env vars: [...]`
   - Если видите `BLOB_READ_WRITE_TOKEN` в списке, но `BLOB token present: false` → проблема с доступом к process.env

## 📝 Что искать в логах

После загрузки изображения в логах должны быть:

```
[API] POST request for action: uploadImage
[API] BLOB token present: true
[API] BLOB_READ_WRITE_TOKEN exists: true
[uploadImage] Starting image upload handler
[uploadImage] BLOB token present: true
[uploadImage] BLOB_READ_WRITE_TOKEN value: vercel_blob_rw...
[uploadImage] All BLOB/VERCEL related env vars: ['BLOB_READ_WRITE_TOKEN', ...]
[uploadImage] Using token: BLOB_READ_WRITE_TOKEN
[uploadImage] Token length: X chars
[uploadImage] Token preview: vercel_blob_rw...xxxxx
[uploadImage] Attempting to upload to Vercel Blob...
[uploadImage] Token available for upload: true
[uploadImage] Upload successful! URL: https://...
[uploadImage] Upload completed successfully
```

Если видите:
- `BLOB token present: false` → переменная не установлена или не для нужного окружения
- `All BLOB/VERCEL related env vars: []` → переменная не установлена
- `All BLOB/VERCEL related env vars: ['VERCEL_BLOB_READ_WRITE_TOKEN']` → неправильное имя переменной

## ✅ Чек-лист

- [ ] Переменная называется точно `BLOB_READ_WRITE_TOKEN` (не `VERCEL_BLOB_READ_WRITE_TOKEN`)
- [ ] Переменная установлена для **Production** и **Preview**
- [ ] Проект передеплоен после добавления переменной
- [ ] В логах видно `[API] BLOB token present: true`
- [ ] В логах видно `[uploadImage] BLOB token present: true`
- [ ] В логах видно `Token available for upload: true`
- [ ] Нет ошибок "unauthorized" или "forbidden"

## 🚀 Следующие шаги

1. **Проверьте переменную в Vercel Dashboard:**
   - Settings → Environment Variables
   - Убедитесь, что имя точно `BLOB_READ_WRITE_TOKEN`
   - Убедитесь, что установлена для Production и Preview

2. **Передеплойте проект:**
   ```bash
   git add .
   git commit -m "Fix BLOB token: explicit token passing and improved logging"
   git push origin main
   ```
   Или через Dashboard → Deployments → Redeploy

3. **Проверьте логи после деплоя:**
   - Vercel Dashboard → Functions → `api/index`
   - Попробуйте загрузить изображение
   - Проверьте логи на наличие `BLOB token present: true`
