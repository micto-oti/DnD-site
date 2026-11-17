# Схема базы данных GM Table

Документ описывает **все** модели Prisma, связи и то, что хранится в **PostgreSQL** vs **in-memory**.

## 🎯 Обзор

**PostgreSQL** — персистентные данные (между сессиями, при перезапуске сервера).
**In-memory** — эфемерные данные (рисунки, метки).

**Схема Prisma:** `server/prisma/schema.prisma`.

## 🗂 Модели

### `User` — пользователи

```prisma
model User {
    id        String   @id @default(uuid()) @db.Uuid
    email     String   @unique
    nickname  String
    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")

    createdRooms    Room[]             @relation("RoomGM")
    memberships     RoomMember[]
    ownedTokens     Token[]            @relation("TokenOwner")
    uploadedAssets  Asset[]
    createdStatuses StatusDefinition[]
    messages        Message[]
    actionRequests  ActionRequest[]

    @@map("users")
}'
```

Поля:

Поле	Тип	Описание
id	UUID	Первичный ключ
email	String	Уникальный. Идентификатор
nickname	String	Отображаемое имя (не уникален)
createdAt	DateTime	Дата регистрации
updatedAt	DateTime	Автообновляется
Связи:

1 → N Room (как GM).

1 → N RoomMember (как участник).

1 → N Token (как владелец).

1 → N Asset (как загрузивший).

1 → N StatusDefinition (как создатель).

1 → N Message.

1 → N ActionRequest.

## Room — комнаты

```prisma
model Room {
    id        String   @id @default(uuid()) @db.Uuid
    shortId   String   @unique @map("short_id")
    name      String
    gmId      String   @map("gm_id") @db.Uuid
    createdAt DateTime @default(now()) @map("created_at")

    gm             User               @relation("RoomGM", fields: [gmId], references: [id], onDelete: Cascade)
    members        RoomMember[]
    scenes         Scene[]
    tokens         Token[]
    assetFolders   AssetFolder[]
    assets         Asset[]
    statuses       StatusDefinition[]
    state          RoomState?
    actionRequests ActionRequest[]
    messages       Message[]

    @@map("rooms")
}
```

Поля:

Поле	Тип	Описание
id	UUID	Первичный ключ
shortId	String	Уникальный. 8 символов для шаринга
name	String	Название комнаты
gmId	UUID	Создатель (GM)
Каскадное удаление: удалили пользователя → его комнаты удалились.

## RoomMember — участники комнат

```prisma
enum Role {
    gm
    player
}

model RoomMember {
    roomId          String   @map("room_id") @db.Uuid
    userId          String   @map("user_id") @db.Uuid
    role            Role
    actionConfirmed Boolean  @default(false) @map("action_confirmed")
    isOnline        Boolean  @default(false) @map("is_online")
    joinedAt        DateTime @default(now()) @map("joined_at")

    room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@id([roomId, userId])
    @@map("room_members")
}
```

Составной PK: (roomId, userId).

Поля:

Поле	Тип	Описание
role	Role	gm / player
actionConfirmed	Boolean	Подтвердил ли действие (для логики хода)
isOnline	Boolean	Онлайн ли (устанавливается при connect/disconnect)
joinedAt	DateTime	Когда присоединился
isOnline — сбрасывается при старте сервера и при disconnecting из WS.

## Scene — сцены

```prisma
model Scene {
    id            String   @id @default(uuid()) @db.Uuid
    roomId        String   @map("room_id") @db.Uuid
    name          String
    backgroundUrl String?  @map("background_url")
    orderIndex    Int      @default(0) @map("order_index")
    createdAt     DateTime @default(now()) @map("created_at")

    room           Room        @relation(fields: [roomId], references: [id], onDelete: Cascade)
    activeInStates RoomState[] @relation("ActiveScene")

    @@index([roomId])
    @@map("scenes")
}
```

Поля:

Поле	Тип	Описание
backgroundUrl	String?	Относительный путь /uploads/<uuid>.<ext>. Null = однотонный фон
orderIndex	Int	Порядок в списке
Связи:

1 → N Room (roomId).

1 → N RoomState (если сцена активна в комнатах).

Каскад: удалили комнату → сцены удалились.

## Token — токены (персонажи, NPC, объекты)

```prisma
model Token {
    id       String  @id @default(uuid()) @db.Uuid
    roomId   String  @map("room_id") @db.Uuid
    assetId  String? @map("asset_id") @db.Uuid
    name     String
    imageUrl String? @map("image_url")
    x        Float   @default(50)
    y        Float   @default(50)
    size     Float   @default(1.0)
    color    String  @default("#3498db")
    ownerId  String? @map("owner_id") @db.Uuid

    isMain   Boolean @default(false) @map("is_main")
    isOnline Boolean @default(false) @map("is_online")

    hpCurrent Int? @map("hp_current")
    hpMax     Int? @map("hp_max")
    spCurrent Int? @map("sp_current")
    spMax     Int? @map("sp_max")

    level      Int? @map("level")
    experience Int? @map("experience")

    statuses Json @default("[]")

    createdAt DateTime @default(now()) @map("created_at")
    updatedAt DateTime @updatedAt @map("updated_at")

    room  Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
    asset Asset? @relation(fields: [assetId], references: [id], onDelete: Cascade)
    owner User?  @relation("TokenOwner", fields: [ownerId], references: [id], onDelete: SetNull)

    @@index([roomId])
    @@index([ownerId])
    @@index([assetId])
    @@map("tokens")
}
```

Поля:

Поле	Тип	Описание
assetId	UUID?	Ссылка на ассет. При удалении ассета — токен удаляется (Cascade)
x, y	Float	Позиция в процентах (0–100) от сцены
size	Float	Множитель от BASE_TOKEN_SIZE_PX (64px)
color	String	HEX-цвет фона (если нет картинки)
ownerId	UUID?	Владелец (игрок / GM). Null = ничей
isMain	Boolean	Главный токен игрока (один на игрока)
isOnline	Boolean	Онлайн ли (для токенов игроков)
hpCurrent, hpMax	Int?	Null = нет HP (объект)
spCurrent, spMax	Int?	Null = нет SP
level, experience	Int?	Null = нет
statuses	JSON	Массив [{ id, stacks, count }]
JSONB:

statuses — массив применённых статусов. Не отдельная таблица (для производительности).

Каскады:

Room → Token (Cascade) — удалили комнату, токены исчезли.

Asset → Token (Cascade) — удалили ассет, токены исчезли.

User → Token (SetNull) — удалили пользователя, токен стал «ничей».

## AssetFolder — папки ассетов

```prisma
model AssetFolder {
    id         String   @id @default(uuid()) @db.Uuid
    roomId     String   @map("room_id") @db.Uuid
    name       String
    orderIndex Int      @default(0) @map("order_index")
    isDefault  Boolean  @default(false) @map("is_default")
    createdAt  DateTime @default(now()) @map("created_at")

    room   Room    @relation(fields: [roomId], references: [id], onDelete: Cascade)
    assets Asset[]

    @@index([roomId])
    @@map("asset_folders")
}
```

Поля:

Поле	Тип	Описание
isDefault	Boolean	true — «Общее». Нельзя переименовать / удалить
orderIndex	Int	Порядок в ленте
Создаётся: одна папка «Общее» при создании комнаты.

## Asset — ассеты (заготовки токенов)

```prisma
model Asset {
    id         String   @id @default(uuid()) @db.Uuid
    roomId     String   @map("room_id") @db.Uuid
    folderId   String?  @map("folder_id") @db.Uuid
    name       String
    imageUrl   String?  @map("image_url")
    color      String   @default("#3498db")
    hpCurrent  Int?     @map("hp_current")
    hpMax      Int?     @map("hp_max")
    spCurrent  Int?     @map("sp_current")
    spMax      Int?     @map("sp_max")
    level      Int?     @map("level")
    experience Int?     @map("experience")
    size       Float    @default(1.0)
    orderIndex Int      @default(0) @map("order_index")
    createdBy  String?  @map("created_by") @db.Uuid
    createdAt  DateTime @default(now()) @map("created_at")

    room   Room         @relation(fields: [roomId], references: [id], onDelete: Cascade)
    folder AssetFolder? @relation(fields: [folderId], references: [id], onDelete: SetNull)
    author User?        @relation(fields: [createdBy], references: [id], onDelete: SetNull)
    tokens Token[]

    @@index([roomId])
    @@index([folderId])
    @@map("assets")
}
```

Поля: аналогично Token, но:

Нет x, y — ассет не на сцене.

Нет ownerId, isMain, isOnline — ассет не привязан к игроку.

folderId — в какой папке (Null = «Общее»).

createdBy — автор (GM).

Каскады:

Room → Asset (Cascade).

AssetFolder → Asset (SetNull) — удалили папку, ассеты в «Общее».

User → Asset (SetNull).

## StatusDefinition — библиотека статусов

```prisma
model StatusDefinition {
    id        String   
    roomId    String   @map("room_id") @db.Uuid
    createdBy String?  @map("created_by") @db.Uuid
    name      String
    icon      String
    color     String
    maxStacks Int      @default(999) @map("max_stacks")
    maxCount  Int?     @map("max_count")
    hasCount  Boolean  @default(false) @map("has_count")
    isDefault Boolean  @default(false) @map("is_default")
    createdAt DateTime @default(now()) @map("created_at")

    room    Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
    creator User?  @relation(fields: [createdBy], references: [id], onDelete: SetNull)

    @@id([roomId, id])
    @@index([roomId])
    @@map("statuses_library")
}
```

Составной PK: (roomId, id).

Почему составной: дефолтные статусы имеют строковый id ("bleed", "burn"). В разных комнатах — одинаковый id. Составной PK это разрешает.

Поля:

Поле	Тип	Описание
id	String	"bleed", "burn", ... или UUID
icon	String	Эмодзи (🩸, 🔥)
color	String	HEX
maxStacks	Int	Лимит стаков
maxCount	Int?	Лимит счётчика (Null = нет счётчика)
hasCount	Boolean	Используется ли счётчик
isDefault	Boolean	Системный (нельзя удалить)
Создаются: при создании комнаты из DEFAULT_STATUSES (shared/constants/defaults.ts).

## RoomState — состояние комнаты

```prisma
enum TurnState {
    active
    gm_control
}

model RoomState {
    roomId        String    @id @map("room_id") @db.Uuid
    activeSceneId String?   @map("active_scene_id") @db.Uuid
    turnState     TurnState @default(active) @map("turn_state")
    updatedAt     DateTime  @updatedAt @map("updated_at")

    room        Room   @relation(fields: [roomId], references: [id], onDelete: Cascade)
    activeScene Scene? @relation("ActiveScene", fields: [activeSceneId], references: [id], onDelete: SetNull)

    @@map("room_state")
}
```

Одна строка на комнату.

Поля:

Поле	Тип	Описание
activeSceneId	UUID?	Активная сцена (Null = нет)
turnState	TurnState	active / gm_control

ActionRequest — заявки (для логики хода)

```prisma
enum RequestStatus {
    pending
    accepted
    rejected
    expired
}

model ActionRequest {
    id         String        @id @default(uuid()) @db.Uuid
    roomId     String        @map("room_id") @db.Uuid
    userId     String        @map("user_id") @db.Uuid
    status     RequestStatus @default(pending)
    createdAt  DateTime      @default(now()) @map("created_at")
    expiresAt  DateTime      @map("expires_at")
    resolvedAt DateTime?     @map("resolved_at")

    room Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
    user User @relation(fields: [userId], references: [id], onDelete: Cascade)

    @@index([roomId, status])
    @@map("action_requests")
}
```

Поля:

Поле	Тип	Описание
status	RequestStatus	pending / accepted / rejected / expired
expiresAt	DateTime	now() + 30 секунд
resolvedAt	DateTime?	Когда обработана
Ещё не используется (логика хода — в roadmap).

## Message — сообщения чата

```prisma
enum MessageMode {
    common
}

model Message {
    id        String      @id @default(uuid()) @db.Uuid
    roomId    String      @map("room_id") @db.Uuid
    userId    String?     @map("user_id") @db.Uuid
    nickname  String
    mode      MessageMode @default(common)
    content   String
    isRoll    Boolean     @default(false) @map("is_roll")
    rollData  Json?       @map("roll_data")
    createdAt DateTime    @default(now()) @map("created_at")

    room Room  @relation(fields: [roomId], references: [id], onDelete: Cascade)
    user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

    @@index([roomId, createdAt])
    @@map("messages")
}
```

Поля:

Поле	Тип	Описание
nickname	String	Денормализация — сохранённый на момент отправки
mode	MessageMode	common (пока один)
isRoll	Boolean	Это бросок кубиков?
rollData	JSON?	Данные броска (DieResult[], breakdown, etc.)
Ещё не используется (чат — в roadmap).

# 💾 In-memory (не в БД)

## Рисунки — drawing.service.ts

```typescript
Map<roomId, Map<drawingId, Drawing>>
```

Drawing:

id, roomId, data (дискриминированный union), color, strokeWidth, isTemporary, expiresAt, authorId, createdAt.

Почему в памяти:

Короткая жизнь (смена сцены / TTL / ручное стирание).

Нет связей с БД.

Быстрая работа.

Минус: перезапуск сервера → всё пропадает.

## Метки — marker.service.ts

```typescript
Map<roomId, Map<markerId, Marker>>
```

Marker:

id, roomId, type (point), x, y, color, label, isTemporary, expiresAt, authorId, createdAt.

Почему в памяти: TTL 20 сек — БД избыточна.

## 📊 Схема связей

```
User
 ├─→ Room (gm)
 ├─→ RoomMember (участник)
 ├─→ Token (owner, может быть null)
 ├─→ Asset (author, может быть null)
 ├─→ StatusDefinition (creator, может быть null)
 ├─→ Message (author, может быть null)
 └─→ ActionRequest

Room
 ├─→ RoomMember
 ├─→ Scene
 ├─→ Token
 ├─→ AssetFolder
 ├─→ Asset
 ├─→ StatusDefinition
 ├─→ RoomState (1:1)
 ├─→ ActionRequest
 └─→ Message

Scene
 └─→ RoomState (activeScene)

Token
 ├─→ Room
 ├─→ Asset (может быть null, Cascade)
 └─→ User (owner, может быть null)

Asset
 ├─→ Room
 ├─→ AssetFolder (может быть null)
 ├─→ User (author, может быть null)
 └─→ Token (обратная связь)
```

## 🔢 Enum'ы

Role — gm / player.
TurnState — active / gm_control.
RequestStatus — pending / accepted / rejected / expired.
MessageMode — common.

## 🎯 Правила

### Даты — ISO 8601 строки в DTO

В БД: DateTime (Postgres timestamp).
В DTO (клиенту): ISO-строка (toISOString()).

### camelCase в коде, snake_case в БД

Prisma @map — конвертирует.

```prisma
createdAt DateTime @default(now()) @map("created_at")
```

В TS: token.createdAt. В БД: created_at.

### Составные PK
Только в:

RoomMember — (roomId, userId).

StatusDefinition — (roomId, id).

### Каскады
Cascade (удалить):

Room → Scene / Token / Asset / AssetFolder / RoomMember / StatusDefinition / RoomState / ActionRequest / Message.

Asset → Token.

User → Room (если GM).

### SetNull (обнулить):

User → Token / Asset / Message / ActionRequest / StatusDefinition.

AssetFolder → Asset.

## 🔧 Миграции

Создать: pnpm db:migrate (prisma migrate dev).
Применить в prod: prisma migrate deploy.
Сбросить: prisma migrate reset.

Хранятся: server/prisma/migrations/.