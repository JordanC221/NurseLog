import { MapPin, Repeat } from "lucide-react";
import { timeRange, typeMeta } from "@/lib/schedule";

export default function SessionItem({ session, onClick }) {
  const meta = typeMeta(session.session_type);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition text-left"
    >
      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${meta.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{session.title}</p>
        <p className="text-[12px] text-slate-500 mt-0.5">{timeRange(session)}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.chip}`}>
            {meta.label}
          </span>
          {session.repeat_weekly && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Repeat size={10} /> Weekly
            </span>
          )}
          {session.location && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
              <MapPin size={10} />
              <span className="truncate max-w-[130px]">{session.location}</span>
            </span>
          )}
        </div>
      </div>
    </button>
  );
}