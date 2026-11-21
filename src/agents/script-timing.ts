export const TARGET_WORDS_PER_SECOND = 2.7;
export const INTER_BEAT_PAUSE_SECONDS = 0.15;

export function deriveBeatTiming(narration: string, hasFollowingBeat: boolean) {
  const wordCount = (
    narration.match(/[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*/g) ?? []
  ).length;
  const estimatedDurationSeconds = Number(
    (wordCount / TARGET_WORDS_PER_SECOND + (hasFollowingBeat ? INTER_BEAT_PAUSE_SECONDS : 0)).toFixed(1),
  );
  return { wordCount, estimatedDurationSeconds };
}
