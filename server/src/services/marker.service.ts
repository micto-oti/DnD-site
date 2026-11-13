import { randomUUID } from "node:crypto";

import { LIMITS, TIMINGS, DEFAULT_MARKER_COLOR } from "@gm-table/shared";
import type { Marker, MarkerType } from "@gm-table/shared";

/**
 * In-memory хранилище меток.
 * Ключ — roomId, значение — Map<markerId, Marker>.
 */
const store = new Map<string, Map<string, Marker>>();

/**
 * Создать метку.
 */
export function createMarker(
    roomId: string,
    authorId: string,
    input: {
        type?: MarkerType;
        x: number;
        y: number;
        color?: string;
        label?: string;
        isTemporary?: boolean;
    },
): Marker
{
    const isTemporary = input.isTemporary ?? true;

    const marker: Marker = {
        id: randomUUID(),
        roomId,
        type: input.type ?? "point",
        x: input.x,
        y: input.y,
        color: input.color ?? DEFAULT_MARKER_COLOR,
        label: input.label ?? null,
        isTemporary,
        expiresAt: isTemporary
            ? new Date(Date.now() + TIMINGS.TEMPORARY_MARKER_TTL_MS).toISOString()
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
    if (room.size >= LIMITS.MARKER_MAX_PER_ROOM)
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

    room.set(marker.id, marker);

    return marker;
}

/**
 * Удалить метку.
 */
export function deleteMarker(roomId: string, markerId: string): Marker | null
{
    const room = store.get(roomId);

    if (!room)
    {
        return null;
    }

    const marker = room.get(markerId) ?? null;

    if (marker)
    {
        room.delete(markerId);
    }

    return marker;
}

/**
 * Получить метку.
 */
export function getMarker(roomId: string, markerId: string): Marker | null
{
    return store.get(roomId)?.get(markerId) ?? null;
}

/**
 * Все метки комнаты.
 */
export function getMarkersByRoom(roomId: string): Marker[]
{
    const room = store.get(roomId);

    return room ? Array.from(room.values()) : [];
}

/**
 * Удалить истёкшие временные метки.
 * Возвращает список удалённых id.
 */
export function expireMarkers(roomId: string): string[]
{
    const room = store.get(roomId);

    if (!room)
    {
        return [];
    }

    const now = Date.now();
    const expiredIds: string[] = [];

    for (const [id, marker] of room)
    {
        if (
            marker.isTemporary &&
            marker.expiresAt &&
            new Date(marker.expiresAt).getTime() < now
        )
        {
            room.delete(id);
            expiredIds.push(id);
        }
    }

    return expiredIds;
}

/**
 * Все roomId с метками — для cron.
 */
export function getAllRoomIds(): string[]
{
    return Array.from(store.keys());
}