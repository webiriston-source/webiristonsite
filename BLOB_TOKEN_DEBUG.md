# Отладка BLOB_READ_WRITE_TOKEN

## 🔍 Как проверить, что токен доступен в API

### Метод 1: Проверка через логи Vercel

1. **Откройте Vercel Dashboard:**
   - Перейдите в ваш проект
   - Откройте **Functions** → `api/index`

2. **Попробуйте загрузить изображение:**
   - Откройте форму портфолио
   - Выберите изображение
   - Нажмите "Сохранить"

3. **Проверьте логи:**
   - В логах функции ищите строки, начинающиеся с `[uploadImage]`
   - Если видите: `BLOB_READ_WRITE_TOKEN is not set` → токен не установлен
   - Если видите: `BLOB_READ_WRITE_TOKEN found (length: X chars)` → токен установлен

### Метод 2: Проверка через Vercel CLI

```bash
# Проверить переменные окружения
vercel env ls

# Или для конкретной переменной
vercel env pull .env.local
cat .env.local | grep BLOB_READ_WRITE_TOKEN
```

### Метод 3: Добавить тестовый эндпоинт (временно)

Добавьте в `api/index.ts` временный эндпоинт для проверки:

```typescript
// В switch (action) для GET запросов добавьте:
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

## ⚠️ Частые проблемы

### Проблема 1: Токен не виден в интерфейсе Vercel

**Причина:** Токен был создан через CLI, а не через веб-интерфейс.

**Решение:** Это нормально! Токены, созданные через CLI, могут не отображаться в веб-интерфейсе, но они работают.

**Проверка:**
```bash
vercel env ls
```

### Проблема 2: Токен установлен, но не работает

**Возможные причины:**
1. Токен установлен только для Development, а проект работает в Production
2. Проект не был передеплоен после добавления токена
3. Токен истек или был удален

**Решение:**
1. Убедитесь, что токен установлен для нужных окружений:
   ```bash
   vercel env add BLOB_READ_WRITE_TOKEN production
   vercel env add BLOB_READ_WRITE_TOKEN preview
   ```

2. Передеплойте проект:
   - Vercel Dashboard → Deployments → Redeploy
   - Или сделайте новый коммит и пуш

3. Проверьте, что токен действителен:
   - Vercel Dashboard → Storage → Blob → Settings → Tokens
   - Убедитесь, что токен не истек

### Проблема 3: Ошибка "unauthorized" или "forbidden"

**Причина:** Токен неверный или не имеет нужных прав.

**Решение:**
1. Создайте новый токен:
   - Vercel Dashboard → Storage → Blob → Settings → Tokens
   - Create Token
   - Permissions: **Read & Write**
   - Скопируйте токен

2. Обновите переменную окружения:
   ```bash
   vercel env rm BLOB_READ_WRITE_TOKEN production
   vercel env add BLOB_READ_WRITE_TOKEN production
   # Вставьте новый токен
   ```

3. Передеплойте проект

## 📋 Чек-лист проверки

- [ ] Токен создан в Vercel Dashboard → Storage → Blob → Settings → Tokens
- [ ] Токен имеет права **Read & Write**
- [ ] Переменная `BLOB_READ_WRITE_TOKEN` добавлена через CLI или веб-интерфейс
- [ ] Переменная установлена для нужных окружений (Production, Preview)
- [ ] Проект передеплоен после добавления переменной
- [ ] В логах видно `BLOB_READ_WRITE_TOKEN found`
- [ ] Нет ошибок "unauthorized" или "forbidden" в логах

## 🔧 Команды для отладки

```bash
# Проверить все переменные окружения
vercel env ls

# Добавить переменную для Production
vercel env add BLOB_READ_WRITE_TOKEN production

# Добавить переменную для Preview
vercel env add BLOB_READ_WRITE_TOKEN preview

# Удалить переменную (если нужно пересоздать)
vercel env rm BLOB_READ_WRITE_TOKEN production

# Передеплой проекта
vercel --prod
```

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
