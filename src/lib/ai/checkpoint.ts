import { MemorySaver } from "@langchain/langgraph-checkpoint";

let saver: MemorySaver | null = null;

/**
 * Development checkpointer behind an adapter.
 * Later: swap for a Postgres/Supabase-backed checkpointer without touching
 * the graph. Checkpoint data stays separate from Tripify business tables.
 */
export function getCheckpointer(): MemorySaver {
  if (!saver) saver = new MemorySaver();
  return saver;
}
