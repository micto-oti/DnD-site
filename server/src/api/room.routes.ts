import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth } from "@/auth/middleware.js";
import {
    createRoom,
    getUserRooms,
    getRoomById,
    joinRoom,
    RoomError,
} from "@/services/room.service.js";

const createRoomSchema = z.object({
    name: z.string().min(1).max(50),
});

const joinRoomSchema = z.object({
    shortId: z.string().min(1).max(20),
    role: z.enum(["gm", "player"]).optional(),
});

export async function registerRoomRoutes(app: FastifyInstance): Promise<void>
{
    /**
     * POST /api/rooms — создать комнату.
     */
    app.post("/api/rooms", { preHandler: [requireAuth] }, async (request, reply) =>
    {
        const parsed = createRoomSchema.safeParse(request.body);

        if (!parsed.success)
        {
            return reply.code(400).send({
                error: "INVALID_BODY",
                message: parsed.error.message,
            });
        }

        const userId = request.user!.sub;
        const room = await createRoom(userId, parsed.data);

        return reply.code(201).send(room);
    });

    /**
     * GET /api/rooms — список моих комнат.
     */
    app.get("/api/rooms", { preHandler: [requireAuth] }, async (request, reply) =>
    {
        const userId = request.user!.sub;
        const rooms = await getUserRooms(userId);

        return reply.send(rooms);
    });

    /**
     * POST /api/rooms/join — присоединиться к комнате по shortId.
     */
    app.post("/api/rooms/join", { preHandler: [requireAuth] }, async (request, reply) =>
    {
        const parsed = joinRoomSchema.safeParse(request.body);

        if (!parsed.success)
        {
            return reply.code(400).send({
                error: "INVALID_BODY",
                message: parsed.error.message,
            });
        }

        const userId = request.user!.sub;

        try
        {
            const room = await joinRoom(userId, parsed.data.shortId, parsed.data.role);

            return reply.send(room);
        }
        catch (err)
        {
            if (err instanceof RoomError)
            {
                return reply.code(404).send({
                    error: err.code,
                    message: err.message,
                });
            }

            throw err;
        }
    });

    /**
     * GET /api/rooms/:id — детали комнаты.
     */
    app.get<{ Params: { id: string } }>(
        "/api/rooms/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            try
            {
                const data = await getRoomById(userId, request.params.id);

                return reply.send(data);
            }
            catch (err)
            {
                if (err instanceof RoomError)
                {
                    return reply.code(404).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );
}