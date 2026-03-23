"use client";

import { Button, ButtonTransparent, Heading, Input, Stack, Text } from "@madecki/ui";
import { useEffect, useState } from "react";

interface CreateFolderModalProps {
  isOpen: boolean;
  parentPath: string | null;
  onConfirm: (name: string) => Promise<void>;
  onCancel: () => void;
}

export function CreateFolderModal({
  isOpen,
  parentPath,
  onConfirm,
  onCancel,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  async function handleCreate() {
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
      setError(err instanceof Error ? err.message : "Failed to create folder");
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
          <Stack direction="vertical" gap="2">
            <Heading level={2} size="lg" weight="semibold">
              Create folder
            </Heading>
            {parentPath && (
              <Text size="sm" color="muted">
                Inside: {parentPath}
              </Text>
            )}
          </Stack>

          <Input
            name="folderName"
            label="Folder name"
            placeholder="my-folder"
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
            <ButtonTransparent variant="neutral" onClick={onCancel} disabled={isBusy} type="button">
              Cancel
            </ButtonTransparent>
            <Button variant="info" onClick={handleCreate} disabled={isBusy} type="button">
              {isBusy ? "Creating…" : "Create"}
            </Button>
          </Stack>
        </Stack>
      </div>
    </div>
  );
}
