// Browser-only fixtures. These replace transport in the isolated UI test bundle,
// never in Next.js, and do not constitute a live Supabase/Reatime test.
export const owner = "11111111-1111-4111-8111-111111111111";
export const tripId = "55555555-5555-4555-8555-555555555555";
const callbacks = new Set();
export const database = {
  messages: [],
  failSend: false,
  conflict: false,
  version: 1,
  calls: [],
  removed: [],
};
window.testDatabase = database;
window.deliverMessage = (content) => {
  database.messages.push({
    id: crypto.randomUUID(),
    user_id: "other",
    content,
    message_type: "user",
    client_message_id: null,
    created_at: new Date().toISOString(),
  });
  for (const callback of callbacks) callback();
};
function query(table) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
    or() {
      return this;
    },
    maybeSingle() {
      return Promise.resolve({ data: { id: tripId }, error: null });
    },
    then(callback) {
      const data =
        table === "chat_messages"
          ? [...database.messages].reverse()
          : table === "trip_versions"
            ? [
                {
                  id: "history-1",
                  version: 1,
                  actor_user_id: owner,
                  change_type: "trip.created",
                  created_at: "2026-09-12T10:00:00Z",
                  snapshot: {
                    trip: {
                      name: "Shared Tokyo",
                      destination: "Tokyo",
                      currency: "MYR",
                      budget_total: 5000,
                    },
                    activities: [],
                  },
                },
              ]
            : [];
      return Promise.resolve({ data, error: null }).then(callback);
    },
  };
}
export function createClient() {
  return {
    from: query,
    channel() {
      let callback;
      const channel = {
        on(event, config, cb) {
          callback = cb;
          callbacks.add(cb);
          return this;
        },
        subscribe(cb) {
          queueMicrotask(() => cb("SUBSCRIBED"));
          return this;
        },
        dispose() {
          callbacks.delete(callback);
        },
      };
      return channel;
    },
    removeChannel(channel) {
      channel.dispose();
      return Promise.resolve();
    },
    async rpc(name, args) {
      database.calls.push({ name, args });
      if (name === "trip_invite_create")
        return { data: { token: "a".repeat(64) }, error: null };
      if (name === "trip_member_remove") {
        database.removed.push(args.p_user);
        return { error: null };
      }
      if (name === "trip_chat_send") {
        if (database.failSend) return { error: { message: "NETWORK" } };
        if (
          !database.messages.some(
            (m) => m.client_message_id === args.p_client_message_id,
          )
        )
          database.messages.push({
            id: crypto.randomUUID(),
            user_id: owner,
            content: args.p_content,
            message_type: "user",
            client_message_id: args.p_client_message_id,
            created_at: new Date().toISOString(),
          });
        for (const cb of callbacks) cb();
        return { data: {}, error: null };
      }
      if (name === "trip_mutate") {
        if (database.conflict)
          return { error: { message: "VERSION_CONFLICT" } };
        return {
          data: {
            newVersion: ++database.version,
            updatedEntity: { id: "activity-saved" },
          },
          error: null,
        };
      }
      return { data: [], error: null };
    },
  };
}
