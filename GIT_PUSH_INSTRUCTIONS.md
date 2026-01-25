# Инструкция по пушированию изменений на GitHub

## 📦 Шаг 1: Установка зависимостей

Сначала нужно установить новые зависимости (`busboy` и `@types/busboy`):

```bash
npm install
```

Это установит:
- `busboy` (версия ^1.6.0) - для парсинга multipart/form-data
- `@types/busboy` (версия ^1.5.4) - типы TypeScript для busboy

## 📝 Шаг 2: Проверка изменений

Проверьте, какие файлы были изменены:

```bash
git status
```

Должны быть изменены:
- `api/index.ts` - обновлен обработчик загрузки изображений
- `client/src/pages/admin/projects.tsx` - обновлена форма для отправки FormData
- `package.json` - добавлены зависимости busboy и @types/busboy
- `package-lock.json` - обновлен после npm install
- `BLOB_SETUP.md` - новая документация
- `IMAGE_UPLOAD_FIX.md` - новая документация

## ➕ Шаг 3: Добавление файлов в staging

Добавьте все измененные файлы:

```bash
git add .
```

Или выборочно:

```bash
git add api/index.ts
git add client/src/pages/admin/projects.tsx
git add package.json
git add package-lock.json
git add BLOB_SETUP.md
git add IMAGE_UPLOAD_FIX.md
```

## 💬 Шаг 4: Создание коммита

Создайте коммит с описанием изменений:

```bash
git commit -m "Fix image upload: add multipart/form-data support with busboy"
```

Или более подробное сообщение:

```bash
git commit -m "Fix image upload: add multipart/form-data support

- Add busboy library for parsing multipart/form-data
- Update handleUploadImage to accept FormData
- Add proper error handling (400, 413, 500)
- Update frontend form to send FormData instead of base64
- Add documentation for Vercel Blob setup"
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

## ✅ Полная последовательность команд

```bash
# 1. Установить зависимости
npm install

# 2. Проверить статус
git status

# 3. Добавить файлы
git add .

# 4. Создать коммит
git commit -m "Fix image upload: add multipart/form-data support with busboy"

# 5. Отправить на GitHub
git push origin main
```

## 🔍 Если возникли проблемы

### Проблема: "npm install" не установил busboy

Убедитесь, что в `package.json` есть:
```json
"busboy": "^1.6.0"
```

И в `devDependencies`:
```json
"@types/busboy": "^1.5.4"
```

Затем выполните:
```bash
npm install busboy @types/busboy
```

### Проблема: "git push" требует аутентификации

Если GitHub требует аутентификацию:
1. Используйте Personal Access Token вместо пароля
2. Или настройте SSH ключи

### Проблема: Конфликты при push

Если есть конфликты:
```bash
git pull origin main
# Разрешите конфликты
git add .
git commit -m "Resolve merge conflicts"
git push origin main
```

## 📋 Чек-лист перед пушем

- [ ] Выполнен `npm install`
- [ ] Проверен `git status`
- [ ] Все нужные файлы добавлены (`git add`)
- [ ] Создан коммит с понятным сообщением
- [ ] Изменения протестированы локально (если возможно)
- [ ] Готов к пушу на GitHub
