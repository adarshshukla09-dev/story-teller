import { StateGraph, START, END } from "@langchain/langgraph";
import { FilmState } from "./workflow.state.js";

import {
  directorNode,
  scriptNode,
  storyboardNode,
  visualNode,
  compositionNode,
  visualStyleNode,
  continuityNode,
  qaNode,
} from "./workflow.node.js";
import { isStage, MAX_REVISIONS, STAGE_TO_NODE } from "../agents/QA.agent.js";

const workflow = new StateGraph(FilmState)

  .addNode("director", directorNode)
  .addNode("scriptwriter", scriptNode)
  .addNode("storyboardGenerator", storyboardNode)
  .addNode("visualDirector", visualNode)
  .addNode("compositionPlanner", compositionNode)
  .addNode("artDirection", visualStyleNode)
  .addNode("continuity", continuityNode)
  .addNode("qa", qaNode)

  .addEdge(START, "director")
  .addEdge("director", "scriptwriter")
  .addEdge("scriptwriter", "storyboardGenerator")
  .addEdge("storyboardGenerator", "compositionPlanner")
  .addEdge("compositionPlanner", "continuity")
  .addEdge("continuity", "visualDirector")
  .addEdge("visualDirector", "artDirection")
  .addEdge("artDirection", "qa")
  .addConditionalEdges(
    "qa",
    (state) => {
      if (state.qualityStatus === "pass") return "end";

      // Out of attempts: stop, but qualityStatus stays "revise" so callers never treat it as approved.
      if (state.revisionCount >= MAX_REVISIONS) return "end";

      // Restart at the earliest stage with a defect. Edges are linear, so everything after it reruns.
      return isStage(state.reviseTarget)
        ? STAGE_TO_NODE[state.reviseTarget]
        : "scriptwriter";
    },
    {
      end: END,
      director: "director",
      scriptwriter: "scriptwriter",
      storyboardGenerator: "storyboardGenerator",
      compositionPlanner: "compositionPlanner",
      continuity: "continuity",
      visualDirector: "visualDirector",
    },
  );

export const filmGraph = workflow.compile();
