"use client";

import { Stack, Text } from "@madecki/ui";

interface MoodPickerProps {
  value: number | null;
  onChange: (mood: number) => void;
}

const moodColors: Record<number, string> = {
  1: "bg-danger",
  2: "bg-danger",
  3: "bg-warning",
  4: "bg-warning",
  5: "bg-neutral",
  6: "bg-neutral",
  7: "bg-blue",
  8: "bg-blue",
  9: "bg-success",
  10: "bg-success",
};

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  return (
    <Stack gap="2">
      <Text as="label" size="sm" weight="medium">
        Mood (1–10)
      </Text>
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`w-10 h-10 rounded-full text-sm font-semibold transition-all ${
                selected
                  ? `${moodColors[n]} text-primary scale-110`
                  : "bg-gray text-icongray hover:bg-lightgray hover:text-offwhite"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </Stack>
  );
}
