import { useUiStore, type ToolCategory, type ActiveTool } from "@/store/ui.store.js";

import ColorPicker from "./ColorPicker.js";

interface ToolSettingsProps
{
    category: ToolCategory;
    onClose: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

/**
 * Меню настроек активного инструмента.
 */
function ToolSettings({ 
    category,
    onMouseEnter,
    onMouseLeave,
}: ToolSettingsProps): React.JSX.Element | null
{
    const activeTool = useUiStore((s) => s.activeTool);
    const color = useUiStore((s) => s.color);
    const strokeWidth = useUiStore((s) => s.strokeWidth);
    const isTemporary = useUiStore((s) => s.isTemporary);
    const textFontSize = useUiStore((s) => s.textFontSize);

    const setActiveTool = useUiStore((s) => s.setActiveTool);
    const setColor = useUiStore((s) => s.setColor);
    const setStrokeWidth = useUiStore((s) => s.setStrokeWidth);
    const setIsTemporary = useUiStore((s) => s.setIsTemporary);
    const setTextFontSize = useUiStore((s) => s.setTextFontSize);

    if (category === "eraser")
    {
        return null;
    }

    const applyTool = (tool: ActiveTool, cat: ToolCategory): void =>
    {
        setActiveTool(tool, cat);
    };

    return (
        <div 
            style={styles.menu}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            {/* Выбор инструмента внутри категории */}
            {category === "line" && (
                <div style={styles.row}>
                    <button
                        onClick={() => applyTool("arrow", "line")}
                        style={{
                            ...styles.toolButton,
                            ...(activeTool === "arrow" ? styles.toolButtonActive : {}),
                        }}
                    >
                        Стрелка
                    </button>
                    <button
                        onClick={() => applyTool("line", "line")}
                        style={{
                            ...styles.toolButton,
                            ...(activeTool === "line" ? styles.toolButtonActive : {}),
                        }}
                    >
                        Линия
                    </button>
                </div>
            )}

            {category === "shape" && (
                <div style={styles.row}>
                    <button
                        onClick={() => applyTool("circle", "shape")}
                        style={{
                            ...styles.toolButton,
                            ...(activeTool === "circle" ? styles.toolButtonActive : {}),
                        }}
                    >
                        ○
                    </button>
                    <button
                        onClick={() => applyTool("rect", "shape")}
                        style={{
                            ...styles.toolButton,
                            ...(activeTool === "rect" ? styles.toolButtonActive : {}),
                        }}
                    >
                        □
                    </button>
                    <button
                        onClick={() => applyTool("triangle", "shape")}
                        style={{
                            ...styles.toolButton,
                            ...(activeTool === "triangle" ? styles.toolButtonActive : {}),
                        }}
                    >
                        △
                    </button>
                </div>
            )}

            {/* Временный */}
            <label style={styles.checkbox}>
                <input
                    type="checkbox"
                    checked={isTemporary}
                    onChange={(e) => setIsTemporary(e.target.checked)}
                />
                Временный
            </label>

            {/* Цвет */}
            <ColorPicker value={color} onChange={setColor} />

            {/* Толщина / размер */}
            {(category === "draw" || category === "line" || category === "shape") && (
                <label style={styles.slider}>
                    Толщина: {strokeWidth}
                    <input
                        type="range"
                        min={1}
                        max={12}
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    />
                </label>
            )}

            {category === "text" && (
                <label style={styles.slider}>
                    Размер: {textFontSize}
                    <input
                        type="range"
                        min={10}
                        max={48}
                        value={textFontSize}
                        onChange={(e) => setTextFontSize(Number(e.target.value))}
                    />
                </label>
            )}
        </div>
    );
}

const styles = {
    menu: {
        position: "absolute" as const,
        left: "calc(100% + 0.5rem)",
        top: 0,
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.5rem",
        padding: "0.75rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        minWidth: "200px",
        zIndex: 200,
    },
    row: {
        display: "flex",
        gap: "0.25rem",
    },
    toolButton: {
        padding: "0.375rem 0.5rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        fontSize: "0.75rem",
        color: "#e8e8e8",
        cursor: "pointer",
        flex: 1,
    },
    toolButtonActive: {
        background: "#3a7bd5",
        borderColor: "#3a7bd5",
        color: "#fff",
    },
    checkbox: {
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        fontSize: "0.75rem",
        color: "#e8e8e8",
        cursor: "pointer",
    },
    slider: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.25rem",
        fontSize: "0.75rem",
        color: "#aaa",
    },
};

export default ToolSettings;