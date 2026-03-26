"use client";

import {
  ButtonTransparent,
  GradientButton,
  Heading,
  Input,
  Select,
  Stack,
  Text,
} from "@madecki/ui";
import { useState } from "react";

export type RefType = "difficult" | "neutral" | "pleasant";

const REF_TYPE_OPTIONS: { value: RefType; label: string }[] = [
  { value: "difficult", label: "Difficult" },
  { value: "neutral", label: "Neutral" },
  { value: "pleasant", label: "Pleasant" },
];

export function TypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: RefType;
  onChange: (t: RefType) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      name="refItemType"
      label="Type"
      testId="ref-item-type"
      variant="secondary"
      options={REF_TYPE_OPTIONS}
      value={value}
      onChange={(v) => onChange(v as RefType)}
      disabled={disabled}
    />
  );
}

export interface AddEmotionTriggerFormProps {
  kind: "emotion" | "trigger";
  onAdd: (label: string, type: RefType) => Promise<void>;
  onCancel: () => void;
}

export function AddEmotionTriggerForm({ kind, onAdd, onCancel }: AddEmotionTriggerFormProps) {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<RefType>("neutral");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Label is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onAdd(trimmed, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-primary/40 rounded-sm border border-gray/30">
      <Heading level={4} size="sm" weight="semibold">
        New {kind}
      </Heading>

      <Input
        name="newLabel"
        label="Label"
        placeholder={kind === "emotion" ? "e.g. nervous, hopeful…" : "e.g. caffeine, deadlines…"}
        variant="secondary"
        onChange={(v) => {
          setLabel(v);
          if (error) setError("");
        }}
        defaultValue={label}
      />

      <TypeSelector value={type} onChange={setType} disabled={isSaving} />

      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}

      <Stack direction="horizontal" gap="3">
        <GradientButton type="button" disabled={isSaving} onClick={handleSubmit}>
          {isSaving ? "Adding…" : "Add"}
        </GradientButton>
        <ButtonTransparent variant="neutral" type="button" disabled={isSaving} onClick={onCancel}>
          Cancel
        </ButtonTransparent>
      </Stack>
    </div>
  );
}
