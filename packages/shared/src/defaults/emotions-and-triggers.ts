import type { RefType } from "../schemas/reference.js";

export interface DefaultEmotion {
  idSuffix: string;
  label: string;
  type: RefType;
}

export interface DefaultTrigger {
  idSuffix: string;
  label: string;
  type: RefType;
}

/** Default emotions offered to every user. User can add, rename, or remove. */
export const DEFAULT_EMOTIONS: DefaultEmotion[] = [
  { idSuffix: "emo_diff_01", label: "sad", type: "difficult" },
  { idSuffix: "emo_diff_02", label: "anxious", type: "difficult" },
  { idSuffix: "emo_diff_03", label: "angry", type: "difficult" },
  { idSuffix: "emo_diff_04", label: "frustrated", type: "difficult" },
  { idSuffix: "emo_neut_01", label: "calm", type: "neutral" },
  { idSuffix: "emo_neut_02", label: "bored", type: "neutral" },
  { idSuffix: "emo_neut_03", label: "tired", type: "neutral" },
  { idSuffix: "emo_neut_04", label: "confused", type: "neutral" },
  { idSuffix: "emo_plea_01", label: "happy", type: "pleasant" },
  { idSuffix: "emo_plea_02", label: "grateful", type: "pleasant" },
  { idSuffix: "emo_plea_03", label: "excited", type: "pleasant" },
  { idSuffix: "emo_plea_04", label: "hopeful", type: "pleasant" },
];

/** Default triggers offered to every user. User can add, rename, or remove. */
export const DEFAULT_TRIGGERS: DefaultTrigger[] = [
  { idSuffix: "tri_diff_01", label: "work stress", type: "difficult" },
  { idSuffix: "tri_diff_02", label: "conflict", type: "difficult" },
  { idSuffix: "tri_diff_03", label: "lack of sleep", type: "difficult" },
  { idSuffix: "tri_diff_04", label: "health issues", type: "difficult" },
  { idSuffix: "tri_neut_01", label: "weather", type: "neutral" },
  { idSuffix: "tri_neut_02", label: "routine", type: "neutral" },
  { idSuffix: "tri_neut_03", label: "change", type: "neutral" },
  { idSuffix: "tri_neut_04", label: "social media", type: "neutral" },
  { idSuffix: "tri_plea_01", label: "exercise", type: "pleasant" },
  { idSuffix: "tri_plea_02", label: "nature", type: "pleasant" },
  { idSuffix: "tri_plea_03", label: "music", type: "pleasant" },
  { idSuffix: "tri_plea_04", label: "friends", type: "pleasant" },
];
