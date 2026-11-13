import type { LoginResponse, User } from "@gm-table/shared";

import { apiFetch } from "./client.js";

/**
 * Логин или регистрация по email.
 */
export async function login(email: string): Promise<LoginResponse>
{
    return await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
}

/**
 * Получить текущего пользователя.
 */
export async function me(): Promise<User>
{
    return await apiFetch<User>("/api/auth/me");
}