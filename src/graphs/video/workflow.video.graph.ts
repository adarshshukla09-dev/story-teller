import { StateGraph, START, END } from "@langchain/langgraph";
import { videoState } from "./workflow.video.state.js";
import {
  loadScenesNode,
  promptAgentNode,
  svgAgentNode,
} from "./workflow.video.node.js";
const workflow = new StateGraph(videoState)
  .addNode("loadScenes", loadScenesNode)
  .addNode("promptAgent", promptAgentNode)
  .addNode("svgAgent", svgAgentNode)

  .addEdge(START, "loadScenes")
  .addEdge("loadScenes", "promptAgent")
  .addEdge("promptAgent", "svgAgent")
  .addEdge("svgAgent", END);

export const videoGraph = workflow.compile();
const result = await videoGraph.invoke(
  {},
  {
    configurable: {
      filePath: "./src/result/the-paradox-of-progress/production.json",
    },
  },
);
