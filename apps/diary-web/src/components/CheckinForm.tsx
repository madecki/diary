"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Stack,
  Heading,
  Text,
  Button,
  ButtonTransparent,
  ContentBox,
} from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";
import { Editor, type EditorData } from "./Editor";
import { MoodPicker } from "./MoodPicker";
import { TagInput } from "./TagInput";
import { createCheckin, updateEntry } from "@/lib/api";

interface CheckinFormProps {
  entry?: EntryResponse;
}

export function CheckinForm({ entry }: CheckinFormProps) {
  const router = useRouter();
  const editing = !!entry;

  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [emotions, setEmotions] = useState<string[]>(entry?.emotions ?? []);
  const [triggers, setTriggers] = useState<string[]>(entry?.triggers ?? []);
  const [timeOfDay, setTimeOfDay] = useState<
    "morning" | "evening" | undefined
  >(entry?.timeOfDay ?? undefined);
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
    if (!mood) {
      setError("Mood is required");
      return;
    }
    if (!editorData) {
      setError("Write something before saving");
      return;
    }
    if (emotions.length === 0) {
      setError("Add at least one emotion");
      return;
    }
    if (triggers.length === 0) {
      setError("Add at least one trigger");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        mood,
        contentJson: editorData.contentJson,
        plainText: editorData.plainText,
        wordCount: editorData.wordCount,
        emotions,
        triggers,
        timeOfDay: timeOfDay || undefined,
      };

      if (editing) {
        await updateEntry(entry.id, payload);
      } else {
        await createCheckin(payload);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function toggleTimeOfDay(value: "morning" | "evening") {
    setTimeOfDay((prev) => (prev === value ? undefined : value));
  }

  return (
    <Container size="md">
      <Stack gap="7">
        <Stack direction="horizontal" justify="between" align="center">
          <Heading level={1} size="2xl" weight="bold">
            {editing ? "Edit Check-in" : "New Check-in"}
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

        <MoodPicker value={mood} onChange={setMood} />

        <Stack gap="2">
          <Text as="label" size="sm" weight="medium">
            Entry
          </Text>
          <Editor
            initialContent={
              entry
                ? (entry.contentJson as Record<string, unknown>)
                : undefined
            }
            onChange={setEditorData}
            placeholder="How are you feeling? What's on your mind?"
          />
        </Stack>

        <TagInput
          label="Emotions (1–5)"
          tags={emotions}
          onChange={setEmotions}
          maxTags={5}
          placeholder="e.g. anxious, grateful, calm"
        />

        <TagInput
          label="Triggers (1–5)"
          tags={triggers}
          onChange={setTriggers}
          maxTags={5}
          placeholder="e.g. work, relationship, health"
        />

        <Stack gap="2">
          <Text as="label" size="sm" weight="medium">
            Time of Day (optional)
          </Text>
          <Stack direction="horizontal" gap="3">
            {(["morning", "evening"] as const).map((tod) => (
              <button
                key={tod}
                type="button"
                onClick={() => toggleTimeOfDay(tod)}
                className={`px-5 py-2 rounded-sm text-sm font-medium transition-colors capitalize ${
                  timeOfDay === tod
                    ? "bg-info text-offwhite"
                    : "bg-gray text-icongray hover:text-offwhite"
                }`}
              >
                {tod}
              </button>
            ))}
          </Stack>
        </Stack>

        <Stack direction="horizontal" gap="3" justify="end">
          <ButtonTransparent variant="neutral" onClick={() => router.push("/")} disabled={submitting}>
            Cancel
          </ButtonTransparent>
          <Button variant="neutral" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : editing ? "Save Changes" : "Save Check-in"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
