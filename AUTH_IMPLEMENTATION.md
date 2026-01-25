# Реализация авторизации через localStorage

## ✅ Что было сделано:

### 1. **API (`api/index.ts`)**
- При успешном входе возвращает токен: `base64(userId:timestamp)`
- Формат ответа: `{ success: true, token: "..." }`

### 2. **Утилиты авторизации (`client/src/lib/auth.ts`)**
- `generateAuthToken(userId)` - генерация токена
- `parseAuthToken(token)` - парсинг токена
- `isTokenValid(token)` - проверка валидности (7 дней)
- `getAuthToken()` - получение токена из localStorage
- `setAuthToken(token)` - сохранение токена
- `removeAuthToken()` - удаление токена
- `isAuthenticated()` - проверка авторизации

### 3. **Страница входа (`client/src/pages/admin/login.tsx`)**
- При успешном входе сохраняет токен в localStorage
- Перенаправляет на `/admin/dashboard`
- Проверяет, не авторизован ли уже пользователь (редирект на dashboard)

### 4. **Layout админ-панели (`client/src/components/admin-layout.tsx`)**
- Проверяет токен из localStorage вместо `/api/admin/session`
- Если токена нет → редирект на `/admin/login`
- Кнопка "Выйти" удаляет токен и перенаправляет на логин

### 5. **Роутинг (`client/src/App.tsx`)**
- `/admin/login` - страница входа
- `/admin/dashboard` - дашборд (требует авторизации)
- `/admin` - редирект на `/admin/dashboard`

## 🔐 Формат токена:

```
base64(userId:timestamp)
```

Пример:
- User ID: `123e4567-e89b-12d3-a456-426614174000`
- Timestamp: `1737820800000`
- Token: `MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDAwOjE3Mzc4MjA4MDAwMDAw`

## ⏱️ Срок действия токена:

- **7 дней** с момента создания
- Автоматическая проверка при каждом использовании
- Истечённые токены автоматически удаляются

## 📝 Использование:

### Вход:
```typescript
const response = await fetch('/api/?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: 'admin', password: 'password' }),
});
const { success, token } = await response.json();
if (success && token) {
  setAuthToken(token);
  // Redirect to dashboard
}
```

### Проверка авторизации:
```typescript
import { isAuthenticated } from '@/lib/auth';

if (!isAuthenticated()) {
  // Redirect to login
}
```

### Выход:
```typescript
import { removeAuthToken } from '@/lib/auth';

removeAuthToken();
// Redirect to login
```

## 🛡️ Безопасность:

- ✅ Пароли хешируются через bcrypt
- ✅ Токены имеют срок действия (7 дней)
- ✅ Токены хранятся только в localStorage (не в cookies)
- ⚠️ **Важно**: Для продакшена рекомендуется использовать HTTP-only cookies или JWT с подписью

## 🔄 Поток авторизации:

1. Пользователь вводит логин/пароль на `/admin/login`
2. Фронтенд отправляет запрос на `/api/?action=login`
3. API проверяет пароль через bcrypt
4. API возвращает токен: `{ success: true, token: "..." }`
5. Фронтенд сохраняет токен в localStorage
6. Фронтенд перенаправляет на `/admin/dashboard`
7. `AdminLayout` проверяет токен при загрузке
8. Если токен валиден → показывается админ-панель
9. Если токена нет или он истёк → редирект на `/admin/login`
