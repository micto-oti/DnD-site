import type { Socket, Server } from "socket.io";

import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@gm-table/shared";

import { prisma } from "@/db/prisma.js";
import { getRoomById, RoomError } from "@/services/room.service.js";
import {
    createToken,
    deleteToken,
    findMainToken,
    recenterAllTokens,
    recenterUserTokens,
    setUserOnline,
    updateToken,
    TokenError,
    toTokenDto,
} from "@/services/token.service.js";
import {
    activateScene,
    SceneError,
} from "@/services/scene.service.js";
import {
    clearAllDrawings,
    clearOwnDrawings,
    createDrawing,
    deleteDrawing,
    getDrawing,
    getDrawingsByRoom,
    updateDrawing,
} from "@/services/drawing.service.js";
import {
    createMarker,
    deleteMarker,
    getMarker,
    getMarkersByRoom,
} from "@/services/marker.service.js";


type IO = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    { userId: string; email: string }
>;

type Sock = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    { userId: string; email: string }
>;

/**
 * Проверяет, что пользователь — ГМ комнаты.
 */
async function ensureGm(userId: string, roomId: string): Promise<boolean>
{
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });

    return member?.role === "gm";
}

async function ensureMember(userId: string, roomId: string): Promise<boolean>
{
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });

    return member !== null;
}

/**
 * Регистрирует обработчики событий комнаты.
 */
export function registerRoomHandlers(io: IO, socket: Sock): void
{
    // ============================================================
    // room:join / room:leave
    // ============================================================

    socket.on("room:join", async ({ roomId }) =>
    {
        const userId = socket.data.userId;

        try
        {
            await prisma.roomMember.update({
                where: { roomId_userId: { roomId, userId } },
                data: { isOnline: true },
            });

            const { room, members, isMember } = await getRoomById(userId, roomId);

            if (!isMember)
            {
                socket.emit("error", {
                    code: "NOT_A_MEMBER",
                    message: "Вы не участник этой комнаты",
                });

                return;
            }

            await socket.join(`room:${roomId}`);

            const onlineTokens = await setUserOnline(roomId, userId, true);

            socket.to(`room:${roomId}`).emit("member:online-changed", {
                userId,
                isOnline: true,
            });

            // Broadcast обновлённые токены
            for (const token of onlineTokens)
            {
                io.to(`room:${roomId}`).emit("token:updated", { token });
            }            

            const [scenes, tokens, statuses, assets, assetFolders, messages, roomState] =
                await Promise.all([
                    prisma.scene.findMany({
                        where: { roomId },
                        orderBy: { orderIndex: "asc" },
                    }),
                    prisma.token.findMany({ where: { roomId } }),
                    prisma.statusDefinition.findMany({ where: { roomId } }),
                    prisma.asset.findMany({ where: { roomId }, orderBy: { orderIndex: "asc" } }),
                    prisma.assetFolder.findMany({ where: { roomId }, orderBy: { orderIndex: "asc" } }),
                    prisma.message.findMany({
                        where: { roomId },
                        orderBy: { createdAt: "desc" },
                        take: 100,
                    }),
                    prisma.roomState.findUnique({ where: { roomId } }),
                ]);

            const confirmedUserIds = members
                .filter((m) => m.actionConfirmed)
                .map((m) => m.userId);

            // Проверяем, нужен ли игроку главный токен
            const isGm = await ensureGm(userId, roomId);
            const mainToken = await findMainToken(roomId, userId);
            const needsMainToken = !isGm && mainToken === null;

            const pendingRequests = await prisma.actionRequest.findMany({
                where: { roomId, status: "pending" },
            });

            const pendingRequestUserIds = pendingRequests.map((r) => r.userId);

            socket.emit("room:state", {
                room,
                members,
                turn: {
                    turnState: roomState?.turnState ?? "active",
                    confirmedUserIds,
                    pendingRequestUserIds,
                },
                activeSceneId: roomState?.activeSceneId ?? null,
                scenes: scenes.map((s) => ({
                    id: s.id,
                    roomId: s.roomId,
                    name: s.name,
                    backgroundUrl: s.backgroundUrl,
                    orderIndex: s.orderIndex,
                    createdAt: s.createdAt.toISOString(),
                })),
                tokens: tokens.map(toTokenDto),
                drawings: getDrawingsByRoom(roomId),
                markers: getMarkersByRoom(roomId),
                statuses: statuses.map((s) => ({
                    id: s.id,
                    roomId: s.roomId,
                    name: s.name,
                    icon: s.icon,
                    color: s.color,
                    maxStacks: s.maxStacks,
                    maxCount: s.maxCount,
                    hasCount: s.hasCount,
                    isDefault: s.isDefault,
                    createdAt: s.createdAt.toISOString(),
                })),
                assets: assets.map((a) => ({
                    id: a.id,
                    roomId: a.roomId,
                    folderId: a.folderId,
                    name: a.name,
                    imageUrl: a.imageUrl,
                    color: a.color,
                    hpCurrent: a.hpCurrent,
                    hpMax: a.hpMax,
                    spCurrent: a.spCurrent,
                    spMax: a.spMax,
                    level: a.level,
                    experience: a.experience,
                    size: a.size,
                    orderIndex: a.orderIndex,
                    createdBy: a.createdBy,
                    createdAt: a.createdAt.toISOString(),
                })),
                assetFolders: assetFolders.map((f) => ({
                    id: f.id,
                    roomId: f.roomId,
                    name: f.name,
                    orderIndex: f.orderIndex,
                    isDefault: f.isDefault,
                    createdAt: f.createdAt.toISOString(),
                })),
                messages: messages.reverse().map((m) => ({
                    id: m.id,
                    roomId: m.roomId,
                    userId: m.userId,
                    nickname: m.nickname,
                    mode: m.mode,
                    content: m.content,
                    isRoll: m.isRoll,
                    rollData: m.rollData as never,
                    createdAt: m.createdAt.toISOString(),
                })),
                needsMainToken,
            });

            socket.to(`room:${roomId}`).emit("room:user-joined", {
                member: members.find((m) => m.userId === userId)!,
            });
        }
        catch (err)
        {
            if (err instanceof RoomError)
            {
                socket.emit("error", { code: err.code, message: err.message });

                return;
            }

            socket.emit("error", {
                code: "UNKNOWN",
                message: "Не удалось подключиться к комнате",
            });
        }
    });

    socket.on("room:leave", async () =>
    {
        const userId = socket.data.userId;
        const rooms = Array.from(socket.rooms).filter((r) => r.startsWith("room:"));

        for (const room of socket.rooms)
        {
            if (room.startsWith("room:"))
            {
                const roomId = room.slice(5);

                await prisma.roomMember.updateMany({
                    where: { roomId, userId },
                    data: { isOnline: false },
                });

                // Устанавливаем isOnline = false
                const offlineTokens = await setUserOnline(roomId, userId, false);

                socket.to(room).emit("member:online-changed", {
                    userId,
                    isOnline: false,
                });

                for (const token of offlineTokens)
                {
                    socket.to(room).emit("token:updated", { token });
                }

                socket.to(room).emit("room:user-left", { userId });

                void socket.leave(room);
            }
        }
    });

    // ============================================================
    // scene:activate
    // ============================================================

    socket.on("scene:activate", async ({ sceneId }) =>
    {
        const userId = socket.data.userId;

        const scene = await prisma.scene.findUnique({
            where: { id: sceneId },
        });

        if (!scene)
        {
            socket.emit("error", {
                code: "SCENE_NOT_FOUND",
                message: "Сцена не найдена",
            });

            return;
        }

        if (!(await ensureGm(userId, scene.roomId)))
        {
            socket.emit("error", {
                code: "NOT_GM",
                message: "Только ГМ может переключать сцены",
            });

            return;
        }

        try
        {
            await activateScene(scene.roomId, sceneId);

            io.to(`room:${scene.roomId}`).emit("scene:activated", { sceneId });
        }
        catch (err)
        {
            if (err instanceof SceneError)
            {
                socket.emit("error", { code: err.code, message: err.message });
            }
        }
    });

    // ============================================================
    // Токены
    // ============================================================

    socket.on("token:create", async (payload) =>
    {
        const userId = socket.data.userId;

        if (!(await ensureMember(userId, payload.roomId)))
        {
            socket.emit("error", {
                code: "NOT_A_MEMBER",
                message: "Вы не участник комнаты",
            });

            return;
        }

        // Права: ГМ или игрок, создающий свой главный токен
        const isGm = await ensureGm(userId, payload.roomId);

        if (!isGm)
        {
            // Игрок может создать только свой главный токен
            const isOwnMain =
                payload.isMain === true &&
                (payload.ownerId === userId || payload.ownerId === undefined);

            if (!isOwnMain)
            {
                socket.emit("error", {
                    code: "FORBIDDEN",
                    message: "Только ГМ может создавать токены",
                });

                return;
            }

            const existing = await findMainToken(payload.roomId, userId);

            if (existing)
            {
                socket.emit("error", {
                    code: "ALREADY_EXISTS",
                    message: "У вас уже есть главный токен",
                });

                return;
            }

            payload.ownerId = userId;
            payload.isMain = true;
        }

        try
        {
            const { roomId, ...input } = payload;

            const token = await createToken(roomId, input);

            io.to(`room:${roomId}`).emit("token:created", { token });
        }
        catch (err)
        {
            if (err instanceof TokenError)
            {
                socket.emit("error", { code: err.code, message: err.message });

                return;
            }

            throw err;
        }
    });

    socket.on("token:update", async ({ tokenId, patch }) =>
    {
        const userId = socket.data.userId;

        const token = await prisma.token.findUnique({
            where: { id: tokenId },
        });

        if (!token)
        {
            socket.emit("error", {
                code: "TOKEN_NOT_FOUND",
                message: "Токен не найден",
            });

            return;
        }

        const isGm = await ensureGm(userId, token.roomId);
        const isOwner = token.ownerId === userId;

        if (!isGm && !isOwner)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Вы не можете редактировать этот токен",
            });

            return;
        }

        try
        {
            const updated = await updateToken(tokenId, patch);

            io.to(`room:${token.roomId}`).emit("token:updated", { token: updated });
        }
        catch (err)
        {
            if (err instanceof TokenError)
            {
                socket.emit("error", { code: err.code, message: err.message });

                return;
            }

            throw err;
        }
    });

    socket.on("token:move", async ({ tokenId, x, y }) =>
    {
        const userId = socket.data.userId;

        const token = await prisma.token.findUnique({
            where: { id: tokenId },
        });

        if (!token)
        {
            socket.emit("error", {
                code: "TOKEN_NOT_FOUND",
                message: "Токен не найден",
            });

            return;
        }

        const isGm = await ensureGm(userId, token.roomId);
        const isOwner = token.ownerId === userId;

        if (!isGm && !isOwner)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Вы не можете двигать этот токен",
            });

            return;
        }

        await updateToken(tokenId, { x, y });

        io.to(`room:${token.roomId}`).emit("token:moved", { tokenId, x, y });
    });

    socket.on("token:delete", async ({ tokenId }) =>
    {
        const userId = socket.data.userId;

        const token = await prisma.token.findUnique({
            where: { id: tokenId },
        });

        if (!token)
        {
            socket.emit("error", {
                code: "TOKEN_NOT_FOUND",
                message: "Токен не найден",
            });

            return;
        }

        const isGm = await ensureGm(userId, token.roomId);

        if (!isGm)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Только ГМ может удалять токены",
            });

            return;
        }

        if (token.isMain)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Нельзя удалить главный токен игрока",
            });

            return;
        }

        try
        {
            await deleteToken(tokenId);

            io.to(`room:${token.roomId}`).emit("token:deleted", { tokenId });
        }
        catch (err)
        {
            if (err instanceof TokenError)
            {
                socket.emit("error", { code: err.code, message: err.message });

                return;
            }

            throw err;
        }
    });

    socket.on("tokens:recenter-all", async ({ roomId }) =>
    {
        const userId = socket.data.userId;

        const isGm = await ensureGm(userId, roomId);

        if (!isGm)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Только ГМ может вернуть всех в центр",
            });

            return;
        }

        const tokens = await recenterAllTokens(roomId);

        io.to(`room:${roomId}`).emit("tokens:recentered", { tokens });
    });

    socket.on("tokens:recenter-mine", async ({ roomId }) =>
    {
        const userId = socket.data.userId;

        if (!(await ensureMember(userId, roomId)))
        {
            socket.emit("error", {
                code: "NOT_A_MEMBER",
                message: "Вы не участник комнаты",
            });

            return;
        }

        const tokens = await recenterUserTokens(roomId, userId);

        // Broadcast себе и всем — чтобы все видели перемещение
        io.to(`room:${roomId}`).emit("tokens:recentered", { tokens });
    });

    // ============================================================
    // Рисунки
    // ============================================================

    socket.on("drawing:create", async (payload) =>
    {
        const userId = socket.data.userId;

        if (!(await ensureMember(userId, payload.roomId)))
        {
            socket.emit("error", {
                code: "NOT_A_MEMBER",
                message: "Вы не участник комнаты",
            });

            return;
        }

        const drawing = createDrawing(payload.roomId, userId, {
            data: payload.data,
            color: payload.color,
            strokeWidth: payload.strokeWidth,
            isTemporary: payload.isTemporary,
        });

        io.to(`room:${payload.roomId}`).emit("drawing:created", { drawing });
    });

    socket.on("drawing:delete", async ({ drawingId }) =>
    {
        const userId = socket.data.userId;

        // Ищем рисунок во всех комнатах пользователя
        let found: { roomId: string; drawing: ReturnType<typeof getDrawing> } | null = null;

        for (const room of socket.rooms)
        {
            if (!room.startsWith("room:"))
            {
                continue;
            }

            const roomId = room.slice(5);
            const drawing = getDrawing(roomId, drawingId);

            if (drawing)
            {
                found = { roomId, drawing };

                break;
            }
        }

        if (!found || !found.drawing)
        {
            socket.emit("error", {
                code: "DRAWING_NOT_FOUND",
                message: "Рисунок не найден",
            });

            return;
        }

        const { roomId, drawing } = found;

        // Права: автор или GM
        const isGm = await ensureGm(userId, roomId);
        const isOwner = drawing.authorId === userId;

        if (!isGm && !isOwner)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Вы не можете удалить этот рисунок",
            });

            return;
        }

        deleteDrawing(roomId, drawingId);

        io.to(`room:${roomId}`).emit("drawing:deleted", { drawingId });
    });

    socket.on("drawing:clear-mine", async ({ roomId }) =>
    {
        const userId = socket.data.userId;

        if (!(await ensureMember(userId, roomId)))
        {
            socket.emit("error", {
                code: "NOT_A_MEMBER",
                message: "Вы не участник комнаты",
            });

            return;
        }

        const deletedIds = clearOwnDrawings(roomId, userId);

        io.to(`room:${roomId}`).emit("drawings:cleared", {
            roomId,
            authorId: userId,
        });

        void deletedIds;
    });

    socket.on("drawing:clear-all", async ({ roomId }) =>
    {
        const userId = socket.data.userId;

        const isGm = await ensureGm(userId, roomId);

        if (!isGm)
        {
            socket.emit("error", {
                code: "NOT_GM",
                message: "Только ГМ может очистить все рисунки",
            });

            return;
        }

        clearAllDrawings(roomId);

        io.to(`room:${roomId}`).emit("drawings:cleared", {
            roomId,
            authorId: null,
        });
    });

    socket.on("drawing:update", async ({ drawingId, patch }) =>
    {
        const userId = socket.data.userId;

        let found: { roomId: string; drawing: ReturnType<typeof getDrawing> } | null = null;

        for (const room of socket.rooms)
        {
            if (!room.startsWith("room:"))
            {
                continue;
            }

            const roomId = room.slice(5);
            const drawing = getDrawing(roomId, drawingId);

            if (drawing)
            {
                found = { roomId, drawing };

                break;
            }
        }

        if (!found || !found.drawing)
        {
            socket.emit("error", {
                code: "DRAWING_NOT_FOUND",
                message: "Рисунок не найден",
            });

            return;
        }

        const { roomId, drawing } = found;

        const isGm = await ensureGm(userId, roomId);
        const isOwner = drawing.authorId === userId;

        if (!isGm && !isOwner)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Вы не можете редактировать этот рисунок",
            });

            return;
        }

        const updated = updateDrawing(roomId, drawingId, patch);

        if (updated)
        {
            io.to(`room:${roomId}`).emit("drawing:updated", { drawing: updated });
        }
    });

    // ============================================================
    // Метки / пинги
    // ============================================================

    socket.on("marker:create", async (payload) =>
    {
        const userId = socket.data.userId;

        if (!(await ensureMember(userId, payload.roomId)))
        {
            socket.emit("error", {
                code: "NOT_A_MEMBER",
                message: "Вы не участник комнаты",
            });

            return;
        }

        const marker = createMarker(payload.roomId, userId, {
            type: "point",
            x: payload.x,
            y: payload.y,
            color: payload.color,
            label: payload.label,
            isTemporary: payload.isTemporary ?? true,
        });

        io.to(`room:${payload.roomId}`).emit("marker:created", { marker });
    });

    socket.on("marker:delete", async ({ markerId }) =>
    {
        const userId = socket.data.userId;

        let found: { roomId: string; marker: ReturnType<typeof getMarker> } | null = null;

        for (const room of socket.rooms)
        {
            if (!room.startsWith("room:"))
            {
                continue;
            }

            const roomId = room.slice(5);
            const marker = getMarker(roomId, markerId);

            if (marker)
            {
                found = { roomId, marker };

                break;
            }
        }

        if (!found || !found.marker)
        {
            return;
        }

        const { roomId, marker } = found;

        const isGm = await ensureGm(userId, roomId);
        const isOwner = marker.authorId === userId;

        if (!isGm && !isOwner)
        {
            socket.emit("error", {
                code: "FORBIDDEN",
                message: "Вы не можете удалить эту метку",
            });

            return;
        }

        deleteMarker(roomId, markerId);

        io.to(`room:${roomId}`).emit("marker:deleted", { markerId });
    });
}