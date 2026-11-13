import { useMemo, useState } from "react";

import { useAssetStore } from "@/store/asset.store.js";
import type { Asset } from "@gm-table/shared";

import AssetFolders from "./AssetFolders.js";
import AssetGrid from "./AssetGrid.js";
import AssetModal from "./AssetModal.js";

interface AssetPanelProps
{
    roomId: string;
}

function AssetPanel({ roomId }: AssetPanelProps): React.JSX.Element
{
    const folders = useAssetStore((s) => s.folders);
    const assets = useAssetStore((s) => s.assets);

    const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    const defaultFolder = useMemo(
        () => folders.find((f) => f.isDefault) ?? null,
        [folders],
    );

    const effectiveFolderId = activeFolderId ?? defaultFolder?.id ?? null;

    const visibleAssets = useMemo(
        () => assets.filter((a) => a.folderId === effectiveFolderId),
        [assets, effectiveFolderId],
    );

    const handleCreate = (): void =>
    {
        setEditingAsset(null);
        setModalOpen(true);
    };

    const handleEdit = (asset: Asset): void =>
    {
        setEditingAsset(asset);
        setModalOpen(true);
    };

    const handleClose = (): void =>
    {
        setModalOpen(false);
        setEditingAsset(null);
    };

    return (
        <div style={styles.panel}>
            <AssetFolders
                folders={folders}
                activeFolderId={effectiveFolderId}
                onSelect={setActiveFolderId}
                roomId={roomId}
            />

            <div style={styles.gridWrapper}>
                <AssetGrid assets={visibleAssets} onEdit={handleEdit} />

                <button
                    onClick={handleCreate}
                    style={styles.fab}
                    title="Создать ассет"
                >
                    +
                </button>
            </div>

            <AssetModal
                open={modalOpen}
                onClose={handleClose}
                roomId={roomId}
                folderId={effectiveFolderId}
                asset={editingAsset}
            />
        </div>
    );
}

const styles = {
    panel: {
        display: "flex",
        flexDirection: "column" as const,
        height: "160px",
        borderTop: "1px solid #2a2a2e",
        background: "#1a1a1d",
        flexShrink: 0,
    },
    gridWrapper: {
        flex: 1,
        position: "relative" as const,
        overflow: "hidden" as const,
    },
    fab: {
        position: "absolute" as const,
        right: "1rem",
        bottom: "1rem",
        width: "40px",
        height: "40px",
        borderRadius: "50%",
        background: "#3a7bd5",
        color: "#fff",
        fontSize: "1.5rem",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
        cursor: "pointer",
        border: "none",
        opacity: 0.85,
        transition: "opacity 0.15s",
    },
};

export default AssetPanel;