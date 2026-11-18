import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nurselog } from "@/api/client";
import { useSettings } from "@/hooks/useSettings";
import { useClinicalData } from "@/hooks/useClinicalData";
import { getEffectiveRotations } from "@/lib/clinical";
import PatientIdField from "@/components/PatientIdField";
import { CheckCircle2 } from "lucide-react";

export default function Details() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { reload } = useClinicalData();
  const rotations = getEffectiveRotations(settings);

  const [form, setForm] = useState({
    skill_name: "",
    date: new Date().toISOString().slice(0, 10),
    attempt_number: 1,
    successful: true,
    patient_id: "",
    rotation_type: settings?.default_rotation || "med-surg",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.skill_name) return;
    setSaving(true);
    await nurselog.entities.SkillLog.create({
      ...form,
      skill_category: "Other",
      notes: "",
      preceptor_name: "",
      semester: settings?.semester || "",
      is_signed: false,
      signature_data: "",
      signer_name: "",
      signed_at: null,
    });
    await reload();
    setSaving(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center">
        <div className="p-4 rounded-full bg-emerald-100">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Details Saved</h2>
        <button
          onClick={() => navigate("/")}
          className="py-3.5 px-8 rounded-xl bg-teal-600 text-white font-semibold active:scale-95"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Quick Details</h1>
        <p className="text-sm text-slate-500">Fast entry for a skill attempt.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skill Name</label>
        <input
          type="text"
          value={form.skill_name}
          onChange={(e) => set("skill_name", e.target.value)}
          placeholder="Skill name"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Attempt #</label>
        <input
          type="number"
          min="1"
          value={form.attempt_number}
          onChange={(e) => set("attempt_number", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rotation</label>
        <select
          value={form.rotation_type}
          onChange={(e) => set("rotation_type", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none capitalize"
        >
          {rotations.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <PatientIdField value={form.patient_id} onChange={(v) => set("patient_id", v)} />

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Successful?</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => set("successful", true)}
            className={`py-3 rounded-xl font-semibold transition active:scale-95 ${
              form.successful ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => set("successful", false)}
            className={`py-3 rounded-xl font-semibold transition active:scale-95 ${
              !form.successful ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            No
          </button>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving || !form.skill_name}
        className="py-4 rounded-xl bg-blue-600 text-white font-bold text-lg active:scale-95 transition shadow-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Details"}
      </button>
    </div>
  );
}