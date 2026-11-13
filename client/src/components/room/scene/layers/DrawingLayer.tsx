import { Layer } from "react-konva";

import { useDrawingStore } from "@/store/drawing.store.js";
import { useUiStore } from "@/store/ui.store.js";
import { getSocket } from "@/ws/socket.js";
import type { Drawing as DrawingType } from "@gm-table/shared";

import Drawing from "../Drawing.js";

interface DrawingLayerProps
{
    scale: number;
    myUserId: string | null;
    isGm: boolean;
}

function DrawingLayer({
    scale,
    myUserId,
    isGm,
}: DrawingLayerProps): React.JSX.Element
{
    const drawings = useDrawingStore((s) => s.drawings);
    const activeTool = useUiStore((s) => s.activeTool);

    const isEraser = activeTool === "eraser";

    const handleDrawingClick = (drawing: DrawingType): void =>
    {
        if (!isEraser)
        {
            return;
        }

        const isOwn = myUserId !== null && drawing.authorId === myUserId;

        if (!isGm && !isOwn)
        {
            return;
        }

        const socket = getSocket();

        socket.emit("drawing:delete", { drawingId: drawing.id });
    };

    const normalDrawings = drawings.filter((d) => d.data.type !== "text");

    return (
        <Layer>
            {normalDrawings.map((drawing) => (
                <Drawing
                    key={drawing.id}
                    drawing={drawing}
                    scale={scale}
                    isOwn={myUserId !== null && drawing.authorId === myUserId}
                    listening={isEraser}
                    onClick={() => handleDrawingClick(drawing)}
                />
            ))}
        </Layer>
    );
}

export default DrawingLayer;