# Universal Storyteller redesign

## Goal
Adapt the explainer pipeline so it can teach paradoxes, computer science, engineering,
historical stories, medical concepts, science, economics, and other domains without forcing
every topic into the same character-and-analogy formula.

## Updated
- `src/skills/custom/skills/STORYTELLING_STANDARD.md`
  - Reframed storytelling as an adaptive explanation system.
  - Added domain-specific safeguards for history, medicine, CS/engineering, science/statistics/economics.
  - Made analogy, protagonist, and callback optional.
  - Added claim sourcing, uncertainty, and causal-integrity requirements.
- `src/skills/custom/skills/director/SKILL.md`
  - Added topic diagnosis and a fit-for-purpose story-shape selection.
  - Clarified when to use human stories, system protagonists, timelines, maps, diagrams, or direct depiction.
  - Added historical, medical, and technical integrity rules.
  - Preserved the existing Director JSON contract for pipeline compatibility.
- `src/skills/custom/skills/scriptwriter/SKILL.md`
  - Replaced rigid universal beat/word constraints with speakable, domain-aware narration.
  - Added explicit writing safeguards for history, medicine, CS/engineering, and quantitative topics.
  - Kept narration/claims/beat map ownership and JSON contract.
- `src/agents/director.agent.ts` and `src/agents/scriptwriter.agent.ts`
  - Updated role prompts to reinforce universal, adaptive storytelling and optional creative devices.

## Important compatibility note
This is a documentation and agent-prompt redesign. It preserves the current pipeline output contracts.
It does not prove runtime quality or compile compatibility: the supplied archive has no package
manifest, lockfile, TypeScript config, dependencies, or representative end-to-end test package.
The schema currently exposes six topic-shape labels; conceptual-distinction and mystery formats
must map to the closest supported label until the schema is deliberately versioned.
