import { AlertCircle, BookOpen, FileText, Loader2, Sparkles, Trash2 } from "lucide-react";

const KIND_LABELS = {
  outline: "Course outline",
  slides: "Lecture slides",
  handout: "Handout",
  notes: "Notes",
  other: "Material",
};

export default function MaterialCard({ material, busy, error, onGenerate, onStudy, onRemove }) {
  const ready = material.status === "ready" && material.set_id;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`p-2.5 rounded-xl shrink-0 ${
            ready ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          <FileText size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{material.title}</p>
          <p className="text-[11px] text-slate-400 truncate">
            {KIND_LABELS[material.kind] || "Material"}
            {material.course ? ` · ${material.course}` : ""}
          </p>
          <p className="text-[10px] text-slate-300 truncate mt-0.5">{material.file_name}</p>
        </div>
        <button
          onClick={onRemove}
          className="p-2 rounded-lg bg-slate-50 text-slate-400 active:scale-95 transition"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {material.summary && <p className="text-xs text-slate-500 mt-3">{material.summary}</p>}

      {!!(material.topics || []).length && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {material.topics.map((topic) => (
            <span
              key={topic}
              className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-medium"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-[11px] mt-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {ready ? (
          <button
            onClick={onStudy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.97] transition"
          >
            <BookOpen size={15} />
            Study {material.card_count ? `${material.card_count} cards` : "this set"}
          </button>
        ) : (
          <button
            onClick={onGenerate}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.97] transition disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Reading your material…
              </>
            ) : (
              <>
                <Sparkles size={15} /> Generate study set
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}