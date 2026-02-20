"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Stack,
  Heading,
  Button,
  ButtonTransparent,
  ContentBox,
  Text,
} from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";
import { Editor, type EditorData } from "./Editor";
import { createShortNote, updateEntry } from "@/lib/api";

interface ShortNoteFormProps {
  entry?: EntryResponse;
}

export function ShortNoteForm({ entry }: ShortNoteFormProps) {
  const router = useRouter();
  const editing = !!entry;

  const [title, setTitle] = useState(entry?.title ?? "");
  const [editorData, setEditorData] = useState<EditorData | null>(
    entry
      ? {
          contentJson: entry.contentJson as Record<string, unknown>,
          plainText: entry.plainText,
          wordCount: entry.wordCount,
        }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!editorData) {
      setError("Write something before saving");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        contentJson: editorData.contentJson,
        plainText: editorData.plainText,
        wordCount: editorData.wordCount,
        title: title.trim() || undefined,
      };

      if (editing) {
        await updateEntry(entry.id, payload);
      } else {
        await createShortNote(payload);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container size="md">
      <Stack gap="7">
        <Stack direction="horizontal" justify="between" align="center">
          <Heading level={1} size="2xl" weight="bold">
            {editing ? "Edit Note" : "New Note"}
          </Heading>
          <ButtonTransparent variant="neutral" onClick={() => router.push("/")}>
            Back
          </ButtonTransparent>
        </Stack>

        {error && (
          <ContentBox variant="danger">
            <Text>{error}</Text>
          </ContentBox>
        )}

        <Stack gap="2">
          <Text as="label" size="sm" weight="medium">
            Title (optional)
          </Text>
          <input
            name="title"
            placeholder="Give your note a title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-darkgray border border-gray rounded-sm px-4 py-3 text-offwhite text-sm placeholder:text-lightgray focus:outline-none focus:border-blue transition-colors w-full"
          />
        </Stack>

        <Stack gap="2">
          <Text as="label" size="sm" weight="medium">
            Content
          </Text>
          <Editor
            initialContent={
              entry
                ? (entry.contentJson as Record<string, unknown>)
                : undefined
            }
            onChange={setEditorData}
            placeholder="What's on your mind?"
          />
        </Stack>

        <Stack direction="horizontal" gap="3" justify="end">
          <ButtonTransparent variant="neutral" onClick={() => router.push("/")} disabled={submitting}>
            Cancel
          </ButtonTransparent>
          <Button variant="neutral" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save Changes" : "Save Note"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
