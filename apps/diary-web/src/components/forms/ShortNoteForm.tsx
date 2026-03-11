"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import {
  createNote,
  updateEntry,
  deleteEntry,
  fetchNoteFolders,
  createNoteFolder,
} from "@/lib/api";
import { todayLocalDate } from "@/lib/utils";
import { EditorWrapper } from "@/components/editor/EditorWrapper";
import { SuccessToast } from "./SuccessToast";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

interface NoteFormProps {
  entry?: EntryResponse;
  initialFolderPath?: string | null;
}

export function NoteForm({ entry, initialFolderPath = null }: NoteFormProps) {
  const router = useRouter();
  const isEdit = !!entry;

  const [title, setTitle] = useState(entry?.title ?? "");
  const [selectedFolderPath, setSelectedFolderPath] = useState(
    entry?.noteFolderPath ?? "",
  );
  const [newFolderName, setNewFolderName] = useState("");
  const [folders, setFolders] = useState<{ id: string; path: string }[]>([]);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const editorBlocks = useRef<Block[]>([]);
  const editorPlainText = useRef<string>("");
  const editorWordCount = useRef<number>(0);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const loadFolders = useCallback(async () => {
    try {
      const rows = await fetchNoteFolders();
      setFolders(rows.map((f) => ({ id: f.id, path: f.path })));
      setFoldersError(null);
    } catch {
      setFoldersError("Could not load folders");
    }
  }, []);

  useEffect(() => {
    if (isEdit) loadFolders();
  }, [isEdit, loadFolders]);

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
          folderPath: selectedFolderPath || null,
        });
      } else {
        await createNote({
          title: title || undefined,
          contentJson: { blocks: contentJson } as Record<string, unknown>,
          plainText,
          wordCount,
          folderPath: initialFolderPath ?? undefined,
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
              {isEdit ? "Edit Note" : "New Note"}
            </Heading>
            <Text color="muted" size="sm">
              {isEdit ? "Update your note" : "Capture your thoughts"}
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

            {!isEdit && initialFolderPath && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-info/10 border border-info/30">
                <Text size="sm" color="muted">Saving in:</Text>
                <Text size="sm" weight="semibold">{initialFolderPath}</Text>
              </div>
            )}

            {isEdit && (
              <div className="flex flex-col gap-2">
                <Text size="sm" weight="semibold">
                  Folder
                </Text>
                <div className="flex items-center gap-2 flex-wrap">
                  <ButtonTransparent
                    variant={selectedFolderPath ? "neutral" : "info"}
                    onClick={() => setSelectedFolderPath("")}
                    type="button"
                  >
                    Root
                  </ButtonTransparent>
                  {folders.map((folder) => (
                    <ButtonTransparent
                      key={folder.id}
                      variant={selectedFolderPath === folder.path ? "info" : "neutral"}
                      onClick={() => setSelectedFolderPath(folder.path)}
                      type="button"
                    >
                      {renderFolderLabel(folder.path)}
                    </ButtonTransparent>
                  ))}
                </div>
                <Text size="xs" color="muted">
                  Selected: {selectedFolderPath || "Root"}
                </Text>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      name="newFolderName"
                      label="New folder name"
                      placeholder="another folder with space"
                      type="text"
                      variant="secondary"
                      onChange={setNewFolderName}
                      defaultValue={newFolderName}
                    />
                  </div>
                  <ButtonTransparent
                    variant="info"
                    type="button"
                    disabled={isCreatingFolder}
                    onClick={async () => {
                      const folderName = newFolderName.trim();
                      if (!folderName) return;
                      const path = selectedFolderPath
                        ? `${selectedFolderPath}/${folderName}`
                        : folderName;
                      setIsCreatingFolder(true);
                      try {
                        const created = await createNoteFolder({ path });
                        setSelectedFolderPath(created.path);
                        setNewFolderName("");
                        await loadFolders();
                      } catch {
                        setFoldersError("Could not create folder");
                      } finally {
                        setIsCreatingFolder(false);
                      }
                    }}
                  >
                    {isCreatingFolder ? "Creating…" : "Create subfolder"}
                  </ButtonTransparent>
                </div>
                {foldersError && (
                  <Text size="xs" color="danger">
                    {foldersError}
                  </Text>
                )}
              </div>
            )}

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

function renderFolderLabel(path: string): string {
  const parts = path.split("/");
  const name = parts[parts.length - 1] ?? path;
  const depth = Math.max(0, parts.length - 1);
  return `${"· ".repeat(depth)}${name}`;
}
