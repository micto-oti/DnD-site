import { create } from "zustand";

import type { Marker } from "@gm-table/shared";

interface MarkerStore
{
    markers: Marker[];

    setMarkers: (markers: Marker[]) => void;
    addMarker: (marker: Marker) => void;
    removeMarker: (markerId: string) => void;

    reset: () => void;
}

const initialState = {
    markers: [] as Marker[],
};

export const useMarkerStore = create<MarkerStore>((set) => ({
    ...initialState,

    setMarkers: (markers) => set({ markers }),

    addMarker: (marker) =>
        set((s) =>
        {
            if (s.markers.some((m) => m.id === marker.id))
            {
                return s;
            }

            return { markers: [...s.markers, marker] };
        }),

    removeMarker: (markerId) =>
        set((s) => ({
            markers: s.markers.filter((m) => m.id !== markerId),
        })),

    reset: () => set(initialState),
}));