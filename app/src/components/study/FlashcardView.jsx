import { motion, AnimatePresence } from "framer-motion";

export default function FlashcardView({ card, revealed, onReveal }) {
  return (
    <button onClick={onReveal} className="w-full text-left" disabled={revealed}>
      <div className="min-h-[280px] p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-teal-600">
          {revealed ? "Answer" : "Prompt"}
        </span>
        <div className="flex-1 flex items-center justify-center py-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={revealed ? "back" : "front"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18 }}
              className={
                revealed
                  ? "text-base leading-relaxed text-slate-700 text-center"
                  : "text-xl font-semibold leading-snug text-slate-900 text-center"
              }
            >
              {revealed ? card.back : card.front}
            </motion.p>
          </AnimatePresence>
        </div>
        {!revealed && <p className="text-center text-xs text-slate-400">Tap to reveal the answer</p>}
      </div>
    </button>
  );
}