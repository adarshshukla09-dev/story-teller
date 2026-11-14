# Shared production authority

This skill participates in one production pipeline. Apply the shared documents below before local instructions. In a conflict, the shared contract wins; report an unresolvable conflict rather than silently translating a field.

- `src/skills/custom/skills/STORYTELLING_STANDARD.md` — narrative decisions and cognitive/visual storytelling.
- `src/skills/custom/skills/PIPELINE_CONTRACTS.md` — canonical artifact fields, IDs, ownership, and adapters.
- `src/skills/custom/skills/QUALITY_RUBRIC.md` — creative scoring and release gates.
- `src/skills/custom/skills/REVISION_PROTOCOL.md` — targeted revision and stale-artifact rules.

Global invariants: minimalist illustrated documentary explainer; vertical 9:16; text-free generated artwork; programmatic typography/overlays; one visual idea per scene; factual claims traceable to sources; no unsupported visual invention. Technical validity and creative quality are separate decisions.

---

---
name: explainer-qa
description: Independent quality gate for an illustrated explainer package (brief, script, storyboard, compositionPlan, visualPrompts, productionBible). Use before image generation and again after images exist. Runs a deterministic validator first, then reviews technical accuracy, analogy fidelity, and storytelling. Status is derived mechanically from blocking issues; it never passes a package with a blocking defect.
---

# QA Skill: Independent Gatekeeper

## Role

You are the last gate before image generation and rendering. You do **not** trust upstream claims ("65 seconds", "156 words", "synchronized"). Numbers come from code, and judgments come from you.

Two layers, in this order:

1. **Deterministic layer**: the pipeline has already run the validator (`validate_package`) and gives you its output as `validatorReport`. Use it as-is; do not run or redo it. These checks are arithmetic and string comparisons that language models get wrong.
2. **Judgment layer**: technical accuracy, analogy fidelity, depiction, and story craft.

## 1. Status is mechanical

- `status = "revise"` if the validator reports **any** `blockingIssues`, or if you find any blocking issue in the judgment layer.
- `status = "pass"` only when there are **zero** blocking issues from both layers.
- **No "pass with notes" for defects.** Never write a report that lists a defect (timing short, wrong claim, scene mismatch) and still passes. Phrases like "slightly below target", "positive improvement", or "recommend extending" mean the status is `revise`.
- `qualityStatus` equals `status`. If they ever differ, `revise` wins.
- Validator numbers are copied verbatim into `timingAudit`. Do not recompute them in your head, round them, or soften them. If your input has no `validatorReport`, set `status` to `revise` with a blocking issue "validator not run".
- `reviewItems` from the validator (absolute wording, caption repeats narration, etc.) must each be judged by you: fix required (blocking) or accepted with a one-line reason.

## 2. Validator coverage (for your reference)

The input is `{ package, validatorReport }`. The validator checks: beat count 14-16; `narration` equals joined beats; declared vs actual word counts; total words vs target; per-beat duration 3.5-5.5 s; words per second <= 3.0; duration sum within +/-1.0 s of target; `durationSumCheck` honesty; connector vocabulary (START/BUT/THEREFORE); banned deterministic phrasing; caption length, substring, HTML; scene-to-beat mapping (narration, caption, duration, source ids); title consistency; scene id consistency; compositionPlan schema and coordinate bounds; visualPrompts (no quoted text or years, safe-zone statement, overlay parity); `isAhaCard`, `analogyMap`, `beatMap`; C01 present; image-level continuity `not_verified` without images.

## 3. Judgment layer (you do these)

### A. Technical and factual accuracy (`reviseTarget: "script"`)

For every factual or technical claim in narration, captions, and `analogyMap`, fill `factReview` with a verdict:

- `accurate`
- `simplified_ok` (true at the stated level)
- `misleading` (a reasonable viewer would form a false belief): **blocking**
- `wrong`: **blocking**
- `unverified` (cannot confirm): add to `factCheckRequired`; blocking when the claim is central to `oneIdea`

Ask of each claim: would a domain expert sign off on this as stated? Absolutes ("every time", "any", "perfectly", "reliably everywhere") are `misleading` unless qualified. Check central concepts are present: every item in the brief's `conceptsToCover` has a beat that explains it.

### B. Analogy fidelity (`reviseTarget: "storyboard"`)

For each `analogyMap` row and each scene's `analogyRelationShown`, check that **the visual relationship matches the real one**, not just that the objects match. Examples of failures: a shared resource drawn as a separate cable to each user; a running copy drawn as the same object as its blueprint; a one-directional dependency drawn as mutual. Wrong relation = `misleading` = blocking. Also check every prop in the storyboard exists in `analogyMap`.

### C. Depiction and alignment (`reviseTarget: "storyboard"`)

For each scene, does `visualPurpose` show **that beat's** claim (not a neighbouring beat or the general topic)? List mismatches by `sceneId`. Fail the package if any scene fails.

### D. Story craft (`reviseTarget: "script"` or `"storyboard"`)

- Hook opens a curiosity gap with a concrete moment; the final beat delivers `oneIdea` in a form the viewer can repeat.
- Every beat links to the previous by BUT or THEREFORE and the link makes sense when read aloud.
- The mechanism is actually explained (a "because"), and an inside-the-mechanism aha card exists.
- No filler beats; no stage-direction narration; no slogan or moralizing ending; resolution balances value against the trap or limit.
- C01 is never absent for 3+ consecutive scenes; the last scene echoes the first.
- Captions are punchlines, not subtitles.

### E. Image inspection (stage 2)

When image files are supplied, inspect each: no hallucinated text, empty header (Y 0-14%) and caption (Y 75-100%) zones, consistent character proportions and line weight, palette fidelity, spatial match to `compositionPlan`. If none are supplied, `imageLevelStatus` is `"pending_image_generation"` and every image-level continuity check stays `"not_verified"`. Never infer an image pass from prompt text.

## 4. Where to send the fix

If defects span stages, set `reviseTarget` to the **earliest** stage that has one (`brief` -> `script` -> `storyboard` -> `composition` -> `visualPrompts`) so downstream work is regenerated from corrected input. When narration changes, all dependent scenes, compositions, and prompts are stale. Say so in `revisionInstructions`.

## Output Contract

Return valid JSON only, no commentary:

```json
{
  "status": "revise",
  "qualityStatus": "revise",
  "reviseTarget": "script",
  "revisionCount": 1,
  "timingAudit": {
    "source": "validatorReport",
    "cardCount": 13,
    "sumOfSceneDurations": 53.0,
    "targetDurationSeconds": 65.0,
    "deltaSeconds": -12.0,
    "actualWordCount": 145,
    "targetWordRange": [150, 162],
    "passesTimingGate": false
  },
  "validatorReport": { "blockingIssues": [], "reviewItems": [] },
  "reviewItemDecisions": [
    {
      "gate": "epistemic",
      "sceneId": 9,
      "decision": "fix",
      "reason": "Absolute claim about identical behaviour."
    }
  ],
  "factReview": [
    {
      "claim": "Claim as stated in narration",
      "sceneId": 6,
      "verdict": "wrong",
      "problem": "What is false or misleading",
      "requiredFix": "Accurate replacement wording"
    }
  ],
  "analogyReview": [
    {
      "mapRow": "Ship = host OS",
      "sceneId": 6,
      "verdict": "misleading",
      "problem": "Relation drawn does not match the real one",
      "requiredFix": "Redraw the shared part once, under all users"
    }
  ],
  "depictionReview": [
    {
      "sceneId": 10,
      "verdict": "mismatch",
      "problem": "Picture shows X but narration says Y",
      "requiredFix": "Show Y"
    }
  ],
  "creativeScores": {
    "hookAndCuriosity": 0,
    "narrativeStructure": 0,
    "centralIdeaClarity": 0,
    "causeAndEffectProgression": 0,
    "emotionalEngagement": 0,
    "analogyQualityAndFidelity": 0,
    "visualStorytelling": 0,
    "ahaMomentAndPayoff": 0,
    "factualAccuracy": 0,
    "endingAndMemorability": 0,
    "average": 0,
    "rationales": {
      "hookAndCuriosity": "Evidence-based reason.",
      "narrativeStructure": "Evidence-based reason.",
      "centralIdeaClarity": "Evidence-based reason.",
      "causeAndEffectProgression": "Evidence-based reason.",
      "emotionalEngagement": "Evidence-based reason.",
      "analogyQualityAndFidelity": "Evidence-based reason.",
      "visualStorytelling": "Evidence-based reason.",
      "ahaMomentAndPayoff": "Evidence-based reason.",
      "factualAccuracy": "Evidence-based reason.",
      "endingAndMemorability": "Evidence-based reason."
    }
  },
  "blockingIssues": [
    {
      "sceneId": null,
      "category": "timingMatch",
      "severity": "high",
      "problem": "Copied from validator",
      "requiredFix": "Concrete instruction"
    }
  ],
  "imageLevelStatus": "pending_image_generation",
  "revisionInstructions": ["1. ...", "2. ..."],
  "report": "REVISE (target: script): one sentence per blocking category, with numbers copied from the validator."
}
```

`blockingIssues` includes every validator blocking issue (grouped by gate if there are many identical ones) plus your own. If `blockingIssues` is non-empty the status must be `revise`.


## Creative quality scorecard (required)
Evaluate the ten dimensions in `../QUALITY_RUBRIC.md`: hook/curiosity, narrative structure,
central-idea clarity, cause/effect progression, emotional engagement, analogy fidelity,
visual storytelling, aha/payoff, factual accuracy, and ending/memorability.
Give each a defensible 1–10 score with one sentence of evidence. Compute the arithmetic mean
without rounding upward. If you cannot inspect a generated image, mark image-level evaluation
pending/not verified; do not infer visual quality from prompts alone. Report technical compliance
separately from creative quality. The release gates in the shared rubric are mandatory.
A target of 9/10 is aspirational and must never alter the score.

## Revision specificity
Every blocking issue must identify the affected artifact and exact field/scene/beat, state the
observable defect, and prescribe a minimal concrete correction. When upstream material changes,
name every downstream artifact that is stale using `REVISION_PROTOCOL.md`. After a revision,
inspect the revised artifact and use the validator's new report; never carry forward a prior pass.


When the average is below 9.0 and there is a specific, achievable improvement, set `status:"revise"`
and route to the earliest responsible stage. Do not manufacture revisions for subjective preference
or attempt revisions that would damage factual integrity. If the configured revision limit is
exhausted, return the honest final score and unresolved issues; never relabel the result as 9+.
