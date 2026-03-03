-- CreateEnum
CREATE TYPE "RefType" AS ENUM ('difficult', 'neutral', 'pleasant');

-- CreateTable
CREATE TABLE "emotions" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "RefType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triggers" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "RefType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "emotions_label_key" ON "emotions"("label");

-- CreateIndex
CREATE UNIQUE INDEX "triggers_label_key" ON "triggers"("label");

-- Seed emotions
INSERT INTO "emotions" ("id", "label", "type") VALUES
  ('emo_diff_01', 'sad',          'difficult'),
  ('emo_diff_02', 'anxious',      'difficult'),
  ('emo_diff_03', 'angry',        'difficult'),
  ('emo_diff_04', 'frustrated',   'difficult'),
  ('emo_diff_05', 'overwhelmed',  'difficult'),
  ('emo_diff_06', 'scared',       'difficult'),
  ('emo_diff_07', 'lonely',       'difficult'),
  ('emo_diff_08', 'ashamed',      'difficult'),
  ('emo_diff_09', 'jealous',      'difficult'),
  ('emo_diff_10', 'guilty',       'difficult'),
  ('emo_neut_01', 'calm',         'neutral'),
  ('emo_neut_02', 'bored',        'neutral'),
  ('emo_neut_03', 'tired',        'neutral'),
  ('emo_neut_04', 'confused',     'neutral'),
  ('emo_neut_05', 'nostalgic',    'neutral'),
  ('emo_neut_06', 'content',      'neutral'),
  ('emo_neut_07', 'indifferent',  'neutral'),
  ('emo_plea_01', 'happy',        'pleasant'),
  ('emo_plea_02', 'grateful',     'pleasant'),
  ('emo_plea_03', 'excited',      'pleasant'),
  ('emo_plea_04', 'hopeful',      'pleasant'),
  ('emo_plea_05', 'joyful',       'pleasant'),
  ('emo_plea_06', 'proud',        'pleasant'),
  ('emo_plea_07', 'peaceful',     'pleasant'),
  ('emo_plea_08', 'loved',        'pleasant'),
  ('emo_plea_09', 'inspired',     'pleasant'),
  ('emo_plea_10', 'confident',    'pleasant');

-- Seed triggers
INSERT INTO "triggers" ("id", "label", "type") VALUES
  ('tri_diff_01', 'work stress',    'difficult'),
  ('tri_diff_02', 'conflict',       'difficult'),
  ('tri_diff_03', 'lack of sleep',  'difficult'),
  ('tri_diff_04', 'health issues',  'difficult'),
  ('tri_diff_05', 'money worries',  'difficult'),
  ('tri_diff_06', 'rejection',      'difficult'),
  ('tri_diff_07', 'criticism',      'difficult'),
  ('tri_neut_01', 'weather',        'neutral'),
  ('tri_neut_02', 'routine',        'neutral'),
  ('tri_neut_03', 'change',         'neutral'),
  ('tri_neut_04', 'social media',   'neutral'),
  ('tri_neut_05', 'meetings',       'neutral'),
  ('tri_plea_01', 'exercise',       'pleasant'),
  ('tri_plea_02', 'nature',         'pleasant'),
  ('tri_plea_03', 'music',          'pleasant'),
  ('tri_plea_04', 'friends',        'pleasant'),
  ('tri_plea_05', 'family',         'pleasant'),
  ('tri_plea_06', 'achievement',    'pleasant'),
  ('tri_plea_07', 'good sleep',     'pleasant'),
  ('tri_plea_08', 'hobbies',        'pleasant'),
  ('tri_plea_09', 'travel',         'pleasant');
