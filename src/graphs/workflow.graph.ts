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

const NODES_PER_PASS = 12;
const MAX_PASSES = MAX_REVISIONS + 1;
export const RECURSION_LIMIT = Math.max(25, NODES_PER_PASS * MAX_PASSES + 5);

const workflow = new StateGraph(FilmState)
  .addNode("research", researchNode)
  .addNode("strategy", strategyNode)
  .addNode("director", directorNode)
  .addNode("scriptwriter", scriptNode)
  .addNode("factCheck", factCheckNode)
  .addNode("comprehension", comprehensionNode)
  .addNode("storyboardGenerator", storyboardNode)
  .addNode("compositionPlanner", compositionNode)
  .addNode("continuity", continuityNode)
  .addNode("visualDirector", visualNode)
  .addNode("qa", qaNode)
  .addNode("artDirection", visualStyleNode)

  // Sequential pre-production
  .addEdge(START, "research")
  .addEdge("research", "strategy")
  .addEdge("strategy", "director")
  .addEdge("director", "scriptwriter")

  // Parallel Branch 1: Script Evaluation (Fan-out -> Fan-in)
  .addEdge("scriptwriter", "factCheck")
  .addEdge("scriptwriter", "comprehension")
  .addEdge(["factCheck", "comprehension"], "storyboardGenerator")

  // Parallel Branch 2: Visual Planning (Fan-out -> Fan-in)
  .addEdge("storyboardGenerator", "compositionPlanner")
  .addEdge("storyboardGenerator", "continuity")
  .addEdge(["compositionPlanner", "continuity"], "visualDirector")

  // QA Gate
  .addEdge("visualDirector", "qa")
  .addConditionalEdges(
    "qa",
    (state) => {
      if (state.qualityStatus === "pass") return "artDirection";
      if (state.revisionCount >= MAX_REVISIONS) return "end";
      if (!isStage(state.reviseTarget)) return "end";

      const targetNode = STAGE_TO_NODE[state.reviseTarget];

      // Note: If QA flags composition or continuity, rerunning just that single
      // parallel branch is actually faster than rerunning both!
      return targetNode;
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
