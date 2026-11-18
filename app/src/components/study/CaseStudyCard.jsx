import { ChevronRight, Stethoscope, Trophy } from "lucide-react";

const DIFFICULTY_CHIP = {
  easy: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  hard: "bg-rose-50 text-rose-700",
};

export default function CaseStudyCard({ studyCase, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition"
    >
      <div className="flex items-start gap-3">
        <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
          <Stethoscope size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{studyCase.title}</p>
          <p className="text-[11px] text-slate-400">
            {studyCase.topic} · {(studyCase.questions || []).length} questions
          </p>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </div>

      {studyCase.summary && (
        <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">{studyCase.summary}</p>
      )}

      <div className="flex items-center gap-2 mt-2.5">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
            DIFFICULTY_CHIP[studyCase.difficulty] || DIFFICULTY_CHIP.medium
          }`}
        >
          {studyCase.difficulty || "medium"}
        </span>
        {studyCase.best_score > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <Trophy size={10} /> Best {studyCase.best_score}%
          </span>
        )}
      </div>
    </button>
  );
}