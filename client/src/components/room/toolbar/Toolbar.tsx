import { useEffect, useRef, useState } from "react";

import { useUiStore, type ToolCategory } from "@/store/ui.store.js";

import ToolButton from "./ToolButton.js";
import ToolSettings from "./ToolSettings.js";
import ClearDrawingsButton from "./ClearDrawingsButton.js";

/**
 * Вертикальная панель инструментов.
 * Полупрозрачная в покое, непрозрачная при hover.
 * Меню настроек появляется при hover на активную категорию.
 */

interface ToolbarProps
{
    roomId: string;
    isGm: boolean;
    myUserId: string | null;
}

function Toolbar({ roomId, isGm, myUserId }: ToolbarProps): React.JSX.Element
{
    const activeCategory = useUiStore((s) => s.activeCategory);
    const setActiveTool = useUiStore((s) => s.setActiveTool);
    const activeTool = useUiStore((s) => s.activeTool);
    const resetTool = useUiStore((s) => s.resetTool);

    const [isHovered, setIsHovered] = useState(false);
    const [menuOpenFor, setMenuOpenFor] = useState<ToolCategory | null>(null);

    const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Отложить закрытие меню.
     * Если пользователь вернётся в toolbar — отменим.
     */
    const scheduleClose = (): void =>
    {
        if (closeTimeoutRef.current)
        {
            clearTimeout(closeTimeoutRef.current);
        }

        closeTimeoutRef.current = setTimeout(() =>
        {
            setMenuOpenFor(null);
            closeTimeoutRef.current = null;
        }, 1000);
    };

    /**
     * Отменить закрытие (пользователь вернулся).
     */
    const cancelClose = (): void =>
    {
        if (closeTimeoutRef.current)
        {
            clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    useEffect(() =>
    {
        return () =>
        {
            if (closeTimeoutRef.current)
            {
                clearTimeout(closeTimeoutRef.current);
            }
        };
    }, []);

    const handleCategoryClick = (category: ToolCategory): void =>
    {
        cancelClose();

        // Для одиночных инструментов — сразу активируем
        if (category === "draw")
        {
            setActiveTool("freehand", "draw");

            return;
        }

        if (category === "text")
        {
            setActiveTool("text", "text");

            return;
        }

        if (category === "eraser")
        {
            setActiveTool("eraser", "eraser");

            return;
        }

        // Для line / shape — если есть активный из этой категории, оставляем
        // Иначе выбираем первый в списке
        if (category === "line")
        {
            if (activeTool !== "line" && activeTool !== "arrow")
            {
                setActiveTool("arrow", "line");
            }

            setMenuOpenFor(category);

            return;
        }

        if (category === "shape")
        {
            if (activeTool !== "circle" && activeTool !== "rect" && activeTool !== "triangle")
            {
                setActiveTool("circle", "shape");
            }

            setMenuOpenFor(category);

            return;
        }
    };

    const handleMouseEnterButton = (category: ToolCategory): void =>
    {
        cancelClose();
        setIsHovered(true);

        if (activeCategory !== null && category !== "eraser")
        {
            setMenuOpenFor(category);
        }
    };

    const handleContainerEnter = (): void =>
    {
        cancelClose();
        setIsHovered(true);
    };

    const handleContainerLeave = (): void =>
    {
        setIsHovered(false);
        scheduleClose();
    };

    const categories: { id: ToolCategory; icon: string; title: string }[] = [
        { id: "draw", icon: "✎", title: "Рисование" },
        { id: "line", icon: "→", title: "Линии" },
        { id: "shape", icon: "□", title: "Фигуры" },
        { id: "text", icon: "T", title: "Текст" },
        { id: "eraser", icon: "⌫", title: "Ластик" },
        //{ id: "clear", icon: "🗑", title: "Стереть рисунки" },
    ];

    return (
        <div
            style={styles.container}
            onMouseEnter={handleContainerEnter}
            onMouseLeave={handleContainerLeave}
        >
            {categories.map((cat) => (
                <ToolButton
                    key={cat.id}
                    icon={cat.icon}
                    title={cat.title}
                    active={activeCategory === cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    onMouseEnter={() => handleMouseEnterButton(cat.id)}
                />
            ))}
        
            {menuOpenFor && menuOpenFor !== "eraser" && (
                <ToolSettings
                    category={menuOpenFor}
                    onClose={() => setMenuOpenFor(null)}
                    onMouseEnter={cancelClose}
                    onMouseLeave={scheduleClose}
                />
            )}

            <ClearDrawingsButton roomId={roomId} isGm={isGm} myUserId={myUserId} />
        </div>
    );
}

const styles = {
    container: {
        position: "absolute" as const,
        left: "3px",
        top: "3px",
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.25rem",
        padding: "0.05rem",
        background: "rgba(26, 26, 29, 0.5)",
        borderRadius: "8px",
    },
    containerHovered: {
        background: "rgba(26, 26, 29, 0.95)",
        borderColor: "#3a3a3e",
    },
};

export default Toolbar;