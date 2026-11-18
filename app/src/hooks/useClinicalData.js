import { useState, useEffect, useCallback } from "react";
import { nurselog } from "@/api/client";

export function useClinicalData() {
  const [skillLogs, setSkillLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [skills, sess] = await Promise.all([
        nurselog.entities.SkillLog.list("-created_date", 500),
        nurselog.entities.HoursSession.list("-created_date", 500),
      ]);
      setSkillLogs(skills);
      setSessions(sess);
    } catch (e) {
      // Surface the failure instead of rendering it as an empty account.
      setError(e?.message || "Could not load your clinical records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { skillLogs, sessions, loading, error, reload: load, setSkillLogs, setSessions };
}