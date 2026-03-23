"use client";

import { ButtonTransparent, GradientButton, Heading, Input, Stack, Text } from "@madecki/ui";
import { useState } from "react";

export type RefType = "difficult" | "neutral" | "pleasant";

const TYPE_BG: Record<RefType, { on: string; off: string }> = {
  difficult: { on: "bg-danger text-white", off: "bg-danger/10 text-danger hover:bg-danger/20" },
  neutral: { on: "bg-warning text-primary", off: "bg-warning/10 text-warning hover:bg-warning/20" },
  pleasant: {
    on: "bg-success text-primary",
    off: "bg-success/10 text-success hover:bg-success/20",
  },
};

const REF_TYPES: RefType[] = ["difficult", "neutral", "pleasant"];

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
    <div className="flex flex-col gap-1">
      <label className="text-xs text-lightgray">Type</label>
      <div className="flex gap-2">
        {REF_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => onChange(t)}
            className={`px-3 py-1 text-sm rounded-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              value === t ? TYPE_BG[t].on : TYPE_BG[t].off
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
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
