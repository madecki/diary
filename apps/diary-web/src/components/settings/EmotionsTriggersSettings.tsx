"use client";

import {
  AddEmotionTriggerForm,
  type RefType,
  TypeSelector,
} from "@/components/forms/AddEmotionTriggerForm";
import {
  createEmotion,
  createTrigger,
  deleteEmotion,
  deleteTrigger,
  updateEmotion,
  updateTrigger,
} from "@/lib/api";
import type { EmotionResponse, TriggerResponse } from "@diary/shared";
import {
  Button,
  ButtonTransparent,
  GradientButton,
  Heading,
  Input,
  Spinner,
  Stack,
  Tag,
  Text,
} from "@madecki/ui";
import { useEffect, useState } from "react";

type Item = EmotionResponse | TriggerResponse;

const TYPE_VARIANT: Record<RefType, "danger" | "warning" | "success"> = {
  difficult: "danger",
  neutral: "warning",
  pleasant: "success",
};

// ── Edit Modal ────────────────────────────────────────────────────────

interface EditModalProps {
  item: Item;
  kind: "emotion" | "trigger";
  onSave: (id: string, label: string, type: RefType) => Promise<void>;
  onClose: () => void;
}

function EditModal({ item, kind, onSave, onClose }: EditModalProps) {
  const [label, setLabel] = useState(item.label);
  const [type, setType] = useState<RefType>(item.type);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSave() {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Label is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSave(item.id, trimmed, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-sm bg-darkgray border border-gray/50 p-7">
        <Stack direction="vertical" gap="6">
          <Heading level={2} size="lg" weight="semibold">
            Edit {kind}
          </Heading>

          <Input
            name="editLabel"
            label="Label"
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

          <Stack direction="horizontal" gap="3" justify="end">
            <ButtonTransparent
              variant="neutral"
              onClick={onClose}
              disabled={isSaving}
              type="button"
            >
              Cancel
            </ButtonTransparent>
            <GradientButton onClick={handleSave} disabled={isSaving} type="button">
              {isSaving ? "Saving…" : "Save"}
            </GradientButton>
          </Stack>
        </Stack>
      </div>
    </div>
  );
}

// ── Item Row ──────────────────────────────────────────────────────────

interface ItemRowProps {
  item: Item;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  isDeleting: boolean;
}

function ItemRow({ item, onEdit, onDelete, isDeleting }: ItemRowProps) {
  const isUsed = item.usageCount > 0;
  const variant = TYPE_VARIANT[item.type];

  return (
    <div className="flex items-center gap-2">
      <Button variant={variant} size="sm" type="button" onClick={() => onEdit(item)}>
        {item.label}
      </Button>
      <div className="relative group">
        <button
          type="button"
          className={`text-xs px-1 py-0.5 transition-colors ${
            isUsed ? "text-lightgray/40 cursor-not-allowed" : "text-danger hover:text-danger/80"
          }`}
          onClick={() => !isUsed && onDelete(item)}
          disabled={isUsed || isDeleting}
          title={
            isUsed
              ? `Used in ${item.usageCount} check-in${item.usageCount === 1 ? "" : "s"} — cannot delete`
              : `Delete ${item.label}`
          }
        >
          {isDeleting ? "…" : "×"}
        </button>
        {isUsed && (
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-darkgray border border-gray/50 rounded-sm whitespace-nowrap text-lightgray opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
            Used in {item.usageCount} check-in{item.usageCount === 1 ? "" : "s"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────

interface EmotionsTriggersSectionProps {
  kind: "emotions" | "triggers";
  items: Item[];
  isLoading: boolean;
  onRefresh: () => void;
}

function EmotionsTriggerSection({
  kind,
  items,
  isLoading,
  onRefresh,
}: EmotionsTriggersSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const itemKind = kind === "emotions" ? "emotion" : "trigger";

  async function handleAdd(label: string, type: RefType) {
    if (kind === "emotions") {
      await createEmotion({ label, type });
    } else {
      await createTrigger({ label, type });
    }
    setShowAdd(false);
    onRefresh();
  }

  async function handleSave(id: string, label: string, type: RefType) {
    if (kind === "emotions") {
      await updateEmotion(id, { label, type });
    } else {
      await updateTrigger(id, { label, type });
    }
    setEditingItem(null);
    onRefresh();
  }

  async function handleDelete(item: Item) {
    setDeletingId(item.id);
    setDeleteError("");
    try {
      if (kind === "emotions") {
        await deleteEmotion(item.id);
      } else {
        await deleteTrigger(item.id);
      }
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const grouped: Record<RefType, Item[]> = {
    difficult: items.filter((i) => i.type === "difficult"),
    neutral: items.filter((i) => i.type === "neutral"),
    pleasant: items.filter((i) => i.type === "pleasant"),
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Heading level={3} size="md" weight="semibold">
            {kind === "emotions" ? "Emotions" : "Triggers"}
          </Heading>
          <Button
            variant="info"
            size="sm"
            type="button"
            onClick={() => {
              setShowAdd((v) => !v);
              setEditingItem(null);
            }}
          >
            {showAdd ? "Cancel" : `Add ${itemKind}`}
          </Button>
        </div>

        {showAdd && (
          <AddEmotionTriggerForm
            kind={itemKind}
            onAdd={handleAdd}
            onCancel={() => setShowAdd(false)}
          />
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 py-3">
            <Spinner size="sm" />
            <Text size="sm" color="muted">
              Loading…
            </Text>
          </div>
        ) : items.length === 0 ? (
          <Text size="sm" color="muted">
            No {kind} yet. Add your first one.
          </Text>
        ) : (
          <div className="flex flex-col gap-4">
            {(["difficult", "neutral", "pleasant"] as RefType[]).map((refType) => {
              const group = grouped[refType];
              if (group.length === 0) return null;
              const variant = TYPE_VARIANT[refType];
              return (
                <div key={refType} className="flex flex-col gap-2">
                  <Tag
                    variant={variant}
                    size="xs"
                    filled
                    label={refType.charAt(0).toUpperCase() + refType.slice(1)}
                    className="w-fit"
                  />
                  <div className="flex flex-wrap gap-2">
                    {group.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        onEdit={setEditingItem}
                        onDelete={handleDelete}
                        isDeleting={deletingId === item.id}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {deleteError && (
          <Text size="sm" color="danger">
            {deleteError}
          </Text>
        )}
      </div>

      {editingItem && (
        <EditModal
          item={editingItem}
          kind={itemKind}
          onSave={handleSave}
          onClose={() => setEditingItem(null)}
        />
      )}
    </>
  );
}

// ── EmotionsTriggersSettings ──────────────────────────────────────────

interface EmotionsTriggersSettingsProps {
  emotions: EmotionResponse[];
  triggers: TriggerResponse[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function EmotionsTriggersSettings({
  emotions,
  triggers,
  isLoading,
  onRefresh,
}: EmotionsTriggersSettingsProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Heading level={2} size="lg" weight="semibold">
          Check-in options
        </Heading>
        <Text size="sm" color="muted">
          Customise the emotions and triggers available when filling in check-ins. Editing a label
          updates it across all existing check-ins automatically.
        </Text>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="bg-darkgray rounded-sm border border-gray/30 p-5">
          <EmotionsTriggerSection
            kind="emotions"
            items={emotions}
            isLoading={isLoading}
            onRefresh={onRefresh}
          />
        </div>
        <div className="bg-darkgray rounded-sm border border-gray/30 p-5">
          <EmotionsTriggerSection
            kind="triggers"
            items={triggers}
            isLoading={isLoading}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
}
