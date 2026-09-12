"use client";
import { useEffect, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Moon, Sun } from "lucide-react";
const THEME_KEY = "tripify-theme";
let fallback: "light" | "dark" | undefined;
type Theme = "light" | "dark";
function preferred(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* Storage can be disabled in private sessions. */
  }
  if (fallback) return fallback;
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
function subscribe(callback: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", callback);
  window.addEventListener("tripify-theme-change", callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("tripify-theme-change", callback);
    media.removeEventListener("change", callback);
  };
}
function useTheme() {
  return useSyncExternalStore(subscribe, preferred, () => "light" as const);
}
export function ThemeAppearance() {
  const theme = useTheme();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return null;
}
export function ThemeToggle() {
  const t = useTranslations("dock"),
    theme = useTheme();
  return (
    <div
      className="app-theme-choices"
      role="group"
      aria-label={t("appearance")}
    >
      {(["light", "dark"] as const).map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => {
            fallback = value;
            try {
              localStorage.setItem(THEME_KEY, value);
            } catch {}
            document.documentElement.classList.toggle("dark", value === "dark");
            window.dispatchEvent(new Event("tripify-theme-change"));
          }}
        >
          {value === "light" ? <Sun size={16} /> : <Moon size={16} />}
          {t(value === "light" ? "lightMode" : "darkMode")}
        </button>
      ))}
    </div>
  );
}
