import { prisma } from "@/db/prisma.js";
import { DEFAULT_TOKEN_COLOR, COLOR_PALETTE } from "@gm-table/shared";
import type {
    CreateTokenInput,
    Token,
    TokenStatus,
    UpdateTokenInput,
} from "@gm-table/shared";

/**
 * Смещение для новых токенов, чтобы не накладывались в центре.
 * Каждый новый токен сдвигается на N% по диагонали.
 */
const SPAWN_OFFSET_STEP = 3;

/**
 * Ошибка сервиса токенов.
 */
export class TokenError extends Error
{
    constructor(
        public code: string,
        message: string,
    )
    {
        super(message);
        this.name = "TokenError";
    }
}

/**
 * Создаёт токен.
 */
export async function createToken(
    roomId: string,
    input: CreateTokenInput,
): Promise<Token>
{
    // Если задан assetId — подтягиваем данные ассета
    let asset: {
        id: string;
        name: string;
        imageUrl: string | null;
        color: string;
        size: number;
        hpCurrent: number | null;
        hpMax: number | null;
        spCurrent: number | null;
        spMax: number | null;
        level: number | null;
        experience: number | null;
    } | null = null;

    if (input.assetId)
    {
        asset = await prisma.asset.findUnique({
            where: { id: input.assetId },
            select: {
                id: true,
                name: true,
                imageUrl: true,
                color: true,
                size: true,
                hpCurrent: true,
                hpMax: true,
                spCurrent: true,
                spMax: true,
                level: true,
                experience: true,
            },
        });

        if (!asset)
        {
            throw new TokenError("ASSET_NOT_FOUND", "Ассет не найден");
        }
    }

    // Имя: из input, из ассета, или дефолтное
    const name = input.name ?? asset?.name ?? "Токен";

    // Позиция
    let x = input.x;
    let y = input.y;

    if (x === undefined || y === undefined)
    {
        const count = await prisma.token.count({ where: { roomId } });
        const offset = count * SPAWN_OFFSET_STEP;

        x = x ?? Math.min(50 + offset, 90);
        y = y ?? Math.min(50 + offset, 90);
    }

    // Цвет: из input, из ассета, или случайный
    const color =
        input.color ??
        asset?.color ??
        COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] ??
        DEFAULT_TOKEN_COLOR;

    const token = await prisma.token.create({
        data: {
            roomId,
            assetId: input.assetId ?? null,
            name,
            imageUrl: input.imageUrl ?? asset?.imageUrl ?? null,
            x,
            y,
            size: input.size ?? asset?.size ?? 1.0,
            color,
            ownerId: input.ownerId ?? null,
            isMain: input.isMain ?? false,
            isOnline: true,
            hpCurrent: input.hpCurrent ?? asset?.hpCurrent ?? null,
            hpMax: input.hpMax ?? asset?.hpMax ?? null,
            spCurrent: input.spCurrent ?? asset?.spCurrent ?? null,
            spMax: input.spMax ?? asset?.spMax ?? null,
            level: input.level ?? asset?.level ?? null,
            experience: input.experience ?? asset?.experience ?? null,
            statuses: [],
        },
    });

    return toTokenDto(token);
}

/**
 * Обновляет токен (PATCH).
 */
export async function updateToken(
    tokenId: string,
    input: UpdateTokenInput,
): Promise<Token>
{
    const data: Record<string, unknown> = {};

    if (input.name !== undefined) data.name = input.name;
    if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl;
    if (input.x !== undefined) data.x = input.x;
    if (input.y !== undefined) data.y = input.y;
    if (input.size !== undefined) data.size = input.size;
    if (input.color !== undefined) data.color = input.color;
    if (input.ownerId !== undefined) data.ownerId = input.ownerId;
    if (input.hpCurrent !== undefined) data.hpCurrent = input.hpCurrent;
    if (input.hpMax !== undefined) data.hpMax = input.hpMax;
    if (input.spCurrent !== undefined) data.spCurrent = input.spCurrent;
    if (input.spMax !== undefined) data.spMax = input.spMax;
    if (input.level !== undefined) data.level = input.level;
    if (input.experience !== undefined) data.experience = input.experience;
    if (input.statuses !== undefined) data.statuses = input.statuses;

    const token = await prisma.token.update({
        where: { id: tokenId },
        data,
    });

    return toTokenDto(token);
}

/**
 * Удаляет токен.
 */
export async function deleteToken(tokenId: string): Promise<void>
{
    const token = await prisma.token.findUnique({
        where: { id: tokenId },
    });

    if (!token)
    {
        throw new TokenError("TOKEN_NOT_FOUND", "Токен не найден");
    }

    await prisma.token.delete({ where: { id: tokenId } });
}

/**
 * Возвращает токены комнаты.
 */
export async function getTokensByRoom(roomId: string): Promise<Token[]>
{
    const tokens = await prisma.token.findMany({
        where: { roomId },
        orderBy: { createdAt: "asc" },
    });

    return tokens.map(toTokenDto);
}

/**
 * Получить токен по id.
 */
export async function getTokenById(tokenId: string): Promise<Token | null>
{
    const token = await prisma.token.findUnique({
        where: { id: tokenId },
    });

    return token ? toTokenDto(token) : null;
}

/**
 * Найти главный токен игрока в комнате.
 */
export async function findMainToken(
    roomId: string,
    userId: string,
): Promise<Token | null>
{
    const token = await prisma.token.findFirst({
        where: {
            roomId,
            ownerId: userId,
            isMain: true,
        },
    });

    return token ? toTokenDto(token) : null;
}

/**
 * Установить isOnline для всех токенов игрока в комнате.
 */
export async function setUserOnline(
    roomId: string,
    userId: string,
    isOnline: boolean,
): Promise<Token[]>
{
    const tokens = await prisma.token.findMany({
        where: {
            roomId,
            ownerId: userId,
        },
    });

    if (tokens.length === 0)
    {
        return [];
    }

    await prisma.token.updateMany({
        where: {
            roomId,
            ownerId: userId,
        },
        data: { isOnline },
    });

    return tokens.map((t) => toTokenDto({ ...t, isOnline }));
}

/**
 * Переместить все токены в центр со смещением.
 * Возвращает обновлённые токены.
 */
export async function recenterAllTokens(roomId: string): Promise<Token[]>
{
    const tokens = await prisma.token.findMany({
        where: { roomId },
        orderBy: { createdAt: "asc" },
    });

    const updated: Token[] = [];

    for (let i = 0; i < tokens.length; i += 1)
    {
        const token = tokens[i]!;
        const offset = i * SPAWN_OFFSET_STEP;
        const x = Math.min(50 + offset, 90);
        const y = Math.min(50 + offset, 90);

        const result = await prisma.token.update({
            where: { id: token.id },
            data: { x, y },
        });

        updated.push(toTokenDto(result));
    }

    return updated;
}

/**
 * Переместить все токены конкретного игрока в центр.
 * Только главный токен и токены с `ownerId = userId`.
 */
export async function recenterUserTokens(
    roomId: string,
    userId: string,
): Promise<Token[]>
{
    const tokens = await prisma.token.findMany({
        where: { roomId, ownerId: userId },
        orderBy: { createdAt: "asc" },
    });

    const updated: Token[] = [];

    for (let i = 0; i < tokens.length; i += 1)
    {
        const token = tokens[i]!;
        const offset = i * SPAWN_OFFSET_STEP;
        const x = Math.min(50 + offset, 90);
        const y = Math.min(50 + offset, 90);

        const result = await prisma.token.update({
            where: { id: token.id },
            data: { x, y },
        });

        updated.push(toTokenDto(result));
    }

    return updated;
}

/**
 * Prisma Token → DTO.
 */
export function toTokenDto(token: {
    id: string;
    roomId: string;
    assetId: string | null;
    name: string;
    imageUrl: string | null;
    x: number;
    y: number;
    size: number;
    color: string;
    ownerId: string | null;
    isMain: boolean;
    isOnline: boolean;
    hpCurrent: number | null;
    hpMax: number | null;
    spCurrent: number | null;
    spMax: number | null;
    level: number | null;
    experience: number | null;
    statuses: unknown;
    createdAt: Date;
    updatedAt: Date;
}): Token
{
    return {
        id: token.id,
        roomId: token.roomId,
        assetId: token.assetId,
        name: token.name,
        imageUrl: token.imageUrl,
        x: token.x,
        y: token.y,
        size: token.size,
        color: token.color,
        ownerId: token.ownerId,
        isMain: token.isMain,
        isOnline: token.isOnline,
        hpCurrent: token.hpCurrent,
        hpMax: token.hpMax,
        spCurrent: token.spCurrent,
        spMax: token.spMax,
        level: token.level,
        experience: token.experience,
        statuses: (token.statuses as TokenStatus[]) ?? [],
        createdAt: token.createdAt.toISOString(),
        updatedAt: token.updatedAt.toISOString(),
    };
}