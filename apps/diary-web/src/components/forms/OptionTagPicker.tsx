"use client";

import { Button, Spinner, Text } from "@madecki/ui";
import type { ColorVariants } from "@madecki/ui";
import type { EmotionResponse, TriggerResponse } from "@diary/shared";

type Option = EmotionResponse | TriggerResponse;

const TYPE_VARIANT: Record<string, Exclude<ColorVariants, "primary">> = {
  difficult: "danger",
  neutral: "warning",
  pleasant: "success",
};

function getMoodTypeOrder(mood: number | null): string[] {
  if (mood === null) return ["pleasant", "neutral", "difficult"];
  if (mood <= 3) return ["difficult", "neutral", "pleasant"];
  if (mood <= 7) return ["neutral", "difficult", "pleasant"];
  return ["pleasant", "neutral", "difficult"];
}

interface OptionTagPickerProps {
  label: string;
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  maxTags?: number;
  error?: string;
  isLoading?: boolean;
  mood?: number | null;
  disabled?: boolean;
  /** When set, shows a gray "Add new" button (same style as tags). */
  addNewLabel?: string;
  onAddNew?: () => void;
}

export function OptionTagPicker({
  label,
  options,
  value,
  onChange,
  maxTags = 5,
  error,
  isLoading,
  mood = null,
  disabled,
  addNewLabel,
  onAddNew,
}: OptionTagPickerProps) {
  function toggleOption(optionLabel: string) {
    if (value.includes(optionLabel)) {
      onChange(value.filter((v) => v !== optionLabel));
    } else if (value.length < maxTags) {
      onChange([...value, optionLabel]);
    }
  }

  const typeOrder = getMoodTypeOrder(mood);

  const sortedOptions = [...options].sort((a, b) => {
    const aSelected = value.includes(a.label);
    const bSelected = value.includes(b.label);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    const aIdx = typeOrder.indexOf(a.type);
    const bIdx = typeOrder.indexOf(b.type);
    return aIdx - bIdx;
  });

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-icongray">
        {label}
        <span className="ml-2 text-xs text-lightgray">
          ({value.length}/{maxTags})
        </span>
      </label>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <Text size="sm" color="muted">
            Loading…
          </Text>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sortedOptions.map((option) => {
            const isSelected = value.includes(option.label);
            const variant = TYPE_VARIANT[option.type] ?? "info";
            const isAtMax = value.length >= maxTags && !isSelected;
            return (
              <Button
                key={option.id}
                id={option.id}
                variant={variant}
                size="sm"
                isActive={isSelected}
                label={option.label}
                type="button"
                disabled={isAtMax || disabled}
                onClick={(maybeId?: string) => {
                  // When isActive=true, Button calls onClick() without id (x clicked)
                  if (maybeId === undefined) {
                    onChange(value.filter((v) => v !== option.label));
                  } else {
                    toggleOption(option.label);
                  }
                }}
              />
            );
          })}
          {addNewLabel != null && onAddNew != null && (
            <Button
              size="sm"
              variant="primary"
              label={addNewLabel}
              type="button"
              disabled={disabled}
              onClick={onAddNew}
            />
          )}
        </div>
      )}

      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}
    </div>
  );
}
