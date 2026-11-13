import { useState } from "react";

import { useRoomStore } from "@/store/room.store.js";
import type { Token } from "@gm-table/shared";

import TokenDetails from "./TokenDetails.js";

function ObjectsTab(): React.JSX.Element
{
    const tokens = useRoomStore((s) => s.tokens);
    const room = useRoomStore((s) => s.room);
    const myUserId = localStorage.getItem("userId");
    const isGm = room !== null && myUserId !== null && room.gmId === myUserId;
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Разделяем: пешки игроков и токены GM
    const playerTokens = tokens.filter((t) => t.ownerId !== null);
    const gmTokens = tokens.filter((t) => t.ownerId === null);

    const selectedToken = tokens.find((t) => t.id === selectedId) ?? null;

    return (
        <div style={styles.container}>
            <div style={styles.list}>
                {playerTokens.map((token) => (
                    <TokenRow
                        key={token.id}
                        token={token}
                        isSelected={token.id === selectedId}
                        isOwn={token.ownerId === myUserId}
                        onClick={() =>
                            setSelectedId((prev) => (prev === token.id ? null : token.id))
                        }
                    />
                ))}

                {playerTokens.length > 0 && gmTokens.length > 0 && (
                    <div style={styles.divider} />
                )}

                {gmTokens.map((token) => (
                    <TokenRow
                        key={token.id}
                        token={token}
                        isSelected={token.id === selectedId}
                        isOwn={false}
                        onClick={() =>
                            setSelectedId((prev) => (prev === token.id ? null : token.id))
                        }
                    />
                ))}

                {tokens.length === 0 && (
                    <div style={styles.empty}>Нет объектов</div>
                )}
            </div>

            {selectedToken && (
                <div style={styles.details}>
                    <TokenDetails
                        token={selectedToken}
                        isGm={isGm}
                        myUserId={myUserId}
                    />
                </div>
            )}
        </div>
    );
}

function TokenRow({
    token,
    isSelected,
    isOwn,
    onClick,
}: {
    token: Token;
    isSelected: boolean;
    isOwn: boolean;
    onClick: () => void;
}): React.JSX.Element
{
    return (
        <button
            onClick={onClick}
            style={{
                ...styles.row,
                ...(isSelected ? styles.rowActive : {}),
                ...(isOwn ? styles.rowOwn : {}),
            }}
        >
            <span
                style={{
                    ...styles.colorDot,
                    background: token.color,
                }}
            />
            <span style={styles.name}>{token.name}</span>
        </button>
    );
}

const styles = {
    container: {
        display: "flex",
        flexDirection: "column" as const,
    },
    list: {
        padding: "0.5rem",
    },
    row: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        width: "100%",
        padding: "0.5rem 0.75rem",
        borderRadius: "4px",
        fontSize: "0.875rem",
        textAlign: "left" as const,
    },
    rowActive: {
        background: "#2a2a2e",
    },
    rowOwn: {
        color: "#6fb3ff",
    },
    colorDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        flexShrink: 0,
    },
    name: {
        overflow: "hidden" as const,
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    },
    divider: {
        height: "1px",
        background: "#3a3a3e",
        margin: "0.5rem 1.5rem",
    },
    empty: {
        padding: "1rem",
        textAlign: "center" as const,
        color: "#666",
        fontSize: "0.875rem",
    },
    details: {
        borderTop: "1px solid #2a2a2e",
        padding: "0.75rem",
    },
};

export default ObjectsTab;