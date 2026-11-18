export const ROTATIONS = [
  "med-surg",
  "pediatrics",
  "maternal health",
  "psych",
  "ICU",
  "ER",
  "community health",
  "other",
];

export const SKILL_CATEGORIES = [
  "Assessment",
  "Medication",
  "Procedure",
  "Documentation",
  "Communication",
  "Safety",
  "Other",
];

export const COMMON_SKILLS = [
  "Vital Signs",
  "Head-to-Toe Assessment",
  "Medication Administration",
  "IV Insertion",
  "Wound Care",
  "Foley Catheter",
  "NG Tube Placement",
  "Blood Draw",
  "EKG",
  "Patient Education",
];

export function minutesToHours(min) {
  return min / 60;
}

export function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatHours(hours) {
  return `${hours.toFixed(1)} h`;
}

export function computeStats(skillLogs, sessions, settings) {
  const requiredHours = settings?.required_total_hours || 180;
  const requiredSkills = settings?.required_skill_count || 120;

  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalHours = minutesToHours(totalMinutes);
  const hoursRemaining = Math.max(0, requiredHours - totalHours);
  const hoursProgress = requiredHours > 0 ? Math.min(100, (totalHours / requiredHours) * 100) : 0;

  const completedSkills = skillLogs.filter((s) => s.successful).length;
  const skillsProgress = requiredSkills > 0 ? Math.min(100, (completedSkills / requiredSkills) * 100) : 0;
  const unsignedCount = skillLogs.filter((s) => !s.is_signed).length;

  const hoursByRotation = {};
  sessions.forEach((s) => {
    const r = s.rotation_type || "other";
    hoursByRotation[r] = (hoursByRotation[r] || 0) + minutesToHours(s.duration_minutes || 0);
  });

  return {
    requiredHours,
    requiredSkills,
    totalHours,
    hoursRemaining,
    hoursProgress,
    completedSkills,
    skillsProgress,
    unsignedCount,
    hoursByRotation,
  };
}

export function getEffectiveRotations(settings) {
  const custom = settings?.custom_rotations || [];
  const merged = [...ROTATIONS];
  custom.forEach((r) => {
    if (!merged.includes(r)) merged.push(r);
  });
  return merged;
}