export default function CaseQuestionCard({ index, total, question, chosen, onChoose }) {
  const answered = chosen !== undefined;

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
        Question {index + 1} of {total}
      </p>
      <p className="text-sm font-semibold text-slate-800 leading-relaxed mb-3">{question.question}</p>

      <div className="flex flex-col gap-2">
        {question.options.map((option, optionIndex) => {
          const isCorrect = optionIndex === question.correct_index;
          const isChosen = chosen === optionIndex;
          let tone = "bg-slate-50 border-slate-200 text-slate-700";
          if (answered && isCorrect) tone = "bg-emerald-50 border-emerald-300 text-emerald-800";
          else if (answered && isChosen) tone = "bg-rose-50 border-rose-300 text-rose-800";
          else if (answered) tone = "bg-slate-50 border-slate-200 text-slate-400";

          return (
            <button
              key={optionIndex}
              onClick={() => onChoose(optionIndex)}
              disabled={answered}
              className={`w-full text-left px-3.5 py-3 rounded-xl border text-sm font-medium transition ${tone}`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + optionIndex)}.</span>
              {option}
            </button>
          );
        })}
      </div>

      {answered && question.explanation && (
        <div className="mt-3 p-3 rounded-xl bg-slate-50">
          <p
            className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${
              chosen === question.correct_index ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {chosen === question.correct_index ? "Correct" : "Review this"}
          </p>
          <p className="text-[13px] text-slate-600 leading-relaxed">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}