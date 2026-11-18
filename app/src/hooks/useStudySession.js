import { useCallback, useEffect, useRef, useState } from "react";
import { nurselog } from "@/api/client";

const PREFIX = "nurselog:study-draft";

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readDraft(key) {
  if (!key) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.sessionId ? parsed : null;
  } catch {
    return null;
  }
}

function writeDraft(key, value) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked - progress stays in memory */
  }
}

/**
 * Durable study session.
 *
 * - One stable session id per account + mode + set, surviving refreshes.
 * - Every answer is written to StudyResponse with a stable response_id, so a
 *   retry re-sends the same id and cannot double-count.
 * - Unsent answers are held in memory and in a per-account draft, so a failed
 *   save never loses the student's work.
 * - Drafts are keyed by account id, so one student never sees another's
 *   unfinished session on a shared device.
 */
export function useStudySession({ mode, setId, userId }) {
  const draftKey = userId ? `${PREFIX}:${userId}:${mode}:${setId || "all"}` : null;

  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState(makeId);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [progress, setProgress] = useState(null);
  const [resumable, setResumable] = useState(null);
  const [pending, setPending] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const seq = useRef(0);
  const busy = useRef(new Set());

  useEffect(() => {
    if (!draftKey || ready) return;
    const draft = readDraft(draftKey);
    if (draft) {
      setSessionId(draft.sessionId);
      setStartedAt(draft.startedAt || Date.now());
      setProgress(draft.progress || null);
      setPending(draft.pending || []);
      seq.current = draft.seq || 0;
      if (draft.progress && !draft.progress.finished) setResumable(draft.progress);
    }
    setReady(true);
  }, [draftKey, ready]);

  useEffect(() => {
    if (!ready || !draftKey) return;
    writeDraft(draftKey, { sessionId, startedAt, progress, pending, seq: seq.current });
  }, [ready, draftKey, sessionId, startedAt, progress, pending]);

  const updateProgress = useCallback((next) => {
    setProgress((prev) => (typeof next === "function" ? next(prev) : next));
  }, []);

  const persist = useCallback(async (item) => {
    const existing = await nurselog.entities.StudyResponse.filter(
      { response_id: item.response_id },
      { limit: 1 }
    );
    if (existing.items.length > 0) return;
    await nurselog.entities.StudyResponse.create(item);
  }, []);

  const recordResponse = useCallback(
    async (input) => {
      if (!input?.questionId) return null;
      // Ignore a second click while the first write for this question is open.
      if (busy.current.has(input.questionId)) return null;
      busy.current.add(input.questionId);

      const item = {
        response_id: `${sessionId}:${input.questionId}:${seq.current}`,
        session_id: sessionId,
        question_id: input.questionId,
        question_type: input.questionType || "mcq",
        question_version: input.questionVersion || "",
        topic: input.topic || "",
        mode,
        selected_index:
          typeof input.selectedIndex === "number" ? input.selectedIndex : undefined,
        selected_text: input.selectedText || "",
        correct_index:
          typeof input.correctIndex === "number" ? input.correctIndex : undefined,
        is_correct: typeof input.isCorrect === "boolean" ? input.isCorrect : undefined,
        self_rating: input.selfRating || undefined,
        answered_at: new Date().toISOString(),
        set_id: setId || "all",
        set_title: input.setTitle || "",
      };
      seq.current += 1;

      setStatus("saving");
      try {
        await persist(item);
        setError(null);
        setStatus("saved");
      } catch (e) {
        setError(e?.message || "Could not save this answer.");
        setPending((list) => [...list, item]);
        setStatus("error");
      } finally {
        busy.current.delete(input.questionId);
      }
      return item;
    },
    [mode, persist, sessionId, setId]
  );

  const retry = useCallback(async () => {
    if (!pending.length) return;
    setStatus("saving");
    const failed = [];
    for (const item of pending) {
      try {
        await persist(item);
      } catch {
        failed.push(item);
      }
    }
    setPending(failed);
    setStatus(failed.length ? "error" : "saved");
    if (!failed.length) setError(null);
  }, [pending, persist]);

  const discard = useCallback(() => {
    if (draftKey) {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
    setSessionId(makeId());
    setStartedAt(Date.now());
    setProgress(null);
    setResumable(null);
    setPending([]);
    seq.current = 0;
    setStatus("idle");
    setError(null);
  }, [draftKey]);

  const complete = useCallback(() => {
    setResumable(null);
    if (draftKey) {
      try {
        window.localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
  }, [draftKey]);

  return {
    ready,
    sessionId,
    startedAt,
    progress,
    resumable,
    pending,
    status,
    error,
    updateProgress,
    recordResponse,
    retry,
    discard,
    complete,
  };
}