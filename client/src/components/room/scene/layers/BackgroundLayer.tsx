import { useEffect, useState } from "react";
import { Image as KonvaImage, Layer, Rect } from "react-konva";

import { DEFAULT_SCENE_BACKGROUND_COLOR } from "@gm-table/shared";

interface BackgroundLayerProps
{
    imageUrl: string | null;
    width: number;
    height: number;
}

/**
 * Слой фона сцены.
 * Если есть картинка — рендерит её. Если нет — однотонный фон.
 */
function BackgroundLayer({
    imageUrl,
    width,
    height,
}: BackgroundLayerProps): React.JSX.Element
{
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() =>
    {
        if (!imageUrl)
        {
            setImage(null);

            return;
        }

        const img = new Image();

        img.crossOrigin = "anonymous";

        img.onload = () => setImage(img);
        img.onerror = () => setImage(null);

        img.src = imageUrl;
    }, [imageUrl]);

    return (
        <Layer>
            <Rect
                x={0}
                y={0}
                width={width}
                height={height}
                fill={DEFAULT_SCENE_BACKGROUND_COLOR}
            />

            {image && (
                <KonvaImage
                    image={image}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                />
            )}
        </Layer>
    );
}

export default BackgroundLayer;