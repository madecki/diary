"use client";

import { Button, ButtonTransparent, Heading, Stack, Text } from "@madecki/ui";
import { useEffect } from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm rounded-sm bg-darkgray border border-gray/50 p-7">
        <Stack direction="vertical" gap="6">
          <Stack direction="vertical" gap="3">
            <Heading level={2} size="lg" weight="semibold">
              Delete entry?
            </Heading>
            <Text color="muted" size="sm">
              This action cannot be undone. The entry will be permanently deleted.
            </Text>
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
            <Button variant="danger" onClick={onConfirm} disabled={isDeleting} type="button">
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </Stack>
        </Stack>
      </div>
    </div>
  );
}
