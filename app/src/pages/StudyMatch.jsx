import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { nurselog } from "@/api/client";
import { ArrowLeft, Timer, Puzzle, RotateCcw } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { pickMatchCards, shuffle } from "@/lib/study";
import CenteredState from "@/components/study/CenteredState";

export default function StudyMatch() {
  const navigate = useNavigate();
  const { sets, cards, loading } = useStudyData();
  const urlParams = new URLSearchParams(window.location.search);
  const setId = urlParams.get("set");

  const source = useMemo(() => {
    const scoped = setId ? cards.filter((c) => c.set_id === setId) : cards;
    return scoped.filter((c) => c.front && c.back);
  }, [cards, setId]);

  const setTitle = setId
    ? sets.find((s) => s.id === setId)?.title || "Matching Game"
    : "Mixed Matching Game";

  const [terms, setTerms] = useState(null);
  const [defs, setDefs] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [matched, setMatched] = useState({});
  const [wrongDef, setWrongDef] = useState(null);
  const [moves, setMoves] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  const start = () => {
    const picked = pickMatchCards(source, 6);
    setTerms(shuffle(picked));
    setDefs(shuffle(picked));
    setSelectedTerm(null);
    setMatched({});
    setWrongDef(null);
    setMoves(0);
    setMistakes(0);
    setSeconds(0);
    setRunning(true);
  };

  useEffect(() => {
    if (!loading && source.length >= 3 && !terms) start();
  }, [loading, source.length, terms]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const finish = (finalMatched) => {
    nurselog.entities.StudyAttempt
      .create({
        set_id: setId || "all",
        set_title: setTitle,
        mode: "match",
        score: Object.keys(finalMatched).length,
        total: Object.keys(finalMatched).length,
        duration_seconds: seconds,
      })
      .catch(() => {});
  };

  const tapDef = (defCard) => {
    if (!selectedTerm || matched[defCard.id]) return;
    setMoves((m) => m + 1);
    if (defCard.id === selectedTerm.id) {
      const nextMatched = { ...matched, [selectedTerm.id]: true };
      setMatched(nextMatched);
      setSelectedTerm(null);
      const boost = Math.min(100, (defCard.mastery || 0) + 8);
      nurselog.entities.Flashcard
        .update(defCard.id, { mastery: boost, last_reviewed: new Date().toISOString() })
        .catch(() => {});
      if (terms && Object.keys(nextMatched).length === terms.length) {
        setRunning(false);
        finish(nextMatched);
      }
    } else {
      setMistakes((x) => x + 1);
      setWrongDef(defCard.id);
      setTimeout(() => setWrongDef(null), 450);
    }
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return <CenteredState loading message="Setting up the game…" />;

  if (source.length < 3) {
    return (
      <CenteredState
        icon={Puzzle}
        title="Not enough cards"
        message="The matching game needs at least 3 flashcards. Generate a study set first."
        actionLabel="Back to Study"
        onAction={() => navigate("/study")}
      />
    );
  }

  if (!terms) return <CenteredState loading />;

  const allMatched = terms.length > 0 && Object.keys(matched).length === terms.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/study")}
          className="p-2 rounded-xl bg-white border border-slate-100 shadow-sm text-slate-600 active:scale-95 transition"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-base font-bold text-slate-900 truncate flex-1">{setTitle}</h1>
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Timer size={14} /> {fmtTime(seconds)}
        </span>
        <span className="text-xs text-slate-500">
          Matched <span className="font-semibold text-slate-700">{Object.keys(matched).length}/{terms.length}</span>
        </span>
        <span className="text-xs text-slate-500">
          Mistakes <span className="font-semibold text-slate-700">{mistakes}</span>
        </span>
      </div>

      {allMatched ? (
        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-center">
          <span className="inline-flex p-4 rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
            <Puzzle size={28} />
          </span>
          <p className="text-lg font-bold text-slate-900">All Matched!</p>
          <p className="text-sm text-slate-500 mt-1">You cleared the board in {fmtTime(seconds)}.</p>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="p-3 rounded-2xl bg-slate-50">
              <p className="text-[11px] text-slate-400 font-medium">Pairs</p>
              <p className="text-lg font-bold text-slate-900">{terms.length}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50">
              <p className="text-[11px] text-slate-400 font-medium">Mistakes</p>
              <p className="text-lg font-bold text-slate-900">{mistakes}</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">Tap a term, then tap its matching meaning.</p>

          <div className="flex flex-wrap gap-1.5">
            {terms.map((t) => {
              const isMatched = matched[t.id];
              const isSelected = selectedTerm?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => !isMatched && setSelectedTerm(t)}
                  disabled={isMatched}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition active:scale-[0.97] ${
                    isMatched
                      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                      : isSelected
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white border-slate-200 text-slate-700"
                  }`}
                >
                  {t.front}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            {defs.map((d) => {
              const isMatched = matched[d.id];
              const isWrong = wrongDef === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => tapDef(d)}
                  disabled={isMatched}
                  className={`w-full text-left p-3.5 rounded-2xl border text-xs leading-relaxed transition ${
                    isMatched
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : isWrong
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : "bg-white border-slate-200 text-slate-600 active:scale-[0.99]"
                  }`}
                >
                  {d.back}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={start}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold active:scale-[0.97] transition"
      >
        <RotateCcw size={16} />
        {allMatched ? "Play Again" : "New Board"}
      </button>
    </div>
  );
}