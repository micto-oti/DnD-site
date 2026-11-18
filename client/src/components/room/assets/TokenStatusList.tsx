import type { Token } from "@gm-table/shared";
import { useRoomStore } from "@/store/room.store.js";
import { useTokenStatusUi } from "@/store/token-status-ui.store.js";
export default function TokenStatusList({ token, canEdit }: { token: Token; canEdit: boolean }): React.JSX.Element {
    const definitions = useRoomStore((s) => s.statuses);
    const open = useTokenStatusUi((s) => s.open);
    return <section className="token-status-list" aria-label="Статусы токена"><strong>Статусы</strong>
        <div>{token.statuses.map((s) => {
            const d = definitions.find((item) => item.id === s.id);
            return <button key={s.id} type="button" onClick={() => open(token.id, s.id)} title={d?.name}>{d?.icon ?? "?"} {d?.name ?? "Эффект"} · {s.stacks}{s.count !== null ? ` / ${s.count}` : ""}</button>;
        })}</div>
        {token.statuses.length === 0 && <small>Нет эффектов</small>}
        {canEdit && <button type="button" onClick={() => open(token.id)}>+ Статус</button>}
    </section>;
}
