import type { CreateSceneInput, Scene, UpdateSceneInput } from "@gm-table/shared";

import { apiFetch } from "./client.js";

/**
 * Сцены комнаты.
 */
export async function getScenes(roomId: string): Promise<Scene[]>
{
    return await apiFetch<Scene[]>(`/api/rooms/${roomId}/scenes`);
}

/**
 * Создать сцену (только ГМ).
 */
export async function createScene(
    roomId: string,
    input: CreateSceneInput,
): Promise<Scene>
{
    return await apiFetch<Scene>(`/api/rooms/${roomId}/scenes`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/**
 * Обновить сцену (только ГМ).
 */
export async function updateScene(
    sceneId: string,
    input: UpdateSceneInput,
): Promise<Scene>
{
    return await apiFetch<Scene>(`/api/scenes/${sceneId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

/**
 * Удалить сцену (только ГМ).
 */
export async function deleteScene(sceneId: string): Promise<void>
{
    await apiFetch<{ ok: boolean }>(`/api/scenes/${sceneId}`, {
        method: "DELETE",
    });
}

/**
 * Активировать сцену (только ГМ).
 */
export async function activateScene(sceneId: string): Promise<Scene>
{
    return await apiFetch<Scene>(`/api/scenes/${sceneId}/activate`, {
        method: "POST",
    });
}