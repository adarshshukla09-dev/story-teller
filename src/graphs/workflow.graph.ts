import { StateGraph, END } from "@langchain/langgraph";
import { ProductionState } from "./workflow.state.js";
import {
  comprehensionNode,
  researchNode,
  factCheckNode,
  factCheckRouter,
  strategyNode,
  directorNode,
  scriptwriterNode,
  qaNode,
  storyboardNode,
  compositionNode,
  continuityNode,
  visualDirectorNode,
  svgIllustratorNode,
  finalQaNode,
  finalOutputNode,
  qaRouter,
} from "./workflow.node.js";

function finalQaRouter(state: typeof ProductionState.State) {
  if (state.finalQaStatus === "approved") return "finalOutputAgent";
  throw new Error(
    `Final production QA did not approve the package. Feedback: ${state.finalQaFeedback}`,
  );
}

export function createProductionGraph() {
  const workflow = new StateGraph(ProductionState)
    // Add nodes
    .addNode("comprehensionAgent", comprehensionNode)
    .addNode("researchAgent", researchNode)
    .addNode("factCheckAgent", factCheckNode)
    .addNode("strategyAgent", strategyNode)
    .addNode("directorAgent", directorNode)
    .addNode("scriptwriterAgent", scriptwriterNode)
    .addNode("qaAgent", qaNode)
    .addNode("storyboardAgent", storyboardNode)
    .addNode("compositionAgent", compositionNode)
    .addNode("continuityAgent", continuityNode)
    .addNode("visualDirectorAgent", visualDirectorNode)
    .addNode("svgIllustratorAgent", svgIllustratorNode)
    .addNode("finalQaAgent", finalQaNode)
    .addNode("finalOutputAgent", finalOutputNode)

    // Define edges and conditional routing
    .addEdge("__start__", "comprehensionAgent")
    .addEdge("comprehensionAgent", "researchAgent")
    .addEdge("researchAgent", "factCheckAgent")

    // Conditional fact-check routing using factCheckRouter
    .addConditionalEdges("factCheckAgent", factCheckRouter, {
      strategy: "strategyAgent",
    })

    .addEdge("strategyAgent", "directorAgent")
    .addEdge("directorAgent", "scriptwriterAgent")
    .addEdge("scriptwriterAgent", "qaAgent")

    // Script QA conditional retry/approval loop
    .addConditionalEdges("qaAgent", qaRouter, {
      scriptwriterAgent: "scriptwriterAgent",
      storyboardAgent: "storyboardAgent",
    })

    .addEdge("storyboardAgent", "compositionAgent")
    .addEdge("compositionAgent", "continuityAgent")
    .addEdge("continuityAgent", "visualDirectorAgent")
    .addEdge("visualDirectorAgent", "svgIllustratorAgent")
    .addEdge("svgIllustratorAgent", "finalQaAgent")

    // Final QA conditional routing
    .addConditionalEdges("finalQaAgent", finalQaRouter, {
      finalOutputAgent: "finalOutputAgent",
    })

    .addEdge("finalOutputAgent", END);

  return workflow.compile();
}

export const productionGraph = createProductionGraph();
