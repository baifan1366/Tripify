"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  Route,
  Sparkles,
  Users,
  Wallet,
  MessageSquare,
  ListChecks,
  Vote,
  CloudRain,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  dayCount,
  dateAt,
  estimatedTotal,
  type Trip,
  type Activity,
} from "@/lib/mvp/model";
import { useMvp } from "./mvp-provider";
import { AppButton, Field } from "./primitives";
import {
  ChatPanel,
  ProposalPanel,
  BudgetPanel,
  PeoplePanel,
} from "./workspace-panels";

const views = [
  ["plan", ListChecks],
  ["map", Route],
  ["chat", MessageSquare],
  ["decisions", Vote],
  ["budget", Wallet],
  ["people", Users],
] as const;

export function TripWorkspace({ trip }: { trip: Trip }) {
  const t = useTranslations("mvp");
  const locale = useLocale();
  const { base } = useMvp();
  const search = useSearchParams();
  const requested = search.get("view");
  const view = views.some(([key]) => key === requested) ? requested! : "plan";
  const [day, setDay] = useState(trip.demo ? 3 : 1);
  const [selected, setSelected] = useState<string | null>(null);
  const items = trip.activities
    .filter((a) => a.day === day)
    .sort((a, b) => a.time.localeCompare(b.time));
  const activity = items.find((a) => a.id === selected) ?? items[0];
  const url = (view: string) => `${base}/trips/${trip.id}?view=${view}`;
  const amount = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: trip.currency,
      maximumFractionDigits: 0,
    }).format(n);
  return (
    <main className="mvp-workspace">
      <header className="mvp-trip-header">
        <div>
          <Link className="mvp-inline-link" href={base}>
            <ArrowLeft size={14} />
            {t("myTrips")}
          </Link>
          <div className="mvp-trip-title">
            <h1>{trip.name}</h1>
            <span className="mvp-tag">{t(trip.demo ? "demo" : "draft")}</span>
          </div>
          <p>
            <MapPin size={14} />
            {trip.destination}
            <span>·</span>
            <CalendarDays size={14} />
            {new Intl.DateTimeFormat(locale, {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }).format(dateAt(trip.start, 1))}{" "}
            —{" "}
            {new Intl.DateTimeFormat(locale, {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            }).format(dateAt(trip.end, 1))}
          </p>
        </div>
        <div className="mvp-trip-header-end">
          <Link
            href={url("people")}
            className="mvp-avatar-group"
            aria-label={t("people")}
          >
            {trip.members.slice(0, 4).map((member) => (
              <span key={member.id} title={member.name}>
                {member.name.slice(0, 1)}
              </span>
            ))}
            <Users size={17} />
          </Link>
          <Link href={url("budget")} className="mvp-budget-mini">
            <small>{t("currentEstimate")}</small>
            <strong>
              {amount(estimatedTotal(trip))}
              <span> / {amount(trip.budget)}</span>
            </strong>
          </Link>
        </div>
      </header>
      <nav className="mvp-view-nav" aria-label={t("workspace")}>
        {views.map(([key, Icon]) => (
          <Link
            href={url(key)}
            key={key}
            aria-current={view === key ? "page" : undefined}
          >
            <Icon size={17} aria-hidden="true" />
            {t(key)}
          </Link>
        ))}
      </nav>
      {view === "plan" || view === "map" || view === "chat" ? (
        <>
          <div className={`mvp-work-grid mvp-show-${view}`}>
            <section className="mvp-plan-panel" aria-label={t("plan")}>
              <div className="mvp-panel-heading">
                <h2>{t("plan")}</h2>
                <span>
                  {t("days", { count: dayCount(trip.start, trip.end) })}
                </span>
              </div>
              <div className="mvp-day-tabs" aria-label={t("plan")}>
                {Array.from(
                  { length: dayCount(trip.start, trip.end) },
                  (_, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={day === i + 1}
                      onClick={() => {
                        setDay(i + 1);
                        setSelected(null);
                      }}
                    >
                      <span>{t("day", { day: i + 1 })}</span>
                      <small>
                        {new Intl.DateTimeFormat(locale, {
                          month: "short",
                          day: "numeric",
                          timeZone: "UTC",
                        }).format(dateAt(trip.start, i + 1))}
                      </small>
                    </button>
                  ),
                )}
              </div>
              <div className="mvp-day-caption">
                <h3>{t("itinerary")}</h3>
                <span>{trip.timezone}</span>
              </div>
              <Timeline
                trip={trip}
                day={day}
                items={items}
                selected={activity?.id}
                onSelect={setSelected}
              />
            </section>
            <section className="mvp-map-panel" aria-label={t("map")}>
              <div className="mvp-panel-heading">
                <h2>
                  <Route size={17} />
                  {t("map")}
                </h2>
                <span>{t("day", { day })}</span>
              </div>
              <RouteMap
                activities={items}
                selected={activity}
                onSelect={setSelected}
              />
              <div className="mvp-map-note">
                <strong>{t("schematic")}</strong>
                <p>{t("mapHint")}</p>
              </div>
            </section>
            <section className="mvp-chat-panel" aria-label={t("chat")}>
              <ChatPanel trip={trip} />
            </section>
          </div>
          {trip.demo && (
            <div className="mvp-smart-alert">
              <CloudRain size={20} aria-hidden="true" />
              <p>{t("warning")}</p>
              <Link href={url("decisions")}>
                {t("reviewChanges")}
                <ArrowLeft size={14} className="mvp-arrow-forward" />
              </Link>
            </div>
          )}
        </>
      ) : (
        <div className="mvp-work-detail">
          {view === "decisions" ? (
            <ProposalPanel trip={trip} />
          ) : view === "budget" ? (
            <BudgetPanel trip={trip} />
          ) : (
            <PeoplePanel trip={trip} />
          )}
        </div>
      )}
    </main>
  );
}

function Timeline({
  trip,
  day,
  items,
  selected,
  onSelect,
}: {
  trip: Trip;
  day: number;
  items: Activity[];
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("mvp");
  const locale = useLocale();
  const { updateTrip, setNotice } = useMvp();
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const errors: Record<string, string> = {};
    for (const key of ["title", "place", "time"])
      if (!String(data.get(key) ?? "").trim()) errors[key] = t("required");
    if (
      !/^\d+(\.\d{1,2})?$/.test(String(data.get("cost"))) ||
      !Number.isFinite(Number(data.get("cost")))
    )
      errors.cost = t("invalidBudget");
    if (
      !/^\d+$/.test(String(data.get("duration"))) ||
      Number(data.get("duration")) < 1 ||
      Number(data.get("duration")) > 1440
    )
      errors.duration = t("invalidDuration");
    setErrors(errors);
    if (Object.keys(errors).length) {
      form
        .querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }
    const activity: Activity = {
      id: crypto.randomUUID(),
      day,
      time: String(data.get("time")),
      title: String(data.get("title")).trim(),
      place: String(data.get("place")).trim(),
      cost: Number(data.get("cost")),
      duration: Number(data.get("duration")),
    };
    updateTrip({ ...trip, activities: [...trip.activities, activity] });
    onSelect(activity.id);
    setAdding(false);
    setNotice(t("activityAdded"));
  }
  return (
    <div className="mvp-timeline">
      {items.map((item, i) => (
        <div key={item.id} className="mvp-timeline-stop">
          <div className="mvp-timeline-dot">{i + 1}</div>
          <button
            type="button"
            className="mvp-activity-card"
            aria-pressed={selected === item.id}
            onClick={() => onSelect(item.id)}
          >
            <span className="mvp-activity-time">
              {item.time}
              <span>
                <Clock3 size={12} />
                {t("minutes", { count: item.duration })}
              </span>
            </span>
            <strong>{item.title}</strong>
            <small>
              <MapPin size={12} />
              {item.place}
            </small>
            <span className="mvp-activity-bottom">
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: trip.currency,
                maximumFractionDigits: 2,
              }).format(item.cost)}
              <span>↗</span>
            </span>
          </button>
        </div>
      ))}
      {!items.length && (
        <div className="mvp-inline-empty">
          <h3>{t("noActivities")}</h3>
          <p>{t("noActivitiesBody")}</p>
        </div>
      )}
      {adding ? (
        <form className="mvp-activity-form" noValidate onSubmit={submit}>
          <Field
            label={t("activity")}
            name="title"
            required
            maxLength={160}
            error={errors.title}
          />
          <Field
            label={t("place")}
            name="place"
            required
            maxLength={200}
            error={errors.place}
          />
          <Field
            label={t("time")}
            name="time"
            type="time"
            required
            error={errors.time}
          />
          <Field
            label={`${t("cost")} (${trip.currency})`}
            name="cost"
            type="number"
            min="0"
            step=".01"
            defaultValue="0"
            error={errors.cost}
          />
          <Field
            label={t("duration")}
            name="duration"
            type="number"
            min="1"
            max="1440"
            defaultValue="60"
            error={errors.duration}
          />
          <div className="mvp-form-actions">
            <AppButton variant="outline" onClick={() => setAdding(false)}>
              {t("close")}
            </AppButton>
            <AppButton type="submit">{t("save")}</AppButton>
          </div>
        </form>
      ) : (
        <AppButton
          variant="outline"
          className="mvp-add-activity"
          onClick={() => setAdding(true)}
        >
          <Plus size={16} />
          {t("addActivity")}
        </AppButton>
      )}
    </div>
  );
}

function RouteMap({
  activities,
  selected,
  onSelect,
}: {
  activities: Activity[];
  selected?: Activity;
  onSelect: (id: string) => void;
}) {
  const t = useTranslations("mvp");
  const nodes = activities.filter(
    (a) => a.x !== undefined && a.y !== undefined,
  );
  return (
    <div className="mvp-route-map">
      <div className="mvp-map-canvas">
        <svg
          viewBox="0 0 600 600"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="mvp-map-water"
            d="M530 -30C400 90 610 210 495 340S480 480 550 650H650V-30Z"
          />
          <path
            className="mvp-map-park"
            d="M140 75L245 95L215 185L105 165Z M90 380L200 350L250 455L125 490Z"
          />
          {[60, 150, 260, 370, 480, 570].map((n) => (
            <path
              key={n}
              className="mvp-map-road"
              d={`M-20 ${n}L620 ${n - 45}M${n} -20L${n - 75} 620`}
            />
          ))}
          <path className="mvp-map-major" d="M-30 420L660 145M85 -30L400 630" />
          {nodes.length > 1 && (
            <polyline
              points={nodes.map((n) => `${n.x! * 6},${n.y! * 6}`).join(" ")}
              className="mvp-map-route"
            />
          )}
        </svg>
        {nodes.map((node, i) => (
          <button
            key={node.id}
            type="button"
            className="mvp-map-pin"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
            aria-pressed={selected?.id === node.id}
            aria-label={`${i + 1}. ${node.title}`}
            onClick={() => onSelect(node.id)}
          >
            <span>{i + 1}</span>
            <strong>{node.title}</strong>
          </button>
        ))}
        {!nodes.length && (
          <div className="mvp-map-empty">
            <MapPin size={28} />
            <p>{t("noCoordinates")}</p>
          </div>
        )}
        <span className="mvp-map-compass" aria-hidden="true">
          N<br />↑
        </span>
      </div>
      {selected && (
        <div className="mvp-map-selection">
          <span>
            <MapPin size={18} />
          </span>
          <div>
            <small>{t("selected")}</small>
            <strong>{selected.title}</strong>
            <p>
              {selected.place} · {selected.time}
            </p>
            {selected.x === undefined && <p>{t("noCoordinates")}</p>}
          </div>
          <Sparkles size={18} />
        </div>
      )}
    </div>
  );
}
