import { BarChart3 } from "lucide-react";
import {
  buildEvidence,
  selfReportSummary,
  formatPercent,
  formatRecency,
  MIN_RESPONSES,
  MIN_DISTINCT_QUESTIONS,
  MIN_DISTINCT_DAYS,
} from "@/lib/evidence";

const TONE = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  slate: "bg-slate-100 text-slate-600",
};

export default function LearningEvidence({ responses = [] }) {
  const summaries = buildEvidence(responses);
  const confidence = selfReportSummary(responses);
  const gradedCount = responses.filter(
    (r) => typeof r.is_correct === "boolean" && r.question_type !== "flashcard"
  ).length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="rounded-lg bg-slate-100 p-1.5 text-slate-600">
          <BarChart3 size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-800">Learning evidence</h2>
          <p className="text-[11px] text-slate-500">
            Built only from graded practice answers. Self-rated confidence is tracked separately
            and never counted as mastery.
          </p>
        </div>
      </div>

      {summaries.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          No graded answers yet. Take a practice exam and evidence will start building here.
        </p>
      ) : (
        <div className="mt-3 flex flex-col divide-y divide-slate-100">
          {summaries.slice(0, 5).map((item) => (
            <div key={item.topic} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                  {item.topic}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    TONE[item.status.tone] || TONE.slate
                  }`}
                >
                  {item.status.label}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-500">{item.status.reason}</p>

              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-slate-500 sm:grid-cols-4">
                <span>
                  <b className="font-semibold text-slate-700">{item.attempts}</b> graded answers
                </span>
                <span>
                  <b className="font-semibold text-slate-700">{item.distinctQuestions}</b> questions
                </span>
                <span>
                  First attempt{" "}
                  <b className="font-semibold text-slate-700">
                    {formatPercent(item.freshAccuracy)}
                  </b>
                </span>
                <span>
                  Delayed{" "}
                  <b className="font-semibold text-slate-700">
                    {formatPercent(item.delayedAccuracy)}
                  </b>
                </span>
              </div>

              <p className="mt-1 text-[10px] text-slate-400">
                {item.distinctDays} day{item.distinctDays === 1 ? "" : "s"} of practice ·{" "}
                {formatRecency(item.daysSinceLast)}
              </p>
            </div>
          ))}
        </div>
      )}

      <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-semibold text-slate-600">
          How these labels are decided
        </summary>
        <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-slate-500">
          <p>
            A label needs at least {MIN_RESPONSES} graded answers across {MIN_DISTINCT_QUESTIONS}{" "}
            different questions on {MIN_DISTINCT_DAYS} different days. Below that it reads
            “Not enough evidence yet”.
          </p>
          <p>
            Only your first ever answer to a question counts as first-attempt accuracy. Repeating a
            question you already know cannot raise it. Answers given 24h or more after first exposure
            count as delayed retention.
          </p>
          <p>
            These labels describe your practice history. They are not NCLEX predictions and not a
            substitute for your program’s evaluation.
          </p>
        </div>
      </details>

      <div className="mt-3 rounded-xl border border-slate-200 p-3">
        <p className="text-[11px] font-semibold text-slate-600">
          Self-reported confidence (not counted as mastery)
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {confidence.total === 0
            ? "No flashcard ratings recorded yet."
            : `${confidence.total} flashcard ratings: ${confidence.good} “Got it”, ${confidence.hard} “Hard”, ${confidence.again} “Again”. These only schedule your reviews.`}
        </p>
      </div>

      {gradedCount > 0 && (
        <p className="mt-2 text-[10px] text-slate-400">
          Based on your most recent {Math.min(responses.length, 500)} recorded answers.
        </p>
      )}
    </section>
  );
}