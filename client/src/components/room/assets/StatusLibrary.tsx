import { useState } from "react";
import type { StatusDefinition } from "@gm-table/shared";
import { createStatus, updateStatus } from "@/api/statuses.js";
import Modal from "@/components/common/Modal.js";
import { useRoomStore, upsertRoomStatus } from "@/store/room.store.js";
import "./StatusLibrary.css";

function StatusEditor({ roomId, status, onClose }: { roomId: string; status: StatusDefinition | null; onClose: () => void }): React.JSX.Element {
    const [name, setName] = useState(status?.name ?? "");
    const [icon, setIcon] = useState(status?.icon ?? "✨");
    const [color, setColor] = useState(status?.color ?? "#3a7bd5");
    const [hasCount, setHasCount] = useState(status?.hasCount ?? true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const close = (): void => { if (!busy) onClose(); };
    return <Modal open onClose={close} title={status ? "Редактировать эффект" : "Новый эффект"}>
        <form className="status-editor" onSubmit={(event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            const input = { name: name.trim(), icon: icon.trim(), color };
            const operation = status ? updateStatus(roomId, status.id, input) : createStatus(roomId, { ...input, hasCount });
            void operation.then((saved) => { upsertRoomStatus(saved); onClose(); })
                .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Не удалось сохранить эффект"))
                .finally(() => setBusy(false));
        }}>
            <fieldset disabled={busy}>
                <label>Название<input autoFocus required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label>
                <label>Иконка (эмодзи)<input required maxLength={32} value={icon} onChange={(e) => setIcon(e.target.value)} /></label>
                <label>Цвет<input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
                <label className="status-editor__check"><input type="checkbox" checked={hasCount} disabled={status !== null} onChange={(e) => setHasCount(e.target.checked)} />Использует счётчик</label>
                {status && <small>Наличие счётчика задаётся при создании эффекта.</small>}
            </fieldset>
            {error && <p role="alert">{error}</p>}
            <div className="status-editor__actions"><button type="button" disabled={busy} onClick={close}>Отмена</button><button type="submit" disabled={busy || !name.trim() || !icon.trim()}>{busy ? "Сохранение…" : "Сохранить"}</button></div>
        </form>
    </Modal>;
}

export default function StatusLibrary({ roomId }: { roomId: string }): React.JSX.Element {
    const statuses = useRoomStore((state) => state.statuses);
    const [query, setQuery] = useState("");
    const [editor, setEditor] = useState<{ status: StatusDefinition | null } | null>(null);
    const visible = statuses.filter((status) => status.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
    return <section className="status-library" aria-label="Библиотека эффектов">
        <div className="status-library__toolbar"><input aria-label="Поиск эффектов" placeholder="Найти эффект…" value={query} onChange={(e) => setQuery(e.target.value)} /><button onClick={() => setEditor({ status: null })}>+ Эффект</button></div>
        <div className="status-library__items">
            {visible.map((status) => <button draggable onDragStart={(e) => { e.dataTransfer.setData("application/x-status-id", status.id); e.dataTransfer.effectAllowed = "copy"; }} className="status-library__item" key={status.id} title={`Редактировать: ${status.name}`} onClick={() => setEditor({ status })}>
                <span className="status-library__icon" style={{ borderColor: status.color }}>{status.icon}</span><span>{status.name}</span>
                <small>{status.hasCount ? "Сила · счётчик" : "Сила"}</small>
            </button>)}
            {visible.length === 0 && <p>{query ? "Эффекты не найдены" : "В библиотеке пока нет эффектов"}</p>}
        </div>
        {editor && <StatusEditor roomId={roomId} status={editor.status} onClose={() => setEditor(null)} />}
    </section>;
}
