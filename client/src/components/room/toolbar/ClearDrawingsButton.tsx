import { useState } from "react";

import ConfirmModal from "@/components/common/ConfirmModal.js";
import { getSocket } from "@/ws/socket.js";

interface ClearDrawingsButtonProps
{
    roomId: string;
    isGm: boolean;
    myUserId: string | null;
}

function ClearDrawingsButton({
    roomId,
    isGm,
}: ClearDrawingsButtonProps): React.JSX.Element
{
    const [menuOpen, setMenuOpen] = useState(false);
    const [confirmMineOpen, setConfirmMineOpen] = useState(false);
    const [confirmAllOpen, setConfirmAllOpen] = useState(false);

    const handleClearMineClick = (): void =>
    {
        setMenuOpen(false);
        setConfirmMineOpen(true);
    };

    const handleClearAllClick = (): void =>
    {
        setMenuOpen(false);
        setConfirmAllOpen(true);
    };

    const handleConfirmMine = (): void =>
    {
        const socket = getSocket();

        socket.emit("drawing:clear-mine", { roomId });
        setConfirmMineOpen(false);
    };

    const handleConfirmAll = (): void =>
    {
        const socket = getSocket();

        socket.emit("drawing:clear-all", { roomId });
        setConfirmAllOpen(false);
    };

    const handleClick = (): void =>
    {
        if (!isGm)
        {
            setConfirmMineOpen(true);

            return;
        }

        setMenuOpen((prev) => !prev);
    };

    return (
        <div style={styles.wrapper}>
            <button
                onClick={handleClick}
                title={isGm ? "Стереть рисунки" : "Стереть свои рисунки"}
                style={styles.button}
            >
                🗑
            </button>

            {menuOpen && isGm && (
                <div style={styles.menu}>
                    <button onClick={handleClearMineClick} style={styles.item}>
                        Стереть мои
                    </button>
                    <button onClick={handleClearAllClick} style={styles.itemDanger}>
                        Стереть все
                    </button>
                </div>
            )}

            <ConfirmModal
                open={confirmMineOpen}
                title="Стереть свои рисунки?"
                message="Все ваши рисунки будут удалены."
                confirmLabel="Стереть"
                danger
                onConfirm={handleConfirmMine}
                onCancel={() => setConfirmMineOpen(false)}
            />

            <ConfirmModal
                open={confirmAllOpen}
                title="Стереть ВСЕ рисунки?"
                message="Все рисунки в комнате будут удалены. Это действие нельзя отменить."
                confirmLabel="Стереть все"
                danger
                onConfirm={handleConfirmAll}
                onCancel={() => setConfirmAllOpen(false)}
            />
        </div>
    );
}

const styles = {
    wrapper: {
        position: "relative" as const,
    },
    button: {
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "1rem",
        color: "#e8e8e8",
        background: "transparent",
        borderRadius: "4px",
        cursor: "pointer",
        border: "none",
    },
    menu: {
        position: "absolute" as const,
        left: "calc(100% + 0.5rem)",
        top: 0,
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.25rem",
        padding: "0.375rem",
        background: "#2a2a2e",
        border: "1px solid #3a3a3e",
        borderRadius: "6px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
        minWidth: "140px",
        zIndex: 200,
    },
    item: {
        padding: "0.375rem 0.75rem",
        background: "transparent",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#e8e8e8",
        textAlign: "left" as const,
        cursor: "pointer",
    },
    itemDanger: {
        padding: "0.375rem 0.75rem",
        background: "transparent",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.8125rem",
        color: "#e74c3c",
        textAlign: "left" as const,
        cursor: "pointer",
    },
};

export default ClearDrawingsButton;