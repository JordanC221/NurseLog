import { AlertTriangle, Check, Loader2 } from "lucide-react";

/**
 * Visible save state for any activity that writes to the account.
 * Never silently swallow a failed write.
 */
export default function SaveStatus({ status, pending = 0, onRetry }) {
  if (status === "idle") return null;

  if (status === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
        <Loader2 size={12} className="animate-spin" aria-hidden="true" /> Saving…
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
        <Check size={12} aria-hidden="true" /> Saved
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-600">
      <AlertTriangle size={12} aria-hidden="true" />
      Not saved{pending > 0 ? ` (${pending})` : ""}
      {onRetry && (
        <button
          onClick={onRetry}
          className="ml-1 rounded-md bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700"
        >
          Retry
        </button>
      )}
    </span>
  );
}