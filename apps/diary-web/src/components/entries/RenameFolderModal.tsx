"use client";

import { useEffect, useState } from "react";
import { Button, ButtonTransparent, Heading, Input, Stack, Text } from "@madecki/ui";
import type { BrowseFolderItem } from "@diary/shared";

interface RenameFolderModalProps {
  folder: BrowseFolderItem | null;
  onConfirm: (newName: string) => Promise<void>;
  onCancel: () => void;
}

export function RenameFolderModal({
  folder,
  onConfirm,
  onCancel,
}: RenameFolderModalProps) {
  const [name, setName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setError(null);
    }
  }, [folder]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!folder) return;
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [folder, onCancel]);

  if (!folder) return null;

  async function handleRename() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Folder name cannot be empty");
      return;
    }
    setIsBusy(true);
    setError(null);
    try {
      await onConfirm(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename folder");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-sm bg-darkgray border border-gray/50 p-7">
        <Stack direction="vertical" gap="6">
          <Heading level={2} size="lg" weight="semibold">
            Rename folder
          </Heading>

          <Input
            name="folderName"
            label="New name"
            placeholder="folder-name"
            type="text"
            variant="secondary"
            onChange={setName}
            defaultValue={name}
          />

          {error && (
            <Text size="sm" color="danger">
              {error}
            </Text>
          )}

          <Stack direction="horizontal" gap="3" justify="end">
            <ButtonTransparent
              variant="neutral"
              onClick={onCancel}
              disabled={isBusy}
              type="button"
            >
              Cancel
            </ButtonTransparent>
            <Button
              variant="info"
              onClick={handleRename}
              disabled={isBusy}
              type="button"
            >
              {isBusy ? "Renaming…" : "Rename"}
            </Button>
          </Stack>
        </Stack>
      </div>
    </div>
  );
}
