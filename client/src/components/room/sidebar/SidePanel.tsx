import { useState } from "react";

import MembersTab from "./MembersTab.js";
import ObjectsTab from "./ObjectsTab.js";

type Tab = "objects" | "members";

/**
 * Доп. панель справа.
 * Две вкладки: «Объекты» (токены) и «Участники».
 */
function SidePanel(): React.JSX.Element
{
    const [tab, setTab] = useState<Tab>("objects");

    return (
        <aside style={styles.panel}>
            <div style={styles.tabs}>
                <button
                    onClick={() => setTab("objects")}
                    style={{
                        ...styles.tab,
                        ...(tab === "objects" ? styles.tabActive : {}),
                    }}
                >
                    Объекты
                </button>
                <button
                    onClick={() => setTab("members")}
                    style={{
                        ...styles.tab,
                        ...(tab === "members" ? styles.tabActive : {}),
                    }}
                >
                    Участники
                </button>
            </div>

            <div style={styles.content}>
                {tab === "objects" ? <ObjectsTab /> : <MembersTab />}
            </div>
        </aside>
    );
}

const styles = {
    panel: {
        width: "240px",
        display: "flex",
        flexDirection: "column" as const,
        borderLeft: "1px solid #2a2a2e",
        background: "#1a1a1d",
        height: "100%",
        overflow: "hidden" as const,
    },
    tabs: {
        display: "flex",
        borderBottom: "1px solid #2a2a2e",
    },
    tab: {
        flex: 1,
        padding: "0.75rem",
        fontSize: "0.875rem",
        color: "#888",
        borderBottom: "2px solid transparent",
    },
    tabActive: {
        color: "#e8e8e8",
        borderBottomColor: "#3a7bd5",
    },
    content: {
        flex: 1,
        overflowY: "auto" as const,
    },
};

export default SidePanel;