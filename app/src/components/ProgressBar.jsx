export default function ProgressBar({ value, label, color = "teal" }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const colorMap = {
    teal: "bg-teal-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
  };
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{label}</span>
          <span className="font-semibold text-slate-700">{pct.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorMap[color]} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}