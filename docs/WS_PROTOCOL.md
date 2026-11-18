# WebSocket протокол GM Table

Документ описывает **все** события Socket.IO: **кто**, **когда**, **с каким payload**.

## 🎯 Базовое

**Библиотека:** Socket.IO 4.x.

**URL:** `ws://<host>:<port>` (тот же, что у API).

**Транспорт:** только `websocket` (без polling).

**Аутентификация:** JWT в handshake.

```typescript
const socket = io(WS_URL, {
    auth: { token: jwt },
    transports: ["websocket"],
});
```

Сервер проверяет JWT в authenticateSocket middleware. Если невалид — соединение отклоняется.

Данные сокета: socket.data.userId, socket.data.email.

## 🏠 Комната

### room:join (client → server)

Подключение к комнате.

```typescript
socket.emit("room:join", { roomId: string });
```

Что делает сервер:

Проверяет, что пользователь — участник комнаты.

Устанавливает isOnline = true для RoomMember и токенов.

Подписывает сокет на room:<roomId>.

Отправляет room:state только этому сокету.

Broadcast'ит room:user-joined остальным.

Broadcast'ит member:online-changed остальным.

### room:state (server → client)

Полное состояние комнаты. Отправляется после room:join.

```typescript
socket.on("room:state", (state: RoomInitialState) => { ... });
```

RoomInitialState:

```typescript
{
    room: Room;
    members: RoomMemberWithUser[];
    turn: TurnStatus;
    activeSceneId: string | null;
    scenes: Scene[];
    tokens: Token[];
    drawings: Drawing[];
    markers: Marker[];
    statuses: StatusDefinition[];
    assets: Asset[];
    assetFolders: AssetFolder[];
    messages: Message[];
    needsMainToken: boolean;
}
```

needsMainToken — true, если игрок не GM и у него нет главного токена. Клиент показывает модалку создания персонажа.

### room:user-joined (server → client, broadcast)

Кто-то зашёл в комнату.

typescript
socket.on("room:user-joined", ({ member }: { member: RoomMemberWithUser }) => { ... });
Кому: всем кроме нового участника (socket.to(room).emit).

room:user-left (server → client, broadcast)
Кто-то вышел из комнаты.

typescript
socket.on("room:user-left", ({ userId }: { userId: string }) => { ... });
Кому: всем кроме вышедшего.

Замечание: клиент не удаляет участника из списка. Только сбрасывает isOnline (см. member:online-changed).

room:leave (client → server)
Выход из комнаты (при навигации, закрытии вкладки).

typescript
socket.emit("room:leave");
Сервер:

Устанавливает isOnline = false для RoomMember и токенов.

Отписывает сокет от room:<roomId>.

Broadcast'ит member:online-changed и token:updated.

member:online-changed (server → client, broadcast)
Онлайн/оффлайн участника.

typescript
socket.on("member:online-changed", ({
    userId,
    isOnline,
}: {
    userId: string;
    isOnline: boolean;
}) => { ... });
Эмитится:

При room:join (isOnline: true).

При disconnecting / room:leave (isOnline: false).

🎬 Сцены
scene:activate (client → server)
Сделать сцену активной. Только GM.

typescript
socket.emit("scene:activate", { sceneId: string });
Сервер:

Проверяет ensureGm.

Меняет RoomState.activeSceneId.

Broadcast'ит scene:activated всем.

scene:activated (server → client, broadcast)
typescript
socket.on("scene:activated", ({ sceneId }: { sceneId: string }) => { ... });
Кому: всем в комнате (io.to(room).emit).

scene:created, scene:updated, scene:deleted
Эмитятся сервером из REST-роутов после создания / обновления / удаления.

Payload:

scene:created — { scene: Scene }.

scene:updated — { scene: Scene }.

scene:deleted — { sceneId: string }.

Клиент просто обновляет локальный стор.

🎭 Токены
token:create (client → server)
Создание токена (из модалки / ассета).

typescript
socket.emit("token:create", {
    roomId: string;
    assetId?: string;       // если создаём из ассета
    name?: string;           // обязательно, если нет assetId
    imageUrl?: string;
    x?: number;              // проценты
    y?: number;
    size?: number;
    color?: string;
    ownerId?: string | null;
    isMain?: boolean;
    hpCurrent?: number;
    hpMax?: number;
    spCurrent?: number;
    spMax?: number;
    level?: number;
    experience?: number;
});
Сервер:

Проверяет ensureMember.

Если не GM — проверяет, что создаётся свой isMain и нет другого главного.

Если assetId — копирует поля ассета.

Создаёт токен в БД.

Broadcast'ит token:created всем.

token:created (server → client, broadcast)
typescript
socket.on("token:created", ({ token }: { token: Token }) => { ... });
Кому: всем (io.to(room).emit), включая создателя (для синхронизации).

token:update (client → server)
Обновление токена (PATCH-семантика).

typescript
socket.emit("token:update", {
    tokenId: string;
    patch: UpdateTokenInput;
});
UpdateTokenInput — любые поля Token (кроме isMain, ownerId — они меняются иначе).

Сервер:

Проверяет владельца или GM.

Обновляет в БД.

Broadcast'ит token:updated.

token:updated (server → client, broadcast)
typescript
socket.on("token:updated", ({ token }: { token: Token }) => { ... });
Кому: всем.

Эмитится также:

При room:join — для своих токенов игрока (isOnline: true).

При disconnecting / room:leave — для своих токенов (isOnline: false).

token:move (client → server)
Перемещение токена (drag-n-drop).

typescript
socket.emit("token:move", {
    tokenId: string;
    x: number;              // проценты 0-100
    y: number;
});
Сервер:

Проверяет владельца или GM.

Обновляет x, y.

Broadcast'ит token:moved.

Замечание: оптимистичное обновление — клиент сразу двигает токен локально, потом эмитит.

token:moved (server → client, broadcast)
typescript
socket.on("token:moved", ({
    tokenId,
    x,
    y,
}: {
    tokenId: string;
    x: number;
    y: number;
}) => { ... });
token:delete (client → server)
Удаление токена. Только GM. Главный токен игрока — нельзя.

typescript
socket.emit("token:delete", { tokenId: string });
Сервер:

Проверяет ensureGm.

Если isMain — отказ.

Удаляет.

Broadcast'ит token:deleted.

token:deleted (server → client, broadcast)
typescript
socket.on("token:deleted", ({ tokenId }: { tokenId: string }) => { ... });
tokens:recenter-all (client → server)
«Вернуть всех в центр». Только GM.

typescript
socket.emit("tokens:recenter-all", { roomId: string });
Сервер: перемещает все токены в центр со смещением. Broadcast'ит tokens:recentered.

tokens:recenter-mine (client → server)
«Вернуть мой токен». Любой участник.

typescript
socket.emit("tokens:recenter-mine", { roomId: string });
Сервер: перемещает только токены пользователя (ownerId = userId). Broadcast'ит tokens:recentered.

tokens:recentered (server → client, broadcast)
typescript
socket.on("tokens:recentered", ({ tokens }: { tokens: Token[] }) => { ... });
Клиент обновляет координаты всех переданных токенов.

✏️ Рисунки
drawing:create (client → server)
Создание рисунка (после завершения штриха / фигуры).

typescript
socket.emit("drawing:create", {
    roomId: string;
    data: DrawingData;       // дискриминированный union
    color?: string;
    strokeWidth?: number;
    isTemporary?: boolean;
});
DrawingData:

typescript
type DrawingData =
    | { type: "freehand"; points: DrawingPoint[] }
    | { type: "line"; points: [DrawingPoint, DrawingPoint] }
    | { type: "arrow"; points: [DrawingPoint, DrawingPoint] }
    | { type: "circle"; start: DrawingPoint; end: DrawingPoint }
    | { type: "rect"; start: DrawingPoint; end: DrawingPoint }
    | { type: "triangle"; points: [DrawingPoint, DrawingPoint, DrawingPoint] }
    | { type: "text"; x: number; y: number; text: string; fontSize: number };
Сервер:

Проверяет ensureMember.

Создаёт в in-memory store.

Broadcast'ит drawing:created.

drawing:created (server → client, broadcast)
typescript
socket.on("drawing:created", ({ drawing }: { drawing: Drawing }) => { ... });
Кому: всем.

drawing:update (client → server)
Обновление рисунка (для текста — редактирование).

typescript
socket.emit("drawing:update", {
    drawingId: string;
    patch: {
        data?: DrawingData;
        color?: string;
    };
});
Сервер:

Проверяет владельца или GM.

Обновляет в in-memory store.

Broadcast'ит drawing:updated.

drawing:updated (server → client, broadcast)
typescript
socket.on("drawing:updated", ({ drawing }: { drawing: Drawing }) => { ... });
drawing:delete (client → server)
Удаление рисунка (ластик).

typescript
socket.emit("drawing:delete", { drawingId: string });
Сервер:

Проверяет владельца или GM.

Удаляет из in-memory store.

Broadcast'ит drawing:deleted.

drawing:deleted (server → client, broadcast)
typescript
socket.on("drawing:deleted", ({ drawingId }: { drawingId: string }) => { ... });
drawing:clear-mine (client → server)
Стереть свои рисунки.

typescript
socket.emit("drawing:clear-mine", { roomId: string });
Сервер: удаляет свои рисунки. Broadcast'ит drawings:cleared с authorId.

drawing:clear-all (client → server)
Стереть все рисунки. Только GM.

typescript
socket.emit("drawing:clear-all", { roomId: string });
Сервер: удаляет все рисунки. Broadcast'ит drawings:cleared с authorId: null.

drawings:cleared (server → client, broadcast)
typescript
socket.on("drawings:cleared", ({
    roomId,
    authorId,
}: {
    roomId: string;
    authorId: string | null;    // null = все
}) => { ... });
Клиент:

authorId === null → очистить все рисунки.

authorId === userId → очистить свои.

drawing:expired (server → client, broadcast)
Временный рисунок истёк.

typescript
socket.on("drawing:expired", ({ drawingId }: { drawingId: string }) => { ... });
Источник: cron-задача раз в 5 сек.

📍 Метки / пинги
marker:create (client → server)
Создание метки / пинга.

typescript
socket.emit("marker:create", {
    roomId: string;
    x: number;
    y: number;
    color?: string;
    label?: string;
    isTemporary?: boolean;
});
Сервер:

Проверяет ensureMember.

Создаёт в in-memory store.

Broadcast'ит marker:created.

marker:created (server → client, broadcast)
typescript
socket.on("marker:created", ({ marker }: { marker: Marker }) => { ... });
marker:delete (client → server)
Удаление метки.

typescript
socket.emit("marker:delete", { markerId: string });
Сервер:

Проверяет владельца или GM.

Удаляет из in-memory store.

Broadcast'ит marker:deleted.

marker:deleted (server → client, broadcast)
typescript
socket.on("marker:deleted", ({ markerId }: { markerId: string }) => { ... });
marker:expired (server → client, broadcast)
Метка истекла (cron).

typescript
socket.on("marker:expired", ({ markerId }: { markerId: string }) => { ... });
📦 Ассеты и папки
folder:created, folder:updated, folder:deleted
Эмитятся сервером из REST-роутов.

Payload:

folder:created — { folder: AssetFolder }.

folder:updated — { folder: AssetFolder }.

folder:deleted — { folderId: string }.

Клиент обновляет asset.store.

asset:created, asset:updated, asset:deleted
Эмитятся сервером из REST-роутов.

Payload:

asset:created — { asset: Asset }.

asset:updated — { asset: Asset }.

asset:deleted — { assetId: string }.

При asset:deleted — сервер также эмитит token:deleted для всех токенов, созданных из этого ассета (Cascade).

⚠️ Ошибки
error (server → client)
Любая ошибка обработчика.

typescript
socket.on("error", ({
    code,
    message,
}: {
    code: string;
    message: string;
}) => { ... });
Коды:

UNAUTHORIZED — невалидный JWT (на этапе handshake).

NOT_A_MEMBER — не участник комнаты.

NOT_GM — не GM.

FORBIDDEN — нет прав на действие.

TOKEN_NOT_FOUND, SCENE_NOT_FOUND, DRAWING_NOT_FOUND, ASSET_NOT_FOUND, FOLDER_NOT_FOUND — сущность не найдена.

ALREADY_EXISTS — дубликат (например, главный токен уже есть).

INVALID_BODY — ошибка валидации.

UNKNOWN — непредвиденная ошибка.

Клиент показывает toast или пишет в консоль.

🔄 Broadcast vs Emit
Правила:

socket.emit(...) — только себе. Используется для room:state, error.

socket.to(room).emit(...) — всем в комнате, кроме себя. Для событий «что-то произошло с другим».

io.to(room).emit(...) — всем в комнате, включая себя. Для событий «изменение данных».

Примеры:

Событие	Способ	Почему
room:state	socket.emit	Только новому участнику
room:user-joined	socket.to	Себя не уведомляем
room:user-left	socket.to	Себя не уведомляем
member:online-changed	socket.to (при join) / socket.to (при leave)	Себя не уведомляем
token:created	io.to	Всем, включая создателя (для синхронизации)
token:updated	io.to	Всем
token:deleted	io.to	Всем
drawing:created	io.to	Всем
scene:activated	io.to	Всем
🔁 Реконнект
Socket.IO автоматически переподключается при разрыве.

Клиент при connect заново эмитит room:join (через useEffect в RoomPage).

Состояние восстанавливается из room:state.

🎯 Порядок событий при подключении
Клиент: io(...) → handshake с JWT.

Сервер: authenticateSocket → проверка JWT.

Сервер: socket.data.userId = ....

Клиент: socket.emit("room:join", { roomId }).

Сервер: проверка, установка isOnline = true.

Сервер: socket.emit("room:state", ...) — клиенту.

Сервер: socket.to(room).emit("room:user-joined", ...) — остальным.

Сервер: socket.to(room).emit("member:online-changed", ...) — остальным.

Сервер: io.to(room).emit("token:updated", ...) для своих токенов — всем.

🎯 Порядок событий при отключении
Клиент: закрывает вкладку → beforeunload → socket.emit("room:leave").

Сервер: room:leave — isOnline = false, broadcast.

Сервер: через мгновение — disconnecting (Socket.IO) — если room:leave не успел, это сработает.

Клиент: закрывается. Сокет отключается.

📋 Итого событий
Client → Server (14):

room:join, room:leave

scene:activate

token:create, token:update, token:move, token:delete

tokens:recenter-all, tokens:recenter-mine

drawing:create, drawing:update, drawing:delete, drawing:clear-mine, drawing:clear-all

marker:create, marker:delete

Server → Client (24):

room:state, room:user-joined, room:user-left

member:online-changed

scene:created, scene:updated, scene:deleted, scene:activated

token:created, token:updated, token:moved, token:deleted

tokens:recentered

drawing:created, drawing:updated, drawing:deleted, drawing:expired, drawings:cleared

marker:created, marker:deleted, marker:expired

folder:created, folder:updated, folder:deleted

asset:created, asset:updated, asset:deleted

error