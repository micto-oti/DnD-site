import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth } from "@/auth/middleware.js";
import { prisma } from "@/db/prisma.js";
import {
    activateScene,
    createScene,
    deleteScene,
    getScenesByRoom,
    updateScene,
    SceneError,
} from "@/services/scene.service.js";

const createSceneSchema = z.object({
    name: z.string().min(1).max(50),
    backgroundUrl: z.string().optional(),
});

const updateSceneSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    backgroundUrl: z.string().nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
});

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

export async function registerSceneRoutes(app: FastifyInstance): Promise<void>
{
    /**
     * GET /api/rooms/:roomId/scenes
     */
    app.get<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/scenes",
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

            const scenes = await getScenesByRoom(roomId);

            return reply.send(scenes);
        },
    );

    /**
     * POST /api/rooms/:roomId/scenes
     */
    app.post<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/scenes",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureGm(userId, roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может создавать сцены",
                });
            }

            const parsed = createSceneSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            const scene = await createScene(roomId, parsed.data);

            // Broadcast всем в комнате
            app.io.to(`room:${roomId}`).emit("scene:created", { scene });

            return reply.code(201).send(scene);
        },
    );

    /**
     * PATCH /api/scenes/:id
     */
    app.patch<{ Params: { id: string } }>(
        "/api/scenes/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const scene = await prisma.scene.findUnique({
                where: { id: request.params.id },
            });

            if (!scene)
            {
                return reply.code(404).send({
                    error: "SCENE_NOT_FOUND",
                    message: "Сцена не найдена",
                });
            }

            if (!(await ensureGm(userId, scene.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может редактировать сцены",
                });
            }

            const parsed = updateSceneSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            const updated = await updateScene(scene.id, parsed.data);

            app.io.to(`room:${scene.roomId}`).emit("scene:updated", { scene: updated });

            return reply.send(updated);
        },
    );

    /**
     * DELETE /api/scenes/:id
     */
    app.delete<{ Params: { id: string } }>(
        "/api/scenes/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const scene = await prisma.scene.findUnique({
                where: { id: request.params.id },
            });

            if (!scene)
            {
                return reply.code(404).send({
                    error: "SCENE_NOT_FOUND",
                    message: "Сцена не найдена",
                });
            }

            if (!(await ensureGm(userId, scene.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может удалять сцены",
                });
            }

            try
            {
                await deleteScene(scene.id);

                app.io.to(`room:${scene.roomId}`).emit("scene:deleted", { sceneId: scene.id });

                return reply.send({ ok: true });
            }
            catch (err)
            {
                if (err instanceof SceneError)
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
     * POST /api/scenes/:id/activate
     */
    app.post<{ Params: { id: string } }>(
        "/api/scenes/:id/activate",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const scene = await prisma.scene.findUnique({
                where: { id: request.params.id },
            });

            if (!scene)
            {
                return reply.code(404).send({
                    error: "SCENE_NOT_FOUND",
                    message: "Сцена не найдена",
                });
            }

            if (!(await ensureGm(userId, scene.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может переключать сцены",
                });
            }

            const updated = await activateScene(scene.roomId, scene.id);

            return reply.send(updated);
        },
    );
}