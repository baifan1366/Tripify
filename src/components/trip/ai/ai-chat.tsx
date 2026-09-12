"use client";

import { useLocale, useTranslations } from "next-intl";
import { Send, Sparkles, Square } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { AppButton } from "@/components/mvp/primitives";
import { usePersistentDraft } from "@/lib/trips/drafts";

type Turn = { role: "user" | "assistant"; content: string };

type StreamEvent =
  | { type: "status"; phase: "thinking" | "researching"; tools?: string[] }
  | { type: "token"; text: string }
  | { type: "done"; text: string; tools?: string[] }
  | { type: "error"; code: string; message: string };

function parseSseLine(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  try {
    return JSON.parse(trimmed.slice(5)) as StreamEvent;
  } catch {
    return null;
  }
}

/**
 * Tripify AI chat: streamed teammate answers, visually distinct from
 * human group chat. Future slots: RecommendationCard, ProposalCard,
 * ResearchEvidence, SmartAlert.
 */
export function AiChat({
  tripId,
  selectedDay,
  suggestions,
}: {
  tripId: string;
  selectedDay?: number;
  /** Tap-to-send starter prompts, shown only before the first turn. */
  suggestions?: string[];
}) {
  const t = useTranslations("dock");
  const locale = useLocale();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = usePersistentDraft(tripId, "ai");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [researchTools, setResearchTools] = useState<string[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);

  function nearBottom() {
    const el = logRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function scrollIfStuck() {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }

  const [slow, setSlow] = useState(false);
  async function ask(history: Turn[]) {
    const userController = new AbortController();
    abortRef.current = userController;
    // Overall 90s cap so a stalled model can never hang the panel forever.
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([userController.signal, timeout]);
    setStreaming(true);
    setStreamText("");
    setResearchTools([]);
    setError("");
    setSlow(false);
    // First-token hint: free-tier models can take a while to start.
    const slowTimer = setTimeout(() => setSlow(true), 20000);
    let full = "";
    let gotToken = false;
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          messages: history.slice(-10),
          locale,
          selectedDay,
          requestId: crypto.randomUUID(),
        }),
        signal,
      });
      if (!response.ok || !response.body) {
        let code = "failed";
        try {
          const data = (await response.json()) as {
            error?: string;
          };
          if (data.error === "UNAUTHENTICATED") code = "aiSignIn";
          else if (data.error === "TRIP_FORBIDDEN") code = "aiForbidden";
          else if (data.error === "AI_NOT_CONFIGURED") code = "aiNotConfigured";
        } catch {
          /* keep generic error */
        }
        setError(t(code));
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const event = parseSseLine(line);
          if (!event) continue;
          if (event.type === "status") {
            if (event.tools) setResearchTools(event.tools);
            scrollIfStuck();
          } else if (event.type === "token") {
            full += event.text;
            if (!gotToken) {
              gotToken = true;
              clearTimeout(slowTimer);
              setSlow(false);
            }
            setStreamText(full);
            scrollIfStuck();
          } else if (event.type === "done") {
            full = event.text;
            setStreamText(full);
            if (event.tools) setResearchTools(event.tools);
            scrollIfStuck();
          } else if (event.type === "error") {
            setError(
              event.code === "AI_NOT_CONFIGURED"
                ? t("aiNotConfigured")
                : event.code === "AI_QUOTA_EXHAUSTED"
                  ? t("aiQuotaExhausted")
                  : event.code === "AI_CREDITS_EXHAUSTED"
                    ? t("aiCreditsExhausted")
                    : event.message || t("aiFailed"),
            );
          }
        }
      }
      if (full.trim()) {
        setTurns((all) => [...all, { role: "assistant", content: full }]);
        setStreamText("");
      } else if (!userController.signal.aborted && !error) {
        setError(t("aiFailed"));
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        // Our 90s cap, not the user's Stop button.
        if (timeout.aborted && !userController.signal.aborted) {
          setError(t("aiTimeout"));
        }
        clearTimeout(slowTimer);
        setSlow(false);
        abortRef.current = null;
        setStreaming(false);
        return;
      }
      setError(t("aiFailed"));
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
      abortRef.current = null;
      setStreaming(false);
    }
  }

  function sendText(content: string) {
    const text = content.trim();
    if (!text || streaming) return;
    const next: Turn[] = [...turns, { role: "user", content: text }];
    setTurns(next);
    setInput("");
    stickRef.current = true;
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    void ask(next);
  }

  function send(event: FormEvent) {
    event.preventDefault();
    sendText(input);
  }

  function retry() {
    if (streaming || !turns.length) return;
    setError("");
    void ask(turns);
  }

  const busy = streaming && !streamText && !researchTools.length;
  const researching = streaming && researchTools.length > 0;

  return (
    <section className="ai-chat" aria-label={t("ai")}>
      <div
        ref={logRef}
        className="ai-chat-log"
        role="log"
        aria-label={t("ai")}
        aria-live="polite"
        aria-relevant="additions"
        onScroll={() => {
          stickRef.current = nearBottom();
        }}
      >
        {!turns.length && !streaming && (
          <p className="decision-quiet">{t("aiEmpty")}</p>
        )}
        {turns.map((turn, index) =>
          turn.role === "user" ? (
            <div key={index} className="mvp-chat-bubble mvp-chat-own">
              <div>
                <p>{turn.content}</p>
              </div>
            </div>
          ) : (
            <article
              key={index}
              className="decision-event decision-recommendation"
            >
              <Sparkles size={18} aria-hidden="true" />
              <div>
                <h3>✦ {t("ai")}</h3>
                <p className="ai-chat-text">{turn.content}</p>
              </div>
            </article>
          ),
        )}
        {streaming && (
          <article
            className="decision-event decision-recommendation"
            aria-busy="true"
          >
            <Sparkles size={18} aria-hidden="true" />
            <div>
              <h3>✦ {t("ai")}</h3>
              <p role="status" className="decision-quiet">
                {researching
                  ? `${t("aiResearching")}${researchTools.length ? ` · ${researchTools.join(", ")}` : ""}${slow ? ` · ${t("aiSlow")}` : ""}`
                  : busy
                    ? slow
                      ? t("aiSlow")
                      : t("aiThinking")
                    : ""}
              </p>
              {streamText && <p className="ai-chat-text">{streamText}</p>}
            </div>
          </article>
        )}
      </div>

      {error && (
        <div role="alert" className="ai-chat-error">
          <p>{error}</p>
          <AppButton variant="outline" onClick={retry}>
            {t("aiRetry")}
          </AppButton>
        </div>
      )}

      {!turns.length && !streaming && (suggestions?.length ?? 0) > 0 && (
        <div className="ai-suggest-row" role="group" aria-label={t("ai")}>
          {suggestions!.slice(0, 3).map((s) => (
            <button key={s} type="button" onClick={() => sendText(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form className="mvp-composer" noValidate onSubmit={send}>
        <label htmlFor={`ai-input-${tripId}`}>{t("aiPlaceholder")}</label>
        <textarea
          id={`ai-input-${tripId}`}
          className="resize-none"
          rows={3}
          maxLength={4000}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("aiPlaceholder")}
          disabled={streaming}
        />
        <div>
          {streaming ? (
            <AppButton
              type="button"
              variant="outline"
              aria-label={t("aiStop")}
              onClick={() => abortRef.current?.abort()}
            >
              <Square size={16} />
            </AppButton>
          ) : (
            <AppButton
              type="submit"
              disabled={!input.trim()}
              aria-label={t("aiSend")}
            >
              <Send size={16} />
            </AppButton>
          )}
        </div>
      </form>
    </section>
  );
}
