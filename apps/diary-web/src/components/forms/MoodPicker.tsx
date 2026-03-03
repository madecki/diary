"use client";

import { Button, Text } from "@madecki/ui";
import type { ColorVariants } from "@madecki/ui";

interface MoodPickerProps {
  value: number | null;
  onChange: (mood: number | null) => void;
  error?: string;
  disabled?: boolean;
}

const MOOD_COLORS: Record<number, Exclude<ColorVariants, "primary">> = {
  1: "danger",
  2: "danger",
  3: "danger",
  4: "warning",
  5: "warning",
  6: "info",
  7: "info",
  8: "success",
  9: "success",
  10: "success",
};

export function MoodPicker({ value, onChange, error, disabled }: MoodPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-icongray">
        Mood{" "}
        <span className="text-xs text-lightgray">
          (1 = very low, 10 = excellent)
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <Button
            key={n}
            id={`mood-${n}`}
            variant={MOOD_COLORS[n]!}
            size="sm"
            onClick={(maybeId?: string) => {
              // When isActive=true, Button calls onClick() without id (x button clicked)
              onChange(maybeId === undefined ? null : n);
            }}
            isActive={value === n}
            label={String(n)}
            type="button"
            disabled={disabled}
          />
        ))}
      </div>

      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}
    </div>
  );
}
