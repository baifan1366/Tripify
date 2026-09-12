"use client";

import { memo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  estimatedTotal,
  forecastTotal,
  type Trip,
} from "@/lib/mvp/model";
import { useMvp } from "./mvp-provider";
import { useAiAsk } from "@/components/trip/ai/use-ai-ask";
import { saveDraft } from "@/lib/trips/drafts";
import { sharedError } from "@/lib/trips/repository";
import { AppButton } from "./primitives";

/** Budget forecast computed deterministically from stored activities. */
export const BudgetPanel = memo(function BudgetPanel({
  trip,
  selectedId,
  day,
}: {
  trip: Trip;
  selectedId?: string;
  day?: number;
}) {
  const t = useTranslations("mvp");
  const shared = useTranslations("shared");
  const locale = useLocale();
  const { base, setNotice } = useMvp();
  const { state: ai, ask, stop } = useAiAsk();
  const [draftSaved, setDraftSaved] = useState(false);
  const planned = estimatedTotal(trip);
  const forecast = forecastTotal(trip);
  const money = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: trip.currency,
      maximumFractionDigits: 2,
    }).format(n);
  const percent =
    trip.budget > 0 ? Math.min(100, (planned / trip.budget) * 100) : planned > 0 ? 100 : 0;
  const over = planned > trip.budget;
  const byDay = new Map<number, { total: number; count: number }>();
  for (const a of trip.activities) {
    const entry = byDay.get(a.day) ?? { total: 0, count: 0 };
    entry.total += a.cost;
    entry.count += 1;
    byDay.set(a.day, entry);
  }
  const days = [...byDay.entries()].sort((a, b) => a[0] - b[0]);
  const overrun = Math.max(0, forecast - trip.budget);
  return (
    <section className="budget-calm" data-over={over} aria-label={t("budget")}>
      <div className="budget-calm-top">
        <small>{t("budget")}</small>
        <div className="budget-calm-amounts">
          <strong>{money(planned)}</strong>
          <span>/ {money(trip.budget)}</span>
          <span aria-hidden="true">· {Math.round(percent)}%</span>
        </div>
        <div
          className="budget-calm-track"
          role="meter"
          aria-label={t("budget")}
          aria-valuemin={0}
          aria-valuemax={trip.budget || 1}
          aria-valuenow={Math.min(planned, trip.budget || 1)}
          aria-valuetext={`${money(planned)} / ${money(trip.budget)}`}
        >
          <i style={{ width: `${percent}%` }} />
        </div>
        <div className="budget-calm-sub">
          <span>
            {t("forecast")}: {money(forecast)}
          </span>
          <span>
            {t(over ? "overBudget" : "remaining")}:{" "}
            {money(Math.abs(trip.budget - planned))}
          </span>
        </div>
        <p className="mvp-hint">{t("estimateNote")}</p>
      </div>
      <div className="budget-day-list">
        {days.length ? (
          days.map(([d, summary]) => (
            <div key={d}>
              <div
                className="budget-day-row"
                data-active={typeof day === "number" && day === d}
              >
                <span>
                  <small>{t("day", { day: d })}</small>
                  {summary.count} · {money(summary.total)}
                </span>
                <strong>{money(summary.total)}</strong>
              </div>
              {trip.activities
                .filter((a) => a.day === d)
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="budget-day-row"
                    data-active={selectedId === activity.id}
                  >
                    <span>
                      <small>{activity.time}</small>
                      {activity.title}
                    </span>
                    <strong>{money(activity.cost)}</strong>
                  </div>
                ))}
            </div>
          ))
        ) : (
          <p className="mvp-muted">{t("noActivitiesBody")}</p>
        )}
      </div>
      <section className="mvp-ai-reduce" aria-label={t("aiReduce")}>
        {ai.status === "idle" && (
          <AppButton
            onClick={() =>
              void ask(
                trip.id,
                t("aiReducePrompt", {
                  budget: money(trip.budget),
                  planned: money(planned),
                  forecast: money(forecast),
                  overrun: money(overrun),
                }),
              )
            }
          >
            <Sparkles size={16} />
            {overrun > 0 ? t("aiReduceOver", { amount: money(overrun) }) : t("aiReduce")}
          </AppButton>
        )}
        {ai.status === "working" && (
          <div role="status">
            <p className="decision-quiet">{t("aiReduceWorking")}</p>
            <AppButton variant="outline" onClick={stop}>
              {t("aiStop")}
            </AppButton>
          </div>
        )}
        {ai.status === "error" && (
          <div role="alert">
            <p>{t("aiReduceFailed")}</p>
            <AppButton
              variant="outline"
              onClick={() =>
                void ask(
                  trip.id,
                  t("aiReducePrompt", {
                    budget: money(trip.budget),
                    planned: money(planned),
                    forecast: money(forecast),
                    overrun: money(overrun),
                  }),
                )
              }
            >
              {t("aiRetry")}
            </AppButton>
          </div>
        )}
        {ai.status === "done" && (
          <div>
            <p className="ai-chat-text">{ai.text}</p>
            {draftSaved ? (
              <p role="status" className="mvp-success">
                {shared("saved")}{" "}
                <Link
                  className="mvp-inline-link"
                  href={`${base}/trips/${trip.id}?view=decisions`}
                >
                  {t("viewProposal")}
                </Link>
              </p>
            ) : (
              <AppButton
                variant="outline"
                onClick={() => {
                  saveDraft(trip.id, "proposal", ai.text)
                    .then(() => {
                      setDraftSaved(true);
                      setNotice(shared("saved"));
                    })
                    .catch((e: unknown) => {
                      const code =
                        e && typeof e === "object" && "message" in e
                          ? sharedError(e)
                          : "failed";
                      setNotice(shared(code));
                    });
                }}
              >
                {t("useAsProposal")}
              </AppButton>
            )}
          </div>
        )}
      </section>
    </section>
  );
});
