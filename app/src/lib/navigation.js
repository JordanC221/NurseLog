import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  History as HistoryIcon,
  Home,
  Layers,
  LayoutDashboard,
  ListChecks,
  PenLine,
  Settings as SettingsIcon,
  Shuffle,
  Stethoscope,
} from "lucide-react";

// Primary information architecture: Today / Clinical / Study / Schedule / Reports / Settings.
export const NAV_GROUPS = [
  {
    key: "today",
    label: "Today",
    icon: Home,
    to: "/",
    items: [{ to: "/", label: "Today", icon: Home }],
  },
  {
    key: "clinical",
    label: "Clinical",
    icon: Stethoscope,
    to: "/log",
    items: [
      { to: "/log", label: "Log a Skill", icon: PenLine },
      { to: "/hours", label: "Hours & Timer", icon: Clock },
      { to: "/history", label: "Log History", icon: HistoryIcon },
      { to: "/checklist", label: "Requirements", icon: ListChecks },
      { to: "/dashboard", label: "Clinical Progress", icon: LayoutDashboard },
    ],
  },
  {
    key: "study",
    label: "Study",
    icon: GraduationCap,
    to: "/study",
    items: [
      { to: "/study", label: "Study Hub", icon: GraduationCap },
      { to: "/study/materials", label: "Course Materials", icon: FolderOpen },
      { to: "/study/flashcards", label: "Flashcards", icon: Layers },
      { to: "/study/exam", label: "Practice Exam", icon: ClipboardCheck },
      { to: "/study/match", label: "Matching", icon: Shuffle },
      { to: "/study/cases", label: "Case Studies", icon: Stethoscope },
    ],
  },
  {
    key: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    to: "/schedule",
    items: [{ to: "/schedule", label: "Schedule", icon: CalendarDays }],
  },
  {
    key: "reports",
    label: "Reports",
    icon: FileText,
    to: "/reports",
    items: [{ to: "/reports", label: "Reports", icon: FileText }],
  },
  {
    key: "settings",
    label: "Settings",
    icon: SettingsIcon,
    to: "/settings",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }],
  },
];

export const PRIMARY_MOBILE = [
  { to: "/", label: "Today", icon: Home, match: ["/"] },
  {
    to: "/log",
    label: "Clinical",
    icon: Stethoscope,
    match: ["/log", "/hours", "/history", "/checklist", "/dashboard"],
  },
  { to: "/study", label: "Study", icon: GraduationCap, match: ["/study"] },
  { to: "/schedule", label: "Schedule", icon: CalendarDays, match: ["/schedule"] },
];

const SECONDARY_PATHS = [
  "/reports",
  "/settings",
  "/hours",
  "/history",
  "/checklist",
  "/dashboard",
  "/study/materials",
  "/study/flashcards",
  "/study/exam",
  "/study/match",
  "/study/cases",
];

export function isActive(pathname, target) {
  if (target === "/") return pathname === "/";
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function isGroupActive(pathname, group) {
  return group.items.some((item) => isActive(pathname, item.to));
}

export function isMobileActive(pathname, item) {
  return (item.match || [item.to]).some((target) => isActive(pathname, target));
}

export function isSecondaryPath(pathname) {
  return SECONDARY_PATHS.some((target) => isActive(pathname, target));
}

// Longest matching route wins, so nested routes resolve to the right section.
export function pageTitle(pathname) {
  const all = NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => ({ ...item, group: group.label }))
  );
  const found = [...all]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => isActive(pathname, item.to));
  if (!found) return { title: "NurseLog Pro", group: "" };
  return { title: found.label, group: found.group };
}