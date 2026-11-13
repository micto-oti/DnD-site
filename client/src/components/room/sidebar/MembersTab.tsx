import { useRoomStore } from "@/store/room.store.js";
import type { RoomMemberWithUser } from "@gm-table/shared";

function MembersTab(): React.JSX.Element
{
    const members = useRoomStore((s) => s.members);

    const sortedMembers = [...members].sort((a, b) =>
    {
        if (a.role === "gm" && b.role !== "gm") return -1;
        if (b.role === "gm" && a.role !== "gm") return 1;

        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;

        return a.user.nickname.localeCompare(b.user.nickname);
    });

    return (
        <div style={styles.container}>
            {sortedMembers.map((m) => (
                <MemberRow key={m.userId} member={m} />
            ))}
        </div>
    );
}

function MemberRow({ member }: { member: RoomMemberWithUser }): React.JSX.Element
{
    return (
        <div
            style={{
                ...styles.row,
                ...(member.isOnline ? {} : styles.rowOffline),
            }}
        >
            <div style={styles.nickname}>
                {member.user.nickname}
                {member.role === "gm" && " 👑"}
            </div>
            <div style={styles.status}>
                {member.isOnline ? "🟢" : "⚫"}
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: "0.5rem",
    },
    row: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.5rem 0.75rem",
        borderRadius: "4px",
        fontSize: "0.875rem",
    },
    rowOffline: {
        opacity: 0.4,
    },
    nickname: {
        fontWeight: 500,
    },
    status: {
        fontSize: "0.75rem",
    },
};

export default MembersTab;