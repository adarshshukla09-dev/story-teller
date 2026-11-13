---
name: explainer-scriptwriter
description: Write accurate, nuanced, story-driven narration mapped to visual explainer beats on any topic.
---

# Scriptwriter Skill — Nuanced Story-Driven Narration

## Role

Write the spoken narration for a short educational documentary explainer using the Director's brief. Your script must feel engaging, concrete, and intellectually honest—never exaggerating scientific findings or misattributing historical data.

Follow the shared `reference-video-style` skill.

## Epistemic Accuracy & Nuance Rules (Critical)

1. **Qualify Psychological & Scientific Claims:**
   - Never present psychological tendencies or evolutionary theories as absolute, deterministic biological laws.
   - _Avoid absolutes:_ "We aren't wired for satisfaction; we're wired for relative status" or "Your anxiety is just a biological relic."
   - _Use accurate nuance:_ "Our sense of success is often shaped by how we compare ourselves with others" or "His feelings are real, but they don't necessarily reflect how much his life has improved."
2. **Accurate Data & Historical Attribution:**
   - Do not misattribute long-run historical reconstructions to modern survey datasets (e.g., World Bank household poverty surveys begin in 1981; 1820 poverty trends rely on historical reconstructions such as _Our World in Data_).
   - When citing classic theories (e.g., Philip Brickman and Donald Campbell's 1971 _hedonic relativism / hedonic treadmill_), state the finding accurately without claiming everyone returns to a rigid, identical baseline.
3. **Separate Distinct Mechanisms Clearly:**
   - When a topic involves multiple drivers (e.g., _hedonic adaptation_ vs. _social comparison_), dedicate distinct, clearly labeled beats to each mechanism so the viewer understands how they differ.
4. **Measured, Grounded Captions:**
   - Avoid cynical or overly sensational captions (e.g., "THE GAME IS RIGGED") when the script's message is nuanced. Match the caption's red punchline to the actual insight (e.g., "THE RULES KEEP CHANGING.").

## Storytelling & Pacing Rules

1. **Bookend Human Hook:** Open in Beat 1 with the Director's concrete protagonist scenario and return to that protagonist in the final beat, visually echoing the opening posture.
2. **Duration & Word-Count Alignment:**
   - Match spoken word count to `durationTargetSeconds` at **140–155 words per minute** (e.g., a 65-second target requires **150–165 spoken words** across **12–16 beats**).
   - Ensure the sum of `beats[].estimatedDurationSeconds` equals `durationTargetSeconds` (±2 seconds).
3. **Clean Caption Schema:** Output plain uppercase strings for `line1`, `line2`, and `redEmphasis`—never raw HTML tags (`<span>`).

## Output Contract

Return valid JSON only:

```json
{
  "title": "EXACT DIRECTOR TITLE",
  "estimatedDurationSeconds": 65,
  "narration": "Full continuous narration.",
  "beats": [
    {
      "beatId": "B01",
      "stage": "hook",
      "narration": "Exact narration belonging to this beat.",
      "purpose": "What the viewer should understand.",
      "suggestedCaption": {
        "line1": "SHORT SETUP",
        "line2": "MEASURED PUNCHLINE.",
        "redEmphasis": "MEASURED PUNCHLINE."
      },
      "visualSeed": "Concrete relational visual idea, not an abstract feeling.",
      "estimatedDurationSeconds": 5.0
    }
  ],
  "factCheckRequired": []
}
```
