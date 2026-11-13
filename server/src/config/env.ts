import { z } from "zod";

/**
 * Схема переменных окружения.
 * Все обязательные переменные должны быть здесь.
 * Если чего-то не хватает — приложение не запустится.
 */
const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info"),

    // Server
    SERVER_PORT: z.coerce.number().int().positive().default(3000),
    SERVER_HOST: z.string().default("0.0.0.0"),
    CORS_ORIGINS: z.string().default("http://localhost:5173"),

    // Database
    DATABASE_URL: z.string().url(),

    // JWT
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default("30d"),

    // Uploads
    UPLOAD_DIR: z.string().default("./uploads"),
    UPLOAD_MAX_SIZE_MB: z.coerce.number().int().positive().default(5),
});

/**
 * Распарсенные и провалидированные переменные окружения.
 * Импортируй `env` вместо `process.env` — типы гарантированы.
 */
export const env = envSchema.parse(process.env);

/**
 * CORS origins, разбитые в массив.
 */
export const corsOrigins = env.CORS_ORIGINS
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);