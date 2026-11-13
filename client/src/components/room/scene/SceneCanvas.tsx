import { useEffect, useRef, useState } from "react";
import { Layer, Stage } from "react-konva";

import {
    BASE_TOKEN_SIZE_PX,
    DEFAULT_SCENE_HEIGHT,
    DEFAULT_SCENE_WIDTH,
} from "@gm-table/shared";
import type { Token as TokenType } from "@gm-table/shared";
import type Konva from "konva";

import BackgroundLayer from "./layers/BackgroundLayer.js";
import TokenLayer from "./layers/TokenLayer.js";
import Toolbar from "@/components/room/toolbar/Toolbar.js";
import DrawingLayer from "./layers/DrawingLayer.js";
import PreviewLayer from "./layers/PreviewLayer.js";
import { useDrawing } from "@/hooks/useDrawing.js";
import TextLayer from "./layers/TextLayer.js";
import MarkerLayer from "./layers/MarkerLayer.js";
import { useMarkerStore } from "@/store/marker.store.js";
import { getSocket } from "@/ws/socket.js";
import { useUiStore } from "@/store/ui.store.js";
import type { Drawing } from "@gm-table/shared";

const API_URL = import.meta.env.VITE_API_URL;

interface SceneCanvasProps
{
    roomId: string;
    backgroundUrl: string | null;
    tokens: TokenType[];
    myUserId: string | null;
    isGm: boolean;
    pingColor: string;
    onTokenHover: (tokenId: string | null) => void;
    onTokenMove: (tokenId: string, xPercent: number, yPercent: number) => void;
    onAssetDrop: (assetId: string, xPercent: number, yPercent: number) => void;
    onTokenContextMenu: (tokenId: string, x: number, y: number) => void;
    onTextContextMenu: (drawing: Drawing, x: number, y: number) => void;
}

function SceneCanvas({
    roomId,
    backgroundUrl,
    tokens,
    myUserId,
    isGm,
    pingColor,
    onTokenHover,
    onTokenMove,
    onAssetDrop,
    onTokenContextMenu,
    onTextContextMenu,
}: SceneCanvasProps): React.JSX.Element
{
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const activeTool = useUiStore((s) => s.activeTool);

    useEffect(() =>
    {
        const container = containerRef.current;

        if (!container)
        {
            return;
        }

        if (activeTool === null)
        {
            container.style.cursor = "default";
        }
        else if (activeTool === "eraser")
        {
            container.style.cursor = "pointer";
        }
        else
        {
            container.style.cursor = "crosshair";
        }

        const observer = new ResizeObserver((entries) =>
        {
            const entry = entries[0];

            if (!entry)
            {
                return;
            }

            setContainerSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            });
        });

        observer.observe(container);

        return () => observer.disconnect();
    }, [activeTool]);

    const scale = Math.min(
        containerSize.width / DEFAULT_SCENE_WIDTH,
        containerSize.height / DEFAULT_SCENE_HEIGHT,
    );

    const scaledWidth = DEFAULT_SCENE_WIDTH * scale;
    const scaledHeight = DEFAULT_SCENE_HEIGHT * scale;

    const {
        previewData,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleContextMenu,
        handleStageClick,
    } = useDrawing(roomId, scale);

    const offsetX = (containerSize.width - scaledWidth) / 2;
    const offsetY = (containerSize.height - scaledHeight) / 2;

    const imageUrl = backgroundUrl ? `${API_URL}${backgroundUrl}` : null;

    const handleStageDblClick = (e: Konva.KonvaEventObject<MouseEvent>): void =>
    {
        // Если активен инструмент — игнорируем (рисование)
        // Но у нас `dblclick` не пересекается с рисованием (драг), проверять не обязательно

        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();

        if (!pointer)
        {
            return;
        }
        
        // Проверяем, попали ли в токен
        const clickedToken = findTokenAtPoint(
            pointer.x,
            pointer.y,
            tokens,
            scale,
        );

        let xPercent: number;
        let yPercent: number;

        if (clickedToken)
        {
            // Пинг в центре токена
            xPercent = clickedToken.x;
            yPercent = clickedToken.y;
        }
        else
        {
            // Пинг в точке клика
            xPercent = (pointer.x / scaledWidth) * 100;
            yPercent = (pointer.y / scaledHeight) * 100;
        }

        const socket = getSocket();

        socket.emit("marker:create", {
            roomId,
            x: Math.max(0, Math.min(100, xPercent)),
            y: Math.max(0, Math.min(100, yPercent)),
            color: pingColor,
            isTemporary: true,
        });
    };

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
                background: "#83898b",
            }}
            onDragOver={(e) =>
            {
                if (e.dataTransfer.types.includes("application/x-asset-id"))
                {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "copy";
                }
            }}
            onDrop={(e) =>
            {
                const assetId = e.dataTransfer.getData("application/x-asset-id");

                if (!assetId)
                {
                    return;
                }

                e.preventDefault();

                const rect = e.currentTarget.getBoundingClientRect();

                // Локальные координаты внутри контейнера
                const localX = e.clientX - rect.left;
                const localY = e.clientY - rect.top;

                // Вычитаем letterbox — получаем координаты внутри Stage
                const stageX = localX - offsetX;
                const stageY = localY - offsetY;

                // Конвертируем в проценты от scaled размеров
                const xPercent = (stageX / scaledWidth) * 100;
                const yPercent = (stageY / scaledHeight) * 100;

                onAssetDrop(
                    assetId,
                    Math.max(0, Math.min(100, xPercent)),
                    Math.max(0, Math.min(100, yPercent)),
                );
            }}
        >
            {containerSize.width > 0 && containerSize.height > 0 && (
                <Stage
                    width={scaledWidth}
                    height={scaledHeight}
                    style={{
                        position: "absolute",
                        left: offsetX,
                        top: offsetY,
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onClick={handleStageClick}
                    onDblClick={handleStageDblClick}
                    onContextMenu={handleContextMenu}
                >
                    <BackgroundLayer
                        imageUrl={imageUrl}
                        width={scaledWidth}
                        height={scaledHeight}
                    />
                    <DrawingLayer 
                        scale={scale} 
                        myUserId={myUserId} 
                        isGm={isGm} 
                    />
                    <TextLayer 
                        scale={scale} 
                        myUserId={myUserId} 
                        isGm={isGm} 
                        onTextContextMenu={onTextContextMenu}
                    />
                    <PreviewLayer 
                        data={previewData} 
                        scale={scale} 
                    />
                    <TokenLayer
                        tokens={tokens}
                        scale={scale}
                        myUserId={myUserId}
                        isGm={isGm}
                        onHover={onTokenHover}
                        onMove={onTokenMove}
                        onContextMenu={onTokenContextMenu}
                    />
                    <MarkerLayer scale={scale} />
                    <Layer />
                    <Layer />
                </Stage>
            )}
            <Toolbar roomId={roomId} isGm={isGm} myUserId={myUserId} />
        </div>
    );
}

/**
 * Найти токен, в который попал клик.
 * Возвращает токен или null.
 */
function findTokenAtPoint(
    x: number,
    y: number,
    tokens: TokenType[],
    scale: number,
): TokenType | null
{
    // Идём в обратном порядке — сверху вниз (последний отрисованный выше)
    for (let i = tokens.length - 1; i >= 0; i -= 1)
    {
        const token = tokens[i]!;

        const tokenX = (token.x / 100) * (DEFAULT_SCENE_WIDTH * scale);
        const tokenY = (token.y / 100) * (DEFAULT_SCENE_HEIGHT * scale);
        const radius = (BASE_TOKEN_SIZE_PX * token.size * scale) / 2;

        const dist = Math.hypot(x - tokenX, y - tokenY);

        if (dist <= radius)
        {
            return token;
        }
    }

    return null;
}

export default SceneCanvas;