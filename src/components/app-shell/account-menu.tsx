"use client";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { UserRound, SlidersHorizontal, ArrowUpRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppPopover } from "@/components/ui/app-popover";
export function AccountMenu() {
  const t = useTranslations("mvp");
  const shared = useTranslations("shared");
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { base, viewer } = useMvp();
  return (
    <AppPopover
      label={t("account")}
      className="app-rail-action app-account-trigger"
      side="right"
      trigger={<UserRound size={20} aria-hidden="true" />}
    >
      {(close) => (
        <>
          <p>{viewer.name}</p>
          <Link href={`${base}/account`} onClick={close}>
            <UserRound size={18} aria-hidden="true" />
            {t("account")}
          </Link>
          <Link href={`${base}/preferences`} onClick={close}>
            <SlidersHorizontal size={18} aria-hidden="true" />
            {t("preferences")}
          </Link>
          <div className="app-popover-divider" />
          <nav className="app-popover-languages" aria-label={t("language")}>
            {(["en", "zh", "ms"] as const).map((l) => (
              <Link
                key={l}
                href={`${pathname}${search ? `?${search}` : ""}`}
                locale={l}
                onClick={close}
                aria-current={l === locale ? "page" : undefined}
              >
                {l === "zh" ? "中文" : l.toUpperCase()}
              </Link>
            ))}
          </nav>
          <p>{shared("sharedNote")}</p>
          <Link href="/" onClick={close}>
            <ArrowUpRight size={18} aria-hidden="true" />
            {t("home")}
          </Link>
        </>
      )}
    </AppPopover>
  );
}
