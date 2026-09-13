"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { AppRail } from "@/components/app-shell/app-rail";
import { useMvp } from "./mvp-provider";
import "./mvp.css";
import "../app-shell/app-shell.css";
import { ThemeAppearance } from "@/components/workspace/theme-toggle";

export function MvpShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("mvp");
  const { notice, setNotice, loadError, refreshTrips } = useMvp();
  const shared = useTranslations("shared");
  // Success toasts dismiss themselves; error banners stay until resolved.
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  return (
    <div className="mvp-shell app-shell trip-app-theme">
      <AppRail />
      <ThemeAppearance />
      <div className="mvp-body">
        {notice && (
          <div className="mvp-toast" role="status" key={notice}>
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label={t("dismiss")}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        {loadError && (
          <div className="mvp-feedback" role="alert">
            <span>{shared("failed")}</span>
            <button
              type="button"
              onClick={() => void refreshTrips().catch(() => {})}
            >
              {shared("retry")}
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
