import { prisma } from "@/db/prisma.js";
import type { User } from "@gm-table/shared";

/**
 * Результат логина/регистрации.
 */
export interface LoginResult
{
    user: User;
    isNewUser: boolean;
}

/**
 * Логин или регистрация по email.
 * Если пользователь существует — возвращает его.
 * Если нет — создаёт нового с автогенерированным ником.
 */
export async function loginOrRegister(email: string): Promise<LoginResult>
{
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
    });

    if (existing)
    {
        return {
            user: toUserDto(existing),
            isNewUser: false,
        };
    }

    const nickname = await generateNickname(normalizedEmail);

    const created = await prisma.user.create({
        data: {
            email: normalizedEmail,
            nickname,
        },
    });

    return {
        user: toUserDto(created),
        isNewUser: true,
    };
}

/**
 * Преобразует Prisma-модель в DTO для клиента.
 */
function toUserDto(user: {
    id: string;
    email: string;
    nickname: string;
    createdAt: Date;
    updatedAt: Date;
}): User
{
    return {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}

/**
 * Генерирует ник из email.
 * Если занят — добавляет суффикс.
 */
async function generateNickname(email: string): Promise<string>
{
    const base = email.split("@")[0] ?? "user";
    const clean = base.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "user";

    let candidate = clean;
    let counter = 1;

    while (true)
    {
        const existing = await prisma.user.findFirst({
            where: { nickname: candidate },
        });

        if (!existing)
        {
            return candidate;
        }

        counter += 1;
        candidate = `${clean}_${counter}`;
    }
}