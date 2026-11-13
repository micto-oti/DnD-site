import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { deleteAsset, updateAsset } from "@/api/assets.js";
import { useAssetStore } from "@/store/asset.store.js";
import type { Asset, AssetFolder } from "@gm-table/shared";
import ConfirmModal from "@/components/common/ConfirmModal.js";

interface AssetContextMenuProps
{
    asset: Asset;
    position: { x: number; y: number };
    folders: AssetFolder[];
    onClose: () => void;
    onEdit: () => void;
}

const MENU_WIDTH = 180;
const MENU_MAX_HEIGHT = 360;
const SUBMENU_MAX_HEIGHT = 200;

/**
 * Контекстное меню для ассета (ПКМ).
 * Автоматически позиционируется, чтобы не выходить за экран.
 */
function AssetContextMenu({
    asset,
    position,
    folders,
    onClose,
    onEdit,
}: AssetContextMenuProps): React.JSX.Element
{
    const removeAsset = useAssetStore((s) => s.removeAsset);
    const updateAssetInStore = useAssetStore((s) => s.updateAsset);
    const menuRef = useRef<HTMLDivElement>(null);
    const [finalPos, setFinalPos] = useState({ x: position.x, y: position.y });
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Пересчитываем позицию после рендера, чтобы знать размеры меню
    useLayoutEffect(() =>
    {
        const menu = menuRef.current;

        if (!menu)
        {
            return;
        }

        const rect = menu.getBoundingClientRect();

        let x = position.x;
        let y = position.y;

        // Не выходим за правый край
        if (x + rect.width > window.innerWidth)
        {
            x = window.innerWidth - rect.width - 8;
        }

        // Не выходим за нижний край — открываем вверх
        if (y + rect.height > window.innerHeight)
        {
            y = window.innerHeight - rect.height - 8;
        }

        // Не выходим за верхний край
        if (y < 8)
        {
            y = 8;
        }

        // Не выходим за левый край
        if (x < 8)
        {
            x = 8;
        }

        setFinalPos({ x, y });
    }, [position.x, position.y]);

    // Закрытие по клику вне
    useEffect(() =>
    {
        const handler = (e: MouseEvent): void =>
        {
            // Не закрываем меню, если открыта модалка
            if (confirmDelete)
            {
                return;
            }

            if (menuRef.current && !menuRef.current.contains(e.target as Node))
            {
                onClose();
            }
        };

        const timeout = setTimeout(() =>
        {
            document.addEventListener("mousedown", handler);
        }, 0);

        return () =>
        {
            clearTimeout(timeout);
            document.removeEventListener("mousedown", handler);
        };
    }, [onClose, confirmDelete]);

    // Закрытие по Esc
    useEffect(() =>
    {
        const handler = (e: KeyboardEvent): void =>
        {
            if (e.key === "Escape")
            {
                onClose();
            }
        };

        document.addEventListener("keydown", handler);

        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    const handleMoveToFolder = async (folderId: string): Promise<void> =>
    {
        try
        {
            const updated = await updateAsset(asset.id, { folderId });

            updateAssetInStore(updated);
        }
        catch
        {
            // игнорируем
        }
        finally
        {
            onClose();
        }
    };

    /* const handleDelete = async (): Promise<void> =>
    {
        if (!confirm(`Удалить ассет "${asset.name}"? Все токены из него тоже будут удалены.`))
        {
            return;
        }

        try
        {
            await deleteAsset(asset.id);
            removeAsset(asset.id);
        }
        catch
        {
            // игнорируем
        }
        finally
        {
            onClose();
        }
    }; */

    const handleDelete = (): void =>
    {
        setConfirmDelete(true);
    };

    const handleDeleteConfirm = async (): Promise<void> =>
    {
        try
        {
            await deleteAsset(asset.id);
            removeAsset(asset.id);
        }
        catch
        {
            // ignore
        }
        finally
        {
            setConfirmDelete(false);
            onClose();
        }
    };


    // Папки, в которые можно переместить (все, кроме текущей)
    const otherFolders = folders.filter((f) => f.id !== asset.folderId);

    return (
        <>
            <div
                ref={menuRef}
                style={{
                    ...styles.menu,
                    left: finalPos.x,
                    top: finalPos.y,
                    width: `${MENU_WIDTH}px`,
                    maxHeight: `${MENU_MAX_HEIGHT}px`,
                }}
            >
                <button onClick={() => { onEdit(); onClose(); }} style={styles.item}>
                    Редактировать
                </button>

                <div style={styles.divider} />

                <div style={styles.submenuLabel}>Переместить в:</div>

                <div style={styles.submenuScroll}>
                    {otherFolders.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => void handleMoveToFolder(f.id)}
                            style={styles.item}
                        >
                            {f.name}
                        </button>
                    ))}

                    {otherFolders.length === 0 && asset.folderId === null && (
                        <div style={styles.emptyHint}>Нет других папок</div>
                    )}
                </div>

                <div style={styles.divider} />

                <button onClick={() => void handleDelete()} style={styles.deleteItem}>
                    Удалить
                </button>
            </div>

            <ConfirmModal
                open={confirmDelete}
                title={`Удалить ассет "${asset.name}"?`}
                message="Все токены, созданные из этого ассета, также будут удалены. Это действие нельзя отменить."
                confirmLabel="Удалить"
                danger
                onConfirm={() => void handleDeleteConfirm()}
                onCancel={() => setConfirmDelete(false)}
            />
        </>
    );
}

const styles = {
    menu: {
        position: "fixed" as const,
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "6px",
        padding: "0.25rem",
        zIndex: 2000,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden" as const,
    },
    item: {
        display: "block",
        width: "100%",
        padding: "0.5rem 0.75rem",
        textAlign: "left" as const,
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        borderRadius: "4px",
        cursor: "pointer",
        flexShrink: 0,
    },
    deleteItem: {
        display: "block",
        width: "100%",
        padding: "0.5rem 0.75rem",
        textAlign: "left" as const,
        fontSize: "0.8125rem",
        color: "#e74c3c",
        borderRadius: "4px",
        cursor: "pointer",
        flexShrink: 0,
    },
    divider: {
        height: "1px",
        background: "#3a3a3e",
        margin: "0.25rem 0",
        flexShrink: 0,
    },
    submenuLabel: {
        padding: "0.375rem 0.75rem",
        fontSize: "0.6875rem",
        color: "#666",
        textTransform: "uppercase" as const,
        flexShrink: 0,
    },
    submenuScroll: {
        maxHeight: `${SUBMENU_MAX_HEIGHT}px`,
        overflowY: "auto" as const,
        display: "flex",
        flexDirection: "column" as const,
    },
    emptyHint: {
        padding: "0.5rem 0.75rem",
        fontSize: "0.75rem",
        color: "#666",
    },
};

export default AssetContextMenu;