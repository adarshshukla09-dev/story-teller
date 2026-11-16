# Pipeline, QA, and SVG Illustrator update

## Implemented
- Restored the QA workflow utility exports required by `workflow.node.ts` and `workflow.graph.ts`: canonical stage ordering/routing, revision budget, script normalization, feedback injection, issue routing, and feedback formatting.
- Moved agent invocation inside `callJson`'s retry boundary so model execution failures are handled by the same retry policy as malformed JSON and contract failures.
- Corrected QA state updates to write `qualityReport`, `qaFeedback`, and `validatorReport`, matching `workflow.state.ts`.
- Made independent LLM QA fail closed. A missing, failed, or invalid QA response can no longer pass solely because deterministic validation passed.
- Changed creative scoring to read the ten named `creativeScores` rubric dimensions. The arithmetic mean is computed only when all ten dimensions have valid 1–10 scores; otherwise the average remains null rather than being fabricated.
- Added an SVG Illustrator agent and skill. It receives scenes, composition plans, visual prompts, and the production bible, and returns one SVG artwork asset per scene.
- Added canonical SVG asset state and an `svgIllustrations` revision stage.
- Added deterministic SVG contract checks: expected scene coverage/order, maximum size, required `viewBox`, text-free artwork, restricted element subset, and rejection of scripts, event handlers, external references, and unsafe declarations.
- Added an Art Direction skill and routed its agent to that task instead of reusing the Visual Director skill.
- Reordered the graph so the SVG illustration and art-direction stages run before QA.
- Removed the generic SVG card template that inserted captions and a generic human figure into every scene. The SVG service now validates artwork rather than fabricating a generic scene.

## Important limitations
- The archive contains no `package.json`, lockfile, `tsconfig.json`, installed dependencies, or full video assembly implementation. A full project build and end-to-end LangGraph run could not be performed.
- TypeScript syntax transpilation passed for all `.ts` files. A static `tsc` pass reported only missing project dependencies/Node type declarations caused by the incomplete archive; no additional project-local type errors were reported under the checked compiler settings.
- The new stage produces and validates SVG source strings stored in workflow state. The archive does not include a verified SVG-to-PNG rasterization dependency or final video assembly service, so final rasterization, audio synchronization, and MP4 rendering remain to be integrated and tested.
- SVG validation is a conservative allowlist check, not a substitute for parsing/sanitizing with a hardened XML library before rendering untrusted SVG in a production renderer.
- Creative review still depends on the QA model response and supplied research evidence; this patch does not independently authenticate sources or inspect rasterized images.

## Required project-level verification
1. Restore the actual project `package.json`, lockfile, `tsconfig.json`, and dependencies.
2. Run the project's real build and QA tests.
3. Run a sample topic end-to-end and inspect all SVGs at phone size.
4. Add the chosen SVG rasterizer (for example, a pinned and audited renderer dependency) and implement PNG/video assembly before treating the pipeline as a complete video renderer.
