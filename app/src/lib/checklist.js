// Standard nursing skills checklist used to seed (and restore) the student's checklist.
export const DEFAULT_SKILLS = [
  { name: "Vital Signs", category: "Assessment", target_count: 10 },
  { name: "Head-to-Toe Assessment", category: "Assessment", target_count: 5 },
  { name: "Focused Assessment", category: "Assessment", target_count: 5 },
  { name: "Pain Assessment", category: "Assessment", target_count: 5 },
  { name: "Neurological Assessment", category: "Assessment", target_count: 3 },
  { name: "Oral Medication Administration", category: "Medication", target_count: 10 },
  { name: "Subcutaneous Injection", category: "Medication", target_count: 5 },
  { name: "Intramuscular Injection", category: "Medication", target_count: 3 },
  { name: "IV Push Medication", category: "Medication", target_count: 3 },
  { name: "IV Piggyback", category: "Medication", target_count: 3 },
  { name: "Medication Reconciliation", category: "Medication", target_count: 3 },
  { name: "Blood Glucose Check", category: "Medication", target_count: 5 },
  { name: "IV Insertion", category: "Procedure", target_count: 3 },
  { name: "Wound Care & Dressing Change", category: "Procedure", target_count: 5 },
  { name: "Foley Catheter Insertion", category: "Procedure", target_count: 2 },
  { name: "NG Tube Placement", category: "Procedure", target_count: 2 },
  { name: "Blood Draw / Venipuncture", category: "Procedure", target_count: 5 },
  { name: "Sterile Field Setup", category: "Procedure", target_count: 3 },
  { name: "Tracheostomy Care", category: "Procedure", target_count: 2 },
  { name: "Oxygen Administration", category: "Procedure", target_count: 3 },
  { name: "Airway Suctioning", category: "Procedure", target_count: 2 },
  { name: "Specimen Collection", category: "Procedure", target_count: 3 },
  { name: "EKG / 12-Lead Placement", category: "Procedure", target_count: 3 },
  { name: "Charting / EHR Documentation", category: "Documentation", target_count: 10 },
  { name: "Shift Handoff Report", category: "Documentation", target_count: 5 },
  { name: "Admission Documentation", category: "Documentation", target_count: 2 },
  { name: "Patient Education", category: "Communication", target_count: 5 },
  { name: "Therapeutic Communication", category: "Communication", target_count: 5 },
  { name: "SBAR Report", category: "Communication", target_count: 5 },
  { name: "Interprofessional Rounding", category: "Communication", target_count: 3 },
  { name: "Family Communication", category: "Communication", target_count: 2 },
  { name: "Hand Hygiene Compliance", category: "Safety", target_count: 10 },
  { name: "Fall Risk Assessment", category: "Safety", target_count: 5 },
  { name: "Isolation Precautions", category: "Safety", target_count: 3 },
  { name: "Medication Safety Double-Check", category: "Safety", target_count: 5 },
  { name: "Restraint Monitoring", category: "Safety", target_count: 1 },
  { name: "Time Management & Prioritization", category: "Other", target_count: 3 },
];

export function normalizeSkill(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Cross-references the checklist against logged skills (matched on skill name).
export function buildChecklist(requirements, logs) {
  const tally = new Map();
  (logs || []).forEach((log) => {
    const key = normalizeSkill(log.skill_name);
    if (!key) return;
    const entry = tally.get(key) || { display: log.skill_name, attempts: 0, successes: 0, signed: 0 };
    entry.attempts += 1;
    if (log.successful) entry.successes += 1;
    if (log.is_signed) entry.signed += 1;
    tally.set(key, entry);
  });

  const items = (requirements || []).map((req) => {
    const stat = tally.get(normalizeSkill(req.name)) || { attempts: 0, successes: 0, signed: 0 };
    const target = Math.max(1, Number(req.target_count) || 1);
    return {
      req,
      attempts: stat.attempts,
      successes: stat.successes,
      signed: stat.signed,
      target,
      done: stat.successes >= target,
      percent: Math.min(100, Math.round((stat.successes / target) * 100)),
    };
  });

  const tracked = new Set(items.map((item) => normalizeSkill(item.req.name)));
  const unlisted = [];
  tally.forEach((stat, key) => {
    if (!tracked.has(key)) unlisted.push({ name: stat.display, successes: stat.successes, attempts: stat.attempts });
  });

  const required = items.filter((item) => item.req.is_required);
  const complete = required.filter((item) => item.done).length;

  return {
    items,
    unlisted,
    summary: {
      total: required.length,
      complete,
      inProgress: required.filter((item) => !item.done && item.successes > 0).length,
      percent: required.length ? Math.round((complete / required.length) * 100) : 0,
    },
  };
}