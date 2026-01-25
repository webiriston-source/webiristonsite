# Инструкция по пушированию изменений на GitHub

## 📦 Шаг 1: Установка зависимостей (если нужно)

Если вы добавили новые зависимости, сначала установите их:

```bash
npm install
```

Это обновит `package-lock.json` с новыми зависимостями.

## 📝 Шаг 2: Проверка изменений

Проверьте, какие файлы были изменены:

```bash
git status
```

Вы должны увидеть измененные файлы:
- `api/index.ts` - обновлен обработчик загрузки изображений с логированием
- `client/src/pages/admin/projects.tsx` - обновлена форма для base64
- `BLOB_TOKEN_DEBUG.md` - новая документация
- `UPLOAD_IMAGE_COMPLETE.md` - новая документация
- `BASE64_UPLOAD_FIX.md` - документация (если была создана)
- Возможно `package-lock.json` (если устанавливали зависимости)

## ➕ Шаг 3: Добавление файлов в staging

Добавьте все измененные файлы:

```bash
git add .
```

Или выборочно (рекомендуется):

```bash
git add api/index.ts
git add client/src/pages/admin/projects.tsx
git add *.md
git add package-lock.json  # только если он изменился
```

## 💬 Шаг 4: Создание коммита

Создайте коммит с понятным описанием:

```bash
git commit -m "Fix image upload: implement base64 upload with detailed logging"
```

Или более подробное сообщение:

```bash
git commit -m "Fix image upload: implement base64 upload with detailed logging

- Replace multipart/form-data with base64 JSON format
- Add detailed logging for debugging BLOB_READ_WRITE_TOKEN
- Improve error handling with specific status codes (400, 413, 500)
- Update frontend form to convert files to base64
- Add comprehensive documentation for token debugging"
```

## 🚀 Шаг 5: Пуш на GitHub

Отправьте изменения на GitHub:

```bash
git push origin main
```

Или если ваша ветка называется по-другому:

```bash
git push origin master
```

Если это первый пуш в новую ветку:

```bash
git push -u origin main
```

## ✅ Полная последовательность команд

Скопируйте и выполните по порядку:

```bash
# 1. Проверить статус
git status

# 2. Установить зависимости (если нужно)
npm install

# 3. Добавить файлы
git add .

# 4. Создать коммит
git commit -m "Fix image upload: implement base64 upload with detailed logging"

# 5. Отправить на GitHub
git push origin main
```

## 🔍 Если возникли проблемы

### Проблема: "Your branch is ahead of 'origin/main' by X commits"

Это нормально! Просто выполните:
```bash
git push origin main
```

### Проблема: "Updates were rejected because the remote contains work"

Сначала получите изменения с сервера:
```bash
git pull origin main
# Разрешите конфликты, если они есть
git add .
git commit -m "Merge remote changes"
git push origin main
```

### Проблема: "git push" требует аутентификации

Если GitHub требует аутентификацию:
1. Используйте Personal Access Token вместо пароля
2. Или настройте SSH ключи

### Проблема: "fatal: not a git repository"

Убедитесь, что вы находитесь в корне проекта:
```bash
cd c:\Projects\MyDevSite
```

## 📋 Чек-лист перед пушем

- [ ] Выполнен `npm install` (если были новые зависимости)
- [ ] Проверен `git status` - видны все нужные файлы
- [ ] Все нужные файлы добавлены (`git add`)
- [ ] Создан коммит с понятным сообщением
- [ ] Изменения протестированы локально (если возможно)
- [ ] Готов к пушу на GitHub

## 🎯 После пуша

После успешного пуша:

1. **Vercel автоматически задеплоит изменения** (если настроен автодеплой)
2. **Проверьте деплой:**
   - Vercel Dashboard → Deployments
   - Убедитесь, что новый деплой успешен

3. **Проверьте работу загрузки изображений:**
   - Откройте форму портфолио
   - Попробуйте загрузить изображение
   - Проверьте логи в Vercel Dashboard → Functions → `api/index`

## 💡 Рекомендации

- **Делайте коммиты с понятными сообщениями** - это поможет в будущем
- **Не коммитьте `.env` файлы** - они должны быть в `.gitignore`
- **Проверяйте `git status` перед коммитом** - убедитесь, что добавляете только нужные файлы
