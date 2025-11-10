export enum Mood {
  Happy = "Happy",
  Sad = "Sad",
  Angry = "Angry",
  Surprised = "Surprised",
  Neutral = "Neutral",
  Anxious = "Anxious",
  Unknown = "Unknown"
}

export interface MoodAnalysis {
  mood: Mood;
  confidence: number;
}


