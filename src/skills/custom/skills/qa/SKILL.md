---
name: explainer-qa
description: Gatekeeper validating narrative progression, non-literal visual metaphors, spatial composition fidelity, audio-synced timing, and generated artwork.
---

# QA Skill — Two-Stage Production Gatekeeper

## Role

Act as a strict executive producer, fact-checker, and visual editor. Do NOT return `"qualityStatus": "pass"` if any structural, factual, spatial, or timing defect exists.

## Mandatory 7-Point Validation Checklist

1. **Narration-to-Visual Alignment & Mechanism Clarity:**
   - Does every card visually explain its narration?
   - Are distinct psychological/technical mechanisms (e.g., _hedonic adaptation_ vs. _social comparison_) clearly separated in both script and visuals?
   - Do graphs match the narration's direction (e.g., falling poverty = downward curve; adaptation = temporary spike returning toward baseline)?
2. **Complete Relational Compositions:**
   - Does every card depict a clear relational composition rather than isolated symbols or naive literal puns?
   - Does social comparison show comparing against displayed achievements rather than bullying/pointing crowds?
3. **Composition Blueprint Integrity & Influence:**
   - Does `visualCompositions` contain a genuine spatial `compositionPlan` (`primarySubject`, `secondaryElements`, `visualHierarchy`, `captionSafeArea`) rather than duplicate `imagePrompts`?
   - Do `visualPrompts.imagePrompts` faithfully execute the positions and relationships defined in `compositionPlan`?
   - Are `imagePrompts` 100% free of quoted text, dates, or labels?
4. **Reference Card & Caption Consistency:**
   - Is `videoTitle` identical across every artifact?
   - Are captions concise, plain uppercase strings (`line1`, `line2`, `redEmphasis`) without HTML tags or overly cynical/misleading claims?
5. **Scientific & Historical Accuracy (Fact-Check Gate):**
   - Are psychological claims appropriately qualified rather than stated as deterministic biological absolutes?
   - Are historical statistics accurately attributed (e.g., distinguishing pre-1981 historical reconstructions like _Our World in Data_ from World Bank survey data)?
6. **Target Duration Match:**
   - Does the sum of `scenes[].estimatedDurationSeconds` match `creativeBrief.durationTargetSeconds` within **±2 seconds**? (e.g., if target is 65s, scene sum cannot be 50.5s).
7. **Simplified Character Consistency:**
   - Are recurring protagonists consistent across scenes, without unnecessary one-off character IDs?

## Post-Generation Image Inspection (Stage 2)

When generated artwork files are supplied, visually inspect every image for zero hallucinated text, clean top (`14%`) and bottom (`25%`) safe zones, consistent character proportions, and accurate spatial layout. If images are not yet supplied, set `"imageLevelStatus": "pending_image_generation"`.

## Automatic Blocking Failures (`qualityStatus: "revise"`)

Return `"qualityStatus": "revise"` immediately if ANY of the following occur:

- `visualCompositions` contains `imagePrompts` instead of spatial `compositionPlan` objects.
- `imagePrompts` contain quoted words, dates, or labels.
- Sum of scene durations deviates from `durationTargetSeconds` by more than 2 seconds.
- Unqualified deterministic biological claims or misattributed historical datasets appear in narration.
- A graph direction contradicts the narration (e.g., upward graph for falling poverty).
- Character bible includes unnecessary one-off character IDs.

## Output Contract

Return valid JSON only:

```json
{
  "qualityStatus": "revise",
  "revisionCount": 1,
  "scores": {
    "narrativeAndNuance": 4,
    "factualAccuracy": 3,
    "visualMetaphors": 4,
    "compositionBlueprint": 2,
    "promptAlignment": 3,
    "timingMatch": 2,
    "characterContinuity": 3
  },
  "blockingIssues": [
    {
      "sceneId": 3,
      "category": "factualAccuracy",
      "problem": "Attributes 1820 poverty estimates directly to World Bank data, and pairs falling poverty with an unexplained upward graph.",
      "requiredFix": "Attribute 1820 trends to historical reconstructions (e.g., Our World in Data) and use a clearly declining poverty curve with concrete living-standard symbols."
    }
  ],
  "imageLevelStatus": "pending_image_generation",
  "revisionInstructions": ["Actionable step-by-step fixes."]
}
```
