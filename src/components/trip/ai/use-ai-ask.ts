"use client";
import { useLocale } from "next-intl";
import { useRef, useState } from "react";

export type AiAskState =
  | { status: "idle" }
  | { status: "working" }
  | { status: "done"; text: string; tools: string[] }
  | { status: "error"; message: string };

/**
 * One-shot Tripify AI question with a full-text result (no chat history).
 * Streams SSE events from POST /api/ai/chat and concatenates token deltas.
 */
export function useAiAsk() {
  const locale = useLocale();
  const [state, setState] = useState<AiAskState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  async function ask(
    tripId: string,
    prompt: string,
    selectedDay?: number,
  ): Promise<string | null> {
    abortRef.current?.abort();
    const userController = new AbortController();
    abortRef.current = userController;
    const timeout = AbortSignal.timeout(90000);
    const signal = AbortSignal.any([userController.signal, timeout]);
    setState({ status: "working" });
    let full = "";
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          messages: [{ role: "user", content: prompt.slice(0, 4000) }],
          locale,
          selectedDay,
          requestId: crypto.randomUUID(),
        }),
        signal,
      });
      if (!response.ok || !response.body) {
        setState({ status: "error", message: "AI_UPSTREAM" });
        return null;
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
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          let event: { type: string; text?: string; tools?: string[] };
          try {
            event = JSON.parse(trimmed.slice(5));
          } catch {
            continue;
          }
          if (event.type === "token" && event.text) full += event.text;
          else if (event.type === "done") {
            full = event.text ?? full;
            const result = { status: "done" as const, text: full, tools: event.tools ?? [] };
            setState(result);
            abortRef.current = null;
            return full.trim() ? full : null;
          } else if (event.type === "error") {
            setState({ status: "error", message: "AI_UPSTREAM" });
            abortRef.current = null;
            return null;
          }
        }
      }
      if (full.trim()) {
        setState({ status: "done", text: full, tools: [] });
        abortRef.current = null;
        return full;
      }
      setState({ status: "error", message: "AI_EMPTY" });
      abortRef.current = null;
      return null;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setState({ status: "idle" });
        return null;
      }
      setState({ status: "error", message: "AI_UPSTREAM" });
      abortRef.current = null;
      return null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    abortRef.current?.abort();
    abortRef.current = null;
    setState({ status: "idle" });
  }

  return { state, ask, stop, reset };
}
