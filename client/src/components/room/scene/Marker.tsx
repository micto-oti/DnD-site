import { useEffect, useRef } from "react";
import { Group, Circle } from "react-konva";
import Konva from "konva";

import type { Marker as MarkerType } from "@gm-table/shared";
import { DEFAULT_SCENE_WIDTH, DEFAULT_SCENE_HEIGHT } from "@gm-table/shared";

interface MarkerProps
{
    marker: MarkerType;
    scale: number;
}

const SCENE_W = DEFAULT_SCENE_WIDTH;
const SCENE_H = DEFAULT_SCENE_HEIGHT;

/**
 * Пинг — цветной кружок с пульсацией.
 * Пульсация делается CSS-анимацией через Konva.Animation.
 */
function Marker({ marker, scale }: MarkerProps): React.JSX.Element
{
    const haloRef = useRef<Konva.Circle>(null);

    const x = (marker.x / 100) * (SCENE_W * scale);
    const y = (marker.y / 100) * (SCENE_H * scale);

    const baseRadius = Math.max(10, 14 * scale);
    const haloMaxRadius = baseRadius * 2.5;

    useEffect(() =>
    {
        const halo = haloRef.current;

        if (!halo)
        {
            return;
        }

        const startTime = Date.now();
        const cycleDuration = 1500; // 1.5 сек на цикл

        const anim = new Konva.Animation(() =>
        {
            const elapsed = Date.now() - startTime;
            const progress = (elapsed % cycleDuration) / cycleDuration;

            // progress от 0 до 1
            const radius = baseRadius + (haloMaxRadius - baseRadius) * progress;
            const opacity = 0.5 * (1 - progress);

            halo.radius(radius);
            halo.opacity(opacity);
        });

        anim.start();

        return () =>
        {
            anim.stop();
        };
    }, [baseRadius, haloMaxRadius]);

    return (
        <Group x={x} y={y} listening={false}>
            {/* Внешний пульсирующий ореол */}
            <Circle
                ref={haloRef}
                radius={baseRadius}
                fill={marker.color}
                opacity={0.5}
            />

            {/* Основной кружок */}
            <Circle
                radius={baseRadius}
                fill={marker.color}
                opacity={0.9}
            />

            {/* Центральный блик */}
            <Circle
                radius={baseRadius * 0.4}
                fill="#ffffff"
                opacity={0.95}
            />
        </Group>
    );
}

export default Marker;