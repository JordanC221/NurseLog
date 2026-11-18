/**
 * Learning evidence.
 *
 * Self-reported confidence ("Got it" on a flashcard, finishing a matching game)
 * is recorded but NEVER treated as mastery. Labels are built only from graded
 * answers, kept separate per question, so repeating the same question cannot
 * inflate a topic.
 */

export const DELAYED_HOURS = 24;
export const MIN_RESPONSES = 6;
export const MIN_DISTINCT_QUESTIONS = 3;
export const MIN_DISTINCT_DAYS = 2;

const DAY_MS = 86400000;

export function isGraded(response) {
  return typeof response?.is_correct === "boolean" && Boolean(response.question_type) && response.question_type !== "flashcard";
}

export function isSelfReport(response) {
  return response?.question_type === "flashcard" && Boolean(response.self_rating);
}

function dayKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

export function classifyEvidence(summary) {
  const insufficient =
    summary.attempts < MIN_RESPONSES ||
    summary.distinctQuestions < MIN_DISTINCT_QUESTIONS ||
    summary.distinctDays < MIN_DISTINCT_DAYS;

  if (insufficient) {
    return {
      key: "insufficient",
      label: "Not enough evidence yet",
      tone: "slate",
      reason: `Needs at least ${MIN_RESPONSES} graded answers across ${MIN_DISTINCT_QUESTIONS} different questions on ${MIN_DISTINCT_DAYS} different days.`,
    };
  }

  const fresh = summary.freshAccuracy ?? 0;
  const retention = summary.delayedAttempts >= 3 ? summary.delayedAccuracy : null;

  if (fresh >= 0.85 && (retention === null || retention >= 0.8)) {
    return {
      key: "strong",
      label: "Strong evidence",
      tone: "emerald",
      reason:
        retention === null
          ? "High accuracy on first attempts. No delayed review has been completed yet."
          : `High accuracy on first attempts, held up on review at least ${DELAYED_HOURS}h later.`,
    };
  }

  if (fresh >= 0.7) {
    return {
      key: "building",
      label: "Building",
      tone: "amber",
      reason: "Mostly correct on first attempts, but not yet consistent or re-tested after a delay.",
    };
  }

  return {
    key: "needs-work",
    label: "Needs work",
    tone: "rose",
    reason: "First attempts on these questions are still often incorrect.",
  };
}

/**
 * Builds per-topic evidence from stored responses.
 * Fresh = the student's first ever answer to that question.
 * Repeat = any later answer to the same question.
 * Delayed = an answer given 24h+ after first exposure.
 */
export function buildEvidence(responses = []) {
  const graded = responses.filter(isGraded);
  const byTopic = new Map();

  graded.forEach((response) => {
    const topic = response.topic || "General";
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic).push(response);
  });

  const summaries = [];

  byTopic.forEach((list, topic) => {
    const ordered = [...list].sort(
      (a, b) => new Date(a.answered_at).getTime() - new Date(b.answered_at).getTime()
    );

    const firstSeen = new Map();
    let freshAttempts = 0;
    let freshCorrect = 0;
    let repeatAttempts = 0;
    let repeatCorrect = 0;
    let delayedAttempts = 0;
    let delayedCorrect = 0;

    ordered.forEach((response) => {
      const answeredAt = new Date(response.answered_at).getTime();
      const first = firstSeen.get(response.question_id);

      if (first === undefined) {
        firstSeen.set(response.question_id, answeredAt);
        freshAttempts += 1;
        if (response.is_correct) freshCorrect += 1;
        return;
      }

      repeatAttempts += 1;
      if (response.is_correct) repeatCorrect += 1;

      if (answeredAt - first >= DELAYED_HOURS * 3600000) {
        delayedAttempts += 1;
        if (response.is_correct) delayedCorrect += 1;
      }
    });

    const last = ordered[ordered.length - 1];
    const daysSinceLast = last
      ? Math.floor((Date.now() - new Date(last.answered_at).getTime()) / DAY_MS)
      : null;

    const summary = {
      topic,
      attempts: ordered.length,
      correct: ordered.filter((r) => r.is_correct).length,
      accuracy: ordered.length
        ? ordered.filter((r) => r.is_correct).length / ordered.length
        : 0,
      distinctQuestions: firstSeen.size,
      distinctDays: new Set(ordered.map((r) => dayKey(r.answered_at))).size,
      freshAttempts,
      freshCorrect,
      freshAccuracy: freshAttempts ? freshCorrect / freshAttempts : null,
      repeatAttempts,
      repeatCorrect,
      repeatAccuracy: repeatAttempts ? repeatCorrect / repeatAttempts : null,
      delayedAttempts,
      delayedCorrect,
      delayedAccuracy: delayedAttempts ? delayedCorrect / delayedAttempts : null,
      lastAnsweredAt: last?.answered_at || null,
      daysSinceLast,
      sessions: new Set(ordered.map((r) => r.session_id)).size,
    };

    summaries.push({ ...summary, status: classifyEvidence(summary) });
  });

  summaries.sort((a, b) => {
    if (a.status.key === "insufficient" && b.status.key !== "insufficient") return 1;
    if (b.status.key === "insufficient" && a.status.key !== "insufficient") return -1;
    return b.attempts - a.attempts;
  });

  return summaries;
}

export function selfReportSummary(responses = []) {
  const ratings = responses.filter(isSelfReport);
  const counts = { again: 0, hard: 0, good: 0 };
  ratings.forEach((r) => {
    if (counts[r.self_rating] !== undefined) counts[r.self_rating] += 1;
  });
  return { total: ratings.length, ...counts };
}

export function formatPercent(value) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatRecency(days) {
  if (days === null || days === undefined) return "never practiced";
  if (days <= 0) return "practiced today";
  if (days === 1) return "practiced yesterday";
  return `practiced ${days} days ago`;
}