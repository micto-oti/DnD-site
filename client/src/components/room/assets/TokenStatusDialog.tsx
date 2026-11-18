import { useEffect, useState } from "react";
import Modal from "@/components/common/Modal.js";
import { useRoomStore } from "@/store/room.store.js";
import { useTokenStatusUi } from "@/store/token-status-ui.store.js";
import { applyTokenStatus, changeTokenStatus } from "@/api/token-statuses.js";
import "./StatusLibrary.css";

export default function TokenStatusDialog(): React.JSX.Element | null {
    const target = useTokenStatusUi((s) => s.target);
    const close = useTokenStatusUi((s) => s.close);
    const token = useRoomStore((s) => s.tokens.find((t) => t.id === target?.tokenId));
    const definitions = useRoomStore((s) => s.statuses);
    const room = useRoomStore((s) => s.room);
    const effect = token?.statuses.find((s) => s.id === target?.statusId);
    const definition = definitions.find((s) => s.id === target?.statusId);
    const userId = localStorage.getItem("userId");
    const canEdit = !!userId && !!token && (room?.gmId === userId || token.ownerId === userId);
    const [stacks, setStacks] = useState(1);
    const [count, setCount] = useState(1);
    const [query, setQuery] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => { setStacks(effect?.stacks ?? 1); setCount(effect?.count ?? 1); setError(""); }, [target?.tokenId, target?.statusId, effect?.stacks, effect?.count]);
    useEffect(() => () => close(), [close]);
    if (!target || !token) return null;
    const dismiss = (): void => { if (!busy) close(); };
    const save = (method: "PATCH" | "DELETE"): void => {
        if (!canEdit || busy || !definition) return;
        setBusy(true); setError("");
        void changeTokenStatus(token.id, definition.id, method, method === "PATCH" ? { stacks, count: definition.hasCount ? count : null } : undefined)
            .then(() => close()).catch((e: unknown) => setError(e instanceof Error ? e.message : "Не удалось изменить эффект")).finally(() => setBusy(false));
    };
    return <Modal open onClose={dismiss} title={target.statusId ? `${definition?.icon ?? ""} ${definition?.name ?? "Эффект"} · ${token.name}` : `Добавить статус · ${token.name}`}>
        <div className="status-editor">
            {!target.statusId && canEdit ? <>
                <input aria-label="Найти статус" placeholder="Найти статус…" value={query} onChange={(e) => setQuery(e.target.value)} />
                <div className="token-status-picker">{definitions.filter((d) => d.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map((d) => <button key={d.id} disabled={busy} onClick={() => {
                    setBusy(true); setError("");
                    void applyTokenStatus(token.id, d.id).catch((e: unknown) => setError(e instanceof Error ? e.message : "Не удалось наложить эффект")).finally(() => setBusy(false));
                }}>{d.icon} {d.name}{token.statuses.some((s) => s.id === d.id) ? " · уже наложен" : ""}</button>)}</div>
                {definitions.length === 0 && <p>В библиотеке пока нет эффектов</p>}
            </> : effect && definition ? <form onSubmit={(e) => { e.preventDefault(); save("PATCH"); }}>
                <fieldset disabled={!canEdit || busy}>
                    <label>Сила<div className="token-status-number"><button type="button" disabled={stacks <= 0} onClick={() => setStacks(Math.max(0, stacks - 1))}>−</button><input aria-label="Сила" type="number" required min={0} max={definition.maxStacks} step={1} value={Number.isNaN(stacks) ? "" : stacks} onChange={(e) => setStacks(e.target.valueAsNumber)} /><button type="button" disabled={stacks >= definition.maxStacks} onClick={() => setStacks(Math.min(definition.maxStacks, (Number.isNaN(stacks) ? 0 : stacks) + 1))}>+</button></div></label>
                    {definition.hasCount && <label>Счётчик<div className="token-status-number"><button type="button" disabled={count <= 0} onClick={() => setCount(Math.max(0, count - 1))}>−</button><input aria-label="Счётчик" type="number" required min={0} max={definition.maxCount ?? 99} step={1} value={Number.isNaN(count) ? "" : count} onChange={(e) => setCount(e.target.valueAsNumber)} /><button type="button" disabled={count >= (definition.maxCount ?? 99)} onClick={() => setCount(Math.min(definition.maxCount ?? 99, (Number.isNaN(count) ? 0 : count) + 1))}>+</button></div></label>}
                </fieldset>
                {canEdit && <div className="status-editor__actions"><button type="button" disabled={busy} onClick={() => save("DELETE")}>Снять эффект</button><button type="submit" disabled={busy}>Сохранить</button></div>}
            </form> : <p>Эффект уже снят или недоступен</p>}
            {!canEdit && <small>Изменять эффекты может владелец токена или ГМ.</small>}
            {error && <p role="alert">{error}</p>}
            <button type="button" disabled={busy} onClick={dismiss}>Закрыть</button>
        </div>
    </Modal>;
}
