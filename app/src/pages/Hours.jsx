import { useState, useEffect, useRef } from "react";
import { nurselog } from "@/api/client";
import { useSettings } from "@/hooks/useSettings";
import { useClinicalData } from "@/hooks/useClinicalData";
import { getEffectiveRotations, formatDuration, minutesToHours } from "@/lib/clinical";
import { Play, Square, Plus, Clock } from "lucide-react";

export default function Hours() {
  const { settings, saveSettings } = useSettings();
  const { sessions, reload } = useClinicalData();
  const rotations = getEffectiveRotations(settings);

  const [selectedRotation, setSelectedRotation] = useState(
    settings?.default_rotation || "med-surg"
  );
  const [newRotation, setNewRotation] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("");
  const [manualRotation, setManualRotation] = useState(
    settings?.default_rotation || "med-surg"
  );
  const [busy, setBusy] = useState(false);
  const timerRef = useRef(null);

  const activeSession = sessions.find((s) => s.is_active);

  useEffect(() => {
    if (activeSession) {
      const update = () => {
        const mins = (Date.now() - new Date(activeSession.start_time).getTime()) / 60000;
        setElapsed(mins);
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => clearInterval(timerRef.current);
    } else {
      setElapsed(0);
    }
  }, [activeSession]);

  async function startSession() {
    if (activeSession) return;
    setBusy(true);
    await nurselog.entities.HoursSession.create({
      start_time: new Date().toISOString(),
      rotation_type: selectedRotation,
      is_active: true,
      duration_minutes: 0,
      semester: settings?.semester || "",
    });
    await reload();
    setBusy(false);
  }

  async function stopSession() {
    if (!activeSession) return;
    setBusy(true);
    const end = new Date();
    const start = new Date(activeSession.start_time);
    const mins = Math.round((end - start) / 60000);
    await nurselog.entities.HoursSession.update(activeSession.id, {
      end_time: end.toISOString(),
      duration_minutes: mins,
      is_active: false,
    });
    await reload();
    setBusy(false);
  }

  async function addManual() {
    const mins = Number(manualMinutes);
    if (!mins || mins <= 0) return;
    setBusy(true);
    const now = new Date();
    const start = new Date(now.getTime() - mins * 60000);
    await nurselog.entities.HoursSession.create({
      start_time: start.toISOString(),
      end_time: now.toISOString(),
      duration_minutes: mins,
      rotation_type: manualRotation,
      is_active: false,
      semester: settings?.semester || "",
    });
    setManualMinutes("");
    await reload();
    setBusy(false);
  }

  async function addCustomRotation() {
    const r = newRotation.trim();
    if (!r || rotations.includes(r)) return;
    await saveSettings({
      custom_rotations: [...(settings?.custom_rotations || []), r],
    });
    setNewRotation("");
    setSelectedRotation(r);
  }

  const completedSessions = sessions.filter((s) => !s.is_active);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Clock In / Out</h1>
        <p className="text-sm text-slate-500">Track clinical hours in real time.</p>
      </div>

      <div className="p-5 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              activeSession ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
            }`}
          />
          <span className={activeSession ? "text-emerald-600" : "text-slate-400"}>
            {activeSession ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="text-4xl font-bold text-slate-900 tabular-nums">
          {formatDuration(elapsed)}
        </div>
        {activeSession && (
          <p className="text-sm text-slate-500 capitalize">
            {activeSession.rotation_type} · started{" "}
            {new Date(activeSession.start_time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {!activeSession && (
          <div className="w-full mt-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Rotation</label>
            <select
              value={selectedRotation}
              onChange={(e) => setSelectedRotation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none capitalize"
            >
              {rotations.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeSession ? (
          <button
            onClick={stopSession}
            disabled={busy}
            className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-xl bg-rose-600 text-white font-bold text-lg active:scale-95 transition disabled:opacity-50"
          >
            <Square size={20} fill="white" /> Stop & Save
          </button>
        ) : (
          <button
            onClick={startSession}
            disabled={busy}
            className="w-full mt-2 flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg active:scale-95 transition disabled:opacity-50"
          >
            <Play size={20} fill="white" /> Start
          </button>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-1">Total Hours Logged</p>
        <p className="text-2xl font-bold text-slate-900">
          {minutesToHours(totalMinutes).toFixed(1)} h
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">Add Custom Rotation</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newRotation}
            onChange={(e) => setNewRotation(e.target.value)}
            placeholder="e.g. OR, PACU"
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={addCustomRotation}
            className="px-4 rounded-xl bg-slate-800 text-white active:scale-95"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-3">Manual Entry (correction)</p>
        <div className="flex flex-col gap-2">
          <select
            value={manualRotation}
            onChange={(e) => setManualRotation(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none capitalize"
          >
            {rotations.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={manualMinutes}
              onChange={(e) => setManualMinutes(e.target.value)}
              placeholder="Minutes"
              min="1"
              className="flex-1 px-4 py-3 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <button
              onClick={addManual}
              disabled={busy || !manualMinutes}
              className="px-5 rounded-xl bg-indigo-600 text-white font-semibold active:scale-95 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Recent Sessions</h2>
        <div className="flex flex-col gap-2">
          {completedSessions.slice(0, 8).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 capitalize">
                    {s.rotation_type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {s.start_time?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-700">
                {formatDuration(s.duration_minutes || 0)}
              </span>
            </div>
          ))}
          {completedSessions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No sessions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}