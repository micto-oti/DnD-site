import type { Scene } from "@gm-table/shared";

interface SceneListProps
{
    scenes: Scene[];
    activeSceneId: string | null;
    isGm: boolean;
    onActivate: (sceneId: string) => void;
    onCreateClick: () => void;
    onContextMenu?: (scene: Scene, x: number, y: number) => void;
}

function SceneList({
    scenes,
    activeSceneId,
    isGm,
    onActivate,
    onCreateClick,
    onContextMenu,
}: SceneListProps): React.JSX.Element | null
{
    if (!isGm)
    {
        return null;
    }

    return (
        <div style={styles.container}>
            <div style={styles.list}>
                {scenes.map((scene) => (
                    <button
                    key={scene.id}
                    onClick={() => onActivate(scene.id)}
                    onContextMenu={(e) =>
                    {
                        e.preventDefault();

                        if (isGm && onContextMenu)
                        {
                            onContextMenu(scene, e.clientX, e.clientY);
                        }
                    }}
                    style={{
                        ...styles.scene,
                        ...(scene.id === activeSceneId ? styles.sceneActive : {}),
                    }}
                >
                    {scene.name}
                </button>
                ))}
            </div>
            <button onClick={onCreateClick} style={styles.add}>
                +
            </button>
        </div>
    );
}

const styles = {
    container: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 1rem",
        borderBottom: "1px solid #2a2a2e",
        overflowX: "auto" as const,
    },
    list: {
        display: "flex",
        gap: "0.5rem",
        flex: 1,
    },
    scene: {
        padding: "0.375rem 0.75rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        fontSize: "0.875rem",
        color: "#e8e8e8",
        whiteSpace: "nowrap" as const,
    },
    sceneActive: {
        background: "#3a7bd5",
        borderColor: "#3a7bd5",
        color: "#fff",
    },
    add: {
        padding: "0.375rem 0.75rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        color: "#e8e8e8",
        fontSize: "1rem",
    },
};

export default SceneList;