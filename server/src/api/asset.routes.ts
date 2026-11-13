import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth } from "@/auth/middleware.js";
import { prisma } from "@/db/prisma.js";
import {
    AssetError,
    createAsset,
    createFolder,
    deleteAsset,
    deleteFolder,
    getAssetsByRoom,
    getFoldersByRoom,
    updateAsset,
    updateFolder,
} from "@/services/asset.service.js";

// ============================================================
// Схемы
// ============================================================

const createFolderSchema = z.object({
    name: z.string().min(1).max(50),
});

const updateFolderSchema = z.object({
    name: z.string().min(1).max(50).optional(),
    orderIndex: z.number().int().min(0).optional(),
});

const createAssetSchema = z.object({
    name: z.string().min(1).max(100),
    imageUrl: z.string().optional(),
    color: z.string().optional(),
    hpCurrent: z.number().int().optional(),
    hpMax: z.number().int().optional(),
    spCurrent: z.number().int().optional(),
    spMax: z.number().int().optional(),
    level: z.number().int().optional(),
    experience: z.number().int().optional(),
    size: z.number().min(0.5).max(4).optional(),
    folderId: z.string().nullable().optional(),
});

const updateAssetSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    imageUrl: z.string().nullable().optional(),
    color: z.string().optional(),
    hpCurrent: z.number().int().nullable().optional(),
    hpMax: z.number().int().nullable().optional(),
    spCurrent: z.number().int().nullable().optional(),
    spMax: z.number().int().nullable().optional(),
    level: z.number().int().nullable().optional(),
    experience: z.number().int().nullable().optional(),
    size: z.number().min(0.5).max(4).optional(),
    folderId: z.string().nullable().optional(),
    orderIndex: z.number().int().min(0).optional(),
});

// ============================================================
// Проверки прав
// ============================================================

async function ensureGm(userId: string, roomId: string): Promise<boolean>
{
    const member = await prisma.roomMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
    });

    return member?.role === "gm";
}

// ============================================================
// Роуты
// ============================================================

export async function registerAssetRoutes(app: FastifyInstance): Promise<void>
{
    // === Папки ===

    /**
     * GET /api/rooms/:roomId/asset-folders
     */
    app.get<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/asset-folders",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureGm(userId, roomId)))
{
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может просматривать папки",
                });
            }

            const folders = await getFoldersByRoom(roomId);

            return reply.send(folders);
        },
    );

    /**
     * POST /api/rooms/:roomId/asset-folders
     */
    app.post<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/asset-folders",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureGm(userId, roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может создавать папки",
                });
            }

            const parsed = createFolderSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            const folder = await createFolder(roomId, parsed.data);

            app.io.to(`room:${roomId}`).emit("folder:created", { folder });

            return reply.code(201).send(folder);
        },
    );

    /**
     * PATCH /api/asset-folders/:id
     */
    app.patch<{ Params: { id: string } }>(
        "/api/asset-folders/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const folder = await prisma.assetFolder.findUnique({
                where: { id: request.params.id },
            });

            if (!folder)
            {
                return reply.code(404).send({
                    error: "FOLDER_NOT_FOUND",
                    message: "Папка не найдена",
                });
            }

            if (!(await ensureGm(userId, folder.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может редактировать папки",
                });
            }

            const parsed = updateFolderSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            try
            {
                const updated = await updateFolder(folder.id, parsed.data);

                app.io.to(`room:${folder.roomId}`).emit("folder:updated", { folder: updated });

                return reply.send(updated);
            }
            catch (err)
            {
                if (err instanceof AssetError)
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
     * DELETE /api/asset-folders/:id
     */
    app.delete<{ Params: { id: string } }>(
        "/api/asset-folders/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const folder = await prisma.assetFolder.findUnique({
                where: { id: request.params.id },
            });

            if (!folder)
            {
                return reply.code(404).send({
                    error: "FOLDER_NOT_FOUND",
                    message: "Папка не найдена",
                });
            }

            if (!(await ensureGm(userId, folder.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может удалять папки",
                });
            }

            try
            {
                await deleteFolder(folder.id);

                app.io.to(`room:${folder.roomId}`).emit("folder:deleted", { folderId: folder.id });

                return reply.send({ ok: true });
            }
            catch (err)
            {
                if (err instanceof AssetError)
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

    // === Ассеты ===

    /**
     * GET /api/rooms/:roomId/assets
     */
    app.get<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/assets",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureGm(userId, roomId)))
{
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может просматривать ассеты",
                });
            }

            const assets = await getAssetsByRoom(roomId);

            return reply.send(assets);
        },
    );

    /**
     * POST /api/rooms/:roomId/assets
     */
    app.post<{ Params: { roomId: string } }>(
        "/api/rooms/:roomId/assets",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;
            const { roomId } = request.params;

            if (!(await ensureGm(userId, roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может создавать ассеты",
                });
            }

            const parsed = createAssetSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            const asset = await createAsset(roomId, userId, parsed.data);

            app.io.to(`room:${roomId}`).emit("asset:created", { asset });

            return reply.code(201).send(asset);
        },
    );

    /**
     * PATCH /api/assets/:id
     */
    app.patch<{ Params: { id: string } }>(
        "/api/assets/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const asset = await prisma.asset.findUnique({
                where: { id: request.params.id },
            });

            if (!asset)
            {
                return reply.code(404).send({
                    error: "ASSET_NOT_FOUND",
                    message: "Ассет не найден",
                });
            }

            if (!(await ensureGm(userId, asset.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может редактировать ассеты",
                });
            }

            const parsed = updateAssetSchema.safeParse(request.body);

            if (!parsed.success)
            {
                return reply.code(400).send({
                    error: "INVALID_BODY",
                    message: parsed.error.message,
                });
            }

            try
            {
                const updated = await updateAsset(asset.id, parsed.data);

                app.io.to(`room:${asset.roomId}`).emit("asset:updated", { asset: updated });

                return reply.send(updated);
            }
            catch (err)
            {
                if (err instanceof AssetError)
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
     * DELETE /api/assets/:id
     * Каскадно удаляет все токены, созданные из этого ассета.
     */
    app.delete<{ Params: { id: string } }>(
        "/api/assets/:id",
        { preHandler: [requireAuth] },
        async (request, reply) =>
        {
            const userId = request.user!.sub;

            const asset = await prisma.asset.findUnique({
                where: { id: request.params.id },
            });

            if (!asset)
            {
                return reply.code(404).send({
                    error: "ASSET_NOT_FOUND",
                    message: "Ассет не найден",
                });
            }

            if (!(await ensureGm(userId, asset.roomId)))
            {
                return reply.code(403).send({
                    error: "NOT_GM",
                    message: "Только ГМ может удалять ассеты",
                });
            }

            try
            {
                const { affectedTokenIds } = await deleteAsset(asset.id);

                // Broadcast удаления токенов
                for (const tokenId of affectedTokenIds)
                {
                    app.io.to(`room:${asset.roomId}`).emit("token:deleted", { tokenId });
                }

                app.io.to(`room:${asset.roomId}`).emit("asset:deleted", { assetId: asset.id });

                return reply.send({ ok: true });
            }
            catch (err)
            {
                if (err instanceof AssetError)
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