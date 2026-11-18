import { useLocation, useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { NAV_GROUPS, isActive, isGroupActive } from "@/lib/navigation";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      {/* Tablet: icon rail */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center gap-1 border-r border-slate-200 bg-white py-4 md:flex lg:hidden"
        aria-label="Sections"
      >
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
          <HeartPulse size={20} aria-hidden="true" />
        </div>
        {NAV_GROUPS.map((group) => {
          const Icon = group.icon;
          const active = isGroupActive(location.pathname, group);
          return (
            <button
              key={group.key}
              onClick={() => navigate(group.to)}
              title={group.label}
              aria-label={group.label}
              aria-current={active ? "page" : undefined}
              className={`flex h-14 w-[60px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition ${
                active
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              <span className="truncate">{group.label}</span>
            </button>
          );
        })}
      </aside>

      {/* Desktop: persistent sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex"
        aria-label="Sections"
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <HeartPulse size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-900">NurseLog Pro</p>
            <p className="truncate text-[11px] text-slate-500">Clinical &amp; study companion</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.key} className="mb-3">
              {group.items.length > 1 && (
                <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(location.pathname, item.to);
                  return (
                    <button
                      key={item.to}
                      onClick={() => navigate(item.to)}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition ${
                        active
                          ? "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon size={17} className="shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}