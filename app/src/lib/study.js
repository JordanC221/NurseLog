import { nurselog } from "@/api/client";

export const SUGGESTED_TOPICS = [
  "Pharmacology",
  "Med-Surg",
  "Fundamentals",
  "Maternal & Newborn",
  "Pediatrics",
  "Mental Health",
  "Critical Care",
  "Fluid & Electrolytes",
  "Infection Control",
  "Lab Values",
  "Dosage Calculations",
  "Anatomy & Physiology",
];

export const RATING_OPTIONS = [
  { key: "again", label: "Again", sub: "Missed it", cls: "bg-rose-500" },
  { key: "hard", label: "Hard", sub: "Struggled", cls: "bg-amber-500" },
  { key: "good", label: "Got it", sub: "Knew it", cls: "bg-teal-500" },
];

// Describes review scheduling built from self-ratings. Deliberately NOT called
// "mastered": self-reported confidence is not evidence of understanding. Real
// learning-progress labels come from graded answers in @/lib/evidence.
export function masteryLevel(mastery) {
  const m = mastery || 0;
  if (m >= 80) return { label: "Reviewed often", bar: "bg-emerald-500", text: "text-emerald-600" };
  if (m >= 50) return { label: "Reviewing", bar: "bg-amber-500", text: "text-amber-600" };
  if (m > 0) return { label: "Needs review", bar: "bg-rose-500", text: "text-rose-600" };
  return { label: "New", bar: "bg-slate-300", text: "text-slate-400" };
}

export function isDue(card) {
  if (!card.next_review) return true;
  return new Date(card.next_review).getTime() <= Date.now();
}

// Adaptive review queue: overdue cards first, then weakest cards, then unseen.
export function buildReviewQueue(cards, limit = 15) {
  const now = Date.now();
  const scored = cards.map((c) => {
    const due = !c.next_review || new Date(c.next_review).getTime() <= now;
    const overdueDays = c.next_review
      ? Math.max(0, (now - new Date(c.next_review).getTime()) / 86400000)
      : 0;
    return { c, due, score: (due ? 1000 : 0) + overdueDays * 10 + (100 - (c.mastery || 0)) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.c);
}

// Spaced-repetition update for one card after a self-rated answer.
export function applyRating(card, ratingKey) {
  const now = new Date();
  let mastery = card.mastery || 0;
  let ease = card.ease || 2.5;
  let interval = card.interval_days || 0;
  let streak = card.streak || 0;
  let timesCorrect = card.times_correct || 0;
  let timesWrong = card.times_wrong || 0;

  if (ratingKey === "again") {
    mastery = Math.max(0, mastery - 18);
    ease = Math.max(1.3, ease - 0.25);
    interval = 0;
    streak = 0;
    timesWrong += 1;
  } else if (ratingKey === "hard") {
    mastery = Math.min(100, mastery + 6);
    ease = Math.max(1.3, ease - 0.1);
    interval = Math.max(1, Math.round((interval || 1) * 1.2));
    streak += 1;
    timesCorrect += 1;
  } else {
    mastery = Math.min(100, mastery + 16);
    ease = Math.min(3.2, ease + 0.08);
    interval = Math.max(1, Math.round((interval || 1) * ease));
    streak += 1;
    timesCorrect += 1;
  }

  const next = new Date(now);
  if (ratingKey === "again") {
    next.setMinutes(next.getMinutes() + 2);
  } else {
    next.setDate(next.getDate() + interval);
  }

  return {
    mastery,
    ease,
    interval_days: interval,
    streak,
    times_correct: timesCorrect,
    times_wrong: timesWrong,
    times_seen: (card.times_seen || 0) + 1,
    last_reviewed: now.toISOString(),
    next_review: next.toISOString(),
  };
}

// Pre-selects an exam pool, weighted toward questions the student has missed.
export function buildExamPool(questions, count = 10) {
  if (questions.length <= count) {
    return shuffle([...questions]);
  }
  const scored = questions.map((q) => {
    const seen = q.times_seen || 0;
    const wrong = seen - (q.times_correct || 0);
    return { q, score: wrong * 3 + (seen === 0 ? 2 : 0) - seen * 0.2 + Math.random() * 0.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.q);
}

const DIFF_RANK = { easy: 0, medium: 1, hard: 2 };
const RANK_DIFF = ["easy", "medium", "hard"];

// Picks the next question closest to the current target difficulty,
// preferring ones the student has previously missed.
export function nextAdaptiveQuestion(remaining, targetDifficulty) {
  if (!remaining.length) return null;
  const target = DIFF_RANK[targetDifficulty] ?? 1;
  const sorted = [...remaining].sort((a, b) => {
    const da = Math.abs(DIFF_RANK[a.difficulty || "medium"] - target);
    const db = Math.abs(DIFF_RANK[b.difficulty || "medium"] - target);
    if (da !== db) return da - db;
    const wa = (a.times_seen || 0) - (a.times_correct || 0);
    const wb = (b.times_seen || 0) - (b.times_correct || 0);
    return wb - wa;
  });
  return sorted[0];
}

export function shiftDifficulty(current, wasCorrect) {
  const rank = DIFF_RANK[current] ?? 1;
  const next = wasCorrect ? rank + 1 : rank - 1;
  return RANK_DIFF[Math.max(0, Math.min(2, next))];
}

// Picks low-mastery cards for the matching game.
export function pickMatchCards(cards, count = 6) {
  const pool = [...cards].sort((a, b) => (a.mastery || 0) - (b.mastery || 0));
  const chosen = pool.slice(0, count);
  return shuffle(chosen);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function formatAccuracy(correct, total) {
  if (!total) return "—";
  return `${Math.round((correct / total) * 100)}%`;
}

// Saves a generated payload as a study set with its flashcards and questions.
export async function persistStudySet(data, { sourceType, topic }) {
  const set = await nurselog.entities.StudySet.create({
    title: data.title,
    description: data.description,
    source_type: sourceType,
    topic,
    card_count: (data.cards || []).length,
    question_count: (data.questions || []).length,
  });

  if ((data.cards || []).length) {
    await nurselog.entities.Flashcard.bulkCreate(
      data.cards.map((c) => ({
        set_id: set.id,
        front: c.front,
        back: c.back,
        topic: c.topic,
      }))
    );
  }

  if ((data.questions || []).length) {
    await nurselog.entities.ExamQuestion.bulkCreate(
      data.questions.map((q) => ({
        set_id: set.id,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        difficulty: q.difficulty,
        topic: q.topic,
      }))
    );
  }

  return set;
}