import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TokenStatus } from "@gm-table/shared";
import { requireAuth } from "@/auth/middleware.js";
import { prisma } from "@/db/prisma.js";
import { toTokenDto } from "@/services/token.service.js";
import { changeStatuses, StatusError } from "@/services/token-status.service.js";
import type { StatusAction } from "@/services/token-status.service.js";

const valuesSchema = z.object({ stacks: z.number().int().min(0), count: z.number().int().min(0).nullable() }).strict();
export async function registerTokenStatusRoutes(app: FastifyInstance): Promise<void> {
    for (const [method, action] of [["POST", "add"], ["PATCH", "update"], ["DELETE", "remove"]] as const) {
        app.route<{ Params: { tokenId: string; statusId: string } }>({
            method, url: "/api/tokens/:tokenId/statuses/:statusId", preHandler: [requireAuth],
            handler: async (request, reply) => {
                const parsed = action === "update" ? valuesSchema.safeParse(request.body) : null;
                if (parsed && !parsed.success) return reply.code(400).send({ message: "Недопустимые значения эффекта" });
                try {
                    const token = await mutate(request.params.tokenId, request.params.statusId, request.user!.sub, action, parsed?.success ? parsed.data : undefined);
                    app.io.to(`room:${token.roomId}`).emit("token:updated", { token });
                    return reply.send(token);
                } catch (error) {
                    if (error instanceof StatusError) return reply.code(error.statusCode).send({ message: error.message });
                    throw error;
                }
            },
        });
    }
}

async function mutate(tokenId: string, statusId: string, userId: string, action: StatusAction, values?: { stacks: number; count: number | null }) {
    // Compare-and-swap avoids overwriting another participant's concurrent effect change.
    for (let attempt = 0; attempt < 5; attempt++) {
        const token = await prisma.token.findUnique({ where: { id: tokenId } });
        if (!token) throw new StatusError(404, "Токен не найден");
        const member = await prisma.roomMember.findUnique({ where: { roomId_userId: { roomId: token.roomId, userId } } });
        if (!member || (member.role !== "gm" && token.ownerId !== userId)) throw new StatusError(403, "Можно менять эффекты только своих токенов");
        const definition = await prisma.statusDefinition.findUnique({ where: { roomId_id: { roomId: token.roomId, id: statusId } } });
        if (!definition) throw new StatusError(404, "Эффект не найден в библиотеке комнаты");
        const statuses = changeStatuses((Array.isArray(token.statuses) ? token.statuses : []) as unknown as TokenStatus[], definition, action, values);
        const result = await prisma.token.updateMany({
            where: { id: tokenId, ownerId: token.ownerId, statuses: { equals: token.statuses === null ? Prisma.JsonNull : token.statuses } },
            data: { statuses: statuses.map((item) => ({ ...item })) },
        });
        if (result.count) {
            const updated = await prisma.token.findUnique({ where: { id: tokenId } });
            if (!updated) throw new StatusError(404, "Токен удалён");
            return toTokenDto(updated);
        }
    }
    throw new StatusError(409, "Эффекты изменились одновременно. Повтори действие");
}
