import { prisma } from "@/db/prisma.js";
import { DEFAULT_TOKEN_COLOR, COLOR_PALETTE } from "@gm-table/shared";
import type {
    Asset,
    AssetFolder,
    CreateAssetFolderInput,
    CreateAssetInput,
    UpdateAssetFolderInput,
    UpdateAssetInput,
} from "@gm-table/shared";

/**
 * Ошибка сервиса ассетов.
 */
export class AssetError extends Error
{
    constructor(
        public code: string,
        message: string,
    )
    {
        super(message);
        this.name = "AssetError";
    }
}

// ============================================================
// Папки
// ============================================================

/**
 * Создать папку.
 */
export async function createFolder(
    roomId: string,
    input: CreateAssetFolderInput,
): Promise<AssetFolder>
{
    const maxOrder = await prisma.assetFolder.aggregate({
        where: { roomId },
        _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const folder = await prisma.assetFolder.create({
        data: {
            roomId,
            name: input.name,
            orderIndex,
        },
    });

    return toFolderDto(folder);
}

/**
 * Обновить папку.
 * Дефолтную («Общее») переименовать нельзя.
 */
export async function updateFolder(
    folderId: string,
    input: UpdateAssetFolderInput,
): Promise<AssetFolder>
{
    const folder = await prisma.assetFolder.findUnique({
        where: { id: folderId },
    });

    if (!folder)
    {
        throw new AssetError("FOLDER_NOT_FOUND", "Папка не найдена");
    }

    if (folder.isDefault && input.name !== undefined)
    {
        throw new AssetError(
            "CANNOT_RENAME_DEFAULT",
            "Дефолтную папку нельзя переименовать",
        );
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;

    const updated = await prisma.assetFolder.update({
        where: { id: folderId },
        data,
    });

    return toFolderDto(updated);
}

/**
 * Удалить папку.
 * Дефолтную удалить нельзя.
 * Ассеты из папки переезжают в «Общее» (folderId = null).
 */
export async function deleteFolder(folderId: string): Promise<void>
{
    const folder = await prisma.assetFolder.findUnique({
        where: { id: folderId },
    });

    if (!folder)
    {
        throw new AssetError("FOLDER_NOT_FOUND", "Папка не найдена");
    }

    if (folder.isDefault)
    {
        throw new AssetError(
            "CANNOT_DELETE_DEFAULT",
            "Дефолтную папку нельзя удалить",
        );
    }

    const defaultFolder = await prisma.assetFolder.findFirst({
        where: { roomId: folder.roomId, isDefault: true },
    });

    if (!defaultFolder)
    {
        throw new AssetError(
            "NO_DEFAULT_FOLDER",
            "Не найдена дефолтная папка",
        );
    }

    // В транзакции: переносим ассеты + удаляем папку
    await prisma.$transaction(async (tx) =>
    {
        await tx.asset.updateMany({
            where: { folderId },
            data: { folderId: defaultFolder.id },
        });

        await tx.assetFolder.delete({ where: { id: folderId } });
    });

    // await prisma.assetFolder.delete({ where: { id: folderId } });
    // ON DELETE SET NULL перенесёт ассеты в «Общее»
}

/**
 * Все папки комнаты.
 */
export async function getFoldersByRoom(roomId: string): Promise<AssetFolder[]>
{
    const folders = await prisma.assetFolder.findMany({
        where: { roomId },
        orderBy: { orderIndex: "asc" },
    });

    return folders.map(toFolderDto);
}

// ============================================================
// Ассеты
// ============================================================

/**
 * Создать ассет.
 */
export async function createAsset(
    roomId: string,
    userId: string,
    input: CreateAssetInput,
): Promise<Asset>
{
    let folderId = input.folderId;

    if (folderId === null || folderId === undefined)
    {
        const defaultFolder = await prisma.assetFolder.findFirst({
            where: { roomId, isDefault: true },
        });

        folderId = defaultFolder?.id ?? null;
    }

    const maxOrder = await prisma.asset.aggregate({
        where: { roomId, folderId: input.folderId ?? null },
        _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    const color =
        input.color ??
        COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] ??
        DEFAULT_TOKEN_COLOR;

    const asset = await prisma.asset.create({
        data: {
            roomId,
            folderId: input.folderId ?? null,
            name: input.name,
            imageUrl: input.imageUrl ?? null,
            color,
            hpCurrent: input.hpCurrent ?? null,
            hpMax: input.hpMax ?? null,
            spCurrent: input.spCurrent ?? null,
            spMax: input.spMax ?? null,
            level: input.level ?? null,
            experience: input.experience ?? null,
            size: input.size ?? 1.0,
            orderIndex,
            createdBy: userId,
        },
    });

    return toAssetDto(asset);
}

/**
 * Обновить ассет.
 */
export async function updateAsset(
    assetId: string,
    input: UpdateAssetInput,
): Promise<Asset>
{
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
    });

    if (!asset)
    {
        throw new AssetError("ASSET_NOT_FOUND", "Ассет не найден");
    }

    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.color !== undefined) data.color = input.color;
    if (input.hpCurrent !== undefined) data.hpCurrent = input.hpCurrent;
    if (input.hpMax !== undefined) data.hpMax = input.hpMax;
    if (input.spCurrent !== undefined) data.spCurrent = input.spCurrent;
    if (input.spMax !== undefined) data.spMax = input.spMax;
    if (input.level !== undefined) data.level = input.level;
    if (input.experience !== undefined) data.experience = input.experience;
    if (input.size !== undefined) data.size = input.size;
    if (input.folderId !== undefined) data.folderId = input.folderId;
    if (input.orderIndex !== undefined) data.orderIndex = input.orderIndex;

    const updated = await prisma.asset.update({
        where: { id: assetId },
        data,
    });

    return toAssetDto(updated);
}

/**
 * Удалить ассет.
 * Все токены, созданные из этого ассета, удаляются каскадом.
 */
export async function deleteAsset(assetId: string): Promise<{ affectedTokenIds: string[] }>
{
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        include: { tokens: { select: { id: true } } },
    });

    if (!asset)
    {
        throw new AssetError("ASSET_NOT_FOUND", "Ассет не найден");
    }

    const affectedTokenIds = asset.tokens.map((t) => t.id);

    await prisma.asset.delete({ where: { id: assetId } });

    return { affectedTokenIds };
}

/**
 * Все ассеты комнаты.
 */
export async function getAssetsByRoom(roomId: string): Promise<Asset[]>
{
    const assets = await prisma.asset.findMany({
        where: { roomId },
        orderBy: { orderIndex: "asc" },
    });

    return assets.map(toAssetDto);
}

/**
 * Получить ассет по id.
 */
export async function getAssetById(assetId: string): Promise<Asset | null>
{
    const asset = await prisma.asset.findUnique({
        where: { id: assetId },
    });

    return asset ? toAssetDto(asset) : null;
}

// ============================================================
// DTO
// ============================================================

export function toAssetDto(asset: {
    id: string;
    roomId: string;
    folderId: string | null;
    name: string;
    imageUrl: string | null;
    color: string;
    hpCurrent: number | null;
    hpMax: number | null;
    spCurrent: number | null;
    spMax: number | null;
    level: number | null;
    experience: number | null;
    size: number;
    orderIndex: number;
    createdBy: string | null;
    createdAt: Date;
}): Asset
{
    return {
        id: asset.id,
        roomId: asset.roomId,
        folderId: asset.folderId,
        name: asset.name,
        imageUrl: asset.imageUrl,
        color: asset.color,
        hpCurrent: asset.hpCurrent,
        hpMax: asset.hpMax,
        spCurrent: asset.spCurrent,
        spMax: asset.spMax,
        level: asset.level,
        experience: asset.experience,
        size: asset.size,
        orderIndex: asset.orderIndex,
        createdBy: asset.createdBy,
        createdAt: asset.createdAt.toISOString(),
    };
}

export function toFolderDto(folder: {
    id: string;
    roomId: string;
    name: string;
    orderIndex: number;
    isDefault: boolean;
    createdAt: Date;
}): AssetFolder
{
    return {
        id: folder.id,
        roomId: folder.roomId,
        name: folder.name,
        orderIndex: folder.orderIndex,
        isDefault: folder.isDefault,
        createdAt: folder.createdAt.toISOString(),
    };
}