import { useEffect, useState } from "react";
import { Circle, Group, Image as KonvaImage, Text } from "react-konva";

import { BASE_TOKEN_SIZE_PX, DEFAULT_SCENE_WIDTH, DEFAULT_SCENE_HEIGHT } from "@gm-table/shared";
import type { Token as TokenType } from "@gm-table/shared";
import { useUiStore } from "@/store/ui.store.js";


import HpBar from "./HpBar.js";
import SpBar from "./SpBar.js";

const API_URL = import.meta.env.VITE_API_URL;

interface TokenProps
{
    token: TokenType;
    scale: number;
    isOwn: boolean;
    isGm: boolean;
    onHover: (tokenId: string | null) => void;
    onMove: (tokenId: string, xPercent: number, yPercent: number) => void;
    onContextMenu: (tokenId: string, x: number, y: number) => void;
}

/**
 * Один токен на сцене.
 * Слоистая структура: цветной кружок + аватар (если есть).
 * Сверху — имя, снизу — HP/SP бары.
 */
function Token({
    token,
    scale,
    isOwn,
    isGm,
    onHover,
    onMove,
    onContextMenu,
}: TokenProps): React.JSX.Element | null
{
    const [avatarImage, setAvatarImage] = useState<HTMLImageElement | null>(null);

    // Токен игрока, который оффлайн — не показываем
    if (token.ownerId && !token.isOnline && !isGm)
    {
        return null;
    }

    // Загружаем аватар
    useEffect(() =>
    {
        if (!token.imageUrl)
        {
            setAvatarImage(null);

            return;
        }

        const img = new Image();

        img.crossOrigin = "anonymous";

        img.onload = () => setAvatarImage(img);
        img.onerror = () => setAvatarImage(null);

        img.src = `${API_URL}${token.imageUrl}`;
    }, [token.imageUrl]);

    // Размеры в пикселях
    const radius = (BASE_TOKEN_SIZE_PX * token.size * scale) / 2;
    const x = (token.x / 100) * (DEFAULT_SCENE_WIDTH * scale);
    const y = (token.y / 100) * (DEFAULT_SCENE_HEIGHT * scale);

    // Прозрачность: свой токен — 100%, чужой — 60%, GM-видит всё
    const opacity = isOwn || isGm ? 1 : 0.6;

    // Размер шрифта имени — адаптивный (пропорционален размеру токена)
    const nameFontSize = Math.max(10, radius * 0.4);
    const nameOffsetY = -radius - nameFontSize - 4;

    // Обводка для аватара
    const innerRadius = radius - 3 * scale;
    const activeTool = useUiStore((s) => s.activeTool);
    const canDrag = (isOwn || isGm) && activeTool === null;
    

    return (
        <Group
            x={x}
            y={y}
            opacity={opacity}
            draggable={canDrag}
            dragBoundFunc={(pos) =>
            {
                // pos — координаты в АБСОЛЮТНЫХ пикселях Stage
                const scaledW = DEFAULT_SCENE_WIDTH * scale;
                const scaledH = DEFAULT_SCENE_HEIGHT * scale;

                return {
                    x: Math.max(0, Math.min(scaledW, pos.x)),
                    y: Math.max(0, Math.min(scaledH, pos.y)),
                };
            }}

            onMouseEnter={() => onHover(token.id)}
            onMouseLeave={() => onHover(null)}
            onContextMenu={(e) =>
            {
                e.evt.preventDefault();

                // Если активен инструмент — не открываем меню токена
                if (activeTool !== null)
                {
                    return;
                }

                e.cancelBubble = true;   // остановить всплытие на Stage

                onContextMenu(token.id, e.evt.clientX, e.evt.clientY);
            }}
            
            onDragStart={() =>
            {
                // Курсор "grabbing" во время перетаскивания
                if (typeof document !== "undefined")
                {
                    document.body.style.cursor = "grabbing";
                }
            }}
            
            onDragEnd={(e) =>
            {
                if (typeof document !== "undefined")
                {
                    document.body.style.cursor = "default";
                }

                const node = e.target;
                const newX = node.x();
                const newY = node.y();

                // Конвертируем пиксели обратно в проценты
                const xPercent = (newX / (DEFAULT_SCENE_WIDTH * scale)) * 100;
                const yPercent = (newY / (DEFAULT_SCENE_HEIGHT * scale)) * 100;

                const clampedX = Math.max(0, Math.min(100, xPercent));
                const clampedY = Math.max(0, Math.min(100, yPercent));

                // Если clamp изменил позицию — вернуть Konva-узел на место
                if (clampedX !== xPercent || clampedY !== yPercent)
                {
                    node.position({
                        x: (clampedX / 100) * (DEFAULT_SCENE_WIDTH * scale),
                        y: (clampedY / 100) * (DEFAULT_SCENE_HEIGHT * scale),
                    });
                }

                onMove(token.id, clampedX, clampedY);
            }}
        >
            {/* Цветной кружок */}
            <Circle radius={radius} fill={token.color} />

            {/* Аватар с белой обводкой */}
            {avatarImage && (
                <>
                    <Circle radius={innerRadius + 2 * scale} fill="white" />
                    <Group
                        clipFunc={(ctx) =>
                        {
                            ctx.beginPath();
                            ctx.arc(0, 0, innerRadius, 0, Math.PI * 2, false);
                            ctx.closePath();
                        }}
                    >
                        <KonvaImage
                            image={avatarImage}
                            x={-innerRadius}
                            y={-innerRadius}
                            width={innerRadius * 2}
                            height={innerRadius * 2}
                        />
                    </Group>
                </>
            )}

            {/* Имя над токеном */}
            <Text
                text={token.name}
                fontSize={nameFontSize}
                fontFamily="system-ui, sans-serif"
                fill="#e8e8e8"
                y={nameOffsetY}
                width={radius * 4}
                x={-radius * 2}
                align="center"
                listening={false}
            />

            {/* HP бар */}
            {token.hpCurrent !== null && token.hpMax !== null && (
                <HpBar
                    current={token.hpCurrent}
                    max={token.hpMax}
                    radius={radius}
                    scale={scale}
                    yOffset={radius + 4 * scale}
                />
            )}

            {/* SP бар */}
            {token.spCurrent !== null && token.spMax !== null && (
                <SpBar
                    current={token.spCurrent}
                    max={token.spMax}
                    radius={radius}
                    scale={scale}
                    yOffset={radius + (token.hpCurrent !== null ? 12 * scale : 4 * scale)}
                />
            )}
        </Group>
    );
}

export default Token;