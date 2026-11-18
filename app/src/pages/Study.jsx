import { useNavigate } from "react-router-dom";
import { FolderOpen, GraduationCap, Sparkles, Stethoscope, Zap } from "lucide-react";
import { useStudyData } from "@/hooks/useStudyData";
import { useClinicalData } from "@/hooks/useClinicalData";
import GeneratePanel from "@/components/study/GeneratePanel";
import StudyStats from "@/components/study/StudyStats";
import LearningEvidence from "@/components/study/LearningEvidence";
import StudySetCard from "@/components/study/StudySetCard";
import CenteredState from "@/components/study/CenteredState";

export default function Study() {
  const navigate = useNavigate();
  const { sets, cards, questions, attempts, responses, loading, reload } = useStudyData();
  const { skillLogs } = useClinicalData();

  const handleGenerated = (set) => {
    reload();
    navigate(`/study/flashcards?set=${set.id}`);
  };

  const handleStudy = (mode, setId) => {
    navigate(`/study/${mode}?set=${setId}`);
  };

  const now = Date.now();
  const dueCount = cards.filter((c) => !c.next_review || new Date(c.next_review).getTime() <= now).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="p-2.5 rounded-2xl bg-teal-100 text-teal-600">
          <GraduationCap size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Study Coach</h1>
          <p className="text-xs text-slate-500">Adaptive flashcards, exams, and games</p>
        </div>
      </div>

      <StudyStats cards={cards} attempts={attempts} />

      <LearningEvidence responses={responses} />

      {dueCount > 0 && (
        <button
          onClick={() => navigate("/study/flashcards")}
          className="flex items-center justify-between p-4 rounded-2xl bg-teal-600 text-white active:scale-[0.98] transition"
        >
          <div className="flex items-center gap-3">
            <Zap size={20} />
            <div className="text-left">
              <p className="text-sm font-semibold">Review Due Cards</p>
              <p className="text-xs text-teal-100">{dueCount} card{dueCount === 1 ? "" : "s"} ready now</p>
            </div>
          </div>
          <span className="text-sm font-medium">Start →</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate("/study/materials")}
          className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.97] transition text-left"
        >
          <span className="p-2.5 rounded-xl bg-indigo-500 text-white">
            <FolderOpen size={22} />
          </span>
          <span className="text-sm font-semibold text-slate-800">Course Materials</span>
        </button>
        <button
          onClick={() => navigate("/study/cases")}
          className="flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm active:scale-[0.97] transition text-left"
        >
          <span className="p-2.5 rounded-xl bg-violet-500 text-white">
            <Stethoscope size={22} />
          </span>
          <span className="text-sm font-semibold text-slate-800">Case Studies</span>
        </button>
      </div>

      <GeneratePanel skillLogs={skillLogs} onGenerated={handleGenerated} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Your Study Sets</h2>
          <span className="text-[11px] text-slate-400">{sets.length} set{sets.length === 1 ? "" : "s"}</span>
        </div>

        {loading ? (
          <CenteredState loading message="Loading your study material…" />
        ) : sets.length === 0 ? (
          <CenteredState
            icon={Sparkles}
            title="No study sets yet"
            message="Generate your first set from your clinical log or pick a topic to get started."
          />
        ) : (
          sets.map((set) => (
            <StudySetCard
              key={set.id}
              set={set}
              cards={cards.filter((c) => c.set_id === set.id)}
              questionCount={questions.filter((q) => q.set_id === set.id).length}
              onStudy={handleStudy}
            />
          ))
        )}
      </div>
    </div>
  );
}