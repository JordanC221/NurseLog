import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, Monitor, Moon, PenLine, Sun, Timer, Upload } from "lucide-react";
import { pageTitle } from "@/lib/navigation";
import { useTheme } from "@/lib/ThemeContext";

const QUICK_ACTIONS = [
  { label: "Log a skill", to: "/log", icon: PenLine },
  { label: "Start a timer", to: "/hours", icon: Timer },
  { label: "Upload material", to: "/study/materials", icon: Upload },
  { label: "Start a study session", to: "/study", icon: GraduationCap },
];

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor };

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { preference, resolvedTheme, toggleTheme } = useTheme();
  const { title, group } = pageTitle(location.pathname);

  const ThemeIcon = THEME_ICON[preference] || Monitor;
  const nextLabel = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          {group && group !== title && (
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group}
            </p>
          )}
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
        </div>

        <div className="hidden items-center gap-1 sm:flex">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.to}
                onClick={() => navigate(action.to)}
                title={action.label}
                aria-label={action.label}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700"
              >
                <Icon size={18} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <button
          onClick={toggleTheme}
          aria-label={`Appearance: ${preference}. Switch to ${nextLabel} mode`}
          title={`Appearance: ${preference} — switch to ${nextLabel} mode (all three options in Settings)`}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-teal-700"
        >
          <ThemeIcon size={18} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}