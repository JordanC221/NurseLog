import { Loader2 } from "lucide-react";

export default function CenteredState({ icon: Icon, title, message, actionLabel, onAction, loading }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-3 px-6">
      {loading ? (
        <Loader2 size={28} className="animate-spin text-teal-600" />
      ) : (
        Icon && (
          <span className="p-4 rounded-2xl bg-slate-100 text-slate-500">
            <Icon size={28} />
          </span>
        )
      )}
      {title && <p className="text-base font-semibold text-slate-800">{title}</p>}
      {message && <p className="text-sm text-slate-500 max-w-xs">{message}</p>}
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-1 px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-semibold active:scale-[0.97] transition"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}