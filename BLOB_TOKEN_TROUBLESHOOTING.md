# Решение проблемы с BLOB_READ_WRITE_TOKEN

## 🔍 Проблема

Ошибка: `BLOB_READ_WRITE_TOKEN is not set in environment variables`, хотя в логах видно, что переменная присутствует в списке доступных.

## ✅ Решение

### 1. Проверка имени переменной

Убедитесь, что переменная называется именно **`BLOB_READ_WRITE_TOKEN`** (без префикса `VERCEL_`).

Код теперь поддерживает оба варианта:
- `BLOB_READ_WRITE_TOKEN` (приоритет)
- `VERCEL_BLOB_READ_WRITE_TOKEN` (fallback)

### 2. Проверка окружения

Переменная должна быть установлена для нужных окружений:
- ✅ **Production** (обязательно)
- ✅ **Preview** (рекомендуется)
- ⚠️ **Development** (опционально)

### 3. Передеплой после добавления переменной

**ВАЖНО:** После добавления переменной окружения нужно передеплоить проект!

```bash
# Через CLI
vercel --prod

# Или через Dashboard
Vercel Dashboard → Deployments → Redeploy
```

## 📋 Инструкция по проверке переменной в Vercel

### Метод 1: Через Vercel Dashboard

1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Найдите переменную `BLOB_READ_WRITE_TOKEN`
5. Проверьте:
   - ✅ Имя: `BLOB_READ_WRITE_TOKEN` (без префикса `VERCEL_`)
   - ✅ Значение: токен установлен
   - ✅ Environment: Production, Preview (или нужные вам)

### Метод 2: Через Vercel CLI

```bash
# Проверить все переменные окружения
vercel env ls

# Проверить конкретную переменную
vercel env pull .env.local
cat .env.local | grep BLOB_READ_WRITE_TOKEN
```

### Метод 3: Через логи API

После загрузки изображения проверьте логи в Vercel:
- Vercel Dashboard → Functions → `api/index`
- Ищите строки:
  - `[uploadImage] BLOB token present: true/false`
  - `[uploadImage] VERCEL_BLOB token present: true/false`
  - `[uploadImage] All BLOB/VERCEL related env vars: [...]`

## 🔧 Как добавить/обновить переменную

### Через Vercel Dashboard:

1. Vercel Dashboard → ваш проект → **Settings** → **Environment Variables**
2. Нажмите **Add New**
3. Заполните:
   - **Key**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: вставьте токен
   - **Environment**: выберите Production, Preview
4. Нажмите **Save**

### Через Vercel CLI:

```bash
# Добавить для Production
vercel env add BLOB_READ_WRITE_TOKEN production

# Добавить для Preview
vercel env add BLOB_READ_WRITE_TOKEN preview

# Добавить для всех окружений
vercel env add BLOB_READ_WRITE_TOKEN production preview
```

## 🚨 Частые проблемы

### Проблема 1: Переменная установлена, но не работает

**Причина:** Переменная установлена только для Development, а проект работает в Production.

**Решение:**
1. Убедитесь, что переменная установлена для **Production** и **Preview**
2. Передеплойте проект

### Проблема 2: Переменная называется по-другому

**Причина:** Переменная называется `VERCEL_BLOB_READ_WRITE_TOKEN` вместо `BLOB_READ_WRITE_TOKEN`.

**Решение:**
Код теперь поддерживает оба варианта, но рекомендуется использовать `BLOB_READ_WRITE_TOKEN`.

### Проблема 3: Проект не передеплоен

**Причина:** Переменная добавлена, но проект не был передеплоен.

**Решение:**
```bash
# Передеплой через CLI
vercel --prod

# Или через Dashboard
Vercel Dashboard → Deployments → последний деплой → Redeploy
```

### Проблема 4: Токен истек или неверный

**Причина:** Токен был удален или истек.

**Решение:**
1. Создайте новый токен:
   - Vercel Dashboard → Storage → Blob → Settings → Tokens
   - Create Token → Permissions: Read & Write
2. Обновите переменную окружения
3. Передеплойте проект

## 📝 Что искать в логах

После загрузки изображения в логах должны быть:

```
[uploadImage] Starting image upload handler
[uploadImage] BLOB token present: true
[uploadImage] VERCEL_BLOB token present: false
[uploadImage] All BLOB/VERCEL related env vars: ['BLOB_READ_WRITE_TOKEN', ...]
[uploadImage] Using token: BLOB_READ_WRITE_TOKEN
[uploadImage] Token length: X chars
[uploadImage] Generated filename: projects/xxx.jpg
[uploadImage] Attempting to upload to Vercel Blob...
[uploadImage] Token available for upload: true
[uploadImage] Upload successful! URL: https://...
[uploadImage] Upload completed successfully
```

Если видите:
- `BLOB token present: false` → переменная не установлена
- `Token available for upload: false` → проблема с доступом к токену
- Ошибка "unauthorized" или "forbidden" → токен неверный или истек

## ✅ Чек-лист

- [ ] Переменная называется `BLOB_READ_WRITE_TOKEN` (без префикса `VERCEL_`)
- [ ] Переменная установлена для Production и Preview
- [ ] Проект передеплоен после добавления переменной
- [ ] В логах видно `BLOB token present: true`
- [ ] В логах видно `Token available for upload: true`
- [ ] Нет ошибок "unauthorized" или "forbidden"
