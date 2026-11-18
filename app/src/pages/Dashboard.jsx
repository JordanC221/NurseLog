import { useNavigate } from "react-router-dom";
import { useClinicalData } from "@/hooks/useClinicalData";
import { useSettings } from "@/hooks/useSettings";
import { formatHours, formatDuration } from "@/lib/clinical";
import { useClinicalTotals } from "@/hooks/useClinicalTotals";
import ProgressBar from "@/components/ProgressBar";
import { Clock, CheckCircle2, AlertCircle, FileText, Lock } from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { skillLogs, sessions } = useClinicalData();
  const { settings } = useSettings();
  const stats = useClinicalTotals(settings);

  const recentSessions = sessions.filter((s) => !s.is_active).slice(0, 5);
  const recentSigned = skillLogs.filter((s) => s.is_signed).slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-sm">
        <p className="text-sm text-teal-100">Total Logged Hours</p>
        <p className="text-3xl font-bold mt-1">{formatHours(stats.totalHours)}</p>
        <p className="text-sm text-teal-100 mt-1">
          {formatHours(stats.hoursRemaining)} remaining of {stats.requiredHours}h required
        </p>
        <div className="mt-3 h-2.5 w-full rounded-full bg-teal-800/40 overflow-hidden">
          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{ width: `${stats.hoursProgress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <ProgressBar value={stats.skillsProgress} label="Skills" color="blue" />
          <p className="text-xs text-slate-500 mt-2">
            {stats.completedSkills} / {stats.requiredSkills} completed
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-xs font-semibold text-slate-500">Unsigned</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.unsignedCount}</p>
          <button
            onClick={() => navigate("/history")}
            className="text-xs text-teal-600 font-medium mt-1"
          >
            Review →
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Hours by Rotation</h2>
        <div className="flex flex-col gap-2">
          {Object.entries(stats.hoursByRotation).length === 0 && (
            <p className="text-sm text-slate-400">No hours logged yet.</p>
          )}
          {Object.entries(stats.hoursByRotation).map(([r, h]) => (
            <div key={r} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 capitalize">{r}</span>
              <span className="text-sm font-semibold text-slate-800">{formatHours(h)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Recent Clinical Sessions</h2>
        <div className="flex flex-col gap-2">
          {recentSessions.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No sessions yet.</p>
          )}
          {recentSessions.map((s) => (
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
                  <p className="text-xs text-slate-400">{s.start_time?.slice(0, 10)}</p>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-700">
                {formatDuration(s.duration_minutes || 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Recent Signed Entries</h2>
        <div className="flex flex-col gap-2">
          {recentSigned.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No signed entries yet.</p>
          )}
          {recentSigned.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Lock size={16} className="text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.skill_name}</p>
                  <p className="text-xs text-slate-400">
                    {s.signer_name} · {s.signed_at?.slice(0, 10)}
                  </p>
                </div>
              </div>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => navigate("/reports")}
        className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-bold active:scale-95 transition"
      >
        <FileText size={20} /> Generate PDF Report
      </button>
    </div>
  );
}