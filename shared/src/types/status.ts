/**
 * Определение статуса в библиотеке комнаты.
 *
 * При создании комнаты из DEFAULT_STATUSES копируются базовые статусы
 * с флагом `isDefault: true`. Их нельзя удалить, но можно переименовать,
 * поменять иконку и цвет. `id` остаётся системным.
 *
 * Кастомные статусы (isDefault: false) можно удалять.
 * При удалении статуса он снимается со всех токенов комнаты.
 */
export interface StatusDefinition
{
    id: string;                     // "bleed", "burn" или UUID для кастомных
    roomId: string | null;          // null = глобальный (на будущее), сейчас всегда uuid
    name: string;
    icon: string;                   // эмодзи, например "🩸"
    color: string;                  // hex, например "#c0392b"
    maxStacks: number;              // максимум стаков (999)
    maxCount: number | null;        // максимум счётчика; null, если hasCount = false
    hasCount: boolean;              // использует ли статус счётчик
    isDefault: boolean;             // true = дефолтный, нельзя удалить
    createdAt: string;
}

/**
 * Входные данные для создания кастомного статуса.
 */
export interface CreateStatusInput
{
    name: string;
    icon: string;
    color?: string;                 // по умолчанию — из палитры
    maxStacks?: number;             // по умолчанию — LIMITS.STATUS_MAX_STACKS (999)
    hasCount?: boolean;             // по умолчанию — false
    maxCount?: number | null;       // по умолчанию — 99 (если hasCount), иначе null
}

/**
 * Входные данные для обновления статуса.
 *
 * Для дефолтных статусов можно менять `name`, `icon`, `color`.
 * `id` и `isDefault` неизменяемы.
 */
export interface UpdateStatusInput
{
    name?: string;
    icon?: string;
    color?: string;
    maxStacks?: number;
    hasCount?: boolean;
    maxCount?: number | null;
}