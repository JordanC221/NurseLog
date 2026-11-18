import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { nurselog } from "@/api/client";
import { useSettings } from "@/hooks/useSettings";
import { useClinicalData } from "@/hooks/useClinicalData";
import {
  SKILL_CATEGORIES,
  COMMON_SKILLS,
  getEffectiveRotations,
} from "@/lib/clinical";
import PatientIdField from "@/components/PatientIdField";
import SignaturePad from "@/components/SignaturePad";
import { CheckCircle2, X } from "lucide-react";

const SKILL_FROM_URL = new URLSearchParams(window.location.search).get("skill") || "";

export default function LogSkill() {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { reload } = useClinicalData();
  const sigRef = useRef(null);

  const rotations = getEffectiveRotations(settings);

  const [form, setForm] = useState({
    skill_name: SKILL_FROM_URL,
    skill_category: SKILL_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10),
    attempt_number: 1,
    successful: true,
    notes: "",
    patient_id: "",
    rotation_type: settings?.default_rotation || "med-surg",
    preceptor_name: "",
  });
  const [phase, setPhase] = useState("form"); // form | sign | done
  const [signerName, setSignerName] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submitEntry(signed, signatureData, signedAt) {
    setSaving(true);
    const payload = {
      ...form,
      attempt_number: Number(form.attempt_number) || 1,
      semester: settings?.semester || "",
      is_signed: signed,
      signature_data: signatureData || "",
      signer_name: signed ? signerName : "",
      signed_at: signedAt || null,
    };
    await nurselog.entities.SkillLog.create(payload);
    await reload();
    setSaving(false);
    setPhase("done");
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (!form.skill_name) return;
    setPhase("sign");
  }

  function handleSignature(dataUrl) {
    submitEntry(true, dataUrl, new Date().toISOString());
  }

  function skipSignature() {
    submitEntry(false, "", null);
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center">
        <div className="p-4 rounded-full bg-emerald-100">
          <CheckCircle2 size={48} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Entry Saved</h2>
        <p className="text-sm text-slate-500 max-w-xs">
          Your skill log has been recorded successfully.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <button
            onClick={() => {
              setForm({
                skill_name: SKILL_FROM_URL,
                skill_category: SKILL_CATEGORIES[0],
                date: new Date().toISOString().slice(0, 10),
                attempt_number: 1,
                successful: true,
                notes: "",
                patient_id: "",
                rotation_type: settings?.default_rotation || "med-surg",
                preceptor_name: "",
              });
              setSignerName("");
              setPhase("form");
            }}
            className="py-3.5 rounded-xl bg-teal-600 text-white font-semibold active:scale-95 transition"
          >
            Log Another Skill
          </button>
          <button
            onClick={() => navigate("/")}
            className="py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold active:scale-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  if (phase === "sign") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Supervising Nurse Signoff</h1>
          <button onClick={() => setPhase("form")} className="p-2 rounded-lg bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-3 rounded-xl bg-slate-100 text-sm">
          <p className="font-semibold text-slate-800">{form.skill_name}</p>
          <p className="text-slate-500 capitalize">
            {form.rotation_type} · {form.date}
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Supervising Nurse Name
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Nurse name"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </div>
        <p className="text-sm text-slate-600">
          Hand the phone to your supervising nurse to sign below.
        </p>
        <SignaturePad ref={sigRef} onConfirm={handleSignature} disabled={saving} />
        <div className="flex flex-col gap-2">
          <button
            onClick={skipSignature}
            disabled={saving}
            className="py-3 rounded-xl bg-slate-100 text-slate-600 font-medium active:scale-95 transition"
          >
            Save without signature
          </button>
        </div>
        {saving && (
          <p className="text-center text-sm text-slate-500">Saving & locking entry…</p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-slate-900">Log a Skill</h1>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Skill Name</label>
        <input
          type="text"
          value={form.skill_name}
          onChange={(e) => set("skill_name", e.target.value)}
          placeholder="Skill name"
          required
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
        />
        <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
          {COMMON_SKILLS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => set("skill_name", s)}
              className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 text-xs font-medium text-slate-600 active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
        <select
          value={form.skill_category}
          onChange={(e) => set("skill_category", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
        >
          {SKILL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
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
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rotation</label>
        <select
          value={form.rotation_type}
          onChange={(e) => set("rotation_type", e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none capitalize"
        >
          {rotations.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preceptor Name</label>
        <input
          type="text"
          value={form.preceptor_name}
          onChange={(e) => set("preceptor_name", e.target.value)}
          placeholder="Optional"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
        />
      </div>

      <PatientIdField value={form.patient_id} onChange={(v) => set("patient_id", v)} />

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Optional notes"
          className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Successful?</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => set("successful", true)}
            className={`py-3 rounded-xl font-semibold transition active:scale-95 ${
              form.successful
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => set("successful", false)}
            className={`py-3 rounded-xl font-semibold transition active:scale-95 ${
              !form.successful
                ? "bg-rose-600 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            No
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="py-4 rounded-xl bg-teal-600 text-white font-bold text-lg active:scale-95 transition shadow-sm"
      >
        Continue to Signoff →
      </button>
    </form>
  );
}