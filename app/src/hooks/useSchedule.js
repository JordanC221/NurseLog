import { useState, useEffect, useCallback } from "react";
import { nurselog } from "@/api/client";

export function useSchedule() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await nurselog.entities.ClassSession.list("-start_date", 300);
      setSessions(data);
    } catch (e) {
      setError(e?.message || "Could not load your schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, loading, error, reload: load };
}