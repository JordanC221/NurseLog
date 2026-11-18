import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, Minus, PenLine, Plus, Trash2 } from "lucide-react";

export default function SkillProgressRow({ item, busy, onLog, onTargetChange, onRemove }) {
  const [open, setOpen] = useState(false);
  const complete = item.done;
  const started = item.successes > 0;

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-3.5 text-left active:scale-[0.99] transition"
      >
        {complete ? (
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
        ) : (
          <Circle size={20} className={started ? "text-amber-400 shrink-0" : "text-slate-300 shrink-0"} />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{item.req.name}</p>
          <p className="text-[11px] text-slate-400">
            {item.req.category} · {item.successes} of {item.target} logged
            {item.signed > 0 ? ` · ${item.signed} signed` : ""}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            complete
              ? "bg-emerald-50 text-emerald-700"
              : started
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {complete ? "Complete" : started ? "In progress" : "Not started"}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-300 shrink-0 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-3">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                complete ? "bg-emerald-500" : "bg-teal-500"
              }`}
              style={{ width: `${item.percent}%` }}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onLog}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.97] transition"
            >
              <PenLine size={15} /> Log this skill
            </button>
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100">
              <button
                onClick={() => onTargetChange(Math.max(1, item.target - 1))}
                disabled={busy}
                className="p-1.5 rounded-lg bg-white text-slate-600 active:scale-95 disabled:opacity-50"
              >
                <Minus size={14} />
              </button>
              <span className="w-7 text-center text-sm font-bold text-slate-700">{item.target}</span>
              <button
                onClick={() => onTargetChange(item.target + 1)}
                disabled={busy}
                className="p-1.5 rounded-lg bg-white text-slate-600 active:scale-95 disabled:opacity-50"
              >
                <Plus size={14} />
              </button>
            </div>
            <button
              onClick={onRemove}
              disabled={busy}
              className="p-2.5 rounded-xl bg-rose-50 text-rose-600 active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}