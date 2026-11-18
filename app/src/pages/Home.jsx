import { useNavigate } from "react-router-dom";
import {
  PenLine,
  ClipboardList,
  Clock,
  LayoutDashboard,
  FileText,
  History,
  ChevronRight,
  GraduationCap,
  CalendarDays,
  ListChecks,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useClinicalData } from "@/hooks/useClinicalData";
import { useSettings } from "@/hooks/useSettings";
import { useSchedule } from "@/hooks/useSchedule";
import { formatHours } from "@/lib/clinical";
import { useClinicalTotals } from "@/hooks/useClinicalTotals";
import ProgressBar from "@/components/ProgressBar";
import UpcomingScheduleCard from "@/components/UpcomingScheduleCard";

export default function Home() {
  const navigate = useNavigate();
  const { skillLogs, sessions, loading } = useClinicalData();
  const { settings } = useSettings();
  const { sessions: classSessions } = useSchedule();

  const stats = useClinicalTotals(settings);
  const activeSession = sessions.find((s) => s.is_active);
  const recentSkill = skillLogs[0];
  const recentSigned = skillLogs.find((s) => s.is_signed);

  const actions = [
    { label: "Skill Logging", icon: PenLine, path: "/log", color: "bg-teal-500" },
    { label: "Details", icon: ClipboardList, path: "/details", color: "bg-blue-500" },
    { label: "Clock In / Out", icon: Clock, path: "/hours", color: "bg-indigo-500" },
    { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", color: "bg-violet-500" },
    { label: "Class Schedule", icon: CalendarDays, path: "/schedule", color: "bg-sky-500" },
    { label: "Skill Checklist", icon: ListChecks, path: "/checklist", color: "bg-amber-500" },
    { label: "Generate PDF", icon: FileText, path: "/reports", color: "bg-emerald-500" },
    { label: "Recent Entries", icon: History, path: "/history", color: "bg-slate-600" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-slate-500">Welcome back</p>
        <h1 className="text-2xl font-bold text-slate-900">
          {settings?.student_name || "Student"}
        </h1>
        {settings?.semester && (
          <p className="text-xs text-slate-400 mt-0.5">{settings.semester}</p>
        )}
      </div>

      {activeSession && (
        <button
          onClick={() => navigate("/hours")}
          className="flex items-center justify-between p-4 rounded-2xl bg-indigo-600 text-white active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <div className="text-left">
              <p className="text-sm font-semibold">Session Active</p>
              <p className="text-xs text-indigo-100 capitalize">{activeSession.rotation_type}</p>
            </div>
          </div>
          <span className="text-sm font-medium">Tap to stop →</span>
        </button>
      )}

      <UpcomingScheduleCard sessions={classSessions} onOpen={() => navigate("/schedule")} />

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[11px] text-slate-400 font-medium">Total Hours</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatHours(stats.totalHours)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[11px] text-slate-400 font-medium">Semester</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatHours(stats.totalHours)}</p>
        </div>
        <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[11px] text-slate-400 font-medium">Remaining</p>
          <p className="text-lg font-bold text-teal-600 mt-0.5">{formatHours(stats.hoursRemaining)}</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
        <ProgressBar value={stats.hoursProgress} label="Overall Progress" color="teal" />
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Current rotation</span>
          <span className="font-semibold text-slate-700 capitalize">
            {settings?.default_rotation || "med-surg"}
          </span>
        </div>
      </div>

      <button
        onClick={() => navigate("/study")}
        className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 text-white active:scale-[0.98] transition"
      >
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-white/20">
            <GraduationCap size={22} />
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold">AI Study Coach</p>
            <p className="text-xs text-teal-50">Flashcards, exams & games from your log</p>
          </div>
        </div>
        <ChevronRight size={18} />
      </button>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.97] transition text-left"
            >
              <span className={`p-2.5 rounded-xl ${a.color} text-white`}>
                <Icon size={22} />
              </span>
              <span className="text-sm font-semibold text-slate-800">{a.label}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <SectionRow
          icon={PenLine}
          label="Most recent skill"
          value={recentSkill ? recentSkill.skill_name : "—"}
          sub={recentSkill ? recentSkill.date : ""}
          onClick={() => navigate("/history")}
        />
        <SectionRow
          icon={CheckCircle2}
          label="Most recent signed"
          value={recentSigned ? recentSigned.skill_name : "—"}
          sub={recentSigned ? recentSigned.signed_at?.slice(0, 10) : ""}
          onClick={() => navigate("/history")}
        />
        <SectionRow
          icon={AlertCircle}
          label="Pending unsigned"
          value={loading ? "…" : `${stats.unsignedCount} entries`}
          sub={stats.unsignedCount > 0 ? "Tap to review" : "All signed"}
          onClick={() => navigate("/history")}
          accent={stats.unsignedCount > 0 ? "amber" : null}
        />
      </div>
    </div>
  );
}

function SectionRow({ icon: Icon, label, value, sub, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.98] transition text-left w-full"
    >
      <span
        className={`p-2 rounded-xl ${
          accent === "amber" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <ChevronRight size={18} className="text-slate-300" />
    </button>
  );
}