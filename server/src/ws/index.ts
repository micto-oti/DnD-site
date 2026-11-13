import type { FastifyInstance } from "fastify";
import { Server as SocketIOServer } from "socket.io";

import type {
    ClientToServerEvents,
    ServerToClientEvents,
} from "@gm-table/shared";

import { corsOrigins } from "@/config/env.js";
import { authenticateSocket } from "./auth.js";
import { registerRoomHandlers } from "./handlers/room.handlers.js";
import { prisma } from "@/db/prisma.js";
import { setUserOnline } from "@/services/token.service.js";

/**
 * Расширяем типы Socket.IO — данные, привязанные к сокету.
 */
declare module "socket.io"
{
    interface SocketData
    {
        userId: string;
        email: string;
    }
}

export interface SocketServer
    extends SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, { userId: string; email: string }>
{
}

declare module "fastify"
{
    interface FastifyInstance
    {
        io: SocketServer;
    }
}

/**
 * Инициализирует Socket.IO и вешает его на HTTP-сервер Fastify.
 */
export async function registerWebSocket(app: FastifyInstance): Promise<SocketServer>
{
    const io: SocketServer = new SocketIOServer(app.server, {
        cors: {
            origin: corsOrigins,
            credentials: true,
        },
    }) as SocketServer;

    io.use(authenticateSocket);

    io.on("connection", (socket) =>
    {
        app.log.info(`Socket connected: ${socket.id} (user ${socket.data.userId})`);

        registerRoomHandlers(io, socket);

        // ВАЖНО: используем `disconnecting`, а не `disconnect`.
        // На момент `disconnect` socket.rooms уже пуст — Socket.IO удаляет сокет из комнат автоматически.
        socket.on("disconnecting", () =>
        {
            const userId = socket.data.userId;
            const rooms = Array.from(socket.rooms);

            app.log.info(
                `Disconnecting: socket=${socket.id} user=${userId} rooms=${rooms.join(",")}`,
            );

            if (!userId)
            {
                return;
            }

            // Fire-and-forget — Socket.IO не ждёт промисы
            void (async () =>
            {
                for (const room of rooms)
                {
                    if (!room.startsWith("room:"))
                    {
                        continue;
                    }

                    const roomId = room.slice(5);

                    try
                    {
                        await prisma.roomMember.updateMany({
                            where: { roomId, userId },
                            data: { isOnline: false },
                        });

                        const offlineTokens = await setUserOnline(roomId, userId, false);

                        io.to(room).emit("member:online-changed", {
                            userId,
                            isOnline: false,
                        });

                        for (const token of offlineTokens)
                        {
                            io.to(room).emit("token:updated", { token });
                        }

                        io.to(room).emit("room:user-left", { userId });
                    }
                    catch (err)
                    {
                        app.log.error(`Disconnecting error: ${String(err)}`);
                    }
                }
            })();
        });

        socket.on("disconnect", (reason) =>
        {
            app.log.info(`Disconnected: socket=${socket.id} reason=${reason}`);
        });
    });

    app.log.info("Socket.IO registered");

    app.decorate("io", io);
    return io;
}

