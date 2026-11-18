import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "@/auth/middleware.js";
import { prisma } from "@/db/prisma.js";

export const statusInputSchema = z.object({
    name: z.string().trim().min(1).max(100),
    icon: z.string().trim().min(1).max(32),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    hasCount: z.boolean(),
}).strict();

export async function registerStatusRoutes(app: FastifyInstance): Promise<void> {
    app.post<{ Params: { roomId: string } }>("/api/rooms/:roomId/statuses", { preHandler: [requireAuth] }, async (request, reply) => {
        const { roomId } = request.params;
        const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: request.user!.sub } } });
        if (member?.role !== "gm") return reply.code(403).send({ error: "NOT_GM", message: "Только ГМ может создавать эффекты" });
        const parsed = statusInputSchema.safeParse(request.body);
        if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", message: "Проверь название, иконку и цвет эффекта" });
        const record = await prisma.statusDefinition.create({ data: {
            ...parsed.data, id: randomUUID(), roomId, createdBy: request.user!.sub,
            maxStacks: 999, maxCount: parsed.data.hasCount ? 99 : null, isDefault: false,
        } });
        const status = { ...record, createdAt: record.createdAt.toISOString() };
        app.io.to(`room:${roomId}`).emit("status:created", { status });
        return reply.code(201).send(status);
    });

    app.patch<{ Params: { roomId: string; statusId: string } }>("/api/rooms/:roomId/statuses/:statusId", { preHandler: [requireAuth] }, async (request, reply) => {
        const { roomId, statusId } = request.params;
        const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId: request.user!.sub } } });
        if (member?.role !== "gm") return reply.code(403).send({ error: "NOT_GM", message: "Только ГМ может редактировать эффекты" });
        const parsed = statusInputSchema.pick({ name: true, icon: true, color: true }).safeParse(request.body);
        if (!parsed.success) return reply.code(400).send({ error: "INVALID_BODY", message: "Проверь название, иконку и цвет эффекта" });
        const existing = await prisma.statusDefinition.findUnique({ where: { roomId_id: { roomId, id: statusId } } });
        if (!existing) return reply.code(404).send({ error: "STATUS_NOT_FOUND", message: "Эффект не найден" });
        const record = await prisma.statusDefinition.update({ where: { roomId_id: { roomId, id: statusId } }, data: parsed.data });
        const status = { ...record, createdAt: record.createdAt.toISOString() };
        app.io.to(`room:${roomId}`).emit("status:updated", { status });
        return reply.send(status);
    });
}
