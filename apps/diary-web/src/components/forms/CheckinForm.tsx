"use client";

import { EditorWrapper } from "@/components/editor/EditorWrapper";
import {
  createCheckin,
  createEmotion,
  createTrigger,
  deleteEntry,
  fetchEmotions,
  fetchTriggers,
  updateEntry,
} from "@/lib/api";
import { markDiaryInsightsRegenerationPending } from "@/lib/insight-regeneration-flag";
import { extractBlocks, todayLocalDateTime } from "@/lib/utils";
import type { Block } from "@blocknote/core";
import type {
  CreateCheckinInput,
  EmotionResponse,
  EntryResponse,
  TriggerResponse,
  UpdateCheckinInput,
} from "@diary/shared";
import {
  Button,
  ButtonTransparent,
  Container,
  GradientButton,
  Heading,
  Hr,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
} from "@madecki/ui";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AddEmotionTriggerForm } from "./AddEmotionTriggerForm";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { MoodPicker } from "./MoodPicker";
import { OptionTagPicker } from "./OptionTagPicker";

// ── Helpers ─────────────────────────────────────────────────────────

type Triple = [string, string, string];

function toTriple(arr: string[] | undefined | null): Triple {
  return [arr?.[0] ?? "", arr?.[1] ?? "", arr?.[2] ?? ""];
}

function defaultCheckInType(): "morning" | "evening" {
  return new Date().getHours() < 15 ? "morning" : "evening";
}

// ── Add emotion/trigger modal ───────────────────────────────────────

interface AddEmotionTriggerModalProps {
  kind: "emotion" | "trigger";
  onClose: () => void;
  onAdd: (label: string, type: "difficult" | "neutral" | "pleasant") => Promise<void>;
}

function AddEmotionTriggerModal({ kind, onClose, onAdd }: AddEmotionTriggerModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-sm bg-darkgray border border-gray/50 p-7">
        <AddEmotionTriggerForm kind={kind} onAdd={onAdd} onCancel={onClose} />
      </div>
    </div>
  );
}

// ── ThreeInputs ──────────────────────────────────────────────────────

interface ThreeInputsProps {
  label: string;
  values: Triple;
  onChange: (values: Triple) => void;
  placeholders: Triple;
  error?: string;
  disabled?: boolean;
}

function ThreeInputs({ label, values, onChange, placeholders, error, disabled }: ThreeInputsProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-icongray">
        {label} <span className="text-xs text-lightgray">(min. 1 required)</span>
      </label>
      <div className="flex flex-col gap-2">
        {([0, 1, 2] as const).map((i) => (
          <input
            key={i}
            type="text"
            value={values[i]}
            placeholder={placeholders[i]}
            disabled={disabled}
            onChange={(e) => {
              const next = [...values] as Triple;
              next[i] = e.target.value;
              onChange(next);
            }}
            className="w-full bg-gray/30 border border-gray/50 rounded-sm px-3 py-2 text-sm text-white placeholder:text-lightgray focus:outline-none focus:border-lightgray/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        ))}
      </div>
      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}
    </div>
  );
}

// ── CheckinForm ──────────────────────────────────────────────────────

interface CheckinFormProps {
  entry?: EntryResponse;
}

export function CheckinForm({ entry }: CheckinFormProps) {
  const router = useRouter();
  const isEdit = !!entry;

  // Mood + emotions + triggers
  const [mood, setMood] = useState<number | null>(entry?.mood ?? null);
  const [emotions, setEmotions] = useState<string[]>(entry?.emotions ?? []);
  const [triggers, setTriggers] = useState<string[]>(entry?.triggers ?? []);

  const [emotionOptions, setEmotionOptions] = useState<EmotionResponse[]>([]);
  const [triggerOptions, setTriggerOptions] = useState<TriggerResponse[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Check-in type
  const [checkInType, setCheckInType] = useState<"morning" | "evening" | "basic">(
    entry?.checkInType ?? defaultCheckInType(),
  );
  const [sectionKey, setSectionKey] = useState(0);

  // Morning fields
  const [whatImGratefulFor, setWhatImGratefulFor] = useState<Triple>(
    toTriple(entry?.whatImGratefulFor),
  );
  const [whatWouldMakeDayGreat, setWhatWouldMakeDayGreat] = useState<Triple>(
    toTriple(entry?.whatWouldMakeDayGreat),
  );
  const [dailyAffirmation, setDailyAffirmation] = useState(entry?.dailyAffirmation ?? "");

  // Evening fields
  const [highlightsOfTheDay, setHighlightsOfTheDay] = useState<Triple>(
    toTriple(entry?.highlightsOfTheDay),
  );
  const [whatDidILearnToday, setWhatDidILearnToday] = useState(entry?.whatDidILearnToday ?? "");

  const [dateTime, setDateTime] = useState<string>(entry?.localDateTime ?? todayLocalDateTime());

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addModal, setAddModal] = useState<"emotion" | "trigger" | null>(null);

  const noteEditorBlocks = useRef<Block[]>([]);
  const noteEditorPlainText = useRef("");
  const noteEditorWordCount = useRef(0);
  /** Without this, clearing the editor still falls back to `entry.plainText` on save. */
  const noteEditorDirty = useRef(false);

  const handleNoteEditorChange = useCallback(
    (blocks: Block[], plainText: string, wordCount: number) => {
      noteEditorDirty.current = true;
      noteEditorBlocks.current = blocks;
      noteEditorPlainText.current = plainText;
      noteEditorWordCount.current = wordCount;
      if (errors["note"] && plainText.trim()) {
        setErrors((e) => ({ ...e, note: "" }));
      }
    },
    [errors],
  );

  const loadEmotionsAndTriggers = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const [emos, trigs] = await Promise.all([fetchEmotions(), fetchTriggers()]);
      setEmotionOptions(emos);
      setTriggerOptions(trigs);
    } catch {
      // options unavailable — fields remain empty
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEmotionsAndTriggers();
  }, [loadEmotionsAndTriggers]);

  function handleTypeChange(newType: "morning" | "evening" | "basic") {
    if (newType === checkInType) return;
    setCheckInType(newType);
    setSectionKey((k) => k + 1);
    setWhatImGratefulFor(["", "", ""]);
    setWhatWouldMakeDayGreat(["", "", ""]);
    setDailyAffirmation("");
    setHighlightsOfTheDay(["", "", ""]);
    setWhatDidILearnToday("");
    setErrors({});
  }

  const handleEditorEmotionsChange = useCallback(
    (val: string[]) => {
      setEmotions(val);
      if (errors["emotions"]) setErrors((e) => ({ ...e, emotions: "" }));
    },
    [errors],
  );

  const handleEditorTriggersChange = useCallback(
    (val: string[]) => {
      setTriggers(val);
      if (errors["triggers"]) setErrors((e) => ({ ...e, triggers: "" }));
    },
    [errors],
  );

  async function handleAddEmotion(label: string, type: "difficult" | "neutral" | "pleasant") {
    await createEmotion({ label, type });
    await loadEmotionsAndTriggers();
    setAddModal(null);
    setEmotions((prev) => (prev.length < 5 ? [...prev, label] : prev));
    setErrors((e) => (e["emotions"] ? { ...e, emotions: "" } : e));
  }

  async function handleAddTrigger(label: string, type: "difficult" | "neutral" | "pleasant") {
    await createTrigger({ label, type });
    await loadEmotionsAndTriggers();
    setAddModal(null);
    setTriggers((prev) => (prev.length < 5 ? [...prev, label] : prev));
    setErrors((e) => (e["triggers"] ? { ...e, triggers: "" } : e));
  }

  /** For POST /checkins — never sends a null triple (omit fields instead). */
  function buildCheckinNotePayloadForCreate():
    | { contentJson: Record<string, unknown>; plainText: string; wordCount: number }
    | Record<string, never> {
    if (!noteEditorDirty.current) {
      return {};
    }

    const fromEditorPlain = noteEditorPlainText.current.trim();
    const blockArray =
      noteEditorBlocks.current.length > 0
        ? noteEditorBlocks.current
        : (extractBlocks(entry?.contentJson) as Block[]);

    if (fromEditorPlain.length > 0) {
      const wc =
        noteEditorWordCount.current > 0
          ? noteEditorWordCount.current
          : fromEditorPlain.split(/\s+/).filter(Boolean).length || entry?.wordCount || 0;
      return {
        contentJson: { blocks: blockArray as unknown[] } as Record<string, unknown>,
        plainText: fromEditorPlain,
        wordCount: wc,
      };
    }

    return {};
  }

  /** For PATCH — may send null triple to clear an existing note. */
  function buildCheckinNotePayloadForUpdate():
    | { contentJson: Record<string, unknown>; plainText: string; wordCount: number }
    | { contentJson: null; plainText: null; wordCount: null }
    | Record<string, never> {
    const hasStoredNote = !!entry?.plainText?.trim();

    if (!noteEditorDirty.current) {
      return {};
    }

    const fromEditorPlain = noteEditorPlainText.current.trim();
    const blockArray =
      noteEditorBlocks.current.length > 0
        ? noteEditorBlocks.current
        : (extractBlocks(entry?.contentJson) as Block[]);

    if (fromEditorPlain.length > 0) {
      const wc =
        noteEditorWordCount.current > 0
          ? noteEditorWordCount.current
          : fromEditorPlain.split(/\s+/).filter(Boolean).length || entry?.wordCount || 0;
      return {
        contentJson: { blocks: blockArray as unknown[] } as Record<string, unknown>,
        plainText: fromEditorPlain,
        wordCount: wc,
      };
    }

    if (isEdit && hasStoredNote && entry?.checkInType !== "basic") {
      return { contentJson: null, plainText: null, wordCount: null };
    }

    return {};
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const atLeastOne = (arr: string[]) => arr.some((s) => s.trim().length > 0);

    if (mood === null) newErrors["mood"] = "Mood is required";
    if (emotions.length === 0) newErrors["emotions"] = "Add at least one emotion";
    if (triggers.length === 0) newErrors["triggers"] = "Add at least one trigger";

    if (checkInType === "morning") {
      if (!atLeastOne(whatImGratefulFor))
        newErrors["whatImGratefulFor"] = "Enter at least one item";
      if (!atLeastOne(whatWouldMakeDayGreat))
        newErrors["whatWouldMakeDayGreat"] = "Enter at least one item";
      if (!dailyAffirmation.trim()) newErrors["dailyAffirmation"] = "Daily affirmation is required";
    } else if (checkInType === "evening") {
      if (!atLeastOne(highlightsOfTheDay))
        newErrors["highlightsOfTheDay"] = "Enter at least one item";
      if (!whatDidILearnToday.trim()) newErrors["whatDidILearnToday"] = "This field is required";
    } else if (checkInType === "basic") {
      const noteText = noteEditorDirty.current
        ? noteEditorPlainText.current.trim()
        : (entry?.plainText ?? "").trim();
      if (!noteText) {
        newErrors["note"] = "Note is required for basic check-ins";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    flushSync(() => setIsSaving(true));

    try {
      if (isEdit && entry) {
        const noteExtra = buildCheckinNotePayloadForUpdate();
        const common = {
          mood: mood!,
          emotions,
          triggers,
          ...noteExtra,
        };
        if (checkInType === "morning") {
          const body: UpdateCheckinInput = {
            ...common,
            checkInType: "morning",
            whatImGratefulFor: [...whatImGratefulFor],
            whatWouldMakeDayGreat: [...whatWouldMakeDayGreat],
            dailyAffirmation: dailyAffirmation.trim(),
            localDateTime: dateTime,
          };
          await updateEntry(entry.id, body);
        } else if (checkInType === "evening") {
          const body: UpdateCheckinInput = {
            ...common,
            checkInType: "evening",
            highlightsOfTheDay: [...highlightsOfTheDay],
            whatDidILearnToday: whatDidILearnToday.trim(),
            localDateTime: dateTime,
          };
          await updateEntry(entry.id, body);
        } else {
          const body: UpdateCheckinInput = {
            ...common,
            checkInType: "basic",
            localDateTime: dateTime,
          };
          await updateEntry(entry.id, body);
        }
      } else {
        const noteExtra = buildCheckinNotePayloadForCreate();
        const common = {
          mood: mood!,
          emotions,
          triggers,
          ...noteExtra,
        };
        if (checkInType === "morning") {
          await createCheckin({
            ...common,
            checkInType: "morning",
            whatImGratefulFor: [...whatImGratefulFor],
            whatWouldMakeDayGreat: [...whatWouldMakeDayGreat],
            dailyAffirmation: dailyAffirmation.trim(),
            localDateTime: dateTime,
          });
        } else if (checkInType === "evening") {
          await createCheckin({
            ...common,
            checkInType: "evening",
            highlightsOfTheDay: [...highlightsOfTheDay],
            whatDidILearnToday: whatDidILearnToday.trim(),
            localDateTime: dateTime,
          });
        } else {
          await createCheckin({
            ...common,
            checkInType: "basic",
            localDateTime: dateTime,
          } as CreateCheckinInput);
        }
      }

      markDiaryInsightsRegenerationPending();
      router.push("/");
    } catch (err) {
      setIsSaving(false);
      setErrors({
        submit: err instanceof Error ? err.message : "Failed to save. Try again.",
      });
    }
  }

  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8">
        {/* Page header */}
        <div className="flex items-center justify-between gap-4">
          <Stack direction="vertical" gap="2">
            <Heading level={1} size="2xl" weight="bold">
              {isEdit ? "Edit Check-in" : "New Check-in"}
            </Heading>
            <Text color="muted" size="sm">
              {isEdit ? "Update your mood and reflections" : "How are you feeling today?"}
            </Text>
          </Stack>

          <ButtonTransparent
            variant="neutral"
            onClick={() => router.back()}
            disabled={isSaving}
            type="button"
          >
            ← Back
          </ButtonTransparent>
        </div>

        {/* Form */}
        <div className="bg-darkgray rounded-sm border border-gray/30 p-6 sm:p-8">
          <Stack direction="vertical" gap="8">
            {/* Date & time */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-icongray">Date & time</label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                disabled={isSaving}
                className="w-full bg-gray/30 border border-gray/50 rounded-sm px-3 py-2 text-sm text-white placeholder:text-lightgray focus:outline-none focus:border-lightgray/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Mood */}
            <MoodPicker
              value={mood}
              onChange={(val) => {
                setMood(val);
                if (errors["mood"]) setErrors((e) => ({ ...e, mood: "" }));
              }}
              error={errors["mood"]}
              disabled={isSaving}
            />

            <Hr />

            {/* Emotions */}
            <OptionTagPicker
              label="Emotions"
              options={emotionOptions}
              value={emotions}
              onChange={handleEditorEmotionsChange}
              maxTags={5}
              error={errors["emotions"]}
              isLoading={optionsLoading}
              mood={mood}
              disabled={isSaving}
              addNewLabel="Add emotion"
              onAddNew={() => setAddModal("emotion")}
            />

            {/* Triggers */}
            <OptionTagPicker
              label="Triggers"
              options={triggerOptions}
              value={triggers}
              onChange={handleEditorTriggersChange}
              maxTags={5}
              error={errors["triggers"]}
              isLoading={optionsLoading}
              mood={mood}
              disabled={isSaving}
              addNewLabel="Add trigger"
              onAddNew={() => setAddModal("trigger")}
            />

            <Hr />

            <Select
              name="checkInType"
              label="Check-in type"
              testId="checkin-type"
              variant="secondary"
              options={[
                { value: "morning", label: "🌅 Morning" },
                { value: "evening", label: "🌙 Evening" },
                { value: "basic", label: "📝 Basic" },
              ]}
              value={checkInType}
              onChange={(v) => handleTypeChange(v as "morning" | "evening" | "basic")}
              disabled={isSaving}
            />

            {(checkInType === "morning" || checkInType === "evening") && (
              <>
                <Hr />

                {/* Morning fields */}
                {checkInType === "morning" && (
                  <div key={`morning-${sectionKey}`} className="flex flex-col gap-6">
                    <ThreeInputs
                      label="What are you grateful for?"
                      values={whatImGratefulFor}
                      onChange={(v) => {
                        setWhatImGratefulFor(v);
                        if (errors["whatImGratefulFor"])
                          setErrors((e) => ({ ...e, whatImGratefulFor: "" }));
                      }}
                      placeholders={["First thing…", "Second thing…", "Third thing…"]}
                      error={errors["whatImGratefulFor"]}
                      disabled={isSaving}
                    />

                    <ThreeInputs
                      label="What would make today great?"
                      values={whatWouldMakeDayGreat}
                      onChange={(v) => {
                        setWhatWouldMakeDayGreat(v);
                        if (errors["whatWouldMakeDayGreat"])
                          setErrors((e) => ({ ...e, whatWouldMakeDayGreat: "" }));
                      }}
                      placeholders={["First thing…", "Second thing…", "Third thing…"]}
                      error={errors["whatWouldMakeDayGreat"]}
                      disabled={isSaving}
                    />

                    <div className="flex flex-col gap-1">
                      <Input
                        name="dailyAffirmation"
                        label="Daily affirmation"
                        placeholder="I am…"
                        defaultValue={dailyAffirmation}
                        disabled={isSaving}
                        onChange={(v) => {
                          setDailyAffirmation(v);
                          if (errors["dailyAffirmation"])
                            setErrors((e) => ({ ...e, dailyAffirmation: "" }));
                        }}
                      />
                      {errors["dailyAffirmation"] && (
                        <Text size="sm" color="danger">
                          {errors["dailyAffirmation"]}
                        </Text>
                      )}
                    </div>
                  </div>
                )}

                {/* Evening fields */}
                {checkInType === "evening" && (
                  <div key={`evening-${sectionKey}`} className="flex flex-col gap-6">
                    <ThreeInputs
                      label="Highlights of the day"
                      values={highlightsOfTheDay}
                      onChange={(v) => {
                        setHighlightsOfTheDay(v);
                        if (errors["highlightsOfTheDay"])
                          setErrors((e) => ({ ...e, highlightsOfTheDay: "" }));
                      }}
                      placeholders={["First highlight…", "Second highlight…", "Third highlight…"]}
                      error={errors["highlightsOfTheDay"]}
                      disabled={isSaving}
                    />

                    <div className="flex flex-col gap-1">
                      <Input
                        name="whatDidILearnToday"
                        label="What did I learn today?"
                        placeholder="Today I learned…"
                        defaultValue={whatDidILearnToday}
                        disabled={isSaving}
                        onChange={(v) => {
                          setWhatDidILearnToday(v);
                          if (errors["whatDidILearnToday"])
                            setErrors((e) => ({ ...e, whatDidILearnToday: "" }));
                        }}
                      />
                      {errors["whatDidILearnToday"] && (
                        <Text size="sm" color="danger">
                          {errors["whatDidILearnToday"]}
                        </Text>
                      )}
                    </div>
                  </div>
                )}

                <Hr />
              </>
            )}

            {checkInType === "basic" && <Hr />}

            <EditorWrapper
              key={`checkin-note-${entry?.id ?? "new"}`}
              label={checkInType === "basic" ? "Note" : "Note (optional)"}
              initialContent={entry?.contentJson ? extractBlocks(entry.contentJson) : undefined}
              onChange={handleNoteEditorChange}
              editable={!isSaving}
              error={errors["note"]}
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
                    disabled={isSaving}
                    type="button"
                  >
                    Delete
                  </Button>
                )}
              </div>

              <Stack direction="horizontal" gap="3">
                <Button
                  variant="danger"
                  onClick={() => router.back()}
                  disabled={isSaving}
                  type="button"
                >
                  Cancel
                </Button>
                <GradientButton onClick={handleSave} disabled={isSaving} type="button">
                  {isSaving ? "Saving…" : isEdit ? "Save changes" : "Save"}
                </GradientButton>
              </Stack>
            </div>
          </Stack>
        </div>
      </Stack>

      {isSaving && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/85 backdrop-blur-sm px-6"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading"
        >
          <Stack direction="vertical" gap="6" align="center" className="max-w-md text-center">
            <Spinner size="lg" />
            <Heading level={2} size="lg" weight="semibold">
              Well done for showing up today.
            </Heading>
            <Text color="muted" size="md" className="leading-relaxed">
              Taking a moment to notice how you feel matters. We&apos;re saving your check-in now —
              breathe slowly; you&apos;ll be back to your diary in a second.
            </Text>
          </Stack>
        </div>
      )}

      {isEdit && entry && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            await deleteEntry(entry.id);
            setShowDeleteModal(false);
            markDiaryInsightsRegenerationPending();
            router.push("/");
          }}
        />
      )}

      {addModal !== null && (
        <AddEmotionTriggerModal
          kind={addModal}
          onClose={() => setAddModal(null)}
          onAdd={addModal === "emotion" ? handleAddEmotion : handleAddTrigger}
        />
      )}
    </Container>
  );
}
