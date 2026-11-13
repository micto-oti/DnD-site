import { useState } from "react";

import { useAssetStore } from "@/store/asset.store.js";
import type { Asset } from "@gm-table/shared";

import AssetContextMenu from "./AssetContextMenu.js";

const API_URL = import.meta.env.VITE_API_URL;

interface AssetItemProps
{
    asset: Asset;
    onEdit: (asset: Asset) => void;
}

/**
 * Один ассет в сетке.
 * ПКМ — контекстное меню.
 * Drag-n-drop на сцену — в следующем шаге.
 */
function AssetItem({ asset, onEdit }: AssetItemProps): React.JSX.Element
{
    const folders = useAssetStore((s) => s.folders);

    const [dragging, setDragging] = useState(false);
    const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

    const handleDragStart = (e: React.DragEvent): void =>
    {
        e.dataTransfer.setData("application/x-asset-id", asset.id);
        e.dataTransfer.effectAllowed = "copy";
        setDragging(true);
    };

    const handleDragEnd = (): void =>
    {
        setDragging(false);
    };

    const handleContextMenu = (e: React.MouseEvent): void =>
    {
        e.preventDefault();
        e.stopPropagation();

        setMenu({ x: e.clientX, y: e.clientY });
    };

    return (
        <>
            <div
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onContextMenu={handleContextMenu}
                style={{
                    ...styles.item,
                    ...(dragging ? styles.itemDragging : {}),
                }}
                title={`${asset.name} (ПКМ — меню)`}
            >
                {asset.imageUrl ? (
                    <img
                        src={`${API_URL}${asset.imageUrl}`}
                        alt={asset.name}
                        style={styles.image}
                        draggable={false}
                    />
                ) : (
                    <div
                        style={{
                            ...styles.image,
                            background: asset.color,
                        }}
                    />
                )}
                <div style={styles.name}>{asset.name}</div>
            </div>

            {menu && (
                <AssetContextMenu
                    asset={asset}
                    position={menu}
                    folders={folders}
                    onClose={() => setMenu(null)}
                    onEdit={() => onEdit(asset)}
                />
            )}
        </>
    );
}

const styles = {
    item: {
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        gap: "0.25rem",
        cursor: "grab",
        padding: "0.25rem",
        borderRadius: "4px",
        flexShrink: 0,
        userSelect: "none" as const,
    },
    itemDragging: {
        opacity: 0.5,
    },
    image: {
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        objectFit: "cover" as const,
        border: "2px solid #3a3a3e",
        userSelect: "none" as const,
    },
    name: {
        fontSize: "0.6875rem",
        color: "#aaa",
        maxWidth: "72px",
        overflow: "hidden" as const,
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
        textAlign: "center" as const,
    },
};

export default AssetItem;