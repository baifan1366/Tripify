"use client";
import { useEffect, useId, useRef } from "react";
import { ArrowUp, Square } from "lucide-react";
import "./message-composer.css";

export function MessageComposer({
  value,
  onChange,
  onSend,
  label,
  sendLabel,
  stopLabel,
  onStop,
  busy = false,
  maxLength = 4000,
  context,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  label: string;
  sendLabel: string;
  stopLabel?: string;
  onStop?: () => void;
  busy?: boolean;
  maxLength?: number;
  context?: string;
}) {
  const id = useId(),
    input = useRef<HTMLTextAreaElement>(null),
    composing = useRef(false);
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(160, Math.max(52, el.scrollHeight))}px`;
  }, [value]);
  const send = () => {
    if (!busy && value.trim() && !composing.current) onSend();
  };
  return (
    <form
      className="mvp-composer trip-message-composer"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <textarea
        ref={input}
        id={id}
        rows={2}
        className="resize-none"
        value={value}
        maxLength={maxLength}
        placeholder={label}
        onChange={(e) => onChange(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            !e.shiftKey &&
            !e.nativeEvent.isComposing &&
            !composing.current
          ) {
            e.preventDefault();
            send();
          }
        }}
      />
      <div className="trip-composer-footer">
        <span>{context}</span>
        {busy && onStop ? (
          <button
            type="button"
            className="trip-composer-send"
            aria-label={stopLabel}
            onClick={onStop}
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            className="trip-composer-send"
            disabled={!value.trim() || busy}
            aria-label={sendLabel}
          >
            <ArrowUp size={19} />
          </button>
        )}
      </div>
    </form>
  );
}
