"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";

const THEME_KEY = "tripify-theme";
type Theme = "light" | "dark";

function preferred(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* private mode: fall through to system */
  }
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const subscribeNoop = () => () => {};

/** Workspace theme toggle. System preference by default, explicit choice
 * persisted afterwards. Google map tiles always stay light. */
export function ThemeToggle() {
  const t = useTranslations("dock");
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  // Lazy init reads the persisted choice / OS preference during render
  // (client only; the server snapshot is always light + unmounted).
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === "undefined" ? "light" : preferred(),
  );
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* layout still applies for the session */
    }
  }, [theme, mounted]);
  if (!mounted) return null;
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="ws-control"
      aria-pressed={dark}
      aria-label={t(dark ? "lightMode" : "darkMode")}
      title={t(dark ? "lightMode" : "darkMode")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? (
        <Sun size={15} aria-hidden="true" />
      ) : (
        <Moon size={15} aria-hidden="true" />
      )}
    </button>
  );
}
