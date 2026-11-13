/**
 * Ограничения на размеры, количества и длины строк.
 * Используются в валидации на сервере и в UI на клиенте.
 */
export const LIMITS = {
    // === Пользователь ===
    NICKNAME_MIN_LENGTH: 3,
    NICKNAME_MAX_LENGTH: 20,

    EMAIL_MAX_LENGTH: 254,

    // === Комната ===
    ROOM_NAME_MIN_LENGTH: 1,
    ROOM_NAME_MAX_LENGTH: 50,
    ROOM_SHORT_ID_LENGTH: 8,
    ROOM_MAX_MEMBERS: 15,

    // === Сцена ===
    SCENE_NAME_MIN_LENGTH: 1,
    SCENE_NAME_MAX_LENGTH: 50,
    SCENE_MAX_COUNT: 50,

    // === Токен ===
    TOKEN_NAME_MIN_LENGTH: 1,
    TOKEN_NAME_MAX_LENGTH: 50,
    TOKEN_MAX_PER_ROOM: 500,
    TOKEN_MIN_SIZE: 0.5,
    TOKEN_MAX_SIZE: 4.0,
    TOKEN_DEFAULT_SIZE: 1.0,

    // === Метка ===
    MARKER_LABEL_MAX_LENGTH: 100,
    MARKER_MAX_PER_ROOM: 200,

    // === Рисунок ===
    DRAWING_MAX_POINTS: 500,
    DRAWING_MAX_PER_ROOM: 500,

    // === Ассет ===
    ASSET_NAME_MIN_LENGTH: 1,
    ASSET_NAME_MAX_LENGTH: 100,
    ASSET_MAX_PER_ROOM: 500,
    ASSET_FOLDER_NAME_MIN_LENGTH: 1,
    ASSET_FOLDER_NAME_MAX_LENGTH: 50,
    ASSET_FOLDER_MAX_COUNT: 30,

    // === Статус ===
    STATUS_NAME_MIN_LENGTH: 1,
    STATUS_NAME_MAX_LENGTH: 30,
    STATUS_MAX_STACKS: 999,

    // === Заявка ===
    ACTION_REQUEST_MAX_TEXT_LENGTH: 200,

    // === Чат ===
    MESSAGE_MIN_LENGTH: 1,
    MESSAGE_MAX_LENGTH: 2000,
    CHAT_HISTORY_PAGE_SIZE: 100,

    // === Файлы ===
    UPLOAD_MAX_SIZE_BYTES: 5 * 1024 * 1024,   // 5 МБ
    UPLOAD_ALLOWED_MIME_TYPES: [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
    ] as const,

    // === Броски кубиков ===
    DICE_MAX_COUNT: 100,      // максимум кубиков в одном броске
    DICE_MAX_SIDES: 1000,     // максимум граней
    DICE_MAX_MODIFIER: 1000,  // максимум модификатора
} as const;

export type Limits = typeof LIMITS;