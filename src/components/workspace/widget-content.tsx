"use client";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Activity, Trip } from "@/lib/mvp/model";
import type { useRoutes } from "@/lib/maps/use-routes";
import type { WeatherDay } from "@/lib/weather/risk";
import { DayNavigator } from "../trip/journey/day-navigator";
import { DayTimeline } from "../trip/journey/day-timeline";
import { MapPanel } from "../trip/map/map-panel";
import { DecisionFeed } from "../trip/decision/decision-feed";
import { SharedChat } from "../trip/chat/shared-chat";
import { SharedProposals, useSharedProposals } from "../trip/decision/shared-proposals";
import { BudgetPanel } from "../mvp/workspace-panels";
import { SharedPeople } from "../trip/people/shared-people";
import { HistoryPanel } from "../trip/history/history-panel";
import { useWorkspaceGrid } from "./workspace-layout-context";
import { useWidgetDensity } from "./widget-frame";
import type { WidgetId } from "./widget-registry";

export interface WidgetProps {
  trip: Trip;
  day: number;
  items: Activity[];
  activity?: Activity;
  hovered: string | null;
  routes: ReturnType<typeof useRoutes>;
  routing: ReturnType<typeof useRoutes>;
  dayRisk: WeatherDay | null;
  onDayChange: (day: number) => void;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function JourneyContent(p: WidgetProps) {
  const t = useTranslations("dock");
  const m = useTranslations("mvp");
  const density = useWidgetDensity();
  const current = p.activity;
  const next = current
    ? p.items.find((a) => a.time > current.time)
    : p.items[0];
  return (
    <>
      {density === "compact" && (
        <div className="ws-compact-only ws-journey-compact">
          <div className="ws-compact-row">
            <button
              type="button"
              aria-label={t("previousDay")}
              disabled={p.day <= 1}
              onClick={() => p.onDayChange(p.day - 1)}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <strong>
              {m("day", { day: p.day })}
              {current ? ` · ${current.time} ${current.title}` : ""}
            </strong>
            <button
              type="button"
              aria-label={t("nextDay")}
              onClick={() => p.onDayChange(p.day + 1)}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          {next && next.id !== current?.id && (
            <button
              type="button"
              className="ws-compact-next"
              onClick={() => p.onSelect(next.id)}
            >
              {t("nextActivity", { title: next.title })}
            </button>
          )}
        </div>
      )}
      <div className="ws-full-content">
        <DayNavigator trip={p.trip} day={p.day} onChange={p.onDayChange} />
        <p className="journey-timezone">{p.trip.timezone}</p>
        <DayTimeline
          trip={p.trip}
          day={p.day}
          items={p.items}
          selected={p.activity?.id}
          onSelect={p.onSelect}
          hovered={p.hovered}
          onHover={p.onHover}
          routes={p.routes.segments}
        />
      </div>
    </>
  );
}

export function MapContent(p: WidgetProps) {
  const t = useTranslations("dock");
  const density = useWidgetDensity();
  return (
    <>
      {density === "compact" && (
        <p className="ws-compact-only ws-map-compact">
          {p.activity
            ? `${p.activity.time} · ${p.activity.place}`
            : t("emptyDay")}
        </p>
      )}
      <div className="ws-full-content ws-map-full">
        <MapPanel
          items={p.items}
          selected={p.activity}
          onSelect={p.onSelect}
          hovered={p.hovered}
          onHover={p.onHover}
          routing={p.routing}
          routes={p.routes.segments}
          dayRisk={p.dayRisk}
        />
      </div>
    </>
  );
}

export function AiContent(p: WidgetProps) {
  const { focusId } = useWorkspaceGrid();
  return (
    <div className="ws-full-content">
      <DecisionFeed
        trip={p.trip}
        selected={p.activity}
        detailed={focusId === "ai"}
      />
    </div>
  );
}

export function BudgetContent(p: WidgetProps) {
  return (
    <div className="ws-full-content">
      <BudgetPanel trip={p.trip} selectedId={p.activity?.id} day={p.day} />
    </div>
  );
}

export function PeopleContent(p: WidgetProps) {
  return (
    <div className="ws-full-content">
      <SharedPeople trip={p.trip} />
    </div>
  );
}

export function DecisionsContent(p: WidgetProps) {
  const t = useTranslations("dock");
  const density = useWidgetDensity();
  const { proposals } = useSharedProposals(p.trip.id);
  const open = proposals.filter((pr) => pr.status === "open").length;
  return (
    <>
      {density === "compact" && (
        <p className="ws-compact-only ws-decisions-compact">
          {t("pendingDecisions", { count: open })}
        </p>
      )}
      <div className="ws-full-content">
        <SharedProposals trip={p.trip} />
      </div>
    </>
  );
}

export function HistoryContent(p: WidgetProps) {
  return (
    <div className="ws-full-content">
      <HistoryPanel trip={p.trip} />
    </div>
  );
}

export function ChatContent(p: WidgetProps) {
  return (
    <div className="ws-full-content">
      <SharedChat trip={p.trip} />
    </div>
  );
}

export const WIDGET_CONTENT: Record<
  WidgetId,
  (p: WidgetProps) => React.JSX.Element
> = {
  plan: JourneyContent,
  map: MapContent,
  ai: AiContent,
  budget: BudgetContent,
  people: PeopleContent,
  chat: ChatContent,
  decisions: DecisionsContent,
  history: HistoryContent,
};
