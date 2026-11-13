import type { Asset } from "@gm-table/shared";

import AssetItem from "./AssetItem.js";

interface AssetGridProps
{
    assets: Asset[];
    onEdit: (asset: Asset) => void;
}

function AssetGrid({ assets, onEdit }: AssetGridProps): React.JSX.Element
{
    if (assets.length === 0)
    {
        return (
            <div style={styles.empty}>
                Нет ассетов. Нажмите «+» чтобы создать.
            </div>
        );
    }

    return (
        <div style={styles.grid}>
            {assets.map((asset) => (
                <AssetItem key={asset.id} asset={asset} onEdit={onEdit} />
            ))}
        </div>
    );
}

const styles = {
    grid: {
        display: "flex",
        gap: "0.5rem",
        padding: "0.5rem 4rem 0.5rem 0.5rem",
        height: "100%",
        overflowX: "auto" as const,
        alignItems: "center",
    },
    empty: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#666",
        fontSize: "0.875rem",
    },
};

export default AssetGrid;