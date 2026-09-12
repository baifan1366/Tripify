import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { END, START, StateGraph } from "@langchain/langgraph";
import { getCheckpointer } from "@/lib/ai/checkpoint";
import { buildTripContext, type ContextClient } from "@/lib/ai/context";
import { createTravelModel, tripThreadId } from "@/lib/ai/model";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { TripifyState } from "@/lib/ai/state";
import { createTripTools } from "@/lib/ai/tools/trip-tools";

export type GraphDeps = {
  client: ContextClient;
  tripId: string;
  userId: string;
  locale: string;
  selectedDay?: number;
  /** Explicit OpenRouter key for this attempt (key rotation). */
  apiKey?: string;
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

function toBaseMessages(turns: ChatTurn[]): BaseMessage[] {
  return turns.map((t) =>
    t.role === "user" ? new HumanMessage(t.content) : new AIMessage(t.content),
  );
}

/**
 * One Tripify teammate graph: START → loadContext → agent ⇄ tools → END.
 * Future nodes (research → recommendation → proposal → interrupt → resume)
 * attach after `agent` without changing this foundation.
 */
export function buildTripifyGraph(deps: GraphDeps) {
  const tools = createTripTools({
    client: deps.client,
    tripId: deps.tripId,
  });
  const model = createTravelModel(deps.apiKey).bindTools(tools);
  const toolNode = new ToolNode(tools);

  async function loadContext() {
    try {
      const tripContext = await buildTripContext(deps.client, deps.tripId, {
        selectedDay: deps.selectedDay,
      });
      return { tripContext };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "CONTEXT_FAILED";
      return { tripContext: "", errors: [message] };
    }
  }

  async function agent(state: typeof TripifyState.State) {
    const system = new SystemMessage(
      buildSystemPrompt(deps.locale, state.tripContext),
    );
    const response = await model.invoke([system, ...state.messages]);
    return { messages: [response] };
  }

  function shouldContinue(state: typeof TripifyState.State): string {
    const last = state.messages[state.messages.length - 1] as
      | AIMessage
      | undefined;
    const calls = (last as { tool_calls?: unknown[] } | undefined)?.tool_calls;
    return calls && calls.length > 0 ? "tools" : END;
  }

  const graph = new StateGraph(TripifyState)
    .addNode("loadContext", loadContext)
    .addNode("agent", agent)
    .addNode("tools", toolNode)
    .addEdge(START, "loadContext")
    .addEdge("loadContext", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent")
    .compile({ checkpointer: getCheckpointer() });

  return { graph, tools };
}

export function graphStructure() {
  return {
    nodes: ["loadContext", "agent", "tools"],
    edges: [
      ["START", "loadContext"],
      ["loadContext", "agent"],
      ["agent", "tools|END"],
      ["tools", "agent"],
    ],
    threadIdFormat: "trip:{tripId}:user:{userId}",
  };
}

export async function runTripifyTurn(
  deps: GraphDeps,
  turns: ChatTurn[],
): Promise<{ text: string; toolNames: string[] }> {
  const { graph } = buildTripifyGraph(deps);
  const thread_id = tripThreadId(deps.tripId, deps.userId);
  const seenTools = new Set<string>();
  let text = "";
  const events = graph.streamEvents(
    { messages: toBaseMessages(turns) },
    { version: "v2", configurable: { thread_id } },
  );
  for await (const event of events) {
    if (event.event === "on_tool_start") {
      const name = String((event as { name?: unknown }).name ?? "");
      if (name) seenTools.add(name);
    }
    if (event.event === "on_chat_model_stream") {
      const chunk = (event.data as { chunk?: unknown }).chunk as {
        content?: unknown;
      };
      const content = chunk?.content;
      if (typeof content === "string") text += content;
      else if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string") text += part;
          else if (
            part &&
            typeof part === "object" &&
            "text" in part &&
            typeof (part as { text: unknown }).text === "string"
          )
            text += (part as { text: string }).text;
        }
      }
    }
  }
  return { text, toolNames: [...seenTools] };
}
