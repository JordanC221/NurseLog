import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { nurselog } from "@/api/client";
import { ArrowLeft, Layers, CheckCircle2 } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { buildReviewQueue, applyRating, RATING_OPTIONS, formatAccuracy } from "@/lib/study";
import FlashcardView from "@/components/study/FlashcardView";
import CenteredState from "@/components/study/CenteredState";
import SaveStatus from "@/components/study/SaveStatus";
import { useStudySession } from "@/hooks/useStudySession";
import { useAuth } from "@/lib/AuthContext";

export default function StudyFlashcards() {
  const navigate = useNavigate();
  const { sets, cards, loading } = useStudyData();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get("set");
  const { user } = useAuth();
  const { status, pending, recordResponse, retry } = useStudySession({
    mode: "flashcards",
    setId,
    userId: user?.id,
  });

  const pool = useMemo(
    () => (setId ? cards.filter((c) => c.set_id === setId) : cards),
    [cards, setId]
  );
  const setTitle = setId
    ? sets.find((s) => s.id === setId)?.title || "Study Set"
    : "Due Cards";

  const [queue, setQueue] = useState(null);
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0 });
  const [done, setDone] = useState(false);
  const requeued = useRef(new Set());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (loading || queue) return;
    setQueue(buildReviewQueue(pool, 15));
    startedAt.current = Date.now();
  }, [loading, pool, queue]);

  useEffect(() => {
    if (queue && queue.length > 0 && pos >= queue.length) setDone(true);
  }, [pos, queue]);

  useEffect(() => {
    if (!done) return;
    const duration = Math.round((Date.now() - startedAt.current) / 1000);
    nurselog.entities.StudyAttempt
      .create({
        set_id: setId || "all",
        set_title: setTitle,
        mode: "flashcards",
        score: stats.correct,
        total: stats.reviewed,
        duration_seconds: duration,
      })
      .catch(() => {});
    if (setId) {
      nurselog.entities.StudySet
        .update(setId, { last_studied: new Date().toISOString() })
        .catch(() => {});
    }
  }, [done]);

  const current = queue ? queue[pos] : null;

  const rate = (ratingKey) => {
    if (!current) return;
    const updates = applyRating(current, ratingKey);

    // Self-ratings are stored separately from graded answers. They schedule
    // reviews and never count toward mastery labels.
    recordResponse({
      questionId: current.id,
      questionType: "flashcard",
      questionVersion: current.updated_date || current.created_date || "",
      topic: current.topic || setTitle,
      selfRating: ratingKey,
      setTitle,
    });

    setStats((s) => ({
      reviewed: s.reviewed + 1,
      correct: s.correct + (ratingKey === "again" ? 0 : 1),
    }));

    setQueue((q) => {
      const copy = [...q];
      copy[pos] = { ...current, ...updates };
      return copy;
    });

    nurselog.entities.Flashcard.update(current.id, updates).catch(() => {});

    if (ratingKey === "again" && !requeued.current.has(current.id)) {
      requeued.current.add(current.id);
      setQueue((q) => [...q, { ...current, ...updates }]);
    }

    setRevealed(false);
    setPos((p) => p + 1);
  };

  const restart = () => {
    requeued.current = new Set();
    startedAt.current = Date.now();
    setStats({ reviewed: 0, correct: 0 });
    setDone(false);
    setPos(0);
    setRevealed(false);
    setQueue(buildReviewQueue(pool, 15));
  };

  if (loading) return <CenteredState loading message="Loading cards…" />;

  if (queue && queue.length === 0) {
    return (
      <CenteredState
        icon={Layers}
        title="Nothing to review"
        message={setId ? "This set has no flashcards." : "No cards are due right now. Generate a new study set to keep going."}
        actionLabel="Back to Study"
        onAction={() => navigate("/study")}
      />
    );
  }

  if (!queue) return <CenteredState loading />;

  if (done) {
    const accuracy = formatAccuracy(stats.correct, stats.reviewed);
    return (
      <div className="flex flex-col gap-5">
        <Header title={setTitle} onBack={() => navigate("/study")} />
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
          <span className="inline-flex p-4 rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
            <CheckCircle2 size={28} />
          </span>
          <p className="text-lg font-bold text-slate-900">Session Complete</p>
          <p className="text-sm text-slate-500 mt-1">Great work — here's how you did.</p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Stat label="Cards Reviewed" value={stats.reviewed} />
            <Stat label="Accuracy" value={accuracy} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={restart}
            className="py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.97] transition"
          >
            Study Again
          </button>
          <button
            onClick={() => navigate("/study")}
            className="py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold active:scale-[0.97] transition"
          >
            Back to Study
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Header title={setTitle} onBack={() => navigate("/study")} />

      <div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>Card {pos + 1} of {queue.length}</span>
          <span className="flex items-center gap-2">
            <SaveStatus status={status} pending={pending.length} onRetry={retry} />
            <span>{stats.correct} correct</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-teal-500" style={{ width: `${(pos / queue.length) * 100}%` }} />
        </div>
      </div>

      <FlashcardView card={current} revealed={revealed} onReveal={() => setRevealed(true)} />

      {revealed && (
        <div className="grid grid-cols-3 gap-2">
          {RATING_OPTIONS.map((r) => (
            <button
              key={r.key}
              onClick={() => rate(r.key)}
              className={`${r.cls} text-white rounded-xl py-3 active:scale-[0.97] transition`}
            >
              <span className="block text-sm font-semibold">{r.label}</span>
              <span className="block text-[10px] opacity-90">{r.sub}</span>
            </button>
          ))}
          <p className="col-span-3 text-center text-[10px] text-slate-400">
            These ratings schedule your reviews. They are self-reported confidence, not a mastery
            score.
          </p>
        </div>
      )}
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-95 transition"
      >
        <ArrowLeft size={18} />
      </button>
      <h1 className="text-base font-bold text-slate-900 truncate">{title}</h1>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-3 rounded-2xl bg-slate-50">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}