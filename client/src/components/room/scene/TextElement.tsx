import { Text } from "react-konva";
import type Konva from "konva";

import { useUiStore } from "@/store/ui.store.js";
import { getSocket } from "@/ws/socket.js";
import type { Drawing as DrawingType } from "@gm-table/shared";
import { DEFAULT_SCENE_WIDTH, DEFAULT_SCENE_HEIGHT } from "@gm-table/shared";


interface TextElementProps
{
    drawing: DrawingType;
    scale: number;
    isOwn: boolean;
    isEraser: boolean;
    isGm: boolean;
    myUserId: string | null;
    onContextMenu: (drawing: DrawingType, x: number, y: number) => void;
}

const SCENE_W = DEFAULT_SCENE_WIDTH;
const SCENE_H = DEFAULT_SCENE_HEIGHT;

/**
 * Один текстовый элемент на сцене.
 */
function TextElement({
    drawing,
    scale,
    isOwn,
    isEraser,
    isGm,
    myUserId,
    onContextMenu,
}: TextElementProps): React.JSX.Element | null
{
    const textFontSize = useUiStore((s) => s.textFontSize);
    const activeTool = useUiStore((s) => s.activeTool);

    if (drawing.data.type !== "text")
    {
        return null;
    }

    const { x, y, text, fontSize } = drawing.data;

    // Прозрачность: свой — 100%, чужой — 60%
    const opacity = isOwn ? 1 : 0.6;

    const screenX = (x / 100) * (SCENE_W * scale);
    const screenY = (y / 100) * (SCENE_H * scale);

    const canEdit = isGm || (myUserId !== null && drawing.authorId === myUserId);

    const handleClick = (): void =>
    {
        if (!isEraser)
        {
            return;
        }

        if (!canEdit)
        {
            return;
        }

        const socket = getSocket();

        socket.emit("drawing:delete", { drawingId: drawing.id });
    };

    const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>): void =>
    {
        e.evt.preventDefault();
        e.cancelBubble = true;

        // Если активен инструмент — сбрасываем (не открываем меню)
        if (activeTool !== null)
        {
            return;
        }

        if (!canEdit)
        {
            return;
        }

        onContextMenu(drawing, e.evt.clientX, e.evt.clientY);
    };

    return (
        <Text
            x={screenX}
            y={screenY}
            text={text}
            fontSize={fontSize * scale}
            fill={drawing.color}
            opacity={opacity}
            fontFamily="system-ui, sans-serif"
            fontStyle="bold"
            listening={isEraser || canEdit}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            hitStrokeWidth={20}
        />
    );
}

export default TextElement;