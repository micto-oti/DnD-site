import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { env } from "@/config/env.js";

/**
 * Разрешённые MIME-типы.
 */
const ALLOWED_MIME_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/gif",
]);

/**
 * Расширения по MIME.
 */
const EXTENSION_BY_MIME: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
};

/**
 * Результат загрузки файла.
 */
export interface UploadResult
{
    url: string;    // относительный путь /uploads/<uuid>.<ext>
}

/**
 * Сохраняет файл в uploads/.
 * Возвращает относительный URL.
 */
export async function saveUploadedFile(
    buffer: Buffer,
    mimeType: string,
): Promise<UploadResult>
{
    if (!ALLOWED_MIME_TYPES.has(mimeType))
    {
        throw new UploadError("INVALID_MIME", `Недопустимый тип файла: ${mimeType}`);
    }

    const maxBytes = env.UPLOAD_MAX_SIZE_MB * 1024 * 1024;

    if (buffer.length > maxBytes)
    {
        throw new UploadError(
            "FILE_TOO_LARGE",
            `Файл больше ${env.UPLOAD_MAX_SIZE_MB} МБ`,
        );
    }

    const extension = EXTENSION_BY_MIME[mimeType]!;
    const filename = `${randomUUID()}${extension}`;
    const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    const filepath = path.join(uploadDir, filename);

    await mkdir(uploadDir, { recursive: true });
    await writeFile(filepath, buffer);

    return { url: `/uploads/${filename}` };
}

/**
 * Ошибка загрузки.
 */
export class UploadError extends Error
{
    constructor(
        public code: string,
        message: string,
    )
    {
        super(message);
        this.name = "UploadError";
    }
}