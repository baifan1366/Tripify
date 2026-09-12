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
import { BudgetPanel } from "@/components/mvp/workspace-panels";
import { DayNavigator } from "../journey/day-navigator";
import { DayTimeline } from "../journey/day-timeline";
import { MapPanel } from "../map/map-panel";
import { DecisionFeed } from "../decision/decision-feed";
import {
  ProposalsProvider,
  SharedProposals,
} from "../decision/shared-proposals";
import { DockWorkspace } from "./dock-workspace";
import "./workspace.css";
import { SharedPeople } from "../people/shared-people";
import { SharedChat } from "../chat/shared-chat";
import { GoogleMapProvider } from "@/lib/maps/google-map-provider";
import { useRoutes } from "@/lib/maps/use-routes";
import { useTripWeather } from "@/lib/maps/use-trip-weather";
import { HistoryPanel } from "../history/history-panel";

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
    () =>
      trip.activities
        .filter((a) => a.day === day)
        .sort((a, b) => a.time.localeCompare(b.time)),
    [trip.activities, day],
  );
  const activity = items.find((a) => a.id === selected) ?? items[0];
  const handleDayChange = useCallback(
    (next: number) => {
      setDay(next);
      setSelected(null);
    },
    [],
  );
  const url = (view: string) => `${base}/trips/${trip.id}?view=${view}`;
  return (
    <GoogleMapProvider enabled>
      <main className="mvp-workspace travel-workspace">
        <TripHeader trip={trip} />
        <ProposalsProvider tripId={trip.id}>
        <DockWorkspace
          active={active}
          requested={requested}
          onNavigate={(id) => router.push(url(id), { scroll: false })}
          panels={{
            plan: (
              <>
                <DayNavigator
                  trip={trip}
                  day={day}
                  onChange={handleDayChange}
                />
                <p className="journey-timezone">{trip.timezone}</p>
                <DayTimeline
                  trip={trip}
                  day={day}
                  items={items}
                  selected={activity?.id}
                  onSelect={setSelected}
                  hovered={hovered}
                  onHover={setHovered}
                  routes={routes.segments}
                />
              </>
            ),
            map: (
              <MapPanel
                items={items}
                selected={activity}
                onSelect={setSelected}
                hovered={hovered}
                onHover={setHovered}
                routing={routes}
                routes={routes.segments}
                dayRisk={dayRisk}
              />
            ),
            ai: <DecisionFeed trip={trip} selected={activity} />,
            chat: <SharedChat trip={trip} />,
            decisions: <SharedProposals trip={trip} />,
            budget: <BudgetPanel trip={trip} />,
            people: <SharedPeople trip={trip} />,
            history: <HistoryPanel trip={trip} />,
          }}
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
