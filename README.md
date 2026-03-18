# Vector Graphic Editor

Образовательный проект векторного графического редактора с разделением на:

- `frontend` (Vue 3 + TypeScript + Canvas 2D)
- `server` (Spring Boot + MongoDB)

Проект включает локальную разработку, контейнерный запуск и CI/CD (линт/формат, сборка образов, деплой).

## Содержание

1. [Что реализовано](#что-реализовано)
2. [Технологический стек](#технологический-стек)
3. [Структура репозитория](#структура-репозитория)
4. [Быстрый старт](#быстрый-старт)
5. [Локальный запуск без Docker](#локальный-запуск-без-docker)
6. [Запуск через Docker Compose](#запуск-через-docker-compose)
7. [Taskfile команды](#taskfile-команды)
8. [Backend API](#backend-api)
9. [Документация по frontend](#документация-по-frontend)
10. [Процесс разработки](#процесс-разработки)

## Что реализовано

Текущее состояние проекта:

- Редактор фигур `rect`, `circle`, `line`
- Выделение и перетаскивание фигур мышью
- Редактирование базовых свойств через панель свойств
- Базовый UI инструментов (включая заготовки для экспорта, zoom, undo/redo)
- REST API для хранения/получения состояния холстов
- MongoDB-персистентность на backend

Важно: часть UI-функций присутствует как заготовка (например, undo/redo и экспорт в `frontend` пока без полноценной реализации).

## Технологический стек

### Frontend

- Vue 3 (Composition API)
- TypeScript
- Pinia
- Vite
- Canvas 2D API
- ESLint + Oxlint + Prettier

### Backend

- Java 21
- Spring Boot 4
- Spring Data MongoDB
- Gradle
- Spotless (Palantir Java Format)

### Инфраструктура

- Docker / Docker Compose
- Task (`go-task`)
- GitHub Actions (CI + deploy)

## Структура репозитория

```text
.
├── frontend/                # клиентская часть
│   ├── src/
│   ├── README.md
│   ├── Taskfile.yaml
│   └── compose.yaml
├── server/                  # backend API
│   ├── src/
│   ├── docs/openapi.yml
│   ├── Taskfile.yaml
│   └── compose.yaml
├── compose.yaml             # объединяет frontend/server compose
├── Taskfile.yaml            # агрегирующие команды
├── CONTRIBUTING.md          # правила участия
└── README.md
```

## Быстрый старт

Требования:

- Docker + Docker Compose
- `task` (опционально, но удобно)

1. Подготовить переменные для MongoDB:

```bash
export MONGO_USER=admin
export MONGO_PASS=admin
```

2. Создать сеть (если ещё не создана):

```bash
docker network create vge || true
```

3. Поднять проект:

```bash
docker compose up -d
```

После запуска:

- Frontend: `http://localhost:5000`
- Backend API: `http://localhost:8080/api`
- MongoDB: `localhost:27017`

## Локальный запуск без Docker

### 1) Backend (`server`)

В директории `server` есть только шаблон `application.example.yml`. Для локального запуска:

1. Скопируйте его в `application.yml` и подставьте реальные значения, либо используйте переменные окружения Spring Boot.
2. Запустите MongoDB локально.
3. Запустите backend:

```bash
cd server
./gradlew bootRun
```

Примечание: если не задавать `SERVER_SERVLET_CONTEXT_PATH=/api`, backend будет доступен без префикса `/api`.

### 2) Frontend (`frontend`)

```bash
cd frontend
npm install
npm run dev
```

По умолчанию Vite поднимается на `http://localhost:5173`.

## Запуск через Docker Compose

### Полный стек (из корня)

```bash
docker network create vge || true
MONGO_USER=admin MONGO_PASS=admin docker compose up -d
```

### Только backend (из `server/`)

```bash
cd server
docker network create vge || true
MONGO_USER=admin MONGO_PASS=admin docker compose up -d
```

### Только frontend (из `frontend/`)

```bash
cd frontend
docker network create vge || true
docker compose up -d
```

## Taskfile команды

Из корня:

```bash
# Сборка docker-образов frontend + server
task image

# Публикация образов в registry
task publish

# Деплой локально через compose
task deploy
```

Подзадачи:

- `task server:image|publish|deploy|format`
- `task client:ci|build|lint|format|image|publish|deploy`

## Backend API

OpenAPI спецификация: `server/docs/openapi.yml`

Базовые эндпоинты:

- `GET /canvas` - получить список метаданных холстов
- `GET /canvas/{id}` - получить конкретный холст
- `POST /canvas` - создать холст
- `PUT /canvas/{id}` - обновить холст
- `DELETE /canvas/{id}` - удалить холст

В docker-конфигурации backend запускается с `SERVER_SERVLET_CONTEXT_PATH=/api`, поэтому итоговые URL будут вида `/api/canvas`.

Пример `POST /api/canvas`:

```json
{
  "state": "{}"
}
```

Формат ответа:

```json
{
  "code": 200,
  "message": null,
  "data": {}
}
```

## Документация по frontend

Подробное описание frontend (архитектура, команды, roadmap) уже оформлено отдельно:

- [`frontend/README.md`](./frontend/README.md)

## Процесс разработки

Правила ветвления, PR, rebase и ревью:

- [`CONTRIBUTING.md`](./CONTRIBUTING.md)

CI/CD:

- Линт/формат в PR: `.github/workflows/ci.yaml`
- Сборка и публикация образов: `.github/workflows/deploy.yaml`
- Сборка devcontainer-образа: `.github/workflows/dev.yaml`