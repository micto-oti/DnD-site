import { getToken } from "./client.js";

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Загрузить файл. Возвращает относительный URL.
 */
export async function uploadFile(file: File): Promise<{ url: string }>
{
    const formData = new FormData();

    formData.append("file", file);

    const token = getToken();

    const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
    });

    if (!response.ok)
    {
        let message = response.statusText;

        try
        {
            const body = (await response.json()) as { message?: string };

            message = body.message ?? message;
        }
        catch
        {
            // ignore
        }

        throw new Error(message);
    }

    return (await response.json()) as { url: string };
}