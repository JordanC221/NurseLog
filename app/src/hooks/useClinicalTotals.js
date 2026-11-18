import { useCallback, useEffect, useState } from "react";
import { nurselog } from "@/api/client";

/**
 * Clinical totals come from server-side aggregation, never from a capped list.
 * This is what keeps "total hours" and "hours by rotation" correct once a
 * student has more records than a single page can hold.
 */
export function useClinicalTotals(settings) {
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [hoursAgg, rotationAgg, completedSkills, unsignedCount, totalSkills] = await Promise.all([
        nurselog.entities.HoursSession.aggregate({
          query: { is_active: false },
          sum: ["duration_minutes"],
        }),
        nurselog.entities.HoursSession.aggregate({
          query: { is_active: false },
          groupBy: "rotation_type",
          sum: ["duration_minutes"],
        }),
        nurselog.entities.SkillLog.count({ successful: true }),
        nurselog.entities.SkillLog.count({ is_signed: false }),
        nurselog.entities.SkillLog.count({}),
      ]);

      const totalMinutes = hoursAgg?.rows?.[0]?.sum_duration_minutes || 0;
      const hoursByRotation = {};
      (rotationAgg?.rows || []).forEach((row) => {
        hoursByRotation[row.rotation_type || "other"] =
          (row.sum_duration_minutes || 0) / 60;
      });

      setTotals({
        totalMinutes,
        hoursByRotation,
        completedSkills: completedSkills || 0,
        unsignedCount: unsignedCount || 0,
        totalSkills: totalSkills || 0,
        partialCoverage: Boolean(hoursAgg?.truncated) || Boolean(rotationAgg?.truncated),
      });
    } catch (e) {
      setError(e?.message || "Could not load your clinical totals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const requiredHours = settings?.required_total_hours || 180;
  const requiredSkills = settings?.required_skill_count || 120;
  const totalHours = (totals?.totalMinutes || 0) / 60;
  const hoursRemaining = Math.max(0, requiredHours - totalHours);

  return {
    totals,
    loading,
    error,
    reload: load,
    requiredHours,
    requiredSkills,
    totalHours,
    hoursRemaining,
    hoursProgress: requiredHours > 0 ? Math.min(100, (totalHours / requiredHours) * 100) : 0,
    completedSkills: totals?.completedSkills || 0,
    skillsProgress:
      requiredSkills > 0
        ? Math.min(100, ((totals?.completedSkills || 0) / requiredSkills) * 100)
        : 0,
    unsignedCount: totals?.unsignedCount || 0,
    hoursByRotation: totals?.hoursByRotation || {},
    partialCoverage: Boolean(totals?.partialCoverage),
  };
}