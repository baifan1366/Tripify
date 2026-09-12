"use client";

import { memo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Sparkles, Wallet } from "lucide-react";
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
}: {
  trip: Trip;
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
  const overrun = Math.max(0, forecast - trip.budget);
  return (
    <section className="mvp-budget-page">
      <p className="mvp-eyebrow">{t("budget")}</p>
      <h2>{t("budgetIntro")}</h2>
      <div className="mvp-budget-grid">
        <article className="mvp-card mvp-budget-overview">
          <Wallet size={26} />
          <p>{t("currentEstimate")}</p>
          <strong>{money(planned)}</strong>
          <span> / {money(trip.budget)}</span>
          <div
            className="mvp-budget-track"
            role="meter"
            aria-label={t("budget")}
            aria-valuemin={0}
            aria-valuemax={trip.budget || 1}
            aria-valuenow={Math.min(planned, trip.budget || 1)}
            aria-valuetext={`${money(planned)} / ${money(trip.budget)}`}
          >
            <span
              style={{
                width: `${Math.min(100, trip.budget > 0 ? (planned / trip.budget) * 100 : planned > 0 ? 100 : 0)}%`,
              }}
            />
          </div>
          <div className="mvp-budget-row">
            <span>{t(planned > trip.budget ? "overBudget" : "remaining")}</span>
            <strong>{money(Math.abs(trip.budget - planned))}</strong>
          </div>
          <p className="mvp-hint">{t("estimateNote")}</p>
        </article>
        <article className="mvp-card mvp-forecast">
          <span className="mvp-eyebrow">✦ {t("forecast")}</span>
          <strong>{money(forecast)}</strong>
          <p>
            {`${t("forecastRemaining")}: ${money(Math.max(0, trip.budget - forecast))}`}
          </p>
          <span className="mvp-tag">{t("forecastTag")}</span>
        </article>
      </div>
      <section className="mvp-card mvp-cost-list">
        <h3>{t("cost")}</h3>
        {trip.activities.length ? (
          trip.activities.map((activity) => (
            <div className="mvp-cost-row" key={activity.id}>
              <span>
                <small>{t("day", { day: activity.day })}</small>
                {activity.title}
              </span>
              <strong>{money(activity.cost)}</strong>
            </div>
          ))
        ) : (
          <p className="mvp-muted">{t("noActivitiesBody")}</p>
        )}
      </section>
      <section className="mvp-card mvp-ai-reduce" aria-label={t("aiReduce")}>
        <span className="mvp-eyebrow">✦ Tripify AI</span>
        <h3>{t("aiReduce")}</h3>
        <p className="mvp-muted">{t("aiReduceHint")}</p>
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
