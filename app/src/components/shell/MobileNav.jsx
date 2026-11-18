import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NAV_GROUPS, PRIMARY_MOBILE, isMobileActive, isSecondaryPath } from "@/lib/navigation";

export default function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const moreActive = isSecondaryPath(location.pathname);

  function go(to) {
    setOpen(false);
    navigate(to);
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close all sections"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="All sections"
            className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">All sections</p>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close all sections"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {NAV_GROUPS.map((group) => (
              <div key={group.key} className="mb-3">
                <p className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
                <div className="flex flex-col">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active =
                      location.pathname === item.to ||
                      location.pathname.startsWith(`${item.to}/`);
                    return (
                      <button
                        key={item.to}
                        onClick={() => go(item.to)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm font-medium ${
                          active
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300"
                            : "text-slate-600"
                        }`}
                      >
                        <Icon size={18} aria-hidden="true" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
          {PRIMARY_MOBILE.map((item) => {
            const Icon = item.icon;
            const active = isMobileActive(location.pathname, item);
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
                  active ? "text-teal-600" : "text-slate-400"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open all sections"
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition ${
              moreActive ? "text-teal-600" : "text-slate-400"
            }`}
          >
            <Menu size={22} strokeWidth={moreActive ? 2.5 : 2} aria-hidden="true" />
            More
          </button>
        </div>
      </nav>
    </>
  );
}