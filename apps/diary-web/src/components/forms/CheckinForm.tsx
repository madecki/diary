"use client";

import { useState, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Container,
  Stack,
  Heading,
  Text,
  Button,
  ButtonTransparent,
  GradientButton,
  Hr,
  Input,
  SpinnerOverlay,
} from "@madecki/ui";
import type { EntryResponse, EmotionResponse, TriggerResponse } from "@diary/shared";
import {
  createCheckin,
  updateEntry,
  deleteEntry,
  fetchEmotions,
  fetchTriggers,
} from "@/lib/api";
import { todayLocalDate } from "@/lib/utils";
import { MoodPicker } from "./MoodPicker";
import { OptionTagPicker } from "./OptionTagPicker";
import { SuccessToast } from "./SuccessToast";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

// ── Helpers ─────────────────────────────────────────────────────────

type Triple = [string, string, string];

function toTriple(arr: string[] | undefined | null): Triple {
  return [arr?.[0] ?? "", arr?.[1] ?? "", arr?.[2] ?? ""];
}

function defaultCheckInType(): "morning" | "evening" {
  return new Date().getHours() < 15 ? "morning" : "evening";
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
        {label}{" "}
        <span className="text-xs text-lightgray">(min. 1 required)</span>
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
  const [checkInType, setCheckInType] = useState<"morning" | "evening">(
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
  const [dailyAffirmation, setDailyAffirmation] = useState(
    entry?.dailyAffirmation ?? "",
  );

  // Evening fields
  const [highlightsOfTheDay, setHighlightsOfTheDay] = useState<Triple>(
    toTriple(entry?.highlightsOfTheDay),
  );
  const [whatDidILearnToday, setWhatDidILearnToday] = useState(
    entry?.whatDidILearnToday ?? "",
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    Promise.all([fetchEmotions(), fetchTriggers()])
      .then(([emos, trigs]) => {
        setEmotionOptions(emos);
        setTriggerOptions(trigs);
      })
      .catch(() => {
        // options unavailable — fields remain empty, user can still proceed
      })
      .finally(() => setOptionsLoading(false));
  }, []);

  function handleTypeChange(newType: "morning" | "evening") {
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
      if (!dailyAffirmation.trim())
        newErrors["dailyAffirmation"] = "Daily affirmation is required";
    } else {
      if (!atLeastOne(highlightsOfTheDay))
        newErrors["highlightsOfTheDay"] = "Enter at least one item";
      if (!whatDidILearnToday.trim())
        newErrors["whatDidILearnToday"] = "This field is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    flushSync(() => setIsSaving(true));

    try {
      const common = {
        mood: mood!,
        emotions,
        triggers,
      };

      if (isEdit && entry) {
        if (checkInType === "morning") {
          await updateEntry(entry.id, {
            ...common,
            checkInType: "morning",
            whatImGratefulFor,
            whatWouldMakeDayGreat,
            dailyAffirmation: dailyAffirmation.trim(),
          });
        } else {
          await updateEntry(entry.id, {
            ...common,
            checkInType: "evening",
            highlightsOfTheDay,
            whatDidILearnToday: whatDidILearnToday.trim(),
          });
        }
      } else {
        if (checkInType === "morning") {
          await createCheckin({
            ...common,
            checkInType: "morning",
            whatImGratefulFor,
            whatWouldMakeDayGreat,
            dailyAffirmation: dailyAffirmation.trim(),
            localDate: todayLocalDate(),
          });
        } else {
          await createCheckin({
            ...common,
            checkInType: "evening",
            highlightsOfTheDay,
            whatDidILearnToday: whatDidILearnToday.trim(),
            localDate: todayLocalDate(),
          });
        }
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
            />

            <Hr />

            {/* Morning / Evening toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-icongray">
                Check-in type
              </label>
              <div className="flex gap-3">
                <Button
                  id="type-morning"
                  variant="info"
                  size="sm"
                  isActive={checkInType === "morning"}
                  label="Morning"
                  type="button"
                  disabled={isSaving}
                  onClick={(_maybeId?: string) => handleTypeChange("morning")}
                />
                <Button
                  id="type-evening"
                  variant="info"
                  size="sm"
                  isActive={checkInType === "evening"}
                  label="Evening"
                  type="button"
                  disabled={isSaving}
                  onClick={(_maybeId?: string) => handleTypeChange("evening")}
                />
              </div>
            </div>

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
                  placeholders={[
                    "First highlight…",
                    "Second highlight…",
                    "Third highlight…",
                  ]}
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

      <SpinnerOverlay isVisible={isSaving} />

      {showSuccess && (
        <SuccessToast
          message={isEdit ? "Check-in updated!" : "Check-in saved!"}
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
