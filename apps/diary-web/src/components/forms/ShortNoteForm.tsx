"use client";

import { useState, useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import type { Block } from "@blocknote/core";
import {
  Container,
  Stack,
  Heading,
  Text,
  Button,
  ButtonTransparent,
  GradientButton,
  Input,
  Hr,
} from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";
import { createShortNote, updateEntry, deleteEntry } from "@/lib/api";
import { todayLocalDate } from "@/lib/utils";
import { EditorWrapper } from "@/components/editor/EditorWrapper";
import { SuccessToast } from "./SuccessToast";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface ShortNoteFormProps {
  entry?: EntryResponse;
}

export function ShortNoteForm({ entry }: ShortNoteFormProps) {
  const router = useRouter();
  const isEdit = !!entry;

  const [title, setTitle] = useState(entry?.title ?? "");

  const editorBlocks = useRef<Block[]>([]);
  const editorPlainText = useRef<string>("");
  const editorWordCount = useRef<number>(0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleEditorChange = useCallback(
    (blocks: Block[], plainText: string, wordCount: number) => {
      editorBlocks.current = blocks;
      editorPlainText.current = plainText;
      editorWordCount.current = wordCount;
      if (errors["content"] && plainText.trim()) {
        setErrors((e) => ({ ...e, content: "" }));
      }
    },
    [errors],
  );

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (title.length > 200) {
      newErrors["title"] = "Title must be 200 characters or less";
    }

    if (!editorPlainText.current.trim() && !entry?.contentJson) {
      newErrors["content"] = "Please write something";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    flushSync(() => setIsSaving(true));

    try {
      const contentJson =
        editorBlocks.current.length > 0
          ? (editorBlocks.current as unknown as Record<string, unknown>[])
          : (entry?.contentJson as Record<string, unknown>[] | undefined) ?? [];

      const plainText = editorPlainText.current || entry?.plainText || "";
      const wordCount = editorWordCount.current || entry?.wordCount || 0;

      if (isEdit && entry) {
        await updateEntry(entry.id, {
          title: title || undefined,
          contentJson: { blocks: contentJson } as Record<string, unknown>,
          plainText,
          wordCount,
        });
      } else {
        await createShortNote({
          title: title || undefined,
          contentJson: { blocks: contentJson } as Record<string, unknown>,
          plainText,
          wordCount,
          localDate: todayLocalDate(),
        });
      }

      setShowSuccess(true);
      setTimeout(() => router.push("/"), 1200);
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error ? err.message : "Failed to save. Try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <Stack direction="vertical" gap="2">
            <Heading level={1} size="2xl" weight="bold">
              {isEdit ? "Edit Note" : "New Short Note"}
            </Heading>
            <Text color="muted" size="sm">
              {isEdit ? "Update your note" : "Capture a quick thought"}
            </Text>
          </Stack>

          <ButtonTransparent
            variant="neutral"
            onClick={() => router.back()}
            type="button"
          >
            ← Back
          </ButtonTransparent>
        </div>

        {/* Form */}
        <div className="bg-darkgray rounded-sm border border-gray/30 p-6 sm:p-8">
          <Stack direction="vertical" gap="8">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Input
                name="title"
                label="Title (optional)"
                placeholder="Give your note a title…"
                type="text"
                variant="secondary"
                onChange={setTitle}
                defaultValue={title}
              />
              {errors["title"] && (
                <Text size="sm" color="danger">
                  {errors["title"]}
                </Text>
              )}
            </div>

            <Hr />

            {/* Content editor */}
            <EditorWrapper
              label="Content"
              initialContent={
                entry?.contentJson
                  ? extractBlocks(entry.contentJson)
                  : undefined
              }
              onChange={handleEditorChange}
              error={errors["content"]}
            />

            {/* Submit error */}
            {errors["submit"] && (
              <Text size="sm" color="danger">
                {errors["submit"]}
              </Text>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div>
                {isEdit && (
                  <Button
                    variant="danger"
                    size="md"
                    onClick={() => setShowDeleteModal(true)}
                    type="button"
                  >
                    Delete
                  </Button>
                )}
              </div>

              <Stack direction="horizontal" gap="3">
                <ButtonTransparent
                  variant="neutral"
                  onClick={() => router.back()}
                  disabled={isSaving}
                  type="button"
                >
                  Cancel
                </ButtonTransparent>
                <GradientButton
                  onClick={handleSave}
                  disabled={isSaving}
                  type="button"
                >
                  {isSaving ? "Saving…" : isEdit ? "Save changes" : "Save"}
                </GradientButton>
              </Stack>
            </div>
          </Stack>
        </div>
      </Stack>

      {showSuccess && (
        <SuccessToast
          message={isEdit ? "Note updated!" : "Note saved!"}
          onDismiss={() => setShowSuccess(false)}
        />
      )}

      {isEdit && entry && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            await deleteEntry(entry.id);
            setShowDeleteModal(false);
            router.push("/");
          }}
        />
      )}
    </Container>
  );
}

function extractBlocks(contentJson: unknown): unknown[] {
  if (!contentJson || typeof contentJson !== "object") return [];
  const obj = contentJson as Record<string, unknown>;
  if (Array.isArray(obj)) return obj;
  if (Array.isArray(obj["blocks"])) return obj["blocks"] as unknown[];
  return [];
}
