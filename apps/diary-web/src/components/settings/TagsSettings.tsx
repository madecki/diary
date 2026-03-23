"use client";

import { createTag, deleteTag, updateTag } from "@/lib/settings-api";
import type { TagResponse } from "@diary/shared";
import { Button, ButtonTransparent, Heading, Input, Spinner, Text } from "@madecki/ui";
import { useState } from "react";

// ── Tag Chip ──────────────────────────────────────────────────────────

interface TagChipProps {
  tag: TagResponse;
  isEditing: boolean;
  isDeleting: boolean;
  onEdit: (tag: TagResponse) => void;
  onSave: (id: string, name: string) => Promise<void>;
  onCancelEdit: () => void;
  onDelete: (tag: TagResponse) => void;
}

function TagChip({
  tag,
  isEditing,
  isDeleting,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
}: TagChipProps) {
  const [name, setName] = useState(tag.name);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Tag name is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSave(tag.id, trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-end gap-2 p-3 bg-primary/40 rounded-sm border border-gray/30">
        <div className="flex-1">
          <Input
            name="editTagName"
            label="Tag name"
            variant="secondary"
            onChange={(v) => {
              setName(v);
              if (error) setError("");
            }}
            defaultValue={name}
          />
        </div>
        <Button variant="success" size="sm" type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "…" : "Save"}
        </Button>
        <ButtonTransparent
          variant="neutral"
          type="button"
          disabled={isSaving}
          onClick={onCancelEdit}
        >
          Cancel
        </ButtonTransparent>
        {error && (
          <Text size="sm" color="danger">
            {error}
          </Text>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-gray/30 border border-gray/50 rounded-sm">
      <span className="text-sm text-white">{tag.name}</span>
      <button
        type="button"
        className="text-xs text-lightgray hover:text-white ml-2 transition-colors"
        onClick={() => onEdit(tag)}
        aria-label={`Edit ${tag.name}`}
      >
        Edit
      </button>
      <button
        type="button"
        className="text-xs text-danger hover:text-danger/80 ml-1 transition-colors"
        onClick={() => onDelete(tag)}
        disabled={isDeleting}
        aria-label={`Delete ${tag.name}`}
      >
        {isDeleting ? "…" : "×"}
      </button>
    </div>
  );
}

// ── TagsSettings ──────────────────────────────────────────────────────

interface TagsSettingsProps {
  tags: TagResponse[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function TagsSettings({ tags, isLoading, onRefresh }: TagsSettingsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleAdd() {
    const trimmed = addName.trim();
    if (!trimmed) {
      setAddError("Tag name is required");
      return;
    }
    setIsAdding(true);
    setAddError("");
    try {
      await createTag({ name: trimmed });
      setAddName("");
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleSave(id: string, name: string) {
    await updateTag(id, { name });
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(tag: TagResponse) {
    setDeletingId(tag.id);
    setDeleteError("");
    try {
      await deleteTag(tag.id);
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Heading level={3} size="md" weight="semibold">
            Tags
          </Heading>
          <Text size="sm" color="muted">
            Add tags to notes for quick categorisation.
          </Text>
        </div>
        {!showAdd && (
          <Button
            variant="success"
            size="sm"
            type="button"
            onClick={() => {
              setShowAdd(true);
              setEditingId(null);
            }}
          >
            Add tag
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="flex flex-col gap-3 p-4 bg-primary/40 rounded-sm border border-gray/30">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                name="newTag"
                label="Tag name"
                placeholder="e.g. health, idea, reading…"
                variant="secondary"
                onChange={(v) => {
                  setAddName(v);
                  if (addError) setAddError("");
                }}
                defaultValue={addName}
              />
            </div>
            <Button
              variant="success"
              size="md"
              type="button"
              disabled={isAdding}
              onClick={handleAdd}
            >
              {isAdding ? "Adding…" : "Add"}
            </Button>
            <ButtonTransparent
              variant="neutral"
              type="button"
              disabled={isAdding}
              onClick={() => {
                setShowAdd(false);
                setAddName("");
                setAddError("");
              }}
            >
              Cancel
            </ButtonTransparent>
          </div>
          {addError && (
            <Text size="sm" color="danger">
              {addError}
            </Text>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 py-3">
          <Spinner size="sm" />
          <Text size="sm" color="muted">
            Loading…
          </Text>
        </div>
      ) : tags.length === 0 && !showAdd ? (
        <Text size="sm" color="muted">
          No tags yet. Add your first one.
        </Text>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              tag={tag}
              isEditing={editingId === tag.id}
              isDeleting={deletingId === tag.id}
              onEdit={(t) => {
                setEditingId(t.id);
                setShowAdd(false);
              }}
              onSave={handleSave}
              onCancelEdit={() => setEditingId(null)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {deleteError && (
        <Text size="sm" color="danger">
          {deleteError}
        </Text>
      )}
    </div>
  );
}
