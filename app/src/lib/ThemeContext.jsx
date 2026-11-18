import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nurselog:theme";
const VALID = ["light", "dark", "system"];

const ThemeContext = createContext({
  preference: "system",
  resolvedTheme: "light",
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

function systemPrefersDark() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function initialPreference() {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (VALID.includes(stored)) return stored;
  return "system";
}

/**
 * Single source of truth for appearance.
 * Preference is the student's choice (Light / Dark / System); resolvedTheme is
 * what is actually painted. Both the top-bar control and Settings read and
 * write through this provider, so they can never drift apart.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(initialPreference);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(STORAGE_KEY, preference);
  }, [preference, resolvedTheme]);

  const setTheme = useCallback((next) => {
    setPreferenceState(VALID.includes(next) ? next : "system");
  }, []);

  // Flips to the opposite of what is currently shown, and pins it explicitly.
  const toggleTheme = useCallback(() => {
    setPreferenceState((current) => {
      const currentlyDark = current === "dark" || (current === "system" && systemPrefersDark());
      return currentlyDark ? "light" : "dark";
    });
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, theme: resolvedTheme, setTheme, toggleTheme }),
    [preference, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}