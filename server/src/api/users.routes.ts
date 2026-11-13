import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { requireAuth } from "@/auth/middleware.js";
import { prisma } from "@/db/prisma.js";

const updateMeSchema = z.object({
    nickname: z.string().min(3).max(20).optional(),
});

export async function registerUserRoutes(app: FastifyInstance): Promise<void>
{
    app.patch("/api/users/me", { preHandler: [requireAuth] }, async (request, reply) =>
    {
        const userId = request.user!.sub;

        const parsed = updateMeSchema.safeParse(request.body);

        if (!parsed.success)
        {
            return reply.code(400).send({
                error: "INVALID_BODY",
                message: parsed.error.message,
            });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: parsed.data,
        });

        return reply.send({
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        });
    });
}