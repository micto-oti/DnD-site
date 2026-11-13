import { randomBytes } from "node:crypto";

import { prisma } from "@/db/prisma.js";
import { DEFAULT_ASSET_FOLDER_NAME, DEFAULT_STATUSES } from "@gm-table/shared";
import type { CreateRoomInput, Role, Room, RoomMemberWithUser } from "@gm-table/shared";

/**
 * Генерирует короткий id для комнаты (8 символов).
 * Только строчные буквы и цифры — чтобы легко вводить руками.
 */
function generateShortId(): string
{
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = randomBytes(8);
    let result = "";

    for (let i = 0; i < 8; i += 1)
    {
        const byte = bytes[i]!;

        result += alphabet[byte % alphabet.length];
    }

    return result;
}

/**
 * Создаёт комнату.
 * Транзакция: комната + GM-участник + RoomState + дефолтная папка + дефолтные статусы.
 */
export async function createRoom(
    userId: string,
    input: CreateRoomInput,
): Promise<Room>
{
    let shortId = generateShortId();

    // На случай коллизии — до 5 попыток
    for (let i = 0; i < 5; i += 1)
    {
        const existing = await prisma.room.findUnique({
            where: { shortId },
        });

        if (!existing)
        {
            break;
        }

        shortId = generateShortId();
    }

    const room = await prisma.$transaction(async (tx) =>
    {
        const created = await tx.room.create({
            data: {
                shortId,
                name: input.name,
                gmId: userId,
            },
        });

        // GM становится участником
        await tx.roomMember.create({
            data: {
                roomId: created.id,
                userId,
                role: "gm",
            },
        });

        // Состояние комнаты
        await tx.roomState.create({
            data: {
                roomId: created.id,
                turnState: "active",
            },
        });

        // Дефолтная папка ассетов
        await tx.assetFolder.create({
            data: {
                roomId: created.id,
                name: DEFAULT_ASSET_FOLDER_NAME,
                isDefault: true,
                orderIndex: 0,
            },
        });

        // Копируем дефолтные статусы
        await tx.statusDefinition.createMany({
            data: DEFAULT_STATUSES.map((s, index) => ({
                id: s.id,
                roomId: created.id,
                name: s.name,
                icon: s.icon,
                color: s.color,
                maxStacks: s.maxStacks,
                maxCount: s.maxCount,
                hasCount: s.hasCount,
                isDefault: true,
                createdBy: null,
            })),
        });

        return created;
    });

    return toRoomDto(room);
}

/**
 * Присоединяет пользователя к комнате.
 */
export async function joinRoom(
    userId: string,
    shortId: string,
    role: Role = "player",
): Promise<Room>
{
    const room = await prisma.room.findUnique({
        where: { shortId },
        include: { members: true },
    });

    if (!room)
    {
        throw new RoomError("ROOM_NOT_FOUND", "Комната не найдена");
    }

    const alreadyMember = room.members.some((m) => m.userId === userId);

    if (!alreadyMember)
    {
        await prisma.roomMember.create({
            data: {
                roomId: room.id,
                userId,
                role,
            },
        });
    }

    return toRoomDto(room);
}

/**
 * Список комнат, в которых состоит пользователь.
 */
export async function getUserRooms(userId: string): Promise<Room[]>
{
    const memberships = await prisma.roomMember.findMany({
        where: { userId },
        include: { room: true },
        orderBy: { joinedAt: "desc" },
    });

    return memberships.map((m) => toRoomDto(m.room));
}

/**
 * Получить комнату по id.
 */
export async function getRoomById(
    userId: string,
    roomId: string,
): Promise<{ room: Room; members: RoomMemberWithUser[]; isMember: boolean }>
{
    const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
            members: {
                include: {
                    user: {
                        select: { id: true, nickname: true, email: true },
                    },
                },
            },
        },
    });

    if (!room)
    {
        throw new RoomError("ROOM_NOT_FOUND", "Комната не найдена");
    }

    const isMember = room.members.some((m) => m.userId === userId);

    return {
        room: toRoomDto(room),
        members: room.members.map((m) => ({
            roomId: m.roomId,
            userId: m.userId,
            role: m.role as Role,
            actionConfirmed: m.actionConfirmed,
            isOnline: m.isOnline,
            joinedAt: m.joinedAt.toISOString(),
            user: m.user,
        })),
        isMember,
    };
}

/**
 * Ошибка сервиса комнат.
 */
export class RoomError extends Error
{
    constructor(
        public code: string,
        message: string,
    )
    {
        super(message);
        this.name = "RoomError";
    }
}

/**
 * Prisma Room → DTO.
 */
function toRoomDto(room: {
    id: string;
    shortId: string;
    name: string;
    gmId: string;
    createdAt: Date;
}): Room
{
    return {
        id: room.id,
        shortId: room.shortId,
        name: room.name,
        gmId: room.gmId,
        createdAt: room.createdAt.toISOString(),
    };
}