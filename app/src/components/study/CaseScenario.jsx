import { Activity, User } from "lucide-react";

export default function CaseScenario({ studyCase }) {
  const paragraphs = String(studyCase.scenario || "").split(/\n+/).filter(Boolean);
  const dataLines = String(studyCase.clinical_data || "").split(/\n+/).filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      {studyCase.patient_profile && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-indigo-50">
          <User size={18} className="text-indigo-600 mt-0.5 shrink-0" />
          <p className="text-sm text-indigo-900 font-medium">{studyCase.patient_profile}</p>
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Scenario</h2>
          <div className="flex flex-col gap-3">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm text-slate-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}

      {dataLines.length > 0 && (
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <h2 className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">
            <Activity size={13} /> Clinical Data
          </h2>
          <div className="flex flex-col gap-1.5">
            {dataLines.map((line, index) => (
              <p key={index} className="text-[13px] text-slate-600 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}