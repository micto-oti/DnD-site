import { create } from "zustand";

import type { Asset, AssetFolder } from "@gm-table/shared";

interface AssetStore
{
    folders: AssetFolder[];
    assets: Asset[];

    setFolders: (folders: AssetFolder[]) => void;
    setAssets: (assets: Asset[]) => void;

    addFolder: (folder: AssetFolder) => void;
    updateFolder: (folder: AssetFolder) => void;
    removeFolder: (folderId: string) => void;

    addAsset: (asset: Asset) => void;
    updateAsset: (asset: Asset) => void;
    removeAsset: (assetId: string) => void;

    reset: () => void;
}

const initialState = {
    folders: [] as AssetFolder[],
    assets: [] as Asset[],
};

export const useAssetStore = create<AssetStore>((set) => ({
    ...initialState,

    setFolders: (folders) => set({ folders }),
    setAssets: (assets) => set({ assets }),

    addFolder: (folder) =>
        set((s) =>
        {
            if (s.folders.some((f) => f.id === folder.id))
            {
                return s;
            }

            return {
                folders: [...s.folders, folder].sort(
                    (a, b) => a.orderIndex - b.orderIndex,
                ),
            };
        }),

    updateFolder: (folder) =>
        set((s) => ({
            folders: s.folders
                .map((f) => (f.id === folder.id ? folder : f))
                .sort((a, b) => a.orderIndex - b.orderIndex),
        })),

    removeFolder: (folderId) =>
        set((s) => {
            const defaultFolder = s.folders.find((f) => f.isDefault);
            return {
                folders: s.folders.filter((f) => f.id !== folderId),
                assets: s.assets.map((a) =>
                    a.folderId === folderId
                        ? { ...a, folderId: defaultFolder?.id ?? null }
                        : a,
                ),
            };
        }),

    addAsset: (asset) =>
        set((s) =>
        {
            if (s.assets.some((a) => a.id === asset.id))
            {
                return s;
            }

            return {
                assets: [...s.assets, asset].sort(
                    (a, b) => a.orderIndex - b.orderIndex,
                ),
            };
        }),

    updateAsset: (asset) =>
        set((s) => ({
            assets: s.assets
                .map((a) => (a.id === asset.id ? asset : a))
                .sort((a, b) => a.orderIndex - b.orderIndex),
        })),

    removeAsset: (assetId) =>
        set((s) => ({
            assets: s.assets.filter((a) => a.id !== assetId),
        })),

    reset: () => set(initialState),
}));