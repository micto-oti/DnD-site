import { useEffect, useLayoutEffect, useRef, useState } from "react";

import ConfirmModal from "@/components/common/ConfirmModal.js";
import { deleteFolder, updateFolder } from "@/api/assets.js";
import { useAssetStore } from "@/store/asset.store.js";
import type { AssetFolder } from "@gm-table/shared";

interface FolderContextMenuProps
{
    folder: AssetFolder;
    position: { x: number; y: number };
    onClose: () => void;
}

const MENU_WIDTH = 180;

function FolderContextMenu({
    folder,
    position,
    onClose,
}: FolderContextMenuProps): React.JSX.Element
{
    const updateFolderInStore = useAssetStore((s) => s.updateFolder);
    const removeFolder = useAssetStore((s) => s.removeFolder);

    const menuRef = useRef<HTMLDivElement>(null);
    const [finalPos, setFinalPos] = useState({ x: position.x, y: position.y });

    const [renaming, setRenaming] = useState(false);
    const [newName, setNewName] = useState(folder.name);

    const [confirmDelete, setConfirmDelete] = useState(false);

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

        if (x + rect.width > window.innerWidth)
        {
            x = window.innerWidth - rect.width - 8;
        }

        if (y + rect.height > window.innerHeight)
        {
            y = window.innerHeight - rect.height - 8;
        }

        if (y < 8) y = 8;
        if (x < 8) x = 8;

        setFinalPos({ x, y });
    }, [position.x, position.y]);

    useEffect(() =>
    {
        const handler = (e: MouseEvent): void =>
        {
            // Не закрываем меню, если открыта модалка подтверждения
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

    const handleRenameSubmit = async (): Promise<void> =>
    {
        const trimmed = newName.trim();

        if (!trimmed || trimmed === folder.name)
        {
            setRenaming(false);
            setNewName(folder.name);

            return;
        }

        try
        {
            const updated = await updateFolder(folder.id, { name: trimmed });

            updateFolderInStore(updated);
        }
        catch
        {
            // ignore
        }
        finally
        {
            setRenaming(false);
            onClose();
        }
    };

    const handleDeleteClick = (): void => setConfirmDelete(true);

    const handleDeleteConfirm = async (): Promise<void> =>
    {
        try
        {
            await deleteFolder(folder.id);
            removeFolder(folder.id);
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

    return (
        <>
            <div
                ref={menuRef}
                style={{
                    ...styles.menu,
                    left: finalPos.x,
                    top: finalPos.y,
                    width: `${MENU_WIDTH}px`,
                }}
            >
                {renaming ? (
                    <input
                        type="text"
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={() => void handleRenameSubmit()}
                        onKeyDown={(e) =>
                        {
                            if (e.key === "Enter")
                            {
                                void handleRenameSubmit();
                            }
                            if (e.key === "Escape")
                            {
                                setRenaming(false);
                                setNewName(folder.name);
                                onClose();
                            }
                        }}
                        maxLength={50}
                        style={styles.renameInput}
                    />
                ) : (
                    <>
                        <button
                            onClick={() => setRenaming(true)}
                            style={styles.item}
                        >
                            Переименовать
                        </button>

                        {!folder.isDefault && (
                            <button onClick={handleDeleteClick} style={styles.itemDanger}>
                                Удалить
                            </button>
                        )}
                    </>
                )}
            </div>

            <ConfirmModal
                open={confirmDelete}
                title={`Удалить папку "${folder.name}"?`}
                message="Все ассеты из этой папки будут перемещены в «Общее». Это действие нельзя отменить."
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
        border: "none",
        background: "transparent",
    },
    itemDanger: {
        display: "block",
        width: "100%",
        padding: "0.5rem 0.75rem",
        textAlign: "left" as const,
        fontSize: "0.8125rem",
        color: "#e74c3c",
        borderRadius: "4px",
        cursor: "pointer",
        border: "none",
        background: "transparent",
    },
    renameInput: {
        padding: "0.5rem 0.75rem",
        background: "#1a1a1d",
        border: "1px solid #3a7bd5",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        width: "100%",
        boxSizing: "border-box" as const,
    },
};

export default FolderContextMenu;