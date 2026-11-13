const API_URL = import.meta.env.VITE_API_URL;

/**
 * Ошибка API — содержит код и сообщение.
 */
export class ApiError extends Error
{
    constructor(
        public status: number,
        public code: string,
        message: string,
    )
    {
        super(message);
        this.name = "ApiError";
    }
}

/**
 * Получить токен из localStorage.
 */
export function getToken(): string | null
{
    return localStorage.getItem("token");
}

/**
 * Сохранить токен.
 */
export function setToken(token: string): void
{
    localStorage.setItem("token", token);
}

/**
 * Удалить токен.
 */
export function clearToken(): void
{
    localStorage.removeItem("token");
}

/**
 * Базовый fetch с авторизацией.
 */
export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T>
{
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type") && options.body)
    {
        headers.set("Content-Type", "application/json");
    }

    const token = getToken();

    if (token)
    {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    if (!response.ok)
    {
        let errorCode = "UNKNOWN";
        let errorMessage = response.statusText;

        try
        {
            const body = (await response.json()) as { error?: string; message?: string };

            errorCode = body.error ?? errorCode;
            errorMessage = body.message ?? errorMessage;
        }
        catch
        {
            // Не JSON — оставим как есть
        }

        throw new ApiError(response.status, errorCode, errorMessage);
    }

    return (await response.json()) as T;
}