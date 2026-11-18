import { Layers, Target, Zap, Flame } from "lucide-react";
import { formatAccuracy } from "@/lib/study";

export default function StudyStats({ cards, attempts }) {
  const mastered = cards.filter((c) => (c.mastery || 0) >= 80).length;
  const dueNow = cards.filter(
    (c) => !c.next_review || new Date(c.next_review).getTime() <= Date.now()
  ).length;
  const totalCorrect = attempts.reduce((s, a) => s + (a.score || 0), 0);
  const totalAsked = attempts.reduce((s, a) => s + (a.total || 0), 0);

  const items = [
    { label: "Total Cards", value: cards.length, icon: Layers, cls: "bg-violet-100 text-violet-600" },
    { label: "Reviewed often", value: mastered, icon: Target, cls: "bg-emerald-100 text-emerald-600" },
    { label: "Due Now", value: dueNow, icon: Zap, cls: "bg-amber-100 text-amber-600" },
    { label: "Accuracy", value: formatAccuracy(totalCorrect, totalAsked), icon: Flame, cls: "bg-teal-100 text-teal-600" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm"
          >
            <span className={`p-2 rounded-xl ${it.cls}`}>
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-400 font-medium">{it.label}</p>
              <p className="text-base font-bold text-slate-900">{it.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}