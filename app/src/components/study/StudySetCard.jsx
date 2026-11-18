import { Layers, ClipboardCheck, Puzzle } from "lucide-react";
import { masteryLevel } from "@/lib/study";

export default function StudySetCard({ set, cards, questionCount, onStudy }) {
  const count = cards.length;
  const mastered = cards.filter((c) => (c.mastery || 0) >= 80).length;
  const avg = count ? Math.round(cards.reduce((s, c) => s + (c.mastery || 0), 0) / count) : 0;
  const level = masteryLevel(avg);

  const actions = [
    { key: "flashcards", label: "Cards", icon: Layers, cls: "bg-teal-600 text-white", disabled: count === 0 },
    { key: "exam", label: "Exam", icon: ClipboardCheck, cls: "bg-indigo-600 text-white", disabled: questionCount === 0 },
    { key: "match", label: "Match", icon: Puzzle, cls: "bg-violet-600 text-white", disabled: count < 3 },
  ];

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{set.title}</p>
          {set.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{set.description}</p>
          )}
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${level.text} bg-slate-50`}>
          {level.label}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
          <span>
            {count} cards · {questionCount} questions
          </span>
          <span className="font-semibold text-slate-700">{mastered}/{count} mastered</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full ${level.bar}`} style={{ width: `${avg}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              onClick={() => onStudy(a.key, set.id)}
              disabled={a.disabled}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold active:scale-[0.97] transition disabled:opacity-40 ${a.cls}`}
            >
              <Icon size={15} />
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}