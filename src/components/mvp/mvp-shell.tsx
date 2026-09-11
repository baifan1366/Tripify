"use client";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Compass,
  FolderHeart,
  SlidersHorizontal,
  UserRound,
  FlaskConical,
  X,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useMvp } from "./mvp-provider";
import "./mvp.css";

export function MvpShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("mvp");
  const locale = useLocale();
  const pathname = usePathname();
  const { base, demo, viewer, notice, setNotice } = useMvp();
  const navigation = [
    [base, "myTrips", FolderHeart],
    [`${base}/preferences`, "preferences", SlidersHorizontal],
    [`${base}/account`, "account", UserRound],
  ] as const;
  return (
    <div className="mvp-shell trip-app-theme">
      <aside className="mvp-sidebar">
        <Link href={base} className="mvp-brand">
          <svg viewBox="0 0 48 48" aria-hidden="true" fill="none">
            <path
              d="M8 10H40M24 10V39M8 37C15 20 32 38 40 20"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="8" cy="37" r="4" fill="currentColor" />
          </svg>
          Tripify
        </Link>
        <div className="mvp-sidebar-caption">{t("workspace")}</div>
        <nav aria-label={t("workspace")}>
          {navigation.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              aria-label={t(label)}
              aria-current={
                (
                  href === base
                    ? pathname === base || pathname.includes("/trips/")
                    : pathname === href
                )
                  ? "page"
                  : undefined
              }
            >
              <Icon size={19} strokeWidth={1.75} aria-hidden="true" />
              <span>{t(label)}</span>
            </Link>
          ))}
        </nav>
        <div className="mvp-sidebar-note">
          <Compass size={24} />
          <p>{t("human")}</p>
        </div>
        <Link href="/" className="mvp-site-link">
          {t("home")}
          <ArrowUpRight size={16} />
        </Link>
        <Link href={`${base}/account`} className="mvp-user">
          <span className="mvp-avatar">
            {demo ? "✦" : viewer.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>{demo ? t("preview") : viewer.name}</strong>
            <small>{t("unsaved")}</small>
          </span>
        </Link>
      </aside>
      <div className="mvp-body">
        <header className="mvp-topbar">
          <span>
            <Compass size={16} aria-hidden="true" />
            {t("snapshot")}
          </span>
          <nav
            aria-label={
              locale === "zh" ? "语言" : locale === "ms" ? "Bahasa" : "Language"
            }
          >
            {(["en", "zh", "ms"] as const).map((l) => (
              <Link
                key={l}
                href={pathname}
                locale={l}
                aria-current={l === locale ? "page" : undefined}
              >
                {l === "zh" ? "中文" : l.toUpperCase()}
              </Link>
            ))}
          </nav>
        </header>
        <div className="mvp-preview-banner">
          <FlaskConical size={16} aria-hidden="true" />
          <span>
            <strong>{t("preview")}</strong> · {t("previewNote")}
          </span>
        </div>
        {notice && (
          <div className="mvp-feedback" role="status">
            <span>{notice}</span>
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label={t("dismiss")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
