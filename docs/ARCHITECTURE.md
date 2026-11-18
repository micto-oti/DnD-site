# Архитектура GM Table

Документ описывает структуру проекта, слои, поток данных и принципы, которые мы используем.

## 🎯 Главная идея

**Монорепа** с тремя воркспейсами: `client`, `server`, `shared`.

- **`shared`** — общие типы, константы, утилиты. **Один источник правды** для клиента и сервера.
- **`server`** — Fastify + Socket.IO + Prisma. Вся логика и данные.
- **`client`** — React + Konva. Только UI и взаимодействие.

**Правило зависимостей:**

- `client` → `shared` ✅
- `server` → `shared` ✅
- `shared` **не** зависит ни от `client`, ни от `server` ❌
- `client` **не** зависит от `server` ❌

## 🏛 Слои

```
┌─────────────────────────────────────────────────┐
│                    Browser                      │
│  ┌──────────────────────────────────────────┐   │
│  │  React + Konva + Zustand                 │   │
│  │  (client/src)                            │   │
│  └──────────────────────────────────────────┘   │
│              ↓ REST          ↕ WebSocket        │
└─────────────────────────────────────────────────┘
                       │
┌─────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────┐   │
│  │  Fastify + Socket.IO + Prisma            │   │
│  │  (server/src)                            │   │
│  └──────────────────────────────────────────┘   │
│              ↓                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  PostgreSQL  +  In-memory Map            │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## 🗂 Что где живёт

### `shared/src`

**`types/`** — TS-интерфейсы для всего:

- `User`, `Room`, `Scene`, `Token`, `Asset`, `AssetFolder`, `Marker`, `Drawing`, `Message`, `ActionRequest`, `StatusDefinition`, `TurnStatus`.
- `ws-events.ts` — все WebSocket-события (client → server, server → client).
- `roll.ts` — типы для бросков кубиков.

**`constants/`:**

- `timings.ts` — TTL для временных меток, cron-интервалы.
- `limits.ts` — максимальные длины имён, размеры файлов, лимиты.
- `defaults.ts` — дефолтные цвета, статусы, размеры.

**`utils/`:**

- `dice-parser.ts` — парсер `/roll 2d6+3`.
- `percent.ts` — конвертация процентов ↔ пиксели.

### `server/src`

**`index.ts`** — точка входа. Регистрация всего:

1. CORS, multipart, static.
2. JWT.
3. Роуты (auth, rooms, scenes, tokens, assets, upload).
4. WebSocket.
5. Cron (expire drawings/markers).
6. Сброс `isOnline` при старте.
7. Запуск listen.

**`api/`** — REST-роуты. **Только** маршрутизация + валидация. Логика — в сервисах.

- `auth.routes.ts`, `room.routes.ts`, `scene.routes.ts`, `token.routes.ts`, `asset.routes.ts`, `upload.routes.ts`, `users.routes.ts`.

**`services/`** — бизнес-логика. Чистая, тестируемая.

- `room.service.ts` — CRUD комнат, join.
- `scene.service.ts` — CRUD сцен.
- `token.service.ts` — CRUD токенов.
- `asset.service.ts` — CRUD ассетов и папок.
- `drawing.service.ts` — **in-memory** рисунки.
- `marker.service.ts` — **in-memory** метки.
- `upload.service.ts` — сохранение файлов.

**`ws/`** — Socket.IO:

- `index.ts` — инициализация + `disconnecting` для сброса `isOnline`.
- `auth.ts` — JWT в handshake.
- `handlers/room.handlers.ts` — все WS-обработчики (комната, сцены, токены, рисунки, метки).

**`jobs/`** — Cron-задачи:

- `expire-drawings.ts`, `expire-markers.ts` — удаление истёкших.

**`auth/`** — JWT:

- `jwt.ts` — регистрация плагина, sign/verify.
- `middleware.ts` — `requireAuth`.
- `service.ts` — `loginOrRegister`.

**`config/env.ts`** — Zod-валидация переменных окружения.

**`db/prisma.ts`** — singleton Prisma Client.

### `client/src`

**`api/`** — REST-клиенты. Тонкие обёртки над `fetch`.

**`ws/`** — Socket.IO:

- `socket.ts` — singleton подключения.
- `useSocket.ts` — хук для подключения.

**`store/`** — Zustand-сторы:

- `auth.store.ts`, `room.store.ts`, `scene.store.ts`, `token.store.ts`, `drawing.store.ts`, `marker.store.ts`, `asset.store.ts`, `ui.store.ts` (с persist).

**`pages/`** — 3 экрана:

- `LoginPage.tsx`, `LobbyPage.tsx`, `RoomPage.tsx`.

**`components/`:**

- `room/scene/` — Konva-сцена (слои, токены, рисунки, метки).
- `room/toolbar/` — панель инструментов.
- `room/sidebar/` — правая панель (объекты, участники).
- `room/assets/` — панель ассетов внизу.
- `room/modals/` — модалки.
- `common/` — переиспользуемые (`Modal`, `ConfirmModal`, `Button`, `Input`).

**`hooks/`:**

- `useDrawing.ts` — логика рисования мышью.

## 🔄 Поток данных

### REST

**Запросы:**
- Создание (комната, сцена, токен, ассет).
- Обновление (сцены, папки, профиль).
- Удаление (сцены, папки, ассеты).
- Загрузка файлов.
- Вход.

**Ответ:** JSON.

**Правило:** REST — для **действий пользователя**, которые **явно** **вызваны** (**кнопка**, **форма**).

### WebSocket

**Зачем:**
- **Real-time** синхронизация (изменения видны **всем** сразу).
- **Быстрые** события (drag-n-drop, рисование).

**События:**
- **Client → Server:** `token:move`, `drawing:create`, `scene:activate`, `token:create` (из модалки), `marker:create`, `tokens:recenter-all`, `turning`...
- **Server → Client:** broadcast после действия (`token:created`, `drawing:updated`, `member:online-changed`, `room:state`).

**Правило:** WS — для **операций в реальном времени** (**движение**, **изменения**, **broadcast**).

**Гибрид:** REST-роут **делает** действие → сервер **broadcast'ит** WS-событие. **Клиент** **обновляется** через WS.

## 🌐 API: архитектура

**API** разделён на **две** части: **REST** и **WebSocket**. **Каждый** **используется** **для** **своего**.

На данный момент архитектура дополняется.

### Когда **REST**, когда **WebSocket**

| Сценарий | Протокол | Почему |
|---|---|---|
| **Login** | REST | Однократный запрос, ответ с JWT. |
| **Создание комнаты** | REST | Явное действие. Ответ — данные. |
| **Загрузка файла** | REST | Multipart, не для WS. |
| **Список комнат** | REST | Одиночный запрос. |
| **Подключение к комнате** | WS | Начало сессии. После — **всё** через WS. |
| **Создание сцены** | REST | Явное действие. Сервер **broadcast'ит** `scene:created` через WS. |
| **Переключение сцены** | WS | Мгновенно, все видят. |
| **Создание токена** | WS | Частое действие (модалка/ассет). Мгновенно всем. |
| **Перемещение токена** | WS | Drag-n-drop — десятки событий/сек. |
| **Рисование** | WS | Мгновенное превью + broadcast. |
| **Чат / кубики** | WS | Real-time. |

**Правило:**

- **REST** — для **«тяжёлых»** **операций**, **которые** **делаются** **редко** (**создать** **комнату**, **загрузить** **файл**).
- **WS** — для **real-time** **синхронизации** **и** **частых** **мелких** **событий**.

### REST — структура

**Базовый** **URL:** `http://<host>:<port>/api`.

**Формат:** JSON (кроме `upload` — multipart).

**Аутентификация:** заголовок `Authorization: Bearer <jwt>`.

**Роуты** **сгруппированы** **по** **сущности**:

```
POST   /api/auth/login
GET    /api/auth/me

PATCH  /api/users/me

POST   /api/rooms
GET    /api/rooms
GET    /api/rooms/:id
POST   /api/rooms/:shortId/join

POST   /api/rooms/:roomId/scenes
GET    /api/rooms/:roomId/scenes
PATCH  /api/scenes/:id
DELETE /api/scenes/:id
POST   /api/scenes/:id/activate

POST   /api/rooms/:roomId/tokens
GET    /api/rooms/:roomId/tokens
PATCH  /api/tokens/:id
POST   /api/tokens/:id/move
DELETE /api/tokens/:id

POST   /api/rooms/:roomId/asset-folders
GET    /api/rooms/:roomId/asset-folders
PATCH  /api/asset-folders/:id
DELETE /api/asset-folders/:id

POST   /api/rooms/:roomId/assets
GET    /api/rooms/:roomId/assets
PATCH  /api/assets/:id
DELETE /api/assets/:id

POST   /api/upload
```

**Ответы:**

- **2xx** — успех (`200` / `201` / `204`).
- **4xx** — ошибка клиента (`400` / `401` / `403` / `404`).
- **5xx** — ошибка сервера.

**Формат ошибок:**

```json
{
    "error": "FORBIDDEN",
    "message": "Только ГМ может создавать сцены"
}
```

### WebSocket — структура

**URL:** `ws://<host>:<port>` (Socket.IO).

**Аутентификация:** в handshake.

```typescript
const socket = io(WS_URL, {
    auth: { token: jwt },
    transports: ["websocket"],
});
```

**Группировка** **событий** **по** **префиксу**:

- `room:*` — подключение / отключение от комнаты.
- `scene:*` — операции со сценами.
- `token:*` — токены.
- `drawing:*` — рисунки.
- `marker:*` — метки / пинги.
- `member:*` — участники комнаты.
- `folder:*`, `asset:*` — папки и ассеты.
- `error` — ошибка.

**Client → Server** (примеры):

```typescript
socket.emit("room:join", { roomId });
socket.emit("token:create", { roomId, name, ... });
socket.emit("token:move", { tokenId, x, y });
socket.emit("drawing:create", { roomId, data, ... });
socket.emit("scene:activate", { sceneId });
```

**Server → Client** (примеры):

```typescript
socket.on("room:state", (state) => { ... });
socket.on("token:created", ({ token }) => { ... });
socket.on("token:moved", ({ tokenId, x, y }) => { ... });
socket.on("member:online-changed", ({ userId, isOnline }) => { ... });
```

**Broadcast vs emit:**

- **`socket.emit(...)`** — **только** **себе**.
- **`socket.to(room).emit(...)`** — **всем** **в** **комнате**, **кроме** **себя**.
- **`io.to(room).emit(...)`** — **всем** **в** **комнате**, **включая** **себя**.

**Примеры** **использования**:

| Событие | Как отправляется | Почему |
|---|---|---|
| `room:state` | `socket.emit` | Только новому участнику. |
| `room:user-joined` | `socket.to(room).emit` | Остальным (себя не уведомляем). |
| `token:created` | `io.to(room).emit` | Всем, включая создателя (для синхронизации). |
| `token:updated` | `io.to(room).emit` | Всем. |

### Обработка ошибок

**REST** — HTTP-код + JSON.

**WS** — событие `error`:

```typescript
{
    code: "FORBIDDEN",
    message: "Вы не можете редактировать этот токен"
}
```

**Коды** (одинаковые для REST и WS):

- `UNAUTHORIZED` — нет/невалидный JWT.
- `FORBIDDEN` — нет прав.
- `NOT_FOUND` — сущность не найдена.
- `INVALID_BODY` — ошибка валидации (Zod).
- `ALREADY_EXISTS` — дубликат.

### Валидация

**REST** — Zod-схемы **в** **роутах**:

```typescript
const createSceneSchema = z.object({
    name: z.string().min(1).max(50),
    backgroundUrl: z.string().optional(),
});

const parsed = createSceneSchema.safeParse(request.body);

if (!parsed.success)
{
    return reply.code(400).send({
        error: "INVALID_BODY",
        message: parsed.error.message,
    });
}
```

**WS** — **ручная** **проверка** + **try/catch**:

```typescript
socket.on("token:create", async (payload) =>
{
    if (!(await ensureMember(userId, payload.roomId)))
    {
        socket.emit("error", {
            code: "NOT_A_MEMBER",
            message: "Вы не участник комнаты",
        });

        return;
    }

    // ...
});
```

### Права: где проверяются

**Всегда** — **на** **сервере**. **Клиент** **может** **скрывать** **кнопки**, **но** **сервер** **всегда** **проверит**:

- **REST** — `requireAuth` + `ensureGm` / `ensureMember`.
- **WS** — то **же** **самое** **в** **каждом** **обработчике**.

**Пример** — **удаление** **сцены**:

- **REST:** `DELETE /api/scenes/:id` → **проверка** `ensureGm`.
- **WS:** **не** **нужно** (**delete** **через** **REST**).

**Пример** — **перемещение** **токена**:

- **WS:** `token:move` → **проверка** **владелец** **или** GM.

### Согласованность данных

**Проблема:** **REST** **делает** **изменение** (**например**, **создаёт** **сцену**), **но** **другие** **клиенты** **не** **знают**.

**Решение:** **REST-роут** **после** **мутации** **broadcast'ит** **WS-событие**:

```typescript
app.post("/api/rooms/:roomId/scenes", async (request, reply) =>
{
    const scene = await createScene(roomId, parsed.data);

    app.io.to(`room:${roomId}`).emit("scene:created", { scene });

    return reply.code(201).send(scene);
});
```

**Клиент** **получает** **ответ** **REST** (**свой**) **и** **событие** **WS** (**все**, **включая** **себя**). **Двойная** **синхронизация**.

**Альтернатива:** **клиент** **не** **доверяет** **своему** **REST-ответу**, **а** **ждёт** **WS-broadcast**. **Но** **это** **задержка**. **Ок** **для** **MVP**.

### Версионирование API

**Сейчас** — **без** **версии** (`/api/...`). **Для** **MVP** — **достаточно**.

**Позже** — **при** **breaking** **changes**:

- **`/api/v1/...`** **в** **пути**.
- **Или** **заголовок** `Accept-Version: 1`.


## 💾 Хранение

### PostgreSQL

**Persistent** данные:

- `users`, `rooms`, `room_members`, `scenes`, `tokens`, `asset_folders`, `assets`, `statuses_library`, `room_state`, `action_requests`, `messages`.

**Почему БД:**

- **Долгая жизнь** (между сессиями).
- **Связи** (FK, каскадное удаление).
- **Персистентность** (перезапуск сервера).

### In-memory (Map)

**Ephemeral** данные:

- **`drawings`** — `Map<roomId, Map<drawingId, Drawing>>`.
- **`markers`** — `Map<roomId, Map<markerId, Marker>>`.

**Почему память:**

- **Короткая жизнь** (смена сцены, TTL).
- **Нет связей** (рисуем поверх, не ссылаемся).
- **Проще** (без миграций).
- **Быстрее** (нет I/O).

**Минус:** при перезапуске сервера — **всё пропадает**. **Ок** для тактических рисунков.

### localStorage (клиент)

- `token` — JWT.
- `userId` — для быстрых проверок.
- `gm-table-ui` — настройки toolbar (persist через Zustand).

## 🎨 Konva-сцена

### Слои (снизу вверх)

1. **BackgroundLayer** — фон (картинка или однотонный).
2. **DrawingLayer** — рисунки (карандаш, линии, стрелки, фигуры).
3. **TextLayer** — текстовые элементы.
4. **PreviewLayer** — превью текущего рисунка (пока рисуют).
5. **MarkerLayer** — метки и пинги.
6. **TokenLayer** — токены (круги, аватары, HP/SP бары, имена).
7. **UILayer** — hover, selection, служебные элементы.

### Масштабирование

**Stage** — `scaledWidth × scaledHeight`, где `scale = min(containerWidth/1920, containerHeight/1080)`.

**Letterbox** — сцена центрирована, по краям чёрные полосы (если пропорции не совпадают).

**Координаты** — **в процентах** (0–100) от размеров сцены. **При рендере** — **умножаются** на `scale`.

### Drag-n-drop

**Токены:** через Konva `draggable`, `dragBoundFunc` (не выходить за границы).

**Ассеты из панели:** через HTML5 `draggable`, `onDrop` на Stage.

## 🔐 Аутентификация

**JWT stateless.**

- **Login:** email → JWT (30 дней).
- **REST:** `Authorization: Bearer <jwt>`.
- **WS handshake:** `io(..., { auth: { token } })`.

**Проверка:**

- **REST:** `requireAuth` middleware.
- **WS:** `authenticateSocket` в `io.use()`.

**Пользователь** кладётся в `request.user` (REST) или `socket.data.userId` (WS).

## 🎭 Роли

**GM** — создатель комнаты + назначенные. Может:
- Создавать / редактировать / удалять **сцены**, **ассеты**, **папки**.
- Создавать **токены** (любые).
- Двигать / редактировать **любые токены**.
- Очищать **все рисунки**.
- Переключать **сцены**.
- Возвращать **всех** в центр.

**Player** — участник. Может:
- Создавать **свой главный токен** (один).
- Двигать / редактировать **свои токены**.
- Очищать **свои рисунки**.
- Создавать **пинги**.
- Возвращать **свои** токены в центр.

## ⚙️ Переменные окружения

См. `.env.example`. Ключевые:

- `DATABASE_URL`, `POSTGRES_*` — БД.
- `JWT_SECRET` — подпись.
- `SERVER_PORT`, `SERVER_HOST` — Fastify.
- `CLIENT_PORT` — Vite.
- `CORS_ORIGINS` — список origin.
- `UPLOAD_DIR`, `UPLOAD_MAX_SIZE_MB` — загрузки.

**Zod-валидация** в `server/src/config/env.ts` — приложение **не запустится**, если чего-то не хватает.

## 🔄 Cron

**`expire-drawings.ts`, `expire-markers.ts`** — каждые **5 секунд** (из `TIMINGS.EXPIRATION_CHECK_INTERVAL_MS`):

1. Проходят по всем комнатам (in-memory).
2. Удаляют истёкшие (`expiresAt < now`).
3. Broadcast `drawing:expired` / `marker:expired`.

## 📡 Сброс isOnline

**При старте сервера:**

```typescript
await prisma.roomMember.updateMany({ data: { isOnline: false } });
await prisma.token.updateMany({ where: { ownerId: { not: null } }, data: { isOnline: false } });
```

При подключении: room:join — isOnline = true.
При отключении: disconnecting (Socket.IO) — isOnline = false, broadcast.

disconnecting — важно. disconnect — уже после выхода из комнат (socket.rooms пуст).

🧩 Принципы
1. Один источник правды
Типы — только в shared. Схема БД — только в Prisma. Константы — только в shared/constants.

2. Никакой бизнес-логики в роутах
Роут — валидация + вызов сервиса + ответ. Сервис — вся логика.

3. Broadcast после мутаций
REST/WS — меняет БД. Сразу после — io.to(...).emit(...). Клиенты обновляются через WS, а не через повторный запрос.

4. Оптимистичные обновления
Клиент — сначала меняет локальный стор (оптимистично), потом эмитит WS. Если сервер отклонит — откат (позже).

Пример: token:move — токен уже сдвинулся локально (Konva), потом — WS.

5. Права на сервере
Все проверки — на сервере. Клиент может скрывать кнопки, но сервер всегда проверит.

6. Простота важнее универсальности
Рисунки и метки — in-memory. Позже — можно перенести в БД. Сейчас — проще.