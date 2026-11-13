import type {
    Asset,
    AssetFolder,
    CreateAssetFolderInput,
    CreateAssetInput,
    UpdateAssetFolderInput,
    UpdateAssetInput,
} from "@gm-table/shared";

import { apiFetch } from "./client.js";

// ============================================================
// Папки
// ============================================================

/**
 * Все папки комнаты.
 */
export async function getFolders(roomId: string): Promise<AssetFolder[]>
{
    return await apiFetch<AssetFolder[]>(`/api/rooms/${roomId}/asset-folders`);
}

/**
 * Создать папку.
 */
export async function createFolder(
    roomId: string,
    input: CreateAssetFolderInput,
): Promise<AssetFolder>
{
    return await apiFetch<AssetFolder>(`/api/rooms/${roomId}/asset-folders`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/**
 * Обновить папку.
 */
export async function updateFolder(
    folderId: string,
    input: UpdateAssetFolderInput,
): Promise<AssetFolder>
{
    return await apiFetch<AssetFolder>(`/api/asset-folders/${folderId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

/**
 * Удалить папку.
 */
export async function deleteFolder(folderId: string): Promise<void>
{
    await apiFetch<{ ok: boolean }>(`/api/asset-folders/${folderId}`, {
        method: "DELETE",
    });
}

// ============================================================
// Ассеты
// ============================================================

/**
 * Все ассеты комнаты.
 */
export async function getAssets(roomId: string): Promise<Asset[]>
{
    return await apiFetch<Asset[]>(`/api/rooms/${roomId}/assets`);
}

/**
 * Создать ассет.
 */
export async function createAsset(
    roomId: string,
    input: CreateAssetInput,
): Promise<Asset>
{
    return await apiFetch<Asset>(`/api/rooms/${roomId}/assets`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

/**
 * Обновить ассет.
 */
export async function updateAsset(
    assetId: string,
    input: UpdateAssetInput,
): Promise<Asset>
{
    return await apiFetch<Asset>(`/api/assets/${assetId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

/**
 * Удалить ассет.
 */
export async function deleteAsset(assetId: string): Promise<void>
{
    await apiFetch<{ ok: boolean }>(`/api/assets/${assetId}`, {
        method: "DELETE",
    });
}