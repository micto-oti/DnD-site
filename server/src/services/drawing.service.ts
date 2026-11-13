import { randomUUID } from "node:crypto";

import { LIMITS, TIMINGS, DEFAULT_DRAWING_COLOR, DEFAULT_STROKE_WIDTH } from "@gm-table/shared";
import type { Drawing, DrawingData } from "@gm-table/shared";

/**
 * In-memory хранилище рисунков.
 * Ключ — roomId, значение — Map<drawingId, Drawing>.
 */
const store = new Map<string, Map<string, Drawing>>();

/**
 * Создать рисунок.
 */
export function createDrawing(
    roomId: string,
    authorId: string,
    input: {
        data: DrawingData;
        color?: string;
        strokeWidth?: number;
        isTemporary?: boolean;
    },
): Drawing
{
    const drawing: Drawing = {
        id: randomUUID(),
        roomId,
        data: input.data,
        color: input.color ?? DEFAULT_DRAWING_COLOR,
        strokeWidth: input.strokeWidth ?? DEFAULT_STROKE_WIDTH,
        isTemporary: input.isTemporary ?? false,
        expiresAt: input.isTemporary
            ? new Date(Date.now() + TIMINGS.TEMPORARY_DRAWING_TTL_MS).toISOString()
            : null,
        authorId,
        createdAt: new Date().toISOString(),
    };

    let room = store.get(roomId);

    if (!room)
    {
        room = new Map();
        store.set(roomId, room);
    }

    // Лимит на комнату
    if (room.size >= LIMITS.DRAWING_MAX_PER_ROOM)
    {
        // Удаляем самый старый
        const oldest = Array.from(room.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )[0];

        if (oldest)
        {
            room.delete(oldest.id);
        }
    }

    room.set(drawing.id, drawing);

    return drawing;
}

/**
 * Удалить рисунок.
 * Проверка прав — на уровне обработчика.
 */
export function deleteDrawing(roomId: string, drawingId: string): Drawing | null
{
    const room = store.get(roomId);

    if (!room)
    {
        return null;
    }

    const drawing = room.get(drawingId) ?? null;

    if (drawing)
    {
        room.delete(drawingId);
    }

    return drawing;
}

/**
 * Получить рисунок.
 */
export function getDrawing(roomId: string, drawingId: string): Drawing | null
{
    return store.get(roomId)?.get(drawingId) ?? null;
}

/**
 * Все рисунки комнаты.
 */
export function getDrawingsByRoom(roomId: string): Drawing[]
{
    const room = store.get(roomId);

    return room ? Array.from(room.values()) : [];
}

/**
 * Очистить все рисунки игрока.
 * Возвращает удалённые id.
 */
export function clearOwnDrawings(roomId: string, authorId: string): string[]
{
    const room = store.get(roomId);

    if (!room)
    {
        return [];
    }

    const deletedIds: string[] = [];

    for (const [id, drawing] of room)
    {
        if (drawing.authorId === authorId)
        {
            room.delete(id);
            deletedIds.push(id);
        }
    }

    return deletedIds;
}

/**
 * Очистить все рисунки комнаты.
 */
export function clearAllDrawings(roomId: string): void
{
    store.delete(roomId);
}

/**
 * Удалить истёкшие временные рисунки.
 * Возвращает список удалённых id.
 */
export function expireDrawings(roomId: string): string[]
{
    const room = store.get(roomId);

    if (!room)
    {
        return [];
    }

    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, drawing] of room)
    {
        if (
            drawing.isTemporary &&
            drawing.expiresAt &&
            new Date(drawing.expiresAt).getTime() < now
        )
        {
            room.delete(id);
            expiredIds.push(id);
        }
    }

    return expiredIds;
}

/**
 * Обновить рисунок.
 */
export function updateDrawing(
    roomId: string,
    drawingId: string,
    patch: { data?: DrawingData; color?: string },
): Drawing | null
{
    const room = store.get(roomId);

    if (!room)
    {
        return null;
    }

    const existing = room.get(drawingId);

    if (!existing)
    {
        return null;
    }

    const updated: Drawing = {
        ...existing,
        data: patch.data ?? existing.data,
        color: patch.color ?? existing.color,
    };

    room.set(drawingId, updated);

    return updated;
}

/**
 * Все roomId с рисунками — для cron.
 */
export function getAllRoomIds(): string[]
{
    return Array.from(store.keys());
}