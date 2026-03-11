"use client";

import { useEffect } from "react";
import { Button, ButtonTransparent, Heading, Text, Stack } from "@madecki/ui";
import type { BrowseFolderItem } from "@diary/shared";

interface DeleteFolderModalProps {
  folder: BrowseFolderItem | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteFolderModal({
  folder,
  isDeleting = false,
  onConfirm,
  onCancel,
}: DeleteFolderModalProps) {
  const isOpen = folder !== null;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!folder) return null;

  const hasChildren = folder.notesCount > 0 || folder.foldersCount > 0;

  const contentSummary = [
    folder.foldersCount > 0
      ? `${folder.foldersCount} ${folder.foldersCount === 1 ? "sub-folder" : "sub-folders"}`
      : null,
    folder.notesCount > 0
      ? `${folder.notesCount} ${folder.notesCount === 1 ? "note" : "notes"}`
      : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm rounded-sm bg-darkgray border border-gray/50 p-7">
        <Stack direction="vertical" gap="6">
          <Stack direction="vertical" gap="3">
            <Heading level={2} size="lg" weight="semibold">
              Remove &quot;{folder.name}&quot;?
            </Heading>
            {hasChildren ? (
              <Stack direction="vertical" gap="2">
                <Text color="warning" size="sm" weight="semibold">
                  This folder contains {contentSummary}.
                </Text>
                <Text color="muted" size="sm">
                  All sub-folders will be removed. Notes inside will be moved to the root level.
                </Text>
              </Stack>
            ) : (
              <Text color="muted" size="sm">
                This folder is empty and will be permanently removed.
              </Text>
            )}
          </Stack>

          <Stack direction="horizontal" gap="3" justify="end">
            <ButtonTransparent
              variant="neutral"
              onClick={onCancel}
              disabled={isDeleting}
              type="button"
            >
              Cancel
            </ButtonTransparent>
            <Button
              variant="danger"
              onClick={onConfirm}
              disabled={isDeleting}
              type="button"
            >
              {isDeleting ? "Removing…" : "Remove"}
            </Button>
          </Stack>
        </Stack>
      </div>
    </div>
  );
}
