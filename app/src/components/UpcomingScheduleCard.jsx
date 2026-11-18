import { useMemo } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { dayLabel, timeRange, typeMeta, upcomingOccurrences } from "@/lib/schedule";

export default function UpcomingScheduleCard({ sessions, onOpen }) {
  const next = useMemo(() => upcomingOccurrences(sessions, 60)[0], [sessions]);

  if (!next) {
    return (
      <button
        onClick={onOpen}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-dashed border-slate-300 active:scale-[0.98] transition"
      >
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-slate-100 text-slate-500">
            <CalendarDays size={20} />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-slate-800">Class Schedule</p>
            <p className="text-xs text-slate-500">Add your class dates and clinical times</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </button>
    );
  }

  const meta = typeMeta(next.session.session_type);

  return (
    <button
      onClick={onOpen}
      className="w-full text-left p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          Next up · {dayLabel(next.date)}
        </p>
        <ChevronRight size={16} className="text-slate-300" />
      </div>
      <div className="flex items-start gap-3 mt-2">
        <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${meta.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{next.session.title}</p>
          <p className="text-xs text-slate-500">{timeRange(next.session)}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.chip}`}>
          {meta.label}
        </span>
      </div>
    </button>
  );
}