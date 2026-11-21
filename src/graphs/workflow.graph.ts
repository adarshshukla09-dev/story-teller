import { StateGraph, END } from "@langchain/langgraph";
import { ProductionState } from "./workflow.state.js";

import {
  comprehensionNode,
  researchNode,
  factCheckNode,
  factCheckRouter,
  strategyNode,
  directorNode,
  directorRouter,
  scriptwriterNode,
  imageNode,
  qaNode,
  storyboardNode,
  compositionNode,
  continuityNode,
  visualDirectorNode,
  finalQaNode,
  finalOutputNode,
  qaRouter,
  prepareSceneImagesNode,
  imageGenerationRouter,
} from "./workflow.node.js";

function finalQaRouter(state: typeof ProductionState.State) {
  if (state.finalQaStatus === "approved") {
    return "finalOutputAgent";
  }

  throw new Error(
    `Final production QA did not approve the package. Feedback: ${state.finalQaFeedback}`,
  );
}

export function createProductionGraph() {
  const workflow = new StateGraph(ProductionState)

    // =======================================
    // REGISTER NODES
    // =======================================

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

    // Sequential image generation nodes
    .addNode("prepareSceneImages", prepareSceneImagesNode)
    .addNode("generateSceneImage", imageNode)

    .addNode("finalQaAgent", finalQaNode)
    .addNode("finalOutputAgent", finalOutputNode)

    // =======================================
    // INITIAL WORKFLOW
    // =======================================

    .addEdge("__start__", "comprehensionAgent")

    .addEdge("comprehensionAgent", "researchAgent")

    .addEdge("researchAgent", "factCheckAgent")

    // =======================================
    // FACT CHECK ROUTING
    // =======================================

    .addConditionalEdges("factCheckAgent", factCheckRouter, {
      strategy: "strategyAgent",
    })

    // =======================================
    // SCRIPT GENERATION
    // =======================================

    .addEdge("strategyAgent", "directorAgent")

    .addConditionalEdges("directorAgent", directorRouter, {
      scriptwriterAgent: "scriptwriterAgent",
      __end__: END,
    })

    .addEdge("scriptwriterAgent", "qaAgent")

    // =======================================
    // SCRIPT QA LOOP
    // =======================================

    .addConditionalEdges("qaAgent", qaRouter, {
      scriptwriterAgent: "scriptwriterAgent",
      storyboardAgent: "storyboardAgent",
      __end__: END,
    })

    // =======================================
    // VISUAL PRODUCTION
    // =======================================

    .addEdge("storyboardAgent", "compositionAgent")

    .addEdge("compositionAgent", "continuityAgent")

    .addEdge("continuityAgent", "visualDirectorAgent")
    .addEdge("visualDirectorAgent", "prepareSceneImages")

    .addEdge("prepareSceneImages", "generateSceneImage")

    .addConditionalEdges("generateSceneImage", imageGenerationRouter, {
      generateSceneImage: "generateSceneImage",
      finalQaAgent: "finalQaAgent",
    })

    // =======================================
    // FINAL QA
    // =======================================

    .addConditionalEdges("finalQaAgent", finalQaRouter, {
      finalOutputAgent: "finalOutputAgent",
    })

    .addEdge("finalOutputAgent", END);

  return workflow.compile();
}

export const productionGraph = createProductionGraph();
