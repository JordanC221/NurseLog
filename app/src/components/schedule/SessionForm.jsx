import { useState } from "react";
import { Repeat, X } from "lucide-react";
import { SESSION_TYPES } from "@/lib/schedule";
import { getEffectiveRotations } from "@/lib/clinical";

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-teal-500 outline-none";
const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

export default function SessionForm({ initial, settings, saving, onSave, onCancel }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    title: initial?.title || "",
    session_type: initial?.session_type || "class",
    start_date: initial?.start_date || today,
    start_time: initial?.start_time || "09:00",
    end_time: initial?.end_time || "12:00",
    repeat_weekly: initial?.repeat_weekly || false,
    repeat_until: initial?.repeat_until || "",
    location: initial?.location || "",
    instructor: initial?.instructor || "",
    rotation_type: initial?.rotation_type || settings?.default_rotation || "med-surg",
    notes: initial?.notes || "",
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const rotations = getEffectiveRotations(settings);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onSave(form);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">
          {initial ? "Edit Session" : "New Session"}
        </h1>
        <button type="button" onClick={onCancel} className="p-2 rounded-lg bg-slate-100">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="e.g. Med-Surg Lecture"
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Type</label>
        <div className="flex flex-wrap gap-1.5">
          {SESSION_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => set("session_type", type.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                form.session_type === type.value
                  ? `${type.chip} border-transparent`
                  : "bg-slate-50 text-slate-500 border-slate-200"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Date</label>
        <input
          type="date"
          value={form.start_date}
          onChange={(e) => set("start_date", e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Start Time</label>
          <input
            type="time"
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End Time</label>
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => set("end_time", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
        <button
          type="button"
          onClick={() => set("repeat_weekly", !form.repeat_weekly)}
          className="w-full flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Repeat size={16} /> Repeats every week
          </span>
          <span
            className={`relative h-6 w-11 rounded-full transition ${
              form.repeat_weekly ? "bg-teal-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 bg-white rounded-full transition-all ${
                form.repeat_weekly ? "left-[22px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
        {form.repeat_weekly && (
          <div className="mt-3">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Repeat until</label>
            <input
              type="date"
              value={form.repeat_until}
              onChange={(e) => set("repeat_until", e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {form.session_type === "clinical" && (
        <div>
          <label className={labelClass}>Rotation</label>
          <select
            value={form.rotation_type}
            onChange={(e) => set("rotation_type", e.target.value)}
            className={`${inputClass} capitalize`}
          >
            {rotations.map((rotation) => (
              <option key={rotation} value={rotation} className="capitalize">
                {rotation}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Location</label>
          <input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Instructor</label>
          <input
            value={form.instructor}
            onChange={(e) => set("instructor", e.target.value)}
            placeholder="Optional"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          placeholder="Optional"
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="py-4 rounded-xl bg-teal-600 text-white font-bold active:scale-95 transition disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Session"}
      </button>
    </form>
  );
}