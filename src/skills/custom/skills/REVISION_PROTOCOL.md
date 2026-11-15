# Revision Protocol

1. Run deterministic validation first. Treat its output as authoritative for counts, schema, mappings, timing arithmetic, missing assets, and structural defects.
2. Run independent creative review second. Identify story/accuracy/analogy/depiction problems not caught mechanically.
3. Every issue must name the gate, affected scene/beat, observed defect, evidence, and smallest sufficient fix. Avoid vague feedback such as "make it better."
4. Route to the earliest responsible stage. Preserve all unaffected approved decisions and content.
5. Regenerate dependent artifacts in order: brief → script → storyboard/scenes → composition plan → continuity bible (if impacted) → visual prompts → rendering. An upstream change invalidates all downstream artifacts that depend on the changed field.
6. Specific dependencies:
   - brief/central idea/beat map/claims/analogy map change → script and every downstream artifact stale;
   - script narration/order/timing change → storyboard, composition, continuity review, visual prompts, audio and render stale;
   - storyboard scene mapping/visual metaphor/caption change → composition, continuity review, visual prompts and render stale;
   - composition coordinates/hierarchy change → visual prompts and rendered images stale;
   - continuity character/prop/palette/style change → affected visual prompts and images stale;
   - visual prompt change → affected image assets and render stale;
   - renderer-only typography/timing change → rendered output and render QA stale, upstream story assets remain valid.
7. Re-run deterministic validation after every revision and inspect the changed output. Re-run creative evaluation on any changed story or visual artifact.
8. Never claim success based on a requested change, generated response, or intended fix. Confirm the updated artifact and test result.
9. Stop after the configured revision limit with unresolved blockers clearly reported. Do not turn exhaustion into pass.
