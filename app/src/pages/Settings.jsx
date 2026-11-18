import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { useClinicalData } from "@/hooks/useClinicalData";
import { nurselog } from "@/api/client";
import { getEffectiveRotations } from "@/lib/clinical";
import { Shield, Trash2, Save, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { queryClientInstance } from "@/lib/query-client";

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { settings, saveSettings, loading } = useSettings();
  const { reload } = useClinicalData();
  const { preference, setTheme } = useTheme();
  const [form, setForm] = useState(null);
  const [newRotation, setNewRotation] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  async function signOut() {
    setLogoutError("");
    try {
      await logout(false);
      queryClientInstance.clear();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Could not log out. Please try again.");
    }
  }

  useEffect(() => {
    if (settings && !form) {
      setForm({
        student_name: settings.student_name || "",
        school_name: settings.school_name || "",
        semester: settings.semester || "",
        required_total_hours: settings.required_total_hours ?? 180,
        required_skill_count: settings.required_skill_count ?? 120,
        semester_start: settings.semester_start || "",
        semester_end: settings.semester_end || "",
        default_rotation: settings.default_rotation || "med-surg",
        theme_mode: settings.theme_mode || "light",
        custom_rotations: settings.custom_rotations || [],
      });
    }
  }, [settings, form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    await saveSettings({
      ...form,
      theme_mode: preference === "dark" ? "dark" : "light",
      required_total_hours: Number(form.required_total_hours) || 180,
      required_skill_count: Number(form.required_skill_count) || 120,
    });
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  }

  async function addRotation() {
    const r = newRotation.trim();
    if (!r) return;
    set("custom_rotations", [...form.custom_rotations, r]);
    setNewRotation("");
  }

  function removeRotation(r) {
    set(
      "custom_rotations",
      form.custom_rotations.filter((x) => x !== r)
    );
  }

  async function resetSemester() {
    if (!confirm("Delete ALL skill logs and hours sessions? This cannot be undone.")) return;
    await nurselog.entities.SkillLog.deleteMany({});
    await nurselog.entities.HoursSession.deleteMany({});
    await reload();
    alert("Semester data reset.");
  }

  if (loading || !form) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-slate-900">Settings</h1>

      <Section title="Profile">
        <Field label="Student Name">
          <input
            type="text"
            value={form.student_name}
            onChange={(e) => set("student_name", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="School Name">
          <input
            type="text"
            value={form.school_name}
            onChange={(e) => set("school_name", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Semester">
          <input
            type="text"
            value={form.semester}
            onChange={(e) => set("semester", e.target.value)}
            placeholder="e.g. Fall 2026"
            className="input"
          />
        </Field>
      </Section>

      <Section title="Semester Requirements">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Required Hours">
            <input
              type="number"
              value={form.required_total_hours}
              onChange={(e) => set("required_total_hours", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Required Skills">
            <input
              type="number"
              value={form.required_skill_count}
              onChange={(e) => set("required_skill_count", e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Semester Start">
            <input
              type="date"
              value={form.semester_start}
              onChange={(e) => set("semester_start", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Semester End">
            <input
              type="date"
              value={form.semester_end}
              onChange={(e) => set("semester_end", e.target.value)}
              className="input"
            />
          </Field>
        </div>
      </Section>

      <Section title="Rotations">
        <Field label="Default Rotation">
          <select
            value={form.default_rotation}
            onChange={(e) => set("default_rotation", e.target.value)}
            className="input capitalize"
          >
            {getEffectiveRotations(form).map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
        </Field>
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Custom Rotations</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.custom_rotations.map((r) => (
              <span
                key={r}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-sm text-slate-700"
              >
                {r}
                <button onClick={() => removeRotation(r)} className="text-slate-400">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRotation}
              onChange={(e) => setNewRotation(e.target.value)}
              placeholder="Add rotation"
              className="input flex-1"
            />
            <button
              onClick={addRotation}
              className="px-4 rounded-xl bg-slate-800 text-white font-medium active:scale-95"
            >
              Add
            </button>
          </div>
        </div>
      </Section>

      <Section title="Appearance">
        <Field label="Theme">
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "light", label: "Light", icon: Sun },
              { key: "dark", label: "Dark", icon: Moon },
              { key: "system", label: "System", icon: Monitor },
            ].map((option) => {
              const Icon = option.icon;
              const active = preference === option.key;
              return (
                <button
                  key={option.key}
                  onClick={() => setTheme(option.key)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-semibold transition active:scale-95 ${
                    active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Applies immediately and is remembered on this device. System follows your device
            setting. This is the same control as the button in the top bar.
          </p>
        </Field>
      </Section>

      <Section title="Privacy">
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300">
          <Shield size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-snug">
            Never enter real patient names or dates of birth. Use non-identifying Patient IDs
            only. Signed entries are locked and cannot be edited.
          </p>
        </div>
      </Section>

      <Section title="Security">
        <button
          onClick={() => navigate("/mfa")}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-slate-50 text-slate-700 font-semibold"
        >
          <Shield size={18} /> Two-factor authentication
        </button>
      </Section>

      <Section title="Account">
        {logoutError && <p className="text-sm text-rose-600">{logoutError}</p>}
        <button
          onClick={signOut}
          className="w-full py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold"
        >
          Log out
        </button>
      </Section>

      <Section title="Data">
        <button
          onClick={resetSemester}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-rose-50 text-rose-600 font-semibold active:scale-95"
        >
          <Trash2 size={18} /> Reset Semester Data
        </button>
      </Section>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-teal-600 text-white font-bold text-lg active:scale-95 transition shadow-sm disabled:opacity-50 sticky bottom-20"
      >
        <Save size={20} /> {saving ? "Saving…" : "Save Settings"}
      </button>
      {savedMsg && (
        <p className="text-center text-sm text-emerald-600 font-medium">Settings saved.</p>
      )}

      <style>{`
        .input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          outline: none;
        }
        .input:focus { box-shadow: 0 0 0 2px rgb(20 184 166); }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}