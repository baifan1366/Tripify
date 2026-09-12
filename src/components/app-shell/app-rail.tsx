"use client";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { FolderHeart, SlidersHorizontal } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppTooltip } from "@/components/ui/app-tooltip";
import { AccountMenu } from "./account-menu";
export function AppRail() {
  const t = useTranslations("mvp");
  const pathname = usePathname();
  const { base } = useMvp();
  return (
    <aside className="app-rail">
      <AppTooltip label={`Tripify · ${t("myTrips")}`}>
        <Link
          href={base}
          className="app-rail-action app-rail-logo"
          aria-label={`Tripify · ${t("myTrips")}`}
        >
          <svg viewBox="0 0 48 48" aria-hidden="true" fill="none">
            <path
              d="M8 10H40M24 10V39M8 37C15 20 32 38 40 20"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="8" cy="37" r="4" fill="currentColor" />
          </svg>
        </Link>
      </AppTooltip>
      <nav aria-label={t("workspace")}>
        {(
          [
            [base, "myTrips", FolderHeart],
            [`${base}/preferences`, "preferences", SlidersHorizontal],
          ] as const
        ).map(([href, label, Icon]) => (
          <AppTooltip key={href} label={t(label)}>
            <Link
              href={href}
              className="app-rail-action"
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
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </AppTooltip>
        ))}
      </nav>
      <div className="app-rail-account">
        <Suspense fallback={<div className="app-rail-action" />}>
          <AccountMenu />
        </Suspense>
      </div>
    </aside>
  );
}
