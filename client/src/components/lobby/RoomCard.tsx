import type { Room } from "@gm-table/shared";

interface RoomCardProps
{
    room: Room;
    onClick: () => void;
}

function RoomCard({ room, onClick }: RoomCardProps): React.JSX.Element
{
    return (
        <div onClick={onClick} style={styles.card}>
            <div style={styles.name}>{room.name}</div>
            <div style={styles.id}>ID: {room.shortId}</div>
        </div>
    );
}

const styles = {
    card: {
        padding: "1rem",
        background: "#2a2a2e",
        borderRadius: "8px",
        cursor: "pointer",
        border: "1px solid #3a3a3e",
        transition: "border-color 0.15s",
    },
    name: {
        fontSize: "1.125rem",
        fontWeight: 500,
        marginBottom: "0.25rem",
    },
    id: {
        fontSize: "0.875rem",
        color: "#888",
        fontFamily: "monospace",
    },
};

export default RoomCard;