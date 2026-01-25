# Формы обратной связи и дашборд админ-панели

## ✅ Что было реализовано:

### 1. **API обработчики (`api/index.ts`)**

#### POST запросы:
- **`/api/?action=contact`** - отправка формы обратной связи
  - Валидация через `contactFormSchema`
  - Сохранение в таблицу `leads` с `type: "contact"`
  - Возвращает `{ success: true, id: "..." }`

- **`/api/?action=estimate`** - отправка запроса на оценку проекта
  - Валидация через `estimationRequestSchema`
  - Сохранение в таблицу `leads` с `type: "estimation"`
  - Сохранение данных оценки (minPrice, maxPrice, minDays, maxDays)
  - Возвращает `{ success: true, id: "..." }`

- **`/api/?action=login`** - вход в админ-панель
  - Проверка пароля через bcrypt
  - Возвращает `{ success: true, token: "..." }`

#### GET запросы:
- **`/api/?action=getContacts`** - получение списка контактов
  - Фильтрует по `type: "contact"`
  - Сортирует по дате создания (новые сначала)
  - Возвращает массив контактов

- **`/api/?action=getEstimates`** - получение списка оценок
  - Фильтрует по `type: "estimation"`
  - Сортирует по дате создания (новые сначала)
  - Возвращает массив оценок

### 2. **Формы на фронтенде**

#### Contact Form (`client/src/components/sections/contact-section.tsx`):
```typescript
const mutation = useMutation({
  mutationFn: async (data: ContactFormData) => {
    const response = await apiRequest("POST", "/api/?action=contact", data);
    return response;
  },
  // ...
});
```

#### Estimate Form (`client/src/components/sections/estimation-section.tsx`):
```typescript
const submitMutation = useMutation({
  mutationFn: async (data: EstimationRequest & { estimation: EstimationResult }) => {
    return apiRequest("POST", "/api/?action=estimate", data);
  },
  // ...
});
```

### 3. **Админ-дашборд (`client/src/pages/admin/dashboard.tsx`)**

Отображает:
- **Статистику**: всего заявок, в этом месяце, горячие лиды, новые заявки
- **Разбивку по типам**: контакты и оценки
- **Разбивку по статусам**: новые, в работе, закрыты
- **Разбивку по scoring**: A (горячие), B (тёплые), C (холодные)
- **Список контактов**: последние 5 контактов с деталями
- **Список оценок**: последние 5 оценок с деталями проекта
- **Все последние заявки**: объединённый список всех заявок

## 📊 Структура данных

### Таблица `leads` (используется для обоих типов):

```typescript
{
  id: string;
  type: "contact" | "estimation";
  status: "new" | "in_progress" | "closed";
  scoring: "A" | "B" | "C";
  
  // Общие поля
  name: string;
  email: string;
  telegram?: string;
  
  // Для contact
  message?: string;
  
  // Для estimation
  projectType?: string;
  features?: string[];
  designComplexity?: string;
  urgency?: string;
  budget?: string;
  description?: string;
  estimatedMinPrice?: number;
  estimatedMaxPrice?: number;
  estimatedMinDays?: number;
  estimatedMaxDays?: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 Поток данных

### Отправка формы:
1. Пользователь заполняет форму (Contact или Estimate)
2. Фронтенд отправляет POST на `/api/?action=contact` или `/api/?action=estimate`
3. API валидирует данные через Zod схемы
4. API подключается к БД (on-demand)
5. API вставляет запись в таблицу `leads`
6. API закрывает соединение
7. API возвращает `{ success: true, id: "..." }`
8. Фронтенд показывает уведомление об успехе

### Просмотр в админ-панели:
1. Админ открывает `/admin/dashboard`
2. Фронтенд отправляет GET на `/api/?action=getContacts`
3. Фронтенд отправляет GET на `/api/?action=getEstimates`
4. API подключается к БД (on-demand)
5. API фильтрует по типу и сортирует по дате
6. API закрывает соединение
7. API возвращает массив данных
8. Фронтенд отображает данные в дашборде

## ✅ Проверка работы

### Тест отправки формы контакта:
```bash
curl -X POST https://iristonweb.ru/api/?action=contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Тест","email":"test@test.com","message":"Тестовое сообщение"}'
```

### Тест отправки формы оценки:
```bash
curl -X POST https://iristonweb.ru/api/?action=estimate \
  -H "Content-Type: application/json" \
  -d '{
    "projectType":"webapp",
    "features":["auth"],
    "designComplexity":"premium",
    "urgency":"standard",
    "contactName":"Тест",
    "contactEmail":"test@test.com",
    "estimation":{"minPrice":100000,"maxPrice":200000,"minDays":30,"maxDays":45}
  }'
```

### Тест получения контактов:
```bash
curl https://iristonweb.ru/api/?action=getContacts
```

### Тест получения оценок:
```bash
curl https://iristonweb.ru/api/?action=getEstimates
```

## 🎯 Результат

- ✅ Формы отправляют данные на правильные эндпоинты
- ✅ Данные сохраняются в БД через on-demand подключения
- ✅ Админ-дашборд отображает контакты и оценки отдельно
- ✅ Статистика рассчитывается из реальных данных
- ✅ Все запросы используют единую функцию `api/index.ts`
