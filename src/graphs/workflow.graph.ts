import { StateGraph, START, END } from "@langchain/langgraph";
import { FilmState } from "./workflow.state.js";

import {
  researchNode,
  strategyNode,
  directorNode,
  scriptNode,
  factCheckNode,
  comprehensionNode,
  storyboardNode,
  visualNode,
  compositionNode,
  visualStyleNode,
  continuityNode,
  qaNode,
} from "./workflow.node.js";
import { isStage, MAX_REVISIONS, STAGE_TO_NODE } from "../agents/QA.agent.js";

/**
 * One full pass is up to 11 nodes (research ... visualDirector, qa), plus artDirection once at the end.
 * LangGraph counts every node execution as a step, so its default limit of 25 made the run crash with
 * GraphRecursionError as soon as QA requested a second pass (a pass that restarts at `director` or
 * `scriptwriter` reruns ~9-10 nodes). The limit is now derived from MAX_REVISIONS; 12 per pass is a
 * deliberate over-estimate.
 */
const NODES_PER_PASS = 12;
const MAX_PASSES = MAX_REVISIONS + 1; // initial run + bounded QA revisions
// A small safety margin covers graph start/end bookkeeping. Never accept an unbounded env override.
export const RECURSION_LIMIT = Math.max(25, NODES_PER_PASS * MAX_PASSES + 5);

const workflow = new StateGraph(FilmState)

  .addNode("research", researchNode)
  .addNode("strategy", strategyNode)
  .addNode("director", directorNode)
  .addNode("scriptwriter", scriptNode)
  .addNode("factCheck", factCheckNode)
  .addNode("comprehension", comprehensionNode)
  .addNode("storyboardGenerator", storyboardNode)
  .addNode("visualDirector", visualNode)
  .addNode("compositionPlanner", compositionNode)
  .addNode("artDirection", visualStyleNode)
  .addNode("continuity", continuityNode)
  .addNode("qa", qaNode)

  .addEdge(START, "research")
  .addEdge("research", "strategy")
  .addEdge("strategy", "director")
  .addEdge("director", "scriptwriter")
  .addEdge("scriptwriter", "factCheck")
  .addEdge("factCheck", "comprehension")
  .addEdge("comprehension", "storyboardGenerator")
  .addEdge("storyboardGenerator", "compositionPlanner")
  .addEdge("compositionPlanner", "continuity")
  .addEdge("continuity", "visualDirector")
  // Art direction is not inspected by QA, so it runs once, only for an approved package.
  .addEdge("visualDirector", "qa")
  .addConditionalEdges(
    "qa",
    (state) => {
      if (state.qualityStatus === "pass") return "artDirection";

      // Out of attempts: stop, but qualityStatus stays "revise" so callers never treat it as approved.
      if (state.revisionCount >= MAX_REVISIONS) return "end";

      // No upstream stage can fix the problem (e.g. the QA judge itself failed): do not burn a pass.
      if (!isStage(state.reviseTarget)) return "end";

      // Restart at the earliest stage with a defect. Edges are linear, so everything after it reruns.
      return STAGE_TO_NODE[state.reviseTarget];
    },
    {
      end: END,
      artDirection: "artDirection",
      director: "director",
      scriptwriter: "scriptwriter",
      storyboardGenerator: "storyboardGenerator",
      compositionPlanner: "compositionPlanner",
      continuity: "continuity",
      visualDirector: "visualDirector",
    },
  )
  .addEdge("artDirection", END);

export const filmGraph = workflow.compile();
