import type { CreateRoomInput, Role, Room } from "@gm-table/shared";

import { apiFetch } from "./client.js";

/**
 * Создать комнату.
 */
export async function createRoom(input: CreateRoomInput): Promise<Room>
{
    return await apiFetch<Room>("/api/rooms", {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/**
 * Список моих комнат.
 */
export async function getRooms(): Promise<Room[]>
{
    return await apiFetch<Room[]>("/api/rooms");
}

/**
 * Присоединиться к комнате по shortId.
 */
export async function joinRoom(shortId: string, role?: Role): Promise<Room>
{
    return await apiFetch<Room>("/api/rooms/join", {
        method: "POST",
        body: JSON.stringify({ shortId, role }),
    });
}