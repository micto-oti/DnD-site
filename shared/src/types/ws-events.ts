import type { Asset, AssetFolder } from "./asset.js";
import type { Drawing, DrawingData } from "./drawing.js";
import type { Marker } from "./marker.js";
import type { Message } from "./message.js";
import type { ActionRequest, TurnStatus } from "./request.js";
import type { Room, RoomMemberWithUser } from "./room.js";
import type { Scene } from "./scene.js";
import type { StatusDefinition } from "./status.js";
import type { Token } from "./token.js";
import type { UpdateTokenInput } from "./token.js";

// ============================================================
// Общие типы
// ============================================================

/**
 * Полное состояние комнаты.
 * Отдаётся клиенту при подключении к комнате.
 * Включает всё, что нужно для отрисовки первого кадра.
 */
export interface RoomInitialState
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

// ============================================================
// Клиент → Сервер
// ============================================================

/**
 * События, которые клиент отправляет серверу.
 */
export interface ClientToServerEvents
{
    // --- Комната ---
    "room:join": (payload: { roomId: string }) => void;
    "room:leave": () => void;

    // --- Сцена ---
    "scene:activate": (payload: { sceneId: string }) => void;

    // --- Токен ---
    "token:create": (payload: {
        roomId: string;
        name?: string;              // ← опционально
        assetId?: string;           // ← добавить
        imageUrl?: string;
        x?: number;
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
    }) => void;
    "token:update": (payload: {
        tokenId: string;
        patch: UpdateTokenInput;
    }) => void;
    "token:move": (payload: { tokenId: string; x: number; y: number }) => void;
    "token:delete": (payload: { tokenId: string }) => void;
    "tokens:recenter-all": (payload: { roomId: string }) => void;
    "tokens:recenter-mine": (payload: { roomId: string }) => void;

    // --- Рисунок ---
    "drawing:create": (payload: { 
        roomId: string; 
        data: DrawingData; 
        color?: string; 
        strokeWidth?: number; 
        isTemporary?: boolean 
    }) => void;
    "drawing:update": (payload: {
        drawingId: string;
        patch: { data?: DrawingData; color?: string };
    }) => void;
    "drawing:delete": (payload: { drawingId: string }) => void;
    "drawing:clear-mine": (payload: { roomId: string }) => void;
    "drawing:clear-all": (payload: { roomId: string }) => void;
    
    // --- Метка ---
    "marker:create": (payload: { 
        roomId: string; 
        x: number; 
        y: number; 
        color?: string; 
        label?: string; 
        isTemporary?: boolean 
    }) => void;
    "marker:delete": (payload: { markerId: string }) => void;

    // --- Чат ---
    "chat:send": (payload: { roomId: string; content: string }) => void;

    // --- Ход ---
    "turn:confirm": (payload: { roomId: string }) => void;
    "turn:cancel": (payload: { roomId: string }) => void;
    "turn:end": (payload: { roomId: string }) => void;

    // --- Заявка ---
    "request:create": (payload: { roomId: string }) => void;
    "request:resolve": (payload: { requestId: string; status: "accepted" | "rejected" }) => void;
    "request:cancel": (payload: { requestId: string }) => void;
}

// ============================================================
// Сервер → Клиент
// ============================================================

/**
 * События, которые сервер отправляет клиенту.
 */
export interface ServerToClientEvents
{
    // --- Подключение к комнате ---
    "room:state": (payload: RoomInitialState) => void;
    "room:user-joined": (payload: { member: RoomMemberWithUser }) => void;
    "room:user-left": (payload: { userId: string }) => void;
    "member:online-changed": (payload: { userId: string; isOnline: boolean }) => void;

    // --- Сцена ---
    "scene:created": (payload: { scene: Scene }) => void;
    "scene:updated": (payload: { scene: Scene }) => void;
    "scene:deleted": (payload: { sceneId: string }) => void;
    "scene:activated": (payload: { sceneId: string }) => void;

    // --- Токен ---
    "token:created": (payload: { token: Token }) => void;
    "token:updated": (payload: { token: Token }) => void;
    "token:moved": (payload: { tokenId: string; x: number; y: number }) => void;
    "token:deleted": (payload: { tokenId: string }) => void;
    "token:online-changed": (payload: { userId: string; isOnline: boolean }) => void;
    "tokens:recentered": (payload: { tokens: Token[] }) => void;
    "token:hp-changed": (payload: { tokenId: string; hpCurrent: number | null; hpMax: number | null }) => void;
    "token:sp-changed": (payload: { tokenId: string; spCurrent: number | null; spMax: number | null }) => void;
    "token:status-added": (payload: { tokenId: string; statusId: string; stacks: number; count: number | null }) => void;
    "token:status-removed": (payload: { tokenId: string; statusId: string }) => void;
    "token:status-changed": (payload: { tokenId: string; statusId: string; stacks: number; count: number | null }) => void;

    // --- Метка ---
    "marker:created": (payload: { marker: Marker }) => void;
    "marker:deleted": (payload: { markerId: string }) => void;
    "marker:expired": (payload: { markerId: string }) => void;

    // --- Рисунок ---
    "drawing:created": (payload: { drawing: Drawing }) => void;
    "drawing:deleted": (payload: { drawingId: string }) => void;
    "drawing:expired": (payload: { drawingId: string }) => void;
    "drawing:updated": (payload: { drawing: Drawing }) => void;
    "drawings:cleared": (payload: { roomId: string; authorId: string | null }) => void;

    // --- Чат ---
    "chat:message": (payload: { message: Message }) => void;

    // --- Ход ---
    "turn:state-changed": (payload: { turn: TurnStatus }) => void;
    "turn:player-confirmed": (payload: { userId: string }) => void;
    "turn:player-cancelled": (payload: { userId: string }) => void;
    "turn:ended": (payload: { roomId: string }) => void;

    // --- Заявка ---
    "request:created": (payload: { request: ActionRequest }) => void;
    "request:resolved": (payload: { requestId: string; status: "accepted" | "rejected" | "expired" }) => void;

    // --- Статусы (библиотека) ---
    "status:created": (payload: { status: StatusDefinition }) => void;
    "status:updated": (payload: { status: StatusDefinition }) => void;
    "status:deleted": (payload: { statusId: string }) => void;

    // --- Ассеты ---
    "asset:created": (payload: { asset: Asset }) => void;
    "asset:updated": (payload: { asset: Asset }) => void;
    "asset:deleted": (payload: { assetId: string }) => void;
    "folder:created": (payload: { folder: AssetFolder }) => void;
    "folder:updated": (payload: { folder: AssetFolder }) => void;
    "folder:deleted": (payload: { folderId: string }) => void;

    // --- Ошибки ---
    "error": (payload: { code: string; message: string }) => void;
}