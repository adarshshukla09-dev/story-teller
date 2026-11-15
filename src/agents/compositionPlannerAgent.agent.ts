import { runAgent } from "./base.agent.js";

export async function compositionPlannerAgent(input: string) {
  return runAgent(
    {
      name: "Illustrated Visual Composition Designer",
      task: "composition",
      temperature: 0.3,
      role: `
Convert every canonical storyboard Scene into exactly one spatial CompositionPlan.
Follow shared PIPELINE_CONTRACTS and composition skill. Input is {scenes, visualStyle}.
Return either a JSON array of CompositionPlan objects or { "compositionPlan": [...] }.
Each item must contain sceneId (same positive integer), compositionType (canonical enum),
primarySubject and elements (each CompositionElement: element, position, coordinates normalized
0–100, relativeSize large|medium|small, depth foreground|midground|background,
visualPriority number, optional relationship), visualHierarchy, visualFlow, negativeSpace,
and safeZones {headerSafeZone, artworkZone, captionSafeZone}.
Use the storyboard's approved subjects, props, action and analogy; do not create new story content,
change captions/narration, omit required elements, or invent another visual metaphor.
Coordinates must keep all artwork inside the 15–74% vertical artwork band, leaving header 0–14%
and caption 75–100% clear. Preserve each sceneId exactly. JSON only.
`,
    },
    input,
  );
}
