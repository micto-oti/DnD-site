import { Layer } from "react-konva";

import { useDrawingStore } from "@/store/drawing.store.js";
import { useUiStore } from "@/store/ui.store.js";
import type { Drawing } from "@gm-table/shared";

import TextElement from "../TextElement.js";

interface TextLayerProps
{
    scale: number;
    myUserId: string | null;
    isGm: boolean;
    onTextContextMenu: (drawing: Drawing, x: number, y: number) => void;
}

function TextLayer({
    scale,
    myUserId,
    isGm,
    onTextContextMenu,
}: TextLayerProps): React.JSX.Element
{
    const drawings = useDrawingStore((s) => s.drawings);
    const activeTool = useUiStore((s) => s.activeTool);

    const isEraser = activeTool === "eraser";

    const texts = drawings.filter((d) => d.data.type === "text");

    return (
        <Layer>
            {texts.map((drawing) => (
                <TextElement
                    key={drawing.id}
                    drawing={drawing}
                    scale={scale}
                    isOwn={myUserId !== null && drawing.authorId === myUserId}
                    isEraser={isEraser}
                    isGm={isGm}
                    myUserId={myUserId}
                    onContextMenu={onTextContextMenu}
                />
            ))}
        </Layer>
    );
}

export default TextLayer;