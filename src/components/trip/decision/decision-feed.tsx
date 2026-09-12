"use client";
import { useTranslations } from "next-intl";
import { Vote, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Trip, Activity } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { AiChat } from "../ai/ai-chat";
import { useSharedProposals } from "./shared-proposals";

export function DecisionFeed({
  trip,
  selected,
}: {
  trip: Trip;
  selected?: Activity;
}) {
  const t = useTranslations("dock"),
    m = useTranslations("mvp");
  const { base } = useMvp();
  const { proposals, loading } = useSharedProposals(trip.id);
  return (
    <div className="decision-feed">
      {selected && (
        <div className="decision-context">
          <small>{m("selected")}</small>
          <strong>{selected.title}</strong>
          <span>
            {selected.time} · {selected.place}
          </span>
        </div>
      )}
      <AiChat tripId={trip.id} selectedDay={selected?.day} />
      {loading ? (
        <p className="decision-quiet">{t("loadingFeed")}</p>
      ) : proposals.length ? (
        proposals.slice(0, 6).map((item) => {
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
                <h4>{t("votes")}</h4>
                <p>
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
        })
      ) : (
        <p className="decision-quiet">{t("noProposals")}</p>
      )}
    </div>
  );
}
