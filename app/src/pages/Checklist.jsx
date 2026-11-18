import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks, Plus, RefreshCw, X } from "lucide-react";
import { nurselog } from "@/api/client";
import { useClinicalData } from "@/hooks/useClinicalData";
import { SKILL_CATEGORIES } from "@/lib/clinical";
import { DEFAULT_SKILLS, buildChecklist } from "@/lib/checklist";
import CenteredState from "@/components/study/CenteredState";
import SkillProgressRow from "@/components/checklist/SkillProgressRow";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none";

export default function Checklist() {
  const navigate = useNavigate();
  const { skillLogs, loading: logsLoading } = useClinicalData();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("All");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: SKILL_CATEGORIES[0], target_count: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRequirements(await nurselog.entities.SkillRequirement.list("-created_date", 300));
    } catch (e) {
      console.error("checklist load error", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { items, unlisted, summary } = useMemo(
    () => buildChecklist(requirements, skillLogs),
    [requirements, skillLogs]
  );

  const categories = useMemo(() => {
    const found = Array.from(new Set(items.map((item) => item.req.category)));
    found.sort((a, b) => SKILL_CATEGORIES.indexOf(a) - SKILL_CATEGORIES.indexOf(b));
    return ["All", ...found];
  }, [items]);

  const visible = useMemo(() => {
    const filtered =
      filter === "All" ? items : items.filter((item) => item.req.category === filter);
    return [...filtered].sort((a, b) => {
      const order =
        SKILL_CATEGORIES.indexOf(a.req.category) - SKILL_CATEGORIES.indexOf(b.req.category);
      if (order !== 0) return order;
      return a.req.name.localeCompare(b.req.name);
    });
  }, [items, filter]);

  async function addRequirement(name, category, target) {
    const clean = String(name || "").trim();
    if (!clean) return;
    setBusy(true);
    try {
      await nurselog.entities.SkillRequirement.create({
        name: clean,
        category: category || "Other",
        target_count: Number(target) || 1,
        is_required: true,
        is_custom: true,
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function restoreDefaults() {
    setBusy(true);
    try {
      await nurselog.entities.SkillRequirement.bulkCreate(
        DEFAULT_SKILLS.map((skill) => ({ ...skill, is_required: true, is_custom: false }))
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function setTarget(item, value) {
    setBusy(true);
    try {
      await nurselog.entities.SkillRequirement.update(item.req.id, { target_count: value });
      setRequirements((prev) =>
        prev.map((req) => (req.id === item.req.id ? { ...req, target_count: value } : req))
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeRequirement(item) {
    setBusy(true);
    try {
      await nurselog.entities.SkillRequirement.delete(item.req.id);
      setRequirements((prev) => prev.filter((req) => req.id !== item.req.id));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-600">
          <ListChecks size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Skill Checklist</h1>
          <p className="text-xs text-slate-500">Program requirements, tracked from your log</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
              Checklist progress
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {summary.complete}
              <span className="text-base font-semibold text-slate-400"> of {summary.total}</span>
            </p>
          </div>
          <p className="text-lg font-bold text-teal-600">{summary.percent}%</p>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-3">
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{ width: `${summary.percent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          {summary.inProgress} skill{summary.inProgress === 1 ? "" : "s"} in progress · counts
          successful logged attempts
        </p>
      </div>

      {categories.length > 2 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setFilter(category)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filter === category
                  ? "bg-teal-500 text-white border-teal-500"
                  : "bg-white text-slate-500 border-slate-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {adding ? (
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">Add a skill</p>
            <button onClick={() => setAdding(false)} className="p-1.5 rounded-lg bg-slate-100">
              <X size={14} />
            </button>
          </div>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Skill name"
            className={inputClass}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className={inputClass}
            >
              {SKILL_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={draft.target_count}
              onChange={(e) => setDraft({ ...draft, target_count: e.target.value })}
              placeholder="Repetitions"
              className={inputClass}
            />
          </div>
          <button
            onClick={async () => {
              await addRequirement(draft.name, draft.category, draft.target_count);
              setDraft({ name: "", category: SKILL_CATEGORIES[0], target_count: 1 });
              setAdding(false);
            }}
            disabled={busy || !draft.name.trim()}
            className="py-3 rounded-xl bg-teal-600 text-white font-semibold active:scale-[0.98] transition disabled:opacity-60"
          >
            Add to checklist
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 active:scale-[0.98] transition"
        >
          <Plus size={15} /> Add your own skill
        </button>
      )}

      {loading || logsLoading ? (
        <CenteredState loading message="Loading your checklist…" />
      ) : items.length === 0 ? (
        <CenteredState
          icon={ListChecks}
          title="Your checklist is empty"
          message="Load the standard nursing skills checklist, then tailor it to your program's requirements."
          actionLabel={busy ? "Loading…" : "Load standard checklist"}
          onAction={restoreDefaults}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((item) => (
            <SkillProgressRow
              key={item.req.id}
              item={item}
              busy={busy}
              onLog={() => navigate(`/log?skill=${encodeURIComponent(item.req.name)}`)}
              onTargetChange={(value) => setTarget(item, value)}
              onRemove={() => removeRequirement(item)}
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <button
          onClick={restoreDefaults}
          disabled={busy}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-500 active:scale-[0.98] transition disabled:opacity-60"
        >
          <RefreshCw size={15} /> Restore standard checklist
        </button>
      )}

      {unlisted.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
            Logged but not on your checklist
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unlisted.map((entry) => (
              <button
                key={entry.name}
                onClick={() => addRequirement(entry.name, "Other", 1)}
                disabled={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 active:scale-95 transition disabled:opacity-60"
              >
                <Plus size={11} /> {entry.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}