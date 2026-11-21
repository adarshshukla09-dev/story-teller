export interface ScriptValidationResult { errors: string[]; warnings: string[] }

const BRIDGES = ["but", "so", "because", "which means", "and yet", "therefore", "that means", "as a result", "now", "instead", "yet", "still"];
const words = (s: string) => (s.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) ?? []).length;

export function validateScript(script: any): ScriptValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const plan = script?.storyPlan;
  const required = ["centralQuestion", "thesis", "keyConcepts", "character", "recurringMotif", "emotionalArc"];
  if (!plan || typeof plan !== "object") errors.push("storyPlan is missing.");
  else {
    for (const field of required) if (!(field in plan)) errors.push(`storyPlan.${field} is missing.`);
    if (Array.isArray(plan.keyConcepts) && plan.keyConcepts.length > 3) errors.push("storyPlan.keyConcepts has more than 3 concepts.");
  }
  const beats = Array.isArray(script?.beats) ? script.beats : [];
  if (!beats.length) errors.push("beats must be a non-empty array.");
  if (beats.length && (beats.length < 12 || beats.length > 16)) errors.push(`Script must contain 12–16 beats (received ${beats.length}); preserve all Director story steps while matching the required scene count.`);
  let time = 0;
  let narrationDerivedTime = 0;
  const headers = new Set<string>();
  for (const [i, beat] of beats.entries()) {
    const duration = Number(beat.estimatedDurationSeconds);
    if (!Number.isFinite(duration) || duration <= 0) { errors.push(`Beat ${i + 1} has invalid duration.`); continue; }
    const wps = words(String(beat.narration ?? "")) / duration;
    if (wps > 3) errors.push(`Beat ${i + 1} is too fast: ${wps.toFixed(2)} words/second (maximum 3.0).`);
    if (i > 0) {
      const first = String(beat.narration ?? "").trim().toLowerCase();
      if (!BRIDGES.some((b) => first.startsWith(b))) {
        const soft = /^(and|then|while|however|because of|this|that)\b/.test(first);
        (soft ? warnings : errors).push(`Beat ${i + 1} narration should begin with a clear bridge from the configurable bridge list.`);
      }
    }
    time += duration;
    narrationDerivedTime += words(String(beat.narration ?? "")) / 2.7 + (i < beats.length - 1 ? 0.15 : 0);
    if (beat.header) {
      const h = String(beat.header).trim().toLowerCase();
      if (headers.has(h)) errors.push(`Beat ${i + 1} repeats header "${beat.header}".`);
      headers.add(h);
    }
    const caption = beat.caption ?? beat.suggestedCaption;
    const emphasis = caption?.redEmphasis;
    if (caption && emphasis !== undefined) {
      if (!emphasis || (String(caption.line1 ?? "") + " " + String(caption.line2 ?? "")).includes(String(emphasis)) === false) errors.push(`Beat ${i + 1} red emphasis must be exactly one word and appear in its caption.`);
      else if (String(emphasis).trim().split(/\s+/).length !== 1) errors.push(`Beat ${i + 1} red emphasis must be exactly one word.`);
    }
  }
  if (Number.isFinite(Number(script?.estimatedDurationSeconds)) && Math.abs(time - Number(script.estimatedDurationSeconds)) > 0.1) errors.push("Total duration does not match the sum of beat durations.");
  narrationDerivedTime = Number(narrationDerivedTime.toFixed(1));
  if (narrationDerivedTime > 75) errors.push(`Narration is too long at about ${narrationDerivedTime}s. For the 60-second target, keep the script near 160 spoken words and within the 45–75 second format; tighten narration without dropping required story steps.`);
  else if (narrationDerivedTime < 45) errors.push(`Narration is too short at about ${narrationDerivedTime}s. Add only essential explanation needed to complete the story within the 45–75 second format.`);
  const scenes = Array.isArray(script?.scenes) ? script.scenes : [];
  const sceneHeaders = new Set<string>();
  for (const [i, scene] of scenes.entries()) {
    const header = String(scene.headerText ?? scene.header ?? "").trim().toLowerCase();
    if (header && sceneHeaders.has(header)) errors.push(`Scene ${i + 1} repeats header "${scene.headerText ?? scene.header}".`);
    if (header) sceneHeaders.add(header);
    if (i > 0 && Number(scene.startTime) !== Number(scenes[i - 1].endTime)) errors.push(`Scene ${i + 1} startTime must equal scene ${i} endTime.`);
    const overlays = scene.textOverlays ?? scene.caption ?? {};
    const emphasis = overlays.redEmphasis;
    if (typeof emphasis !== "string" || emphasis.trim().split(/\s+/).length !== 1) errors.push(`Scene ${i + 1} must have exactly one red emphasis word.`);
    const caption = [overlays.captionLine1, overlays.captionLine2, overlays.line1, overlays.line2].filter(Boolean).join(" ");
    if (emphasis && !caption.includes(emphasis)) errors.push(`Scene ${i + 1} red emphasis must appear in its caption.`);
    if (plan?.character && scene.imagePrompt && !String(scene.imagePrompt).toLowerCase().includes(String(plan.character).toLowerCase())) errors.push(`Scene ${i + 1} imagePrompt must include the storyPlan character name.`);
  }
  if (scenes.length && Number.isFinite(Number(script?.estimatedTotalDuration)) && Math.abs(Number(scenes.at(-1)?.endTime) - Number(script.estimatedTotalDuration)) > 0.1) errors.push("Scene endTime total does not match estimatedTotalDuration.");
  return { errors, warnings };
}
