import { useState, useEffect, useCallback } from "react";
import { nurselog } from "@/api/client";

export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await nurselog.entities.AppSettings.list();
      if (list.length > 0) {
        setSettings(list[0]);
      } else {
        const created = await nurselog.entities.AppSettings.create({
          student_name: "Student",
          required_total_hours: 180,
          required_skill_count: 120,
          default_rotation: "med-surg",
          custom_rotations: [],
          theme_mode: "light",
        });
        setSettings(created);
      }
    } catch (e) {
      setError(e?.message || "Could not load your settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = useCallback(async (patch) => {
    if (!settings) return;
    const updated = await nurselog.entities.AppSettings.update(settings.id, patch);
    setSettings(updated);
    return updated;
  }, [settings]);

  return { settings, loading, error, saveSettings, reload: load };
}