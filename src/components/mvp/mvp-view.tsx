"use client";

import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  CalendarDays,
  Plus,
  Search,
  Users,
  X,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthActionForm } from "@/components/auth/auth-action-form";
import {
  dayCount,
  emptyDraft,
  type Trip,
  type TripDraft,
} from "@/lib/mvp/model";
import { useMvp } from "./mvp-provider";
import { AppButton, Field, SectionHeading, EmptyState } from "./primitives";
import { TripWorkspace } from "./trip-workspace";

export function MvpView({ path }: { path: string[] }) {
  const t = useTranslations("mvp");
  const { trips, base } = useMvp();
  const search = useSearchParams();
  if (path[0] === "trips" && path[1] === "new") return <CreateTrip />;
  if (path[0] === "trips") {
    const trip = trips.find((item) => item.id === path[1]);
    return trip ? (
      <TripWorkspace key={trip.id} trip={trip} />
    ) : (
      <main className="mvp-page">
        <EmptyState title={t("notFound")} description={t("notFoundBody")}>
          <Link className="mvp-link-button" href={base}>
            {t("cancel")}
          </Link>
        </EmptyState>
      </main>
    );
  }
  if (path[0] === "account") return <Account />;
  if (path[0] === "preferences")
    return (
      <main className="mvp-page">
        <SectionHeading eyebrow={t("people")} title={t("preferences")} />
        <p className="mvp-lead">{t("preferenceIntro")}</p>
        <p className="mvp-muted">{t("chooseTrip")}</p>
        <div className="mvp-trip-grid">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} view="people" />
          ))}
        </div>
        {!trips.length && (
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")}>
            <Link href={`${base}/trips/new`} className="mvp-link-button">
              {t("create")}
            </Link>
          </EmptyState>
        )}
      </main>
    );
  return <TripList key={search.get("q") ?? ""} />;
}

function TripCard({ trip, view = "plan" }: { trip: Trip; view?: string }) {
  const t = useTranslations("mvp");
  const { base } = useMvp();
  const locale = useLocale();
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  return (
    <article className="mvp-trip-card">
      <Link
        href={`${base}/trips/${trip.id}?view=${view}`}
        className="mvp-trip-art"
        aria-label={`${t("openTrip")} · ${trip.name}`}
      >
        <svg viewBox="0 0 420 160" fill="none" aria-hidden="true">
          <path
            d="M-20 120L90 40L200 110L300 30L440 100M60 170L160 -10M260 170L360 -10"
            className="mvp-art-street"
          />
          <path
            d="M55 115C150 105 80 35 190 55S300 135 370 65"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="6 7"
          />
          <circle cx="55" cy="115" r="7" fill="currentColor" />
          <circle cx="370" cy="65" r="7" fill="currentColor" />
        </svg>
        <span className="mvp-pill">{t(trip.demo ? "demo" : "draft")}</span>
        <strong>{trip.destination}</strong>
        <span className="mvp-trip-art-arrow">
          <ArrowRight size={22} />
        </span>
      </Link>
      <div className="mvp-trip-card-content">
        <h2>
          <Link href={`${base}/trips/${trip.id}?view=${view}`}>
            {trip.name}
          </Link>
        </h2>
        <p>
          <CalendarDays size={15} />
          {date(trip.start)} — {date(trip.end)}
          <span>· {t("days", { count: dayCount(trip.start, trip.end) })}</span>
        </p>
        <div className="mvp-trip-card-footer">
          <span>
            <Users size={15} />
            {t("members", { count: trip.members.length })}
          </span>
          <strong>
            {new Intl.NumberFormat(locale, {
              style: "currency",
              currency: trip.currency,
              maximumFractionDigits: 0,
            }).format(trip.budget)}
          </strong>
        </div>
      </div>
    </article>
  );
}

function TripList() {
  const t = useTranslations("mvp");
  const { trips, base } = useMvp();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const filtered = trips.filter((trip) =>
    `${trip.name} ${trip.destination}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <main className="mvp-page">
      <SectionHeading eyebrow={t("myTrips")} title={t("greeting")}>
        <Link href={`${base}/trips/new`} className="mvp-link-button">
          <Plus size={18} />
          {t("create")}
        </Link>
      </SectionHeading>
      <p className="mvp-lead">{t("intro")}</p>
      <div className="mvp-list-toolbar">
        <h2>
          {t("seeAll")} <span>{trips.length}</span>
        </h2>
        <form
          noValidate
          className="mvp-search"
          onSubmit={(event) => {
            event.preventDefault();
            router.replace(
              query ? `${base}?q=${encodeURIComponent(query)}` : base,
            );
          }}
        >
          <Search size={17} aria-hidden="true" />
          <input
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label={t("clear")}
              onClick={(event) => {
                setQuery("");
                router.replace(base);
                event.currentTarget.parentElement
                  ?.querySelector("input")
                  ?.focus();
              }}
            >
              <X size={16} />
            </button>
          )}
        </form>
      </div>
      {filtered.length ? (
        <div className="mvp-trip-grid">
          {filtered.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
          <Link className="mvp-new-card" href={`${base}/trips/new`}>
            <span>
              <Plus size={24} />
            </span>
            <strong>{t("create")}</strong>
            <p>{t("createIntro")}</p>
          </Link>
        </div>
      ) : (
        <EmptyState
          title={t(trips.length ? "noResults" : "emptyTitle")}
          description={t(trips.length ? "noResultsBody" : "emptyBody")}
        >
          {trips.length ? (
            <AppButton
              onClick={() => {
                setQuery("");
                router.replace(base);
              }}
            >
              {t("clear")}
            </AppButton>
          ) : (
            <Link className="mvp-link-button" href={`${base}/trips/new`}>
              {t("create")}
            </Link>
          )}
        </EmptyState>
      )}
      <section className="mvp-demo-callout">
        <span className="mvp-demo-sign" aria-hidden="true">
          ✦
        </span>
        <div>
          <h2>{t("human")}</h2>
          <p>{t("aiExample")}</p>
        </div>
        <Link className="mvp-inline-link" href="/demo/trips/tokyo">
          {t("openDemo")}
          <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}

function CreateTrip() {
  const t = useTranslations("mvp");
  const { draft, setDraft, setTrips, setNotice, viewer, base } = useMvp();
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const update = (key: keyof TripDraft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const errors: Record<string, string> = {};
    for (const key of ["name", "destination", "start", "end"] as const)
      if (!draft[key].trim()) errors[key] = t("required");
    const count = dayCount(draft.start, draft.end);
    if (!Number.isFinite(count) || count < 1 || count > 60)
      errors.end = t("invalidDates");
    if (
      !/^\d+(\.\d{1,2})?$/.test(draft.budget) ||
      !Number.isFinite(Number(draft.budget))
    )
      errors.budget = t("invalidBudget");
    try {
      new Intl.DateTimeFormat("en", { timeZone: draft.timezone }).format();
    } catch {
      errors.timezone = t("invalidTimezone");
    }
    setErrors(errors);
    if (Object.keys(errors).length) {
      form
        .querySelector<HTMLInputElement>(`[name="${Object.keys(errors)[0]}"]`)
        ?.focus();
      return;
    }
    const trip: Trip = {
      ...draft,
      name: draft.name.trim(),
      destination: draft.destination.trim(),
      id: crypto.randomUUID(),
      demo: false,
      budget: Number(draft.budget),
      activities: [],
      members: [
        {
          id: "me",
          name: viewer.name || t("you"),
          interests: "",
          dislikes: "",
          food: "",
          pace: "balanced",
          budget: 0,
        },
      ],
    };
    setTrips((all) => [...all, trip]);
    setDraft(emptyDraft);
    setNotice(t("created"));
    router.push(base);
  }
  return (
    <main className="mvp-page mvp-form-page">
      <Link className="mvp-inline-link" href={base}>
        <ArrowLeft size={16} />
        {t("cancel")}
      </Link>
      <SectionHeading eyebrow={t("draft")} title={t("create")} />
      <p className="mvp-lead">{t("createIntro")}</p>
      <form className="mvp-card mvp-create-form" noValidate onSubmit={submit}>
        <Field
          label={t("name")}
          name="name"
          value={draft.name}
          onChange={(e) => update("name", e.target.value)}
          maxLength={100}
          error={errors.name}
          required
        />
        <Field
          label={t("destination")}
          name="destination"
          value={draft.destination}
          onChange={(e) => update("destination", e.target.value)}
          maxLength={120}
          error={errors.destination}
          required
        />
        <div className="mvp-form-row">
          <Field
            label={t("start")}
            name="start"
            type="date"
            value={draft.start}
            onChange={(e) => update("start", e.target.value)}
            error={errors.start}
            required
          />
          <Field
            label={t("end")}
            name="end"
            type="date"
            value={draft.end}
            min={draft.start || undefined}
            onChange={(e) => update("end", e.target.value)}
            error={errors.end}
            required
          />
        </div>
        <p className="mvp-hint">{t("dateHint")}</p>
        <div className="mvp-form-row">
          <div className="mvp-field">
            <label htmlFor="trip-currency">{t("currency")}</label>
            <select
              id="trip-currency"
              value={draft.currency}
              onChange={(e) => update("currency", e.target.value)}
            >
              {["MYR", "USD", "JPY", "CNY", "SGD", "EUR"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <Field
            label={t("budget")}
            name="budget"
            type="number"
            min="0"
            step="0.01"
            value={draft.budget}
            onChange={(e) => update("budget", e.target.value)}
            error={errors.budget}
            required
          />
        </div>
        <Field
          label={t("timezone")}
          name="timezone"
          value={draft.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          error={errors.timezone}
          hint="Asia/Tokyo · Asia/Kuala_Lumpur · Europe/Paris"
          required
        />
        <p className="mvp-hint">{t("previewNote")}</p>
        <div className="mvp-form-actions">
          <Link className="mvp-inline-link" href={base}>
            {t("cancel")}
          </Link>
          <AppButton type="submit">
            <Plus size={16} />
            {t("createDraft")}
          </AppButton>
        </div>
      </form>
    </main>
  );
}

function Account() {
  const t = useTranslations("mvp");
  const { viewer, demo } = useMvp();
  return (
    <main className="mvp-page mvp-form-page">
      <SectionHeading title={t("account")} />
      <p className="mvp-lead">{t(demo ? "demoAccount" : "accountIntro")}</p>
      <section className="mvp-card mvp-account">
        <ShieldCheck size={30} />
        <h2>{demo ? "Tripify" : viewer.name}</h2>
        {!demo && <p>{viewer.email}</p>}
        <p className="mvp-muted">{t("previewNote")}</p>
        {demo ? (
          <Link className="mvp-link-button" href="/sign-in">
            {t("signIn")}
          </Link>
        ) : (
          <AuthActionForm logout buttonClassName="mvp-button" />
        )}
      </section>
    </main>
  );
}
