"use client";
import { useTranslations } from "next-intl";
import { Check, ChevronDown, Plus, Route } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AppPopover } from "@/components/ui/app-popover";
import type { Trip } from "@/lib/mvp/model";
export function TripSwitcher({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const { trips, base } = useMvp();
  return (
    <AppPopover
      label={t("switchTrip")}
      className="app-trip-switcher"
      trigger={
        <>
          <span>{trip.name}</span>
          <ChevronDown size={20} aria-hidden="true" />
        </>
      }
    >
      {(close) => (
        <>
          <Link href={base} onClick={close}>
            <Route size={18} aria-hidden="true" />
            {t("myTrips")}
          </Link>
          <div className="app-popover-divider" />
          {trips.map((item) => (
            <Link
              key={item.id}
              href={`${base}/trips/${item.id}`}
              onClick={close}
              aria-current={item.id === trip.id ? "page" : undefined}
            >
              {item.id === trip.id ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                <Route size={18} aria-hidden="true" />
              )}
              {item.name}
            </Link>
          ))}
          <div className="app-popover-divider" />
          <Link href={`${base}/trips/new`} onClick={close}>
            <Plus size={18} aria-hidden="true" />
            {t("create")}
          </Link>
        </>
      )}
    </AppPopover>
  );
}
