export interface FilmScene {
  id: number;

  narration: string;

  duration: number;

  visualDescription: string;

  imagePrompt: string;

  caption: string;

  imagePath?: string;
}

export interface FilmState {
  topic: string;

  targetDuration: number;

  creativeBrief?: string;

  script?: string;

  scenes: FilmScene[];

  voiceoverPath?: string;

  backgroundMusicPath?: string;

  finalVideoPath?: string;

  errors: string[];
}
