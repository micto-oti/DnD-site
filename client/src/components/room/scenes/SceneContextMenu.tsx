import { useEffect, useLayoutEffect, useRef, useState } from "react";

import ConfirmModal from "@/components/common/ConfirmModal.js";
import { deleteScene } from "@/api/scenes.js";
import { useSceneStore } from "@/store/scene.store.js";
import type { Scene } from "@gm-table/shared";

interface SceneContextMenuProps
{
    scene: Scene;
    position: { x: number; y: number };
    onClose: () => void;
    onEdit: () => void;
}

const MENU_WIDTH = 180;

function SceneContextMenu({
    scene,
    position,
    onClose,
    onEdit,
}: SceneContextMenuProps): React.JSX.Element
{
    const removeScene = useSceneStore((s) => s.removeScene);

    const menuRef = useRef<HTMLDivElement>(null);
    const [finalPos, setFinalPos] = useState({ x: position.x, y: position.y });
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

    const handleDeleteClick = (): void => setConfirmDelete(true);

    const handleDeleteConfirm = async (): Promise<void> =>
    {
        try
        {
            await deleteScene(scene.id);
            removeScene(scene.id);
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
                <button onClick={() => { onEdit(); onClose(); }} style={styles.item}>
                    Редактировать
                </button>
                <button onClick={handleDeleteClick} style={styles.itemDanger}>
                    Удалить
                </button>
            </div>

            <ConfirmModal
                open={confirmDelete}
                title={`Удалить сцену "${scene.name}"?`}
                message="Это действие нельзя отменить. Все токены на этой сцене останутся, но сама сцена будет удалена."
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
};

export default SceneContextMenu;