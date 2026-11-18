import { useState, useEffect, useCallback } from "react";
import { nurselog } from "@/api/client";

export function useStudyData() {
  const [sets, setSets] = useState([]);
  const [cards, setCards] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c, q, a, r] = await Promise.all([
        nurselog.entities.StudySet.list("-created_date", 100),
        nurselog.entities.Flashcard.list("-created_date", 1000),
        nurselog.entities.ExamQuestion.list("-created_date", 500),
        nurselog.entities.StudyAttempt.list("-created_date", 200),
        nurselog.entities.StudyResponse.list("-answered_at", 500),
      ]);
      setSets(s);
      setCards(c);
      setQuestions(q);
      setAttempts(a);
      setResponses(r);
    } catch (e) {
      setError(e?.message || "Could not load your study data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { sets, cards, questions, attempts, responses, loading, error, reload: load };
}