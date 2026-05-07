# STRADEX Parking System

Автоматизированная система управления парковкой.

## Возможности

- Управление парковочными сессиями
- Гостевые пропуска
- Белый и чёрный списки номеров
- Тарифы и подписки
- Статистика и отчёты
- Типы клиентов: разовые, постоянные, арендаторы

## Технологии

- **Frontend:** React, TypeScript, TailwindCSS, Vite
- **Backend:** NestJS, Prisma ORM
- **База данных:** SQLite (для desktop версии), PostgreSQL (для серверной версии)
- **Desktop:** Electron

## Структура проекта

```
web-app/
├── frontend/          # React приложение
├── backend/          # NestJS API
├── electron/         # Electron desktop приложение
└── prisma/          # Схема базы данных
```

## Запуск

### Разработка

```bash
# Backend
cd backend
npm install
npm run start:dev

# Frontend
cd frontend
npm install
npm run dev
```

### Desktop приложение

Готовые сборки доступны в папках:
- `STRADEX-Portable/` - Windows версия
- `STRADEX-Portable-Linux/` - Linux версия

```bash
# Запуск
./STRADEX-Portable-Linux/stradex-parking-desktop
# или
STRADEX-Portable/STRADEX Parking.exe
```

## Логин по умолчанию

- **Email:** admin@parking.local
- **Пароль:** admin123

## API Endpoints

- `GET /api/v1/dashboard/statistics` - Статистика
- `GET /api/v1/dashboard/sessions` - Сессии
- `POST /api/v1/dashboard/parking/sessions` - Создать сессию
- `GET /api/v1/dashboard/guest-passes` - Гостевые пропуска
- `POST /api/v1/dashboard/guest-passes` - Создать пропуск
- `GET /api/v1/dashboard/whitelist` - Белый список
- `POST /api/v1/dashboard/whitelist` - Добавить в белый список
- `GET /api/v1/dashboard/blacklist` - Чёрный список
- `POST /api/v1/dashboard/blacklist` - Добавить в чёрный список

## Лицензия

MIT