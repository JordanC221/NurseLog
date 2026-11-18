import { useState } from "react";
import { nurselog } from "@/api/client";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { SUGGESTED_TOPICS, persistStudySet } from "@/lib/study";

export default function GeneratePanel({ skillLogs, onGenerated }) {
  const [mode, setMode] = useState("log");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const hasLog = (skillLogs || []).length > 0;

  const generate = async () => {
    setError("");
    if (mode === "topic" && !topic.trim()) {
      setError("Choose or type a topic first.");
      return;
    }
    setBusy(true);
    setStatus("Reviewing your clinical log…");
    try {
      const items = (skillLogs || []).slice(0, 25).map((s) => ({
        skill_name: s.skill_name,
        skill_category: s.skill_category,
        rotation_type: s.rotation_type,
        notes: s.notes,
      }));

      const res = await nurselog.functions.invoke("generateStudySet", {
        mode,
        topic: topic.trim(),
        items,
      });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);

      setStatus("Building flashcards and questions…");

      const set = await persistStudySet(data, {
        sourceType: mode,
        topic: mode === "topic" ? topic.trim() : "Clinical log",
      });

      setTopic("");
      onGenerated(set);
    } catch (e) {
      const msg =
        e?.response?.data?.error || e?.message || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
      setStatus("");
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="p-2 rounded-xl bg-teal-100 text-teal-600">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">Generate Study Material</p>
          <p className="text-[11px] text-slate-400">Adaptive AI builds cards and questions for you</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-3">
        {[
          { key: "log", label: "From My Log" },
          { key: "topic", label: "Pick a Topic" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setMode(t.key);
              setError("");
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition ${
              mode === t.key ? "bg-white text-teal-600 shadow-sm" : "text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "log" ? (
        <p className="text-xs text-slate-500 mb-3">
          {hasLog
            ? `Uses your ${Math.min(skillLogs.length, 25)} most recent logged skills to build review material.`
            : "No skills logged yet — switch to Pick a Topic to study something new."}
        </p>
      ) : (
        <div className="mb-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Pharmacology, Fluid & Electrolytes…"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
          />
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                  topic === t
                    ? "bg-teal-500 text-white border-teal-500"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-[11px] mb-3">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={generate}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.98] transition disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {status || "Generating…"}
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generate Study Set
          </>
        )}
      </button>
    </div>
  );
}