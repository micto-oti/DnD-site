import { Layer } from "react-konva";

import type { DrawingData } from "@gm-table/shared";

import DrawingPreview from "../DrawingPreview.js";

interface PreviewLayerProps
{
    data: DrawingData | null;
    scale: number;
}

function PreviewLayer({ data, scale }: PreviewLayerProps): React.JSX.Element
{
    return (
        <Layer listening={false}>
            {data && <DrawingPreview data={data} scale={scale} />}
        </Layer>
    );
}

export default PreviewLayer;