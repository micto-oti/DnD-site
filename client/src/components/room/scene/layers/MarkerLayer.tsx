import { Layer } from "react-konva";

import { useMarkerStore } from "@/store/marker.store.js";

import Marker from "../Marker.js";

interface MarkerLayerProps
{
    scale: number;
}

function MarkerLayer({ scale }: MarkerLayerProps): React.JSX.Element
{
    const markers = useMarkerStore((s) => s.markers);

    return (
        <Layer listening={false}>
            {markers.map((marker) => (
                <Marker key={marker.id} marker={marker} scale={scale} />
            ))}
        </Layer>
    );
}

export default MarkerLayer;