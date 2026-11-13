import { useState } from "react";

import Modal from "@/components/common/Modal.js";
import CreateRoomModal from "./CreateRoomModal.js";
import JoinRoomModal from "./JoinRoomModal.js";

interface CreateOrJoinModalProps
{
    open: boolean;
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
    onJoin: (shortId: string) => Promise<void>;
}

function CreateOrJoinModal({
    open,
    onClose,
    onCreate,
    onJoin,
}: CreateOrJoinModalProps): React.JSX.Element
{
    const [mode, setMode] = useState<"choose" | "create" | "join">("choose");

    const handleClose = (): void =>
    {
        setMode("choose");
        onClose();
    };

    return (
        <>
            <Modal open={open && mode === "choose"} onClose={handleClose} title="Что делаем?">
                <div style={styles.choices}>
                    <button onClick={() => setMode("create")} style={styles.choice}>
                        Создать игру
                    </button>
                    <button onClick={() => setMode("join")} style={styles.choice}>
                        Присоединиться
                    </button>
                </div>
            </Modal>

            <CreateRoomModal
                open={open && mode === "create"}
                onClose={handleClose}
                onCreate={onCreate}
            />

            <JoinRoomModal
                open={open && mode === "join"}
                onClose={handleClose}
                onJoin={onJoin}
            />
        </>
    );
}

const styles = {
    choices: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "0.75rem",
    },
    choice: {
        padding: "1rem",
        background: "#1a1a1d",
        border: "1px solid #3a3a3e",
        borderRadius: "4px",
        fontSize: "1rem",
        textAlign: "left" as const,
        color: "#e8e8e8",
    },
};

export default CreateOrJoinModal;