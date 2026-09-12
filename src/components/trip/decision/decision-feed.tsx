"use client";
import { useTranslations } from "next-intl";
import { Vote, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Trip, Activity } from "@/lib/mvp/model";
import { dayCount, forecastTotal } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AiChat } from "../ai/ai-chat";
import { changeSummary, useSharedProposals } from "./shared-proposals";

export function DecisionFeed({
  trip,
  selected,
  detailed,
}: {
  trip: Trip;
  selected?: Activity;
  /** Focus mode: render each proposal's field diffs inline. */
  detailed?: boolean;
}) {
  const t = useTranslations("dock"),
    m = useTranslations("mvp"),
    s = useTranslations("shared");
  const { base } = useMvp();
  const { proposals, loading } = useSharedProposals(trip.id);
  // Contextual starters: over-budget trips lead with saving, multi-day
  // trips with pacing, rain backup always applies. Tap-to-send onboarding.
  const suggestions = [
    ...(forecastTotal(trip) > trip.budget ? [t("suggestSave")] : []),
    ...(dayCount(trip.start, trip.end) > 1
      ? [t("suggestPace", { day: selected?.day ?? 1 })]
      : []),
    t("suggestRain"),
  ].slice(0, 3);
  return (
    <div className="decision-feed ai-live">
      <div className="ai-live-head">
        <h2>{t("ai")}</h2>
        <p>
          {selected?.day
            ? `${m("day", { day: selected.day })} · ${selected.time}`
            : t("aiEmpty")}
        </p>
      </div>
      {selected && (
        <span className="ai-context-chip" title={`${selected.title} · ${selected.place}`}>
          Context: {selected.title}
        </span>
      )}
      <AiChat tripId={trip.id} selectedDay={selected?.day} suggestions={suggestions} />
      {loading ? (
        <p className="decision-quiet">{t("loadingFeed")}</p>
      ) : proposals.length ? (
        <section aria-label={t("proposal")}>
          {proposals.slice(0, 3).map((item) => {
            const approvals = item.proposal_votes.filter(
              (vote) => vote.vote === "approve",
            ).length;
            return (
              <article key={item.id} className="decision-event decision-proposal">
                <Vote size={18} aria-hidden="true" />
                <div>
                  <h3>
                    {t("proposal")}{" "}
                    <span className={`mvp-tag mvp-state-${item.status}`}>
                      {t(`proposal_${item.status}`)}
                    </span>
                  </h3>
                  <p>{item.title}</p>
                  {detailed && (
                    <ul className="decision-diff">
                      {item.proposal_changes
                        .slice()
                        .sort((a, b) => a.ordinal - b.ordinal)
                        .slice(0, 4)
                        .map((change) => (
                          <li key={change.id}>{changeSummary(s, change)}</li>
                        ))}
                    </ul>
                  )}
                  <p className="decision-quiet">
                    {t("voteCount", {
                      yes: approvals,
                      total: trip.members.length,
                    })}
                  </p>
                  <Link
                    className="mvp-inline-link"
                    href={`${base}/trips/${trip.id}?view=decisions`}
                  >
                    {m("viewProposal")}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
