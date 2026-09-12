"use client";
import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Route,
  Users,
  Wallet,
  MessageSquare,
  ListChecks,
  Vote,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { TripHeader } from "@/components/app-shell/trip-header";
import { dateAt, dayCount, type Trip } from "@/lib/mvp/model";
import { panelIds, type PanelId } from "@/lib/mvp/workspace-layout";
import { useMvp } from "@/components/mvp/mvp-provider";
import {
  ProposalsProvider,
  useSharedProposals,
} from "../decision/shared-proposals";
import "./workspace.css";
import "../../workspace/workspace.css";
import { GoogleMapProvider } from "@/lib/maps/google-map-provider";
import { useRoutes } from "@/lib/maps/use-routes";
import { useTripWeather } from "@/lib/maps/use-trip-weather";
import { dayActivities } from "@/lib/maps/schedule";
import type { WeatherDay } from "@/lib/weather/risk";
import { AdaptiveWorkspace } from "../../workspace/adaptive-workspace";
import type { WidgetProps } from "../../workspace/widget-content";

export function TripWorkspace({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const { base } = useMvp();
  const router = useRouter();
  const requested = useSearchParams().get("view");
  const active: PanelId = panelIds.includes(requested as PanelId)
    ? (requested as PanelId)
    : "plan";
  const [chosenDay, setDay] = useState(1);
  const day = Math.max(1, Math.min(chosenDay, dayCount(trip.start, trip.end)));
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const routes = useRoutes(trip, day);
  const weather = useTripWeather(trip.id);
  const dayDate = dateAt(trip.start, day).toISOString().slice(0, 10);
  const dayRisk = weather?.days.find((d) => d.date === dayDate) ?? null;
  const items = useMemo(
    () => dayActivities(trip.activities, day),
    [trip.activities, day],
  );
  const activity = items.find((a) => a.id === selected) ?? items[0];
  const handleDayChange = useCallback((next: number) => {
    setDay(next);
    setSelected(null);
  }, []);
  const url = (view: string) => `${base}/trips/${trip.id}?view=${view}`;
  return (
    <GoogleMapProvider enabled>
      <main
        className="mvp-workspace travel-workspace"
        data-selected={activity?.id ?? undefined}
      >
        <TripHeader trip={trip} selectedDay={day} />
        <ProposalsProvider tripId={trip.id}>
          <WorkspaceDock
            trip={trip}
            active={active}
            requested={requested}
            day={day}
            items={items}
            activity={activity}
            hovered={hovered}
            dayRisk={dayRisk}
            routes={routes}
            onNavigate={(id) => router.push(url(id), { scroll: false })}
            onDayChange={handleDayChange}
            onSelect={setSelected}
            onHover={setHovered}
          />
        </ProposalsProvider>
        <nav
          className="mvp-view-nav dock-mobile-nav"
          aria-label={t("workspace")}
        >
          {(
            [
              ["plan", ListChecks],
              ["map", Route],
              ["chat", MessageSquare],
              ["decisions", Vote],
              ["budget", Wallet],
              ["people", Users],
            ] as const
          ).map(([key, Icon]) => (
            <Link
              key={key}
              href={url(key)}
              scroll={false}
              aria-current={active === key ? "page" : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              {t(key)}
            </Link>
          ))}
        </nav>
      </main>
    </GoogleMapProvider>
  );
}

function WorkspaceDock({
  trip,
  active,
  requested,
  day,
  items,
  activity,
  hovered,
  dayRisk,
  routes,
  onNavigate,
  onDayChange,
  onSelect,
  onHover,
}: {
  trip: Trip;
  active: PanelId;
  requested: string | null;
  day: number;
  items: Trip["activities"];
  activity: Trip["activities"][number] | undefined;
  hovered: string | null;
  dayRisk: WeatherDay | null;
  routes: ReturnType<typeof useRoutes>;
  onNavigate: (id: PanelId) => void;
  onDayChange: (day: number) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { proposals } = useSharedProposals(trip.id);
  const openCount = proposals.filter((p) => p.status === "open").length;
  const widgetProps: WidgetProps = {
    trip,
    day,
    items,
    activity,
    hovered,
    routes,
    routing: routes,
    dayRisk,
    onDayChange,
    onSelect,
    onHover,
  };
  return (
    <AdaptiveWorkspace
      {...widgetProps}
      active={active}
      requested={requested}
      onNavigate={onNavigate}
      badges={{ decisions: openCount || proposals.length }}
    />
  );
}
