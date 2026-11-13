import { useCallback, useEffect, useRef, useState } from "react";

import { LIMITS, type Token, type TokenNote } from "@gm-table/shared";

import {
    createTokenNote,
    deleteTokenNote,
    getTokenNotes,
    updateTokenNote,
} from "@/api/token-notes.js";
import ConfirmModal from "@/components/common/ConfirmModal.js";
import Modal from "@/components/common/Modal.js";

import "./CharacterNotesModal.css";

interface CharacterNotesModalProps {
    open: boolean;
    token: Token | null;
    ownerName?: string;
    onClose: () => void;
}

interface NoteDraft {
    id: string;
    tokenId: string;
    title: string;
    content: string;
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTO_SAVE_DELAY_MS = 1_000;

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
});

function sortNotes(notes: TokenNote[]): TokenNote[] {
    return [...notes].sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id),
    );
}

function toDraft(note: TokenNote): NoteDraft {
    return {
        id: note.id,
        tokenId: note.tokenId,
        title: note.title,
        content: note.content,
    };
}

function draftsEqual(a: NoteDraft | null, b: NoteDraft | null): boolean {
    return (
        a?.id === b?.id &&
        a?.tokenId === b?.tokenId &&
        a?.title === b?.title &&
        a?.content === b?.content
    );
}

function CharacterNotesModal({
    open,
    token,
    ownerName,
    onClose,
}: CharacterNotesModalProps): React.JSX.Element | null {
    const [notes, setNotes] = useState<TokenNote[]>([]);
    const [draft, setDraft] = useState<NoteDraft | null>(null);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [closing, setClosing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [error, setError] = useState<string | null>(null);

    const draftRef = useRef<NoteDraft | null>(null);
    const savedDraftRef = useRef<NoteDraft | null>(null);
    const savePromiseRef = useRef<Promise<boolean> | null>(null);
    const mutationRef = useRef(false);
    const closingRef = useRef(false);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const tokenId = token?.id;
    const activeTokenIdRef = useRef<string | undefined>(undefined);

    activeTokenIdRef.current = open ? tokenId : undefined;

    const setActiveNote = useCallback((note: TokenNote | null): void => {
        const nextDraft = note ? toDraft(note) : null;

        draftRef.current = nextDraft;
        savedDraftRef.current = nextDraft;
        setDraft(nextDraft);
        setSaveStatus(note ? "saved" : "idle");
        setError(null);
    }, []);

    useEffect(() => {
        if (!open || !tokenId) {
            return;
        }

        let cancelled = false;

        const loadNotes = async (): Promise<void> => {
            setLoading(true);
            setNotes([]);
            setActiveNote(null);

            try {
                const loaded = sortNotes(await getTokenNotes(tokenId));

                if (!cancelled) {
                    setNotes(loaded);
                    setActiveNote(loaded[0] ?? null);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Не удалось загрузить заметки");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void loadNotes();

        return () => {
            cancelled = true;
        };
    }, [open, setActiveNote, tokenId]);

    const flushDraft = useCallback(async (): Promise<boolean> => {
        while (true) {
            let current = draftRef.current;
            const saved = savedDraftRef.current;

            if (!current || draftsEqual(current, saved)) {
                setSaveStatus(current ? "saved" : "idle");

                return true;
            }

            if (current.title.trim().length === 0) {
                current = { ...current, title: "Без названия" };
                draftRef.current = current;
                setDraft(current);
            }

            const snapshot = { ...current };

            setSaveStatus("saving");
            setError(null);

            try {
                const updated = await updateTokenNote(snapshot.id, {
                    title: snapshot.title,
                    content: snapshot.content,
                });

                if (activeTokenIdRef.current !== snapshot.tokenId) {
                    return true;
                }

                const savedDraft = toDraft(updated);

                savedDraftRef.current = savedDraft;
                setNotes((currentNotes) =>
                    sortNotes(
                        currentNotes.map((note) => (note.id === updated.id ? updated : note)),
                    ),
                );

                if (draftsEqual(draftRef.current, snapshot)) {
                    draftRef.current = savedDraft;
                    setDraft(savedDraft);
                    setSaveStatus("saved");

                    return true;
                }
            } catch (err) {
                if (activeTokenIdRef.current !== snapshot.tokenId) {
                    return true;
                }

                setError(err instanceof Error ? err.message : "Не удалось сохранить заметку");
                setSaveStatus("error");

                return false;
            }
        }
    }, []);

    const saveCurrent = useCallback((): Promise<boolean> => {
        if (savePromiseRef.current) {
            return savePromiseRef.current;
        }

        const promise = flushDraft();

        savePromiseRef.current = promise;
        void promise.finally(() => {
            if (savePromiseRef.current === promise) {
                savePromiseRef.current = null;
            }
        });

        return promise;
    }, [flushDraft]);

    useEffect(() => {
        if (!open || !draft || draftsEqual(draft, savedDraftRef.current)) {
            return;
        }

        const timeout = window.setTimeout(() => {
            void saveCurrent();
        }, AUTO_SAVE_DELAY_MS);

        return () => window.clearTimeout(timeout);
    }, [draft, open, saveCurrent]);

    if (!token) {
        return null;
    }

    const isBusy = creating || deleting || closing;

    const updateDraft = (patch: Partial<Pick<NoteDraft, "title" | "content">>): void => {
        const current = draftRef.current;

        if (!current || mutationRef.current || closingRef.current) {
            return;
        }

        const next = { ...current, ...patch };

        draftRef.current = next;
        setDraft(next);
        setSaveStatus("dirty");
        setError(null);
    };

    const handleSelect = async (note: TokenNote): Promise<void> => {
        if (draftRef.current?.id === note.id || mutationRef.current || closingRef.current) {
            return;
        }

        if (await saveCurrent()) {
            setActiveNote(note);
        }
    };

    const handleCreate = async (): Promise<void> => {
        if (mutationRef.current || closingRef.current) {
            return;
        }

        const targetTokenId = token.id;

        mutationRef.current = true;
        setCreating(true);
        setError(null);

        try {
            if (!(await saveCurrent())) {
                return;
            }

            const created = await createTokenNote(targetTokenId, {
                title: "Новая заметка",
                content: "",
            });

            if (activeTokenIdRef.current !== targetTokenId) {
                return;
            }

            setNotes((currentNotes) => sortNotes([created, ...currentNotes]));
            setActiveNote(created);
            window.requestAnimationFrame(() => {
                titleInputRef.current?.focus();
                titleInputRef.current?.select();
            });
        } catch (err) {
            if (activeTokenIdRef.current === targetTokenId) {
                setError(err instanceof Error ? err.message : "Не удалось создать заметку");
            }
        } finally {
            mutationRef.current = false;
            setCreating(false);
        }
    };

    const handleClose = async (): Promise<void> => {
        if (closingRef.current || mutationRef.current) {
            return;
        }

        closingRef.current = true;
        setClosing(true);

        try {
            if (await saveCurrent()) {
                onClose();
            }
        } finally {
            closingRef.current = false;
            setClosing(false);
        }
    };

    const handleDeleteConfirm = async (): Promise<void> => {
        if (mutationRef.current || closingRef.current) {
            return;
        }

        const current = draftRef.current;

        if (!current) {
            return;
        }

        mutationRef.current = true;
        setDeleting(true);
        setError(null);

        try {
            if (!(await saveCurrent())) {
                setConfirmDelete(false);

                return;
            }

            await deleteTokenNote(current.id);

            if (activeTokenIdRef.current !== current.tokenId) {
                return;
            }

            const remaining = notes.filter((note) => note.id !== current.id);

            setNotes(remaining);
            setActiveNote(remaining[0] ?? null);
            setConfirmDelete(false);
        } catch (err) {
            if (activeTokenIdRef.current === current.tokenId) {
                setError(err instanceof Error ? err.message : "Не удалось удалить заметку");
                setConfirmDelete(false);
            }
        } finally {
            mutationRef.current = false;
            setDeleting(false);
        }
    };

    const saveLabel =
        saveStatus === "saving"
            ? "Сохранение..."
            : saveStatus === "dirty"
              ? "Есть несохранённые изменения"
              : saveStatus === "error"
                ? "Ошибка сохранения"
                : saveStatus === "saved"
                  ? "Сохранено"
                  : "";

    return (
        <>
            <Modal
                open={open}
                onClose={() => (confirmDelete ? setConfirmDelete(false) : void handleClose())}
                size="wide"
                ariaLabel={`Заметки о персонаже ${token.name}`}
            >
                <div className="character-notes">
                    <header className="character-notes__header">
                        <div className="character-notes__heading">
                            <span
                                className="character-notes__token-dot"
                                style={{ background: token.color }}
                            />
                            <div>
                                <h2>Заметки о {token.name}</h2>
                                <p>
                                    {ownerName ? `Персонаж игрока ${ownerName}. ` : ""}
                                    Заметки видны только вам.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="character-notes__close"
                            aria-label="Закрыть заметки"
                            disabled={isBusy}
                            onClick={() => void handleClose()}
                        >
                            ×
                        </button>
                    </header>

                    <div className="character-notes__body">
                        <aside className="character-notes__sidebar">
                            <div className="character-notes__sidebar-header">
                                <span>Все заметки</span>
                                <button
                                    type="button"
                                    disabled={loading || isBusy}
                                    onClick={() => void handleCreate()}
                                >
                                    {creating ? "Создание..." : "+ Новая"}
                                </button>
                            </div>

                            <div className="character-notes__list">
                                {loading && (
                                    <div className="character-notes__list-message">Загрузка...</div>
                                )}

                                {!loading && notes.length === 0 && (
                                    <div className="character-notes__list-message">
                                        Заметок пока нет
                                    </div>
                                )}

                                {notes.map((note) => (
                                    <button
                                        type="button"
                                        key={note.id}
                                        className={
                                            note.id === draft?.id
                                                ? "character-notes__note character-notes__note--active"
                                                : "character-notes__note"
                                        }
                                        disabled={isBusy}
                                        onClick={() => void handleSelect(note)}
                                    >
                                        <span className="character-notes__note-title">
                                            {note.title}
                                        </span>
                                        <span className="character-notes__note-date">
                                            {dateFormatter.format(new Date(note.updatedAt))}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </aside>

                        <main className="character-notes__editor">
                            {draft ? (
                                <>
                                    <div className="character-notes__editor-toolbar">
                                        <input
                                            ref={titleInputRef}
                                            type="text"
                                            value={draft.title}
                                            maxLength={LIMITS.TOKEN_NOTE_TITLE_MAX_LENGTH}
                                            aria-label="Название заметки"
                                            disabled={isBusy}
                                            onChange={(event) =>
                                                updateDraft({ title: event.target.value })
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="character-notes__delete"
                                            disabled={isBusy}
                                            onClick={() => setConfirmDelete(true)}
                                        >
                                            Удалить
                                        </button>
                                    </div>

                                    <textarea
                                        value={draft.content}
                                        maxLength={LIMITS.TOKEN_NOTE_CONTENT_MAX_LENGTH}
                                        aria-label="Текст заметки в Markdown"
                                        disabled={isBusy}
                                        placeholder={
                                            "Текст заметки"
                                        }
                                        spellCheck
                                        onChange={(event) =>
                                            updateDraft({ content: event.target.value })
                                        }
                                    />

                                    <footer className="character-notes__status">
                                        <span className={saveStatus === "error" ? "is-error" : ""}>
                                            {error ?? saveLabel}
                                        </span>
                                        <span>Markdown (.md)</span>
                                    </footer>
                                </>
                            ) : (
                                <div className="character-notes__empty">
                                    <strong>Создайте первую заметку</strong>
                                    <button
                                        type="button"
                                        disabled={loading || isBusy}
                                        onClick={() => void handleCreate()}
                                    >
                                        Создать заметку
                                    </button>
                                    {error && <span className="is-error">{error}</span>}
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </Modal>

            <ConfirmModal
                open={confirmDelete}
                title="Удалить заметку?"
                message="Это действие нельзя отменить."
                confirmLabel={deleting ? "Удаление..." : "Удалить"}
                danger
                onConfirm={() => void handleDeleteConfirm()}
                onCancel={() => setConfirmDelete(false)}
            />
        </>
    );
}

export default CharacterNotesModal;
