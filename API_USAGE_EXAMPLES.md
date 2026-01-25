# Примеры использования универсального API

Все API-запросы теперь идут через один эндпоинт `/api/?action=...`

## 1. Отправка формы обратной связи (Contact)

```typescript
// React компонент
const handleContactSubmit = async (formData: { name: string; email: string; message: string }) => {
  try {
    const response = await fetch('/api/?action=contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Сообщение отправлено! ID:', result.id);
      // Показать успешное уведомление
    } else {
      console.error('Ошибка:', result.message);
      // Показать ошибку
    }
  } catch (error) {
    console.error('Ошибка сети:', error);
  }
};

// Использование:
handleContactSubmit({
  name: 'Иван Иванов',
  email: 'ivan@example.com',
  message: 'Привет! Хочу связаться с вами по поводу проекта.',
});
```

## 2. Запрос оценки проекта (Estimate)

```typescript
// React компонент
const handleEstimateSubmit = async (formData: {
  projectType: string;
  features: string[];
  designComplexity: string;
  urgency: string;
  budget?: string;
  contactName: string;
  contactEmail: string;
  contactTelegram?: string;
  description?: string;
  estimation: {
    minPrice: number;
    maxPrice: number;
    minDays: number;
    maxDays: number;
  };
}) => {
  try {
    const response = await fetch('/api/?action=estimate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Заявка отправлена! ID:', result.id);
      // Показать успешное уведомление
    } else {
      console.error('Ошибка:', result.message);
      // Показать ошибку
    }
  } catch (error) {
    console.error('Ошибка сети:', error);
  }
};

// Использование:
handleEstimateSubmit({
  projectType: 'webapp',
  features: ['auth', 'admin', 'payment'],
  designComplexity: 'premium',
  urgency: 'standard',
  budget: '300000',
  contactName: 'Петр Петров',
  contactEmail: 'petr@example.com',
  contactTelegram: '@petr',
  description: 'Нужен веб-сайт для интернет-магазина',
  estimation: {
    minPrice: 250000,
    maxPrice: 350000,
    minDays: 30,
    maxDays: 45,
  },
});
```

## 3. Вход в админ-панель (Login)

```typescript
// React компонент
const handleLogin = async (credentials: { login: string; password: string }) => {
  try {
    const response = await fetch('/api/?action=login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const result = await response.json();

    if (result.success) {
      console.log('Вход выполнен успешно!');
      // Сохранить состояние авторизации (например, в localStorage или state)
      // Перенаправить на админ-панель
      window.location.href = '/admin';
    } else {
      console.error('Ошибка:', result.message);
      // Показать ошибку входа
    }
  } catch (error) {
    console.error('Ошибка сети:', error);
  }
};

// Использование:
handleLogin({
  login: 'admin',
  password: 'your_password',
});
```

## Пример с React Hook Form

```typescript
import { useForm } from 'react-hook-form';

function ContactForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: { name: string; email: string; message: string }) => {
    try {
      const response = await fetch('/api/?action=contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Сообщение отправлено!');
      } else {
        alert(`Ошибка: ${result.message}`);
      }
    } catch (error) {
      alert('Ошибка сети');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('name', { required: true })} placeholder="Имя" />
      {errors.name && <span>Имя обязательно</span>}
      
      <input {...register('email', { required: true })} type="email" placeholder="Email" />
      {errors.email && <span>Email обязателен</span>}
      
      <textarea {...register('message', { required: true })} placeholder="Сообщение" />
      {errors.message && <span>Сообщение обязательно</span>}
      
      <button type="submit">Отправить</button>
    </form>
  );
}
```

## Пример с TanStack Query (React Query)

```typescript
import { useMutation } from '@tanstack/react-query';

function useContactMutation() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; message: string }) => {
      const response = await fetch('/api/?action=contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Ошибка отправки');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Успешно отправлено:', data);
    },
    onError: (error) => {
      console.error('Ошибка:', error);
    },
  });
}

// Использование в компоненте:
function ContactForm() {
  const mutation = useContactMutation();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* поля формы */}
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Отправка...' : 'Отправить'}
      </button>
    </form>
  );
}
```

## Формат ответов API

### Успешный ответ:
```json
{
  "success": true,
  "message": "Сообщение успешно отправлено",
  "id": "uuid-заявки"
}
```

### Ошибка валидации:
```json
{
  "error": "Validation error",
  "message": "Имя должно содержать минимум 2 символа; Введите корректный email"
}
```

### Ошибка аутентификации:
```json
{
  "error": "Authentication error",
  "message": "Неверный логин или пароль"
}
```

### Ошибка сервера:
```json
{
  "error": "Internal server error",
  "message": "Произошла ошибка при обработке запроса"
}
```
