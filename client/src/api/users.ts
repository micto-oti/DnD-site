import type { User } from "@gm-table/shared";

import { apiFetch } from "./client.js";

/**
 * Обновить текущего пользователя (ник).
 */
export async function updateMe(input: { nickname?: string }): Promise<User>
{
    return await apiFetch<User>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}