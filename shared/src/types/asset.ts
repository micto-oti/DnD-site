/**
 * Папка для ассетов.
 *
 * Дефолтная папка («Общее») создаётся при создании комнаты
 * с флагом `isDefault: true`. Её нельзя переименовать или удалить.
 */
export interface AssetFolder
{
    id: string;
    roomId: string;
    name: string;
    orderIndex: number;
    isDefault: boolean;
    createdAt: string;
}

/**
 * Ассет — заготовка для быстрого размещения на сцене.
 * ГМ тащит ассет на сцену → создаётся токен.
 *
 * Изображение опционально: если его нет — токен рисуется
 * цветным кружком с буквой. ГМ может добавить картинку позже.
 */
export interface Asset
{
    id: string;
    roomId: string;
    folderId: string | null;
    name: string;
    imageUrl: string | null;
    color: string;
    hpCurrent: number | null;
    hpMax: number | null;
    spCurrent: number | null;
    spMax: number | null;
    level: number | null;
    experience: number | null;
    size: number;
    orderIndex: number;
    createdBy: string | null;
    createdAt: string;
}

/**
 * Входные данные для создания папки.
 */
export interface CreateAssetFolderInput
{
    name: string;
}

/**
 * Входные данные для обновления папки.
 */
export interface UpdateAssetFolderInput
{
    name?: string;
    orderIndex?: number;
}

/**
 * Входные данные для создания ассета.
 *
 * `imageUrl` опционален — ассет можно создать без картинки,
 * чтобы не затягивать партию. ГМ добавит картинку позже.
 */
export interface CreateAssetInput
{
    name: string;
    imageUrl?: string;
    color?: string;
    hpCurrent?: number;
    hpMax?: number;
    spCurrent?: number;
    spMax?: number;
    level?: number;
    experience?: number;
    size?: number;
    folderId?: string | null;
}

/**
 * Входные данные для обновления ассета.
 */
export interface UpdateAssetInput
{
    name?: string;
    imageUrl?: string | null;
    color?: string;
    hpCurrent?: number | null;
    hpMax?: number | null;
    spCurrent?: number | null;
    spMax?: number | null;
    level?: number | null;
    experience?: number | null;
    size?: number;
    folderId?: string | null;
    orderIndex?: number;
}