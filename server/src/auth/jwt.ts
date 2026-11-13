import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";

import { env } from "@/config/env.js";
import type { JwtPayload, JwtSignPayload } from "@gm-table/shared";

declare module "@fastify/jwt"
{
    interface FastifyJWT
    {
        payload: JwtSignPayload;
        user: JwtPayload;
    }
}

export async function registerJwt(app: FastifyInstance): Promise<void>
{
    await app.register(fastifyJwt, {
        secret: env.JWT_SECRET,
        sign: {
            expiresIn: env.JWT_EXPIRES_IN,
        },
    });
}

export function signToken(app: FastifyInstance, payload: JwtSignPayload): string
{
    return app.jwt.sign(payload);
}

export function verifyToken(app: FastifyInstance, token: string): JwtPayload
{
    return app.jwt.verify<JwtPayload>(token);
}

/**
 * Проверяет JWT без FastifyInstance — для Socket.IO middleware.
 */
export function verifyTokenStandalone(token: string): JwtPayload
{
    const decoded = jwt.verify(token, env.JWT_SECRET);

    if (typeof decoded !== "object" || decoded === null)
    {
        throw new Error("Invalid JWT payload");
    }

    return decoded as JwtPayload;
}