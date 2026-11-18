import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { nurselog } from "@/api/client";
import { ArrowLeft, CheckCircle2, XCircle, ClipboardCheck, RotateCcw, PlayCircle } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { useStudySession } from "@/hooks/useStudySession";
import { useAuth } from "@/lib/AuthContext";
import { buildExamPool, nextAdaptiveQuestion, shiftDifficulty } from "@/lib/study";
import CenteredState from "@/components/study/CenteredState";
import SaveStatus from "@/components/study/SaveStatus";

const DIFF_CLS = {
  easy: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  hard: "bg-rose-100 text-rose-700",
};

export default function StudyExam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { sets, questions, loading, reload } = useStudyData();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get("set");

  const poolSource = questions.filter((q) => (setId ? q.set_id === setId : true));
  const setTitle = setId
    ? sets.find((s) => s.id === setId)?.title || "Practice Exam"
    : "Mixed Practice Exam";

  const {
    ready,
    resumable,
    progress,
    status,
    pending,
    updateProgress,
    recordResponse,
    retry,
    discard,
    complete,
  } = useStudySession({ mode: "exam", setId, userId: user?.id });

  const [started, setStarted] = useState(false);
  const [remaining, setRemaining] = useState([]);
  const [current, setCurrent] = useState(null);
  const [target, setTarget] = useState("medium");
  const [selected, setSelected] = useState(null);
  const [lastCorrect, setLastCorrect] = useState(null);
  const [asked, setAsked] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState(null);

  function start() {
    if (!poolSource.length) return;
    const pool = buildExamPool(poolSource, 10);
    const first = nextAdaptiveQuestion(pool, "medium");
    if (!first) return;
    const rest = pool.filter((q) => q.id !== first.id);
    const at = Date.now();

    setTotal(pool.length);
    setRemaining(rest);
    setCurrent(first);
    setTarget("medium");
    setSelected(null);
    setLastCorrect(null);
    setAsked(0);
    setCorrect(0);
    setDone(false);
    setStartedAt(at);
    setStarted(true);

    updateProgress({
      total: pool.length,
      asked: 0,
      correct: 0,
      target: "medium",
      remainingIds: rest.map((q) => q.id),
      currentId: first.id,
      startedAt: at,
      finished: false,
    });
  }

  function resume() {
    const saved = resumable || progress;
    if (!saved) {
      start();
      return;
    }
    const byId = new Map(poolSource.map((q) => [q.id, q]));
    const resumeCurrent = byId.get(saved.currentId) || null;
    const resumeRemaining = (saved.remainingIds || []).map((id) => byId.get(id)).filter(Boolean);

    if (!resumeCurrent) {
      start();
      return;
    }

    setTotal(saved.total || resumeRemaining.length + 1);
    setAsked(saved.asked || 0);
    setCorrect(saved.correct || 0);
    setTarget(saved.target || "medium");
    setRemaining(resumeRemaining);
    setCurrent(resumeCurrent);
    setSelected(null);
    setLastCorrect(null);
    setDone(false);
    setStartedAt(saved.startedAt || Date.now());
    setStarted(true);
  }

  // Auto-start only when there is no unfinished session to offer back.
  useEffect(() => {
    if (!loading && ready && poolSource.length > 0 && !started && !done && !resumable) {
      start();
    }

  }, [loading, ready, poolSource.length, started, done, resumable]);

  function onSelect(i) {
    if (selected !== null || !current) return;
    const ok = i === current.correct_index;
    const nextAsked = asked + 1;
    const nextCorrect = correct + (ok ? 1 : 0);

    setSelected(i);
    setLastCorrect(ok);
    setAsked(nextAsked);
    if (ok) setCorrect(nextCorrect);

    recordResponse({
      questionId: current.id,
      questionType: "mcq",
      questionVersion: current.updated_date || current.created_date || "",
      topic: current.topic || setTitle,
      selectedIndex: i,
      selectedText: (current.options || [])[i] || "",
      correctIndex: current.correct_index,
      isCorrect: ok,
      setTitle,
    });

    updateProgress((prev) => ({
      ...(prev || {}),
      asked: nextAsked,
      correct: nextCorrect,
      currentId: current.id,
    }));

    nurselog.entities.ExamQuestion
      .update(current.id, {
        times_seen: (current.times_seen || 0) + 1,
        times_correct: (current.times_correct || 0) + (ok ? 1 : 0),
      })
      .catch(() => {});
  }

  function finish(finalAsked, finalCorrect) {
    setDone(true);
    setStarted(false);
    const duration = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;

    updateProgress((prev) => ({ ...(prev || {}), finished: true }));
    complete();

    nurselog.entities.StudyAttempt
      .create({
        set_id: setId || "all",
        set_title: setTitle,
        mode: "exam",
        score: finalCorrect,
        total: finalAsked,
        duration_seconds: duration,
      })
      .catch(() => {});

    reload();
  }

  function next() {
    const nextTarget = shiftDifficulty(target, Boolean(lastCorrect));
    setTarget(nextTarget);

    if (remaining.length === 0) {
      finish(asked, correct);
      return;
    }

    const nxt = nextAdaptiveQuestion(remaining, nextTarget);
    const rest = remaining.filter((q) => q.id !== nxt.id);
    setRemaining(rest);
    setCurrent(nxt);
    setSelected(null);
    setLastCorrect(null);

    updateProgress((prev) => ({
      ...(prev || {}),
      target: nextTarget,
      currentId: nxt.id,
      remainingIds: rest.map((q) => q.id),
    }));
  }

  function restarted() {
    discard();
    start();
  }

  if (loading || !ready) return <CenteredState loading message="Loading questions…" />;

  if (poolSource.length === 0) {
    return (
      <CenteredState
        icon={ClipboardCheck}
        title="No practice questions"
        message="Generate a study set first to build a practice exam."
        actionLabel="Back to Study"
        onAction={() => navigate("/study")}
      />
    );
  }

  if (!started && resumable) {
    const resumeAnswered = resumable.asked || 0;
    return (
      <div className="flex flex-col gap-4">
        <Header title={setTitle} onBack={() => navigate("/study")} />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="inline-flex rounded-xl bg-indigo-100 p-2.5 text-indigo-600">
            <PlayCircle size={20} aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-semibold text-slate-800">Unfinished exam saved</p>
          <p className="mt-1 text-xs text-slate-500">
            You answered {resumeAnswered} question{resumeAnswered === 1 ? "" : "s"} before leaving.
            Everything you answered is already saved.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={resume}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:scale-[0.97]"
            >
              Resume exam
            </button>
            <button
              onClick={() => {
                discard();
                start();
              }}
              className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-600 active:scale-[0.97]"
            >
              Discard and restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = asked ? Math.round((correct / asked) * 100) : 0;
    const tone = pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-rose-600";
    return (
      <div className="flex flex-col gap-5">
        <Header title={setTitle} onBack={() => navigate("/study")} />
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Exam score
          </p>
          <p className={`mt-1 text-4xl font-bold ${tone}`}>{pct}%</p>
          <p className="mt-1 text-sm text-slate-500">
            {correct} of {asked} correct
          </p>
          <p className="mt-3 text-[11px] text-slate-400">
            One practice session. It is not a predicted exam or NCLEX score.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={restarted}
            className="rounded-xl bg-teal-600 py-3 text-sm font-semibold text-white active:scale-[0.97] transition"
          >
            Retake exam
          </button>
          <button
            onClick={() => navigate("/study")}
            className="rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:scale-[0.97] transition"
          >
            Back to study
          </button>
        </div>
      </div>
    );
  }

  if (!current) return <CenteredState loading />;

  const diffCls = DIFF_CLS[current.difficulty || "medium"] || DIFF_CLS.medium;

  return (
    <div className="flex flex-col gap-4">
      <Header title={setTitle} onBack={() => navigate("/study")} />

      <div>
        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
          <span>
            Question {asked + 1} of {total}
          </span>
          <span className="flex items-center gap-2">
            <SaveStatus status={status} pending={pending.length} onRetry={retry} />
            <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${diffCls}`}>
              {current.difficulty || "medium"}
            </span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-indigo-500"
            style={{ width: `${total ? (asked / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <p className="text-base font-semibold leading-snug text-slate-900">{current.question}</p>
      </div>

      <div className="flex flex-col gap-2">
        {(current.options || []).map((opt, i) => {
          let cls = "bg-white border-slate-200 text-slate-700";
          if (selected !== null) {
            if (i === current.correct_index) cls = "bg-emerald-50 border-emerald-400 text-emerald-800";
            else if (i === selected) cls = "bg-rose-50 border-rose-400 text-rose-800";
            else cls = "bg-white border-slate-100 text-slate-400";
          }
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              disabled={selected !== null}
              className={`w-full rounded-2xl border p-3.5 text-left text-sm font-medium transition active:scale-[0.99] ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <>
          <div
            className={`rounded-2xl border p-4 ${
              lastCorrect ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              {lastCorrect ? (
                <CheckCircle2 size={16} className="text-emerald-600" aria-hidden="true" />
              ) : (
                <XCircle size={16} className="text-rose-600" aria-hidden="true" />
              )}
              <span
                className={`text-xs font-semibold ${
                  lastCorrect ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {lastCorrect ? "Correct" : "Not quite"}
              </span>
            </div>
            {current.explanation && (
              <p className="text-xs leading-relaxed text-slate-600">{current.explanation}</p>
            )}
          </div>
          <button
            onClick={next}
            className="rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white active:scale-[0.97] transition"
          >
            {remaining.length === 0 ? "Finish exam" : "Next question"}
          </button>
        </>
      )}
    </div>
  );
}

function Header({ title, onBack }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onBack}
        aria-label="Back to study"
        className="rounded-xl border border-slate-100 bg-white p-2 text-slate-600 shadow-sm transition active:scale-95"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </button>
      <h1 className="truncate text-base font-bold text-slate-900">{title}</h1>
      <RotateCcw size={14} className="ml-auto shrink-0 text-slate-300" aria-hidden="true" />
    </div>
  );
}