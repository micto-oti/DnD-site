import { useState } from "react";

import { createFolder } from "@/api/assets.js";
import { useAssetStore } from "@/store/asset.store.js";
import FolderContextMenu from "./FolderContextMenu.js";

import type { AssetFolder } from "@gm-table/shared";

interface AssetFoldersProps
{
    folders: AssetFolder[];
    activeFolderId: string | null;
    onSelect: (folderId: string) => void;
    roomId: string;
}

/**
 * Лента папок в панели ассетов.
 * Дефолтная папка «Общее» — слева, неизменяемая.
 */
function AssetFolders({
    folders,
    activeFolderId,
    onSelect,
    roomId,
}: AssetFoldersProps): React.JSX.Element
{
    const addFolder = useAssetStore((s) => s.addFolder);

    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [menu, setMenu] = useState<{
        folder: AssetFolder;
        x: number;
        y: number;
    } | null>(null);

    const sortedFolders = [...folders].sort((a, b) =>
    {
        // Дефолтная папка — первая
        if (a.isDefault && !b.isDefault) return -1;
        if (b.isDefault && !a.isDefault) return 1;

        return a.orderIndex - b.orderIndex;
    });

    const handleCreate = async (): Promise<void> =>
    {
        const name = newName.trim();

        if (!name)
        {
            setCreating(false);
            setNewName("");
            return;
        }

        try
        {
            const folder = await createFolder(roomId, { name });

            addFolder(folder);
        }
        catch
        {
            // игнорируем
        }
        finally
        {
            setCreating(false);
            setNewName("");
        }
    };

    return (
        <div style={styles.container}>
            {sortedFolders.map((folder) => (
                <button
                    key={folder.id}
                    onClick={() => onSelect(folder.id)}
                    onContextMenu={(e) =>
                    {
                        e.preventDefault();
                        setMenu({
                            folder,
                            x: e.clientX,
                            y: e.clientY,
                        });
                    }}
                    style={{
                        ...styles.tab,
                        ...(folder.id === activeFolderId ? styles.tabActive : {}),
                    }}
                >
                    {folder.name}
                </button>
            ))}

            {creating ? (
                <input
                    type="text"
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleCreate}
                    onKeyDown={(e) =>
                    {
                        if (e.key === "Enter")
                        {
                            void handleCreate();
                        }
                        if (e.key === "Escape")
                        {
                            setCreating(false);
                            setNewName("");
                        }
                    }}
                    maxLength={50}
                    style={styles.input}
                    placeholder="Название"
                />
            ) : (
                <button
                    onClick={() => setCreating(true)}
                    style={styles.addButton}
                    title="Создать папку"
                >
                    + Папка
                </button>
            )}

            {menu && (
                <FolderContextMenu
                    folder={menu.folder}
                    position={{ x: menu.x, y: menu.y }}
                    onClose={() => setMenu(null)}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.375rem 0.5rem",
        borderBottom: "1px solid #2a2a2e",
        overflowX: "auto" as const,
        flexShrink: 0,
    },
    tab: {
        padding: "0.25rem 0.75rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
    },
    tabActive: {
        background: "#3a7bd5",
        borderColor: "#3a7bd5",
        color: "#fff",
    },
    addButton: {
        padding: "0.25rem 0.75rem",
        background: "transparent",
        border: "1px dashed #3a3a3e",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#888",
        whiteSpace: "nowrap" as const,
        flexShrink: 0,
    },
    input: {
        padding: "0.25rem 0.5rem",
        background: "#0a0a0c",
        border: "1px solid #3a7bd5",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        width: "120px",
        flexShrink: 0,
    },
};

export default AssetFolders;