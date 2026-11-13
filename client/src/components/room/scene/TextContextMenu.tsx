import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useDrawingStore } from "@/store/drawing.store.js";
import { getSocket } from "@/ws/socket.js";
import { COLOR_PALETTE } from "@gm-table/shared";
import type { Drawing, DrawingData } from "@gm-table/shared";

interface TextContextMenuProps
{
    drawing: Drawing;
    position: { x: number; y: number };
    onClose: () => void;
}

const MENU_WIDTH = 220;
const MENU_MAX_HEIGHT = 400;

/**
 * Контекстное меню для текстового элемента.
 * Редактирование: текст, цвет, размер шрифта, удалить.
 */
function TextContextMenu({
    drawing,
    position,
    onClose,
}: TextContextMenuProps): React.JSX.Element | null
{
    const updateDrawing = useDrawingStore((s) => s.updateDrawing);
    const removeDrawing = useDrawingStore((s) => s.removeDrawing);

    const menuRef = useRef<HTMLDivElement>(null);
    const [finalPos, setFinalPos] = useState({ x: position.x, y: position.y });

    const [text, setText] = useState<string>(
        drawing.data.type === "text" ? drawing.data.text : "",
    );
    const [fontSize, setFontSize] = useState<number>(
        drawing.data.type === "text" ? drawing.data.fontSize : 16,
    );
    const [color, setColor] = useState<string>(drawing.color);

    // Автопозиционирование
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

    // Закрытие по клику вне
    useEffect(() =>
    {
        const handler = (e: MouseEvent): void =>
        {
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
    }, [onClose]);

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

    if (drawing.data.type !== "text")
    {
        return null;
    }

    const textData = drawing.data;

    const handleSave = (): void =>
    {
        const newData: DrawingData = {
            type: "text",
            x: textData.x,
            y: textData.y,
            text,
            fontSize,
        };

        const socket = getSocket();

        // Оптимистично
        updateDrawing({
            ...drawing,
            color,
            data: newData,
        });

        socket.emit("drawing:update", {
            drawingId: drawing.id,
            patch: {
                data: newData,
                color,
            },
        });

        onClose();
    };

    const handleDelete = (): void =>
    {
        const socket = getSocket();

        removeDrawing(drawing.id);

        socket.emit("drawing:delete", { drawingId: drawing.id });

        onClose();
    };

    return (
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
            <div style={styles.label}>Текст</div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                style={styles.textarea}
                autoFocus
            />

            <div style={styles.label}>Цвет</div>
            <div style={styles.palette}>
                {COLOR_PALETTE.map((c) => (
                    <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{
                            ...styles.colorButton,
                            background: c,
                            ...(color === c ? styles.colorButtonActive : {}),
                        }}
                        aria-label={`Цвет ${c}`}
                    />
                ))}
            </div>

            <div style={styles.label}>
                Размер: {fontSize}
            </div>
            <input
                type="range"
                min={10}
                max={64}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={styles.slider}
            />

            <div style={styles.divider} />

            <div style={styles.actions}>
                <button onClick={handleDelete} style={styles.deleteButton}>
                    Удалить
                </button>
                <button onClick={handleSave} style={styles.saveButton}>
                    Сохранить
                </button>
            </div>
        </div>
    );
}

const styles = {
    menu: {
        position: "fixed" as const,
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "6px",
        padding: "0.75rem",
        zIndex: 2000,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.5rem",
        overflowY: "auto" as const,
    },
    label: {
        fontSize: "0.6875rem",
        color: "#888",
        textTransform: "uppercase" as const,
    },
    textarea: {
        padding: "0.5rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "0.875rem",
        fontFamily: "system-ui, sans-serif",
        resize: "vertical" as const,
        minHeight: "60px",
    },
    palette: {
        display: "flex",
        flexWrap: "wrap" as const,
        gap: "0.25rem",
    },
    colorButton: {
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        border: "2px solid transparent",
        cursor: "pointer",
        padding: 0,
    },
    colorButtonActive: {
        borderColor: "#fff",
    },
    slider: {
        width: "100%",
    },
    divider: {
        height: "1px",
        background: "#3a3a3e",
        margin: "0.25rem 0",
    },
    actions: {
        display: "flex",
        gap: "0.5rem",
        justifyContent: "space-between",
    },
    deleteButton: {
        padding: "0.5rem 1rem",
        background: "transparent",
        border: "1px solid #e74c3c",
        color: "#e74c3c",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        cursor: "pointer",
    },
    saveButton: {
        padding: "0.5rem 1rem",
        background: "#3a7bd5",
        color: "#fff",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        fontWeight: 500,
        cursor: "pointer",
        border: "none",
    },
};

export default TextContextMenu;