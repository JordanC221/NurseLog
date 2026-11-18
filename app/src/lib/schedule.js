import { addDays, endOfDay, format, parseISO, startOfDay } from "date-fns";

export const SESSION_TYPES = [
  { value: "class", label: "Class", dot: "bg-indigo-500", chip: "bg-indigo-50 text-indigo-700" },
  { value: "clinical", label: "Clinical", dot: "bg-teal-500", chip: "bg-teal-50 text-teal-700" },
  { value: "lab", label: "Lab / Sim", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  { value: "exam", label: "Exam", dot: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  { value: "assignment", label: "Assignment", dot: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
  { value: "other", label: "Other", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600" },
];

export function typeMeta(value) {
  return SESSION_TYPES.find((t) => t.value === value) || SESSION_TYPES[SESSION_TYPES.length - 1];
}

export function formatTime(value) {
  const raw = String(value || "");
  if (!raw) return "";
  const bits = raw.split(":");
  const hours = Number(bits[0]);
  if (Number.isNaN(hours)) return raw;
  const minutes = Number(bits[1]) || 0;
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function endTimeOf(session) {
  if (session.end_time) return session.end_time;
  const bits = String(session.start_time || "09:00").split(":");
  const total = ((Number(bits[0]) || 0) * 60 + (Number(bits[1]) || 0) + 60) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function timeRange(session) {
  if (!session.start_time) return session.end_time ? `Until ${formatTime(session.end_time)}` : "All day";
  return `${formatTime(session.start_time)} – ${formatTime(endTimeOf(session))}`;
}

// Turns stored sessions (optionally repeating weekly) into dated occurrences in a range.
export function expandOccurrences(sessions, from, to) {
  const out = [];
  (sessions || []).forEach((session) => {
    if (!session.start_date) return;
    const start = startOfDay(parseISO(session.start_date));
    const limit =
      session.repeat_weekly && session.repeat_until
        ? endOfDay(parseISO(session.repeat_until))
        : endOfDay(start);
    let cursor = start;
    let guard = 0;
    while (cursor <= limit && guard < 400) {
      if (cursor >= from && cursor <= to) out.push({ session, date: format(cursor, "yyyy-MM-dd") });
      cursor = session.repeat_weekly ? addDays(cursor, 7) : addDays(cursor, 100000);
      guard += 1;
    }
  });
  return out.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    return String(a.session.start_time || "").localeCompare(String(b.session.start_time || ""));
  });
}

export function upcomingOccurrences(sessions, days = 120) {
  const from = startOfDay(new Date());
  return expandOccurrences(sessions, from, endOfDay(addDays(from, days)));
}

export function pastOccurrences(sessions, days = 120) {
  const today = startOfDay(new Date());
  return expandOccurrences(sessions, startOfDay(addDays(today, -days)), endOfDay(addDays(today, -1))).reverse();
}

export function groupByDate(occurrences) {
  const groups = [];
  occurrences.forEach((item) => {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  });
  return groups;
}

export function dayLabel(dateStr) {
  const date = parseISO(dateStr);
  const diff = Math.round((startOfDay(date) - startOfDay(new Date())) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return format(date, "EEE, MMM d");
}

function compact(dateStr, timeStr) {
  const date = String(dateStr || "").replace(/-/g, "");
  const time = String(timeStr || "09:00").replace(/:/g, "");
  return `${date}T${time}00`;
}

export function googleCalendarUrl(session, date) {
  const params = new URLSearchParams();
  params.set("action", "TEMPLATE");
  params.set("text", session.title || "Nursing session");
  params.set("dates", `${compact(date, session.start_time || "09:00")}/${compact(date, endTimeOf(session))}`);
  const details = [
    session.instructor ? `Instructor: ${session.instructor}` : "",
    session.notes || "",
  ]
    .filter(Boolean)
    .join("\n");
  if (details) params.set("details", details);
  if (session.location) params.set("location", session.location);
  if (session.repeat_weekly && session.repeat_until) {
    params.set("recur", `RRULE:FREQ=WEEKLY;UNTIL=${compact(session.repeat_until, "23:59")}Z`);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function downloadScheduleIcs(occurrences, filename = "class-schedule.ics") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NurseLog Pro//Class Schedule//EN",
    "CALSCALE:GREGORIAN",
  ];

  occurrences.forEach((item, index) => {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:nurselog-${item.session.id || index}-${item.date}@nurselogpro`);
    lines.push(`DTSTAMP:${compact(item.date, "00:00")}Z`);
    lines.push(`DTSTART:${compact(item.date, item.session.start_time || "09:00")}`);
    lines.push(`DTEND:${compact(item.date, endTimeOf(item.session))}`);
    lines.push(`SUMMARY:${icsEscape(item.session.title)}`);
    if (item.session.location) lines.push(`LOCATION:${icsEscape(item.session.location)}`);
    const details = [
      item.session.instructor ? `Instructor: ${item.session.instructor}` : "",
      item.session.notes || "",
    ]
      .filter(Boolean)
      .join("\n");
    if (details) lines.push(`DESCRIPTION:${icsEscape(details)}`);
    lines.push("END:VEVENT");
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}