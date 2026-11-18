import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, Loader2, Sparkles, Stethoscope } from "lucide-react";
import { nurselog } from "@/api/client";
import { useClinicalData } from "@/hooks/useClinicalData";
import { SUGGESTED_TOPICS } from "@/lib/study";
import CenteredState from "@/components/study/CenteredState";
import CaseStudyCard from "@/components/study/CaseStudyCard";

export default function StudyCases() {
  const navigate = useNavigate();
  const { skillLogs } = useClinicalData();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("topic");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCases(await nurselog.entities.CaseStudy.list("-created_date", 100));
    } catch (e) {
      console.error("cases load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasLog = (skillLogs || []).length > 0;

  async function generate() {
    setError("");
    if (mode === "topic" && !topic.trim()) {
      setError("Choose or type a topic first.");
      return;
    }
    setBusy(true);
    try {
      const items = (skillLogs || []).slice(0, 25).map((skill) => ({
        skill_name: skill.skill_name,
        skill_category: skill.skill_category,
        rotation_type: skill.rotation_type,
      }));

      const res = await nurselog.functions.invoke("generateCaseStudy", {
        mode,
        topic: topic.trim(),
        items,
      });
      const data = res.data || {};
      if (data.error) throw new Error(data.error);

      const created = await nurselog.entities.CaseStudy.create({
        title: data.title,
        topic: data.topic,
        difficulty: data.difficulty,
        summary: data.summary,
        patient_profile: data.patient_profile,
        scenario: data.scenario,
        clinical_data: data.clinical_data,
        questions: data.questions,
        source_type: mode,
      });

      navigate(`/study/cases/${created.id}`);
    } catch (e) {
      setError(
        e?.response?.data?.error || e?.message || "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/study")} className="p-2 rounded-lg bg-slate-100">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Case Studies</h1>
          <p className="text-xs text-slate-500">Work through realistic clinical scenarios</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-2 rounded-xl bg-indigo-100 text-indigo-600">
            <Stethoscope size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Build a case study</p>
            <p className="text-[11px] text-slate-400">
              A patient scenario with clinical reasoning questions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 mb-3">
          {[
            { key: "topic", label: "Pick a Topic" },
            { key: "log", label: "From My Log" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setMode(option.key);
                setError("");
              }}
              className={`py-2 rounded-lg text-xs font-semibold transition ${
                mode === option.key ? "bg-white text-teal-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {mode === "topic" ? (
          <div className="mb-3">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Sepsis, Post-op Care…"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_TOPICS.slice(0, 8).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setTopic(suggestion)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                    topic === suggestion
                      ? "bg-teal-500 text-white border-teal-500"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mb-3">
            {hasLog
              ? `Builds a scenario around your ${Math.min(skillLogs.length, 25)} most recent logged skills.`
              : "No skills logged yet — switch to Pick a Topic instead."}
          </p>
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
              <Loader2 size={16} className="animate-spin" /> Building your case…
            </>
          ) : (
            <>
              <Sparkles size={16} /> Generate Case Study
            </>
          )}
        </button>
      </div>

      {loading ? (
        <CenteredState loading message="Loading your case studies…" />
      ) : cases.length === 0 ? (
        <CenteredState
          icon={Stethoscope}
          title="No case studies yet"
          message="Generate one from a topic or from the skills you have logged to practise clinical reasoning."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-800">Your Case Studies</h2>
          {cases.map((studyCase) => (
            <CaseStudyCard
              key={studyCase.id}
              studyCase={studyCase}
              onOpen={() => navigate(`/study/cases/${studyCase.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}