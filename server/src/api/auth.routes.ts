import type { FastifyInstance } from "fastify";

import { requireAuth } from "@/auth/middleware.js";
import { signToken } from "@/auth/jwt.js";
import { loginOrRegister } from "@/auth/service.js";
import { prisma } from "@/db/prisma.js";
import type { LoginResponse } from "@gm-table/shared";

/**
 * Схема тела запроса для логина.
 */
interface LoginBody
{
    email: string;
}

/**
 * Регистрирует auth-роуты.
 */
export async function registerAuthRoutes(app: FastifyInstance): Promise<void>
{
    /**
     * POST /api/auth/login
     * Принимает email. Создаёт или находит пользователя.
     * Возвращает user + JWT.
     */
    app.post<{ Body: LoginBody }>("/api/auth/login", async (request, reply) =>
    {
        const { email } = request.body;

        // Простая валидация: есть @ и точка после
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        {
            return reply.code(400).send({
                error: "INVALID_EMAIL",
                message: "Email is invalid",
            });
        }

        const { user, isNewUser } = await loginOrRegister(email);

        const token = signToken(app, {
            sub: user.id,
            email: user.email,
        });

        const response: LoginResponse & { isNewUser: boolean } = {
            user,
            token,
            isNewUser,
        };

        return reply.send(response);
    });

    /**
     * GET /api/auth/me
     * Возвращает текущего пользователя по JWT.
     */
    app.get("/api/auth/me", { preHandler: [requireAuth] }, async (request, reply) =>
    {
        const payload = request.user!;

        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
        });

        if (!user)
        {
            return reply.code(404).send({
                error: "USER_NOT_FOUND",
                message: "User does not exist",
            });
        }

        return reply.send({
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        });
    });
}