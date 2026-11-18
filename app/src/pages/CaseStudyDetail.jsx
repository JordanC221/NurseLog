import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy } from "lucide-react";
import { nurselog } from "@/api/client";
import CaseScenario from "@/components/study/CaseScenario";
import CaseQuestionCard from "@/components/study/CaseQuestionCard";
import CenteredState from "@/components/study/CenteredState";

export default function CaseStudyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [studyCase, setStudyCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  useEffect(() => {
    nurselog.entities.CaseStudy.get(id)
      .then(setStudyCase)
      .catch(() => setMissing(true))
      .finally(() => setLoading(false));
  }, [id]);

  const questions = studyCase?.questions || [];
  const current = questions[index];
  const chosen = answers[index];
  const score = questions.reduce(
    (sum, question, i) => sum + (answers[i] === question.correct_index ? 1 : 0),
    0
  );

  function choose(optionIndex) {
    if (answers[index] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [index]: optionIndex }));
  }

  async function next() {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      return;
    }

    const finalScore = questions.reduce(
      (sum, question, i) => sum + (answers[i] === question.correct_index ? 1 : 0),
      0
    );
    setDone(true);

    try {
      await nurselog.entities.StudyAttempt.create({
        set_id: studyCase.id,
        set_title: studyCase.title,
        mode: "case",
        score: finalScore,
        total: questions.length,
        duration_seconds: Math.round((Date.now() - startedAt) / 1000),
      });
      await nurselog.entities.CaseStudy.update(studyCase.id, {
        times_completed: (studyCase.times_completed || 0) + 1,
        best_score: Math.max(
          studyCase.best_score || 0,
          Math.round((finalScore / questions.length) * 100)
        ),
      });
    } catch (e) {
      console.error("case result save error", e);
    }
  }

  function retake() {
    setAnswers({});
    setIndex(0);
    setDone(false);
    setStartedAt(Date.now());
  }

  if (loading) return <CenteredState loading message="Loading case study…" />;

  if (missing || !studyCase) {
    return (
      <CenteredState
        icon={ArrowLeft}
        title="Case study not found"
        message="It may have been removed."
        actionLabel="Back to case studies"
        onAction={() => navigate("/study/cases")}
      />
    );
  }

  if (done) {
    const percent = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-3 text-center">
        <div className="p-4 rounded-full bg-indigo-100">
          <Trophy size={44} className="text-indigo-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Case Complete</h2>
        <p className="text-3xl font-bold text-teal-600">{percent}%</p>
        <p className="text-sm text-slate-500 max-w-xs">
          You answered {score} of {questions.length} questions correctly.
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs mt-2">
          <button
            onClick={retake}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-600 text-white font-semibold active:scale-95 transition"
          >
            <RotateCcw size={16} /> Retake Case
          </button>
          <button
            onClick={() => navigate("/study/cases")}
            className="py-3.5 rounded-xl bg-slate-100 text-slate-700 font-semibold active:scale-95 transition"
          >
            Back to Case Studies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/study/cases")} className="p-2 rounded-lg bg-slate-100">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 truncate">{studyCase.title}</h1>
          <p className="text-[11px] text-slate-500">
            {studyCase.topic} · {questions.length} questions
          </p>
        </div>
      </div>

      <CaseScenario studyCase={studyCase} />

      {questions.length === 0 || !current ? (
        <CenteredState
          icon={ArrowLeft}
          title="This case has no questions"
          message="Generate a new case study to practise with."
        />
      ) : (
        <>
          <CaseQuestionCard
            index={index}
            total={questions.length}
            question={current}
            chosen={chosen}
            onChoose={choose}
          />
          {chosen !== undefined && (
            <button
              onClick={next}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-teal-600 text-white font-semibold active:scale-[0.98] transition"
            >
              {index < questions.length - 1 ? (
                "Next Question"
              ) : (
                <>
                  <CheckCircle2 size={16} /> Finish Case
                </>
              )}
            </button>
          )}
        </>
      )}
    </div>
  );
}