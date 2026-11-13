import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth } from "@/auth/middleware.js";
import { prisma } from "@/db/prisma.js";
import {
    createToken,
    deleteToken,
    getTokensByRoom,
    updateToken,
    TokenError,
} from "@/services/token.service.js";

const createTokenSchema = z.object({
    name: z.string().min(1).max(50),
    imageUrl: z.string().optional(),
    x: z.number().min(0).max(100).optional(),
    y: z.number().min(0).max(100).optional(),
    size: z.number().min(0.5).max(4).optional(),
    color: z.string().optional(),
    ownerId: z.string().nullable().optional(),
    isMain: z.boolean().optional(),
    hpCurrent: z.number().int().optional(),
    hpMax: z.number().int().optional(),
    spCurrent: z.number().int().optional(),
    spMax: z.number().int().optional(),
    level: z.number().int().optional(),
    experience: z.number().int().optional(),
});

const updateTokenSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    imageUrl: z.string().nullable().optional(),
    x: z.number().min(0).max(100).optional(),
    y: z.number().min(0).max(100).optional(),
    size: z.number().min(0.5).max(4).optional(),
    color: z.string().optional(),
    ownerId: z.string().nullable().optional(),
    hpCurrent: z.number().int().nullable().optional(),
    hpMax: z.number().int().nullable().optional(),
    spCurrent: z.number().int().nullable().optional(),
    spMax: z.number().int().nullable().optional(),
    level: z.number().int().nullable().optional(),
    experience: z.number().int().nullable().optional(),
});

const moveTokenSchema = z.object({
    x: z.number().min(0).max(100),
    y: z.number().min(0).max(100),
});

/**
 * Проверяет, что пользователь — участник комнаты.
 */
async function ensureMember(userId: string, roomId: string): Promise<boolean>
{
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });

    return member !== null;
}

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

export async function registerTokenRoutes(app: FastifyInstance): Promise<void>
{
    /**
     * GET /api/rooms/:roomId/tokens
     */
    app.get<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/tokens",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureMember(userId, roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_A_MEMBER",
                    message: "Вы не участник комнаты",
                });
            }

            const tokens = await getTokensByRoom(roomId);

            return reply.send(tokens);
        },
    );

    /**
     * POST /api/rooms/:roomId/tokens
     *
     * - ГМ может создавать любые токены.
     * - Игрок может создать только свой главный токен (isMain: true, ownerId: self),
     *   и только если у него ещё нет главного токена в комнате.
     */
    app.post<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/tokens",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureMember(userId, roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_A_MEMBER",
                    message: "Вы не участник комнаты",
                });
            }

            const parsed = createTokenSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            const isGm = await ensureGm(userId, roomId);

            // Игрок может создавать только свой главный токен
            if (!isGm)
            {
                const isOwnMain =
                    parsed.data.isMain === true &&
                    (parsed.data.ownerId === userId || parsed.data.ownerId === undefined);

                if (!isOwnMain)
                {
                    return reply.code(403).send({
                        error: "FORBIDDEN",
                        message: "Только ГМ может создавать токены",
                    });
                }

                // Проверяем, что у игрока ещё нет главного токена
                const existing = await prisma.token.findFirst({
                    where: { roomId, ownerId: userId, isMain: true },
                });

                if (existing)
                {
                    return reply.code(409).send({
                        error: "ALREADY_EXISTS",
                        message: "У вас уже есть главный токен в этой комнате",
                    });
                }
            }

            // Принудительно ставим ownerId = userId для игрока
            const input = { ...parsed.data };

            if (!isGm)
            {
                input.ownerId = userId;
                input.isMain = true;
            }

            const token = await createToken(roomId, input);

            return reply.code(201).send(token);
        },
    );

    /**
     * PATCH /api/tokens/:id
     *
     * - ГМ может редактировать любые токены.
     * - Владелец — только свои.
     */
    app.patch<{ Params: { id: string } }>(
        "/api/tokens/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const token = await prisma.token.findUnique({
                where: { id: request.params.id },
            });

            if (!token)
            {
                return reply.code(404).send({
                    error: "TOKEN_NOT_FOUND",
                    message: "Токен не найден",
                });
            }

            const isGm = await ensureGm(userId, token.roomId);
            const isOwner = token.ownerId === userId;

            if (!isGm && !isOwner)
            {
                return reply.code(403).send({
                    error: "FORBIDDEN",
                    message: "Вы не можете редактировать этот токен",
                });
            }

            const parsed = updateTokenSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            try
            {
                const updated = await updateToken(token.id, parsed.data);

                return reply.send(updated);
            }
            catch (err)
            {
                if (err instanceof TokenError)
                {
                    return reply.code(400).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );

    /**
     * POST /api/tokens/:id/move
     */
    app.post<{ Params: { id: string } }>(
        "/api/tokens/:id/move",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const token = await prisma.token.findUnique({
                where: { id: request.params.id },
            });

            if (!token)
            {
                return reply.code(404).send({
                    error: "TOKEN_NOT_FOUND",
                    message: "Токен не найден",
                });
            }

            const isGm = await ensureGm(userId, token.roomId);
            const isOwner = token.ownerId === userId;

            if (!isGm && !isOwner)
            {
                return reply.code(403).send({
                    error: "FORBIDDEN",
                    message: "Вы не можете двигать этот токен",
                });
            }

            const parsed = moveTokenSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            const updated = await updateToken(token.id, parsed.data);

            return reply.send(updated);
        },
    );

    /**
     * DELETE /api/tokens/:id
     *
     * - Токен игрока (isMain: true) — удалить нельзя.
     * - Токен ГМа — может удалить только ГМ.
     */
    app.delete<{ Params: { id: string } }>(
        "/api/tokens/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const token = await prisma.token.findUnique({
                where: { id: request.params.id },
            });

            if (!token)
            {
                return reply.code(404).send({
                    error: "TOKEN_NOT_FOUND",
                    message: "Токен не найден",
                });
            }

            const isGm = await ensureGm(userId, token.roomId);

            if (!isGm)
            {
                return reply.code(403).send({
                    error: "FORBIDDEN",
                    message: "Только ГМ может удалять токены",
                });
            }

            if (token.isMain) {
                return reply.code(403).send({
                    error: "FORBIDDEN",
                    message: "Нельзя удалить главный токен игрока",
                });
            }

            try
            {
                await deleteToken(token.id);

                return reply.send({ ok: true });
            }
            catch (err)
            {
                if (err instanceof TokenError)
                {
                    return reply.code(400).send({
                        error: err.code,
                        message: err.message,
                    });
                }

                throw err;
            }
        },
    );
}