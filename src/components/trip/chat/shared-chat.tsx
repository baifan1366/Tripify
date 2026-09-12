"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Trip } from "@/lib/mvp/model";
import { useMvp } from "@/components/mvp/mvp-provider";
import { usePersistentDraft } from "@/lib/trips/drafts";
import { AppButton } from "@/components/mvp/primitives";

type ChatRow = {
  id: string;
  user_id: string;
  content: string;
  message_type: string;
  client_message_id: string | null;
  created_at: string;
};
type Outgoing = { id: string; content: string; failed: boolean };
const columns = "id,user_id,content,message_type,client_message_id,created_at";

function sortRows(rows: ChatRow[]): ChatRow[] {
  return rows.sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

/**
 * Merges fetched rows while preserving object identity for unchanged
 * messages, so memoized rows skip re-renders on every poll.
 */
const MAX_KEPT_ROWS = 300;

function rowKey(row: ChatRow): string {
  return `${row.created_at}|${row.id}`;
}

function mergeRows(previous: ChatRow[], incoming: ChatRow[]): ChatRow[] {
  if (!incoming.length) return previous;
  const kept = new Map(previous.map((r) => [r.id, r]));
  const merged = incoming.map((row) => {
    const old = kept.get(row.id);
    if (
      old &&
      old.content === row.content &&
      old.created_at === row.created_at &&
      old.message_type === row.message_type &&
      old.user_id === row.user_id &&
      old.client_message_id === row.client_message_id
    )
      return old;
    return row;
  });
  const ids = new Set(incoming.map((r) => r.id));
  const floor = rowKey(sortRows([...incoming])[0]);
  // Preserve previously paged history older than this window; rows inside
  // (or newer than) the window that vanished were deleted server-side.
  const previousKept = previous.filter(
    (r) => !ids.has(r.id) && rowKey(r) < floor,
  );
  const all = sortRows([...previousKept, ...merged]);
  return all.length > MAX_KEPT_ROWS
    ? all.slice(all.length - MAX_KEPT_ROWS)
    : all;
}

const ChatMessageRow = memo(function ChatMessageRow({
  row,
  own,
  displayName,
  locale,
  timezone,
}: {
  row: ChatRow;
  own: boolean;
  displayName: string;
  locale: string;
  timezone: string;
}) {
  return (
    <div
      className={`mvp-chat-bubble ${own ? "mvp-chat-own" : ""}`}
      data-message-type={row.message_type}
    >
      <span className="mvp-avatar" aria-hidden="true">
        {displayName.slice(0, 1)}
      </span>
      <div>
        <strong>{displayName}</strong>
        <time dateTime={row.created_at}>
          {new Intl.DateTimeFormat(locale, {
            dateStyle: "short",
            timeStyle: "short",
            timeZone: timezone,
          }).format(new Date(row.created_at))}
        </time>
        <p>{row.content}</p>
      </div>
    </div>
  );
});

function ChatComposer({
  tripId,
  onSend,
}: {
  tripId: string;
  onSend: (content: string) => void;
}) {
  const m = useTranslations("mvp");
  const [draft, setDraft] = usePersistentDraft(tripId, "chat");
  const composing = useRef(false);
  return (
    <form
      className="mvp-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (composing.current || !draft.trim()) return;
        const content = draft.trim();
        setDraft("");
        onSend(content);
      }}
    >
      <label htmlFor={`shared-message-${tripId}`}>{m("message")}</label>
      <textarea
        id={`shared-message-${tripId}`}
        rows={3}
        maxLength={2000}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
        }}
      />
      <AppButton
        type="submit"
        disabled={!draft.trim()}
        aria-label={m("send")}
      >
        <Send size={16} />
      </AppButton>
    </form>
  );
}

const POLL_BASE_MS = 15000;
const POLL_MAX_MS = 60000;

// Kept mounted by DockWorkspace: drafts/subscriptions survive hide, resize and reordering.
export function SharedChat({ trip }: { trip: Trip }) {
  const t = useTranslations("shared");
  const m = useTranslations("mvp");
  const locale = useLocale();
  const { viewer } = useMvp();
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [connected, setConnected] = useState(false);
  const [older, setOlder] = useState(true);
  const [paging, setPaging] = useState(false);
  const sending = useRef(new Set<string>());
  const alive = useRef(false);
  const failCount = useRef(0);
  const viewerId = viewer.id;
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const client = createClient();
      const access = await client
        .from("trips")
        .select("id")
        .eq("id", trip.id)
        .maybeSingle();
      if (access.error) throw access.error;
      if (!access.data) {
        if (alive.current) {
          setRows([]);
          setOutgoing([]);
        }
        throw new Error("FORBIDDEN");
      }
      const result = await client
        .from("chat_messages")
        .select(columns)
        .eq("trip_id", trip.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(100);
      if (result.error) throw result.error;
      if (alive.current) {
        const latest = result.data as ChatRow[];
        setRows((previous) => mergeRows(previous, latest));
        setOutgoing((pending) =>
          pending.filter(
            (p) =>
              !latest.some(
                (r) => r.user_id === viewerId && r.client_message_id === p.id,
              ),
          ),
        );
        setError(false);
        failCount.current = 0;
        if (latest.length < 100) setOlder(false);
      }
      return true;
    } catch {
      if (alive.current) {
        setError(true);
        failCount.current++;
      }
      return false;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, [trip.id, viewerId]);
  useEffect(() => {
    alive.current = true;
    const client = createClient();
    const reload = () => {
      void refresh();
    };
    reload();
    // Per-instance topic: the browser client is a singleton and
    // RealtimeClient.channel() reuses an existing topic, which would throw
    // when calling .on() on an already-subscribed channel after remounts.
    const instance = crypto.randomUUID();
    let channel: ReturnType<typeof client.channel> | null = null;
    try {
      channel = client
        .channel(`chat:${trip.id}:${instance}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `trip_id=eq.${trip.id}`,
          },
          reload,
        )
        .subscribe((status) => {
          if (!alive.current) return;
          setConnected(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") reload();
        });
    } catch {
      channel = null;
    }
    // Realtime first; poll as backup with backoff on failures. Hidden tabs skip.
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (!document.hidden) void refresh();
      const delay = Math.min(
        POLL_MAX_MS,
        POLL_BASE_MS * 2 ** Math.min(failCount.current, 2),
      );
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, POLL_BASE_MS);
    window.addEventListener("online", reload);
    window.addEventListener("focus", reload);
    return () => {
      alive.current = false;
      clearTimeout(timer);
      window.removeEventListener("online", reload);
      window.removeEventListener("focus", reload);
      if (channel) void client.removeChannel(channel).catch(() => {});
    };
  }, [trip.id, refresh]);
  const send = useCallback(
    async (message: Outgoing) => {
      if (sending.current.has(message.id)) return;
      sending.current.add(message.id);
      setOutgoing((all) => [
        ...all.filter((p) => p.id !== message.id),
        { ...message, failed: false },
      ]);
      try {
        const result = await createClient().rpc("trip_chat_send", {
          p_trip: trip.id,
          p_content: message.content,
          p_client_message_id: message.id,
        });
        if (result.error) throw result.error;
        if (alive.current) {
          const confirmed = result.data as ChatRow;
          if (confirmed.id) {
            setRows((all) => mergeRows(all, [confirmed]));
            setOutgoing((all) => all.filter((row) => row.id !== message.id));
          } else await refresh();
        }
      } catch {
        if (alive.current)
          setOutgoing((all) =>
            all.map((p) => (p.id === message.id ? { ...p, failed: true } : p)),
          );
      } finally {
        sending.current.delete(message.id);
      }
    },
    [trip.id, refresh],
  );
  const sendNew = useCallback(
    (content: string) => {
      void send({ id: crypto.randomUUID(), content, failed: false });
    },
    [send],
  );
  const memberName = useCallback(
    (userId: string) =>
      trip.members.find((p) => p.id === userId)?.name ?? t("formerMember"),
    [trip.members, t],
  );
  return (
    <>
      <div className="shared-chat-status" role="status">
        {loading
          ? t("loadingChat")
          : connected
            ? t("connected")
            : t("reconnecting")}
      </div>
      {error && (
        <div role="alert">
          <p>{t("failed")}</p>
          <AppButton variant="outline" onClick={() => void refresh()}>
            {t("retry")}
          </AppButton>
        </div>
      )}
      <div
        className="mvp-chat-messages"
        role="log"
        aria-label={m("chat")}
        aria-live="polite"
        aria-relevant="additions"
      >
        {older && !!rows.length && (
          <AppButton
            disabled={paging}
            variant="outline"
            onClick={async () => {
              setPaging(true);
              const first = rows[0];
              const result = await createClient()
                .from("chat_messages")
                .select(columns)
                .eq("trip_id", trip.id)
                .or(
                  `created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})`,
                )
                .order("created_at", { ascending: false })
                .order("id", { ascending: false })
                .limit(100);
              if (result.error) setError(true);
              else {
                setRows((all) => mergeRows(all, result.data as ChatRow[]));
                setOlder(result.data.length === 100);
              }
              setPaging(false);
            }}
          >
            {t("olderMessages")}
          </AppButton>
        )}
        {!loading && !rows.length && !outgoing.length && (
          <p>{t("emptyChat")}</p>
        )}
        {rows.map((row) => (
          <ChatMessageRow
            key={row.id}
            row={row}
            own={row.user_id === viewer.id}
            displayName={memberName(row.user_id)}
            locale={locale}
            timezone={trip.timezone}
          />
        ))}
        {outgoing.map((row) => (
          <div className="mvp-chat-bubble mvp-chat-own" key={row.id}>
            <div>
              <p>{row.content}</p>
              <small>{t(row.failed ? "sendFailed" : "sending")}</small>
              {row.failed && (
                <AppButton variant="outline" onClick={() => void send(row)}>
                  {t("retry")}
                </AppButton>
              )}
            </div>
          </div>
        ))}
      </div>
      <ChatComposer tripId={trip.id} onSend={sendNew} />
    </>
  );
}
