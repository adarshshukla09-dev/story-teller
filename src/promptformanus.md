I’d improve your **Universal Storyteller** with a dedicated AI Agent Skill called **`viral-explainer-storycraft`**.

I researched the Agent Skills approach and prompt-evaluation guidance. The key lesson is: don't just tell the AI to “write better.” Give it a repeatable storytelling process, measurable quality criteria, examples, and tests. Agent Skills are designed for exactly this kind of reusable expertise. [Anthropic](https://www.anthropic.com/research/equipping-agents-for-the-real-world-with-agent-skills?utm_source=chatgpt.com)

## 1. What your project needs to improve

From your latest Progress Paradox package, the main problems are:

- **Storytelling:** the opening is abstract and lacks a concrete, topic-fit entry point (human, technical, historical, or observational).
- **Emotional engagement:** the narrative explains the idea but doesn't make viewers feel the contradiction.
- **Aha moment:** the central insight needs a stronger reveal and visual payoff.
- **Ending:** the conclusion needs to connect back to the opening.
- **Analogy:** the software/hardware metaphor needs clearer limits.
- **Evidence:** the research dossier has no populated source list, leaving important claims unsupported.
- **Structure:** the validator reports 14 storyboard scenes but 0 script beats, so the script-to-storyboard mapping is broken.

**Important:** fix the structural and evidence problems before trying to improve the creative score. A beautiful script with broken beat mapping is not production-ready.

## 2. Create this AI skill

Create:

`src/skills/custom/skills/storycraft/SKILL.md`

Paste this into it:

```markdown
---
name: universal-explainer-storycraft
description: Builds accurate, compelling explanations across technical, scientific, historical, psychological, economic, and other topics.
---

# Universal Explainer Storycraft

## Mission
Make the viewer curious, explain the real mechanism or causal story, and leave them able to retell one important idea. Aim for an evidence-based creative average of 8.5+/10; 9+ is exceptional, never assumed.

## 1. Diagnose before writing
Identify the domain, audience, likely mental model, exact viewer question, central idea, mechanism/evidence, and key limitation. Find the strongest viewer-sized entry point: a human experience, technical task, system failure, historical constraint, surprising observation, or decision. Do not force a protagonist or emotional anecdote.

## 2. Choose the story engine
Select the form that fits: mechanism, paradox, mystery, chain of events, origin/evolution, trade-off, misconception, or conceptual distinction. Combine only when useful. Adapt the structure to the topic rather than forcing every subject into the same formula.

## 3. Build a truthful hook
Generate at least three hook candidates internally. Choose a concrete puzzle, consequence, counterintuitive observation, decision, or demonstration that opens a clear question the film actually answers. Avoid generic intros, title repetition, empty shock, unsupported statistics, and fake urgency.

## 4. Build the causal chain
Plan the hook, open question, essential context, expectation or constraint, evidence/turn, causal explanation, earned aha, important boundary, and payoff. Each beat must add a necessary premise, evidence, causal step, or perspective change. Remove filler.

## 5. Explain the actual idea
Teach the mechanism, evidence, event sequence, decision logic, or distinction. Define jargon after the plain-language explanation. Use a small worked example or trace when it improves understanding. Do not substitute mood, metaphor, or benefits for explanation.

## 6. Choose the right explanatory device
Use an analogy only when its relationships map faithfully; state its limits. Otherwise use direct depiction, a diagram, timeline, map, comparison, or process flow. Visuals should show change, relationships, scale, sequence, or evidence.

## 7. Earn the aha
The aha explains why/how the outcome occurs or how the pieces fit. Prepare it with earlier beats, express it in one plain sentence, and make it visually demonstrable. If there is no single twist, use a synthesis; never manufacture one.

## 8. Pay off the opening
Answer the opening question directly and leave one portable insight, prediction rule, distinction, or consequence. Avoid generic morals and slogan endings.

## 9. Protect domain integrity
History: sourced chronology, interacting causes, fact versus interpretation; no invented dialogue or motives.
CS/engineering: system boundary, inputs, transformations, dependencies, outputs, trade-offs, failure modes, and version assumptions.
Psychology/economics: context, baselines, populations, uncertainty; no universalizing tendencies.
Science/medicine: conditions and uncertainty; no individualized diagnosis or treatment advice.
All domains: map material claims to dossier sources or flag verification needs.

## 10. Score and revise honestly
Score ten creative dimensions from the actual package. A 9–10 requires exceptional evidence; compliance alone is not excellence. Aim for 8.5+, identify the three highest-leverage weaknesses, and revise where possible. Never inflate scores, force emotion, or sacrifice accuracy.

## 11. Audience retell test
After one viewing, can the viewer state the puzzle, explain what caused the outcome, repeat the central idea, and name one important boundary? If not, revise the missing explanation.
```

## 3. Give your coding AI this implementation prompt

Use this with your coding agent (Cursor, Claude Code, Codex, etc.) from the project root.

```text
You are a senior AI video-pipeline architect, storytelling expert,
prompt engineer, and TypeScript engineer.

Your task is to upgrade my Universal Storyteller project so it can
consistently produce exceptional educational explainer videos.

TARGET QUALITY: 8.5+/10 creative quality; 9+ is exceptional and must be earned by evidence.
Do not fake scores or weaken validation to reach this target.

IMPORTANT:
Inspect the existing repository before making changes.
Understand the current architecture, agent prompts, skill loading,
JSON schemas, validators, workflow, and revision loop.

Do not rewrite the entire project unnecessarily.

PHASE 1 — AUDIT

Inspect these areas:

- src/agents/
- src/graphs/
- src/skills/custom/skills/
- QA.agent.ts
- Director agent
- Scriptwriter agent
- Research agent
- Storyboard agent
- validate_package.ts
- QUALITY_RUBRIC.md
- All workflow nodes and revision logic

Identify:
1. Where each agent gets its instructions.
2. Which agents are responsible for creative quality.
3. How QA feedback reaches revision agents.
4. How script beats map to storyboard scenes.
5. How research sources map to factual claims.
6. Why the current validator reports 0 beats despite 14 scenes.
7. Any broken imports, exports, or schema mismatches.

Do not guess field names. Read the actual schemas and types.

PHASE 2 — CREATE STORYCRAFT SKILL

Create and integrate:

src/skills/custom/skills/storycraft/SKILL.md

Use the viral-explainer-storycraft skill specification.

Make sure the skill is actually loaded by the relevant agents.
Creating a file without integrating it does not count.

Apply it to:
- Creative brief generation
- Director
- Scriptwriter
- Storyboard
- QA

Keep each agent's responsibilities distinct.

PHASE 3 — IMPROVE THE AGENTS

RESEARCH AGENT:
- Find credible primary and academic sources.
- Map important factual claims to source IDs.
- Identify disputed findings and uncertainty.
- Never invent citations or statistics.
- Do not allow unsupported claims into the final script.

DIRECTOR AGENT:
- Find the strongest viewer-sized problem or stakes behind the subject; use a human story only when it is authentic and useful.
- Develop a surprising contradiction.
- Create a curiosity-driven narrative.
- Define one central idea.
- Use a faithful analogy only when it improves understanding; otherwise use direct depiction, a diagram, timeline, or process flow.
- Identify the exact aha moment.

SCRIPTWRITER AGENT:
- Write natural spoken narration.
- Use specific human examples.
- Avoid textbook-style explanations.
- Build a strong opening and memorable ending.
- Give every beat a clear narrative purpose.
- Match the target duration and word count.

STORYBOARD AGENT:
- Make visuals communicate information, not just decorate narration.
- Give each scene a visual purpose.
- Maintain character and style continuity.
- Make the aha moment visually obvious.
- Match every scene to its corresponding script beat.

QA AGENT:
- Score all ten creative dimensions independently.
- Explain every score below 9.
- Give precise revision instructions.
- Never reward schema compliance as creative excellence.
- Never change deterministic validator results.
- Never invent a passing result.

PHASE 4 — FIX STRUCTURAL RELIABILITY

Investigate and fix:
- Script beat count incorrectly returning zero.
- Script/storyboard scene mapping.
- Missing videoTitle fields.
- Missing analogyMap or oneIdea fields.
- Missing research source mappings.
- Inconsistent beat and scene durations.
- Invalid visual prompts.
- Broken imports and exports.
- Revision feedback not reaching the correct agent.

Preserve the existing package contract unless a migration is
necessary. If changing it, update all producers, consumers,
types, validators, and tests together.

PHASE 5 — BUILD A REAL QUALITY REVISION LOOP

Implement a maximum of three targeted creative revisions.

Each revision must:
1. Read the previous QA report.
2. Identify the weakest creative dimensions.
3. Revise only the relevant sections.
4. Preserve already-correct content.
5. Run deterministic validation again.
6. Run independent creative QA again.

Do not allow infinite revision loops.

Technical validation and creative quality must remain separate.

A package cannot be production-ready if it has blocking structural
or factual issues, even if its creative score is high.

PHASE 6 — CREATE EVALUATION TESTS

Create at least five representative evaluation topics.

Include:
- A scientific explainer.
- A psychology topic.
- A historical topic.
- An economics topic.
- A technology topic.

For each run, evaluate:

- Hook quality
- Narrative progression
- Clarity
- Emotional engagement
- Analogy fidelity
- Visual storytelling
- Aha moment
- Factual grounding
- Ending
- Technical validity

Compare results before and after your changes.

Use independent evaluation criteria.
Do not change the rubric simply to increase scores.

PHASE 7 — TEST

Run the existing test suite.

Run the demo:

MAX_REVISIONS=3 RUN_DEMO=true DEMO_TOPIC="The Progress Paradox" npm run dev

Verify:
- No runtime errors.
- All expected script beats exist.
- Every beat maps to a scene.
- All factual claims have source mappings.
- Narration duration is valid.
- QA returns valid JSON.
- Revision feedback is actionable.
- The final package passes deterministic validation.

Also investigate any unresolved buildFeedback import/export issue.

FINAL DELIVERABLE

Report:

1. Files changed.
2. Problems discovered.
3. Problems fixed.
4. New skill integration points.
5. Before/after creative scores.
6. Test results.
7. Remaining blockers.

Do not claim a 9/10 result unless the evaluation evidence supports it.

Make the changes directly in the repository.
Do not stop after providing recommendations.
```

## 4. The most important improvement: measure quality, don't just prompt for it

Use this approach:

| Quality area            | Target |
| ----------------------- | -----: |
| Hook and curiosity      |   9/10 |
| Narrative structure     |   9/10 |
| Central idea clarity    |   9/10 |
| Cause and effect        |   9/10 |
| Emotional engagement    |   9/10 |
| Analogy quality         |   9/10 |
| Visual storytelling     |   9/10 |
| Aha moment              |   9/10 |
| Factual accuracy        |   9/10 |
| Ending and memorability |   9/10 |

These are targets, not automatic pass scores. Keep technical release gates independent.

For implementation, follow the evaluation approach in [OpenAI's guide to systematically testing agent skills](https://developers.openai.com/blog/eval-skills?trk=article-ssr-frontend-pulse_little-text-block&utm_source=chatgpt.com) and the [Agent Skills authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview?utm_source=chatgpt.com).

**My recommendation:** don't add more agents yet. First improve the existing Director, Scriptwriter, Research, Storyboard and QA agents, integrate the new skill, and fix the zero-beat structural failure. That is the shortest path toward genuinely better videos.
