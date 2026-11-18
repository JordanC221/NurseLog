import { AlertTriangle } from "lucide-react";

export default function PatientIdField({ value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Patient ID
      </label>
      <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 mb-2">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs font-semibold text-amber-800 leading-snug">
          DO NOT enter real patient name or dates of birth.
        </p>
      </div>
      <input
        type="text"
        inputMode="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. PT-04A (non-identifying reference only)"
        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
      />
    </div>
  );
}