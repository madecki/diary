import { REF_TYPE_TAG_VARIANT } from "@/lib/ref-type-tag-variant";
import {
  firstSentenceTitle,
  formatDateTime,
  moodColor,
  moodLabel,
  splitFirstSentence,
  truncate,
} from "@/lib/utils";
import type { EntryResponse, RefType } from "@diary/shared";
import { Heading, Stack, Tag, Text } from "@madecki/ui";
import Link from "next/link";

interface EntryCardProps {
  entry: EntryResponse;
  /** Current catalog label → type; used to color emotion chips like the check-in form. */
  emotionTypeByLabel?: Partial<Record<string, RefType>>;
  triggerTypeByLabel?: Partial<Record<string, RefType>>;
}

function checkinTitle(entry: EntryResponse): string | null {
  if (entry.checkInType === "morning") {
    return entry.whatImGratefulFor.find((s) => s.trim()) ?? null;
  }
  if (entry.checkInType === "evening") {
    return entry.highlightsOfTheDay.find((s) => s.trim()) ?? null;
  }
  const note = entry.plainText?.trim();
  if (!note) return null;
  const titled = firstSentenceTitle(note);
  return titled.length > 0 ? titled : null;
}

function checkinPreview(entry: EntryResponse): string | null {
  if (entry.checkInType === "morning") {
    return entry.dailyAffirmation ?? null;
  }
  if (entry.checkInType === "evening") {
    return entry.whatDidILearnToday ?? null;
  }
  const note = entry.plainText?.trim();
  if (!note) return null;
  const { tail } = splitFirstSentence(note);
  return tail ? truncate(tail, 150) : null;
}

function moodTagVariant(mood: number): "success" | "danger" | "warning" | "info" {
  const c = moodColor(mood);
  if (c === "success") return "success";
  if (c === "danger") return "danger";
  if (c === "warning") return "warning";
  return "info";
}

export function EntryCard({
  entry,
  emotionTypeByLabel,
  triggerTypeByLabel,
}: EntryCardProps) {
  const isCheckin = entry.type === "checkin";
  const dateTime = formatDateTime(entry.localDateTime);

  const title = isCheckin ? checkinTitle(entry) : entry.title;
  const preview = isCheckin ? checkinPreview(entry) : truncate(entry.plainText ?? "", 150);

  return (
    <Link href={`/entries/${entry.id}`} className="block group">
      <div className="bg-darkgray rounded-sm p-6 border border-gray/30 transition-colors hover:border-lightgray/50 hover:bg-gray/20">
        <Stack direction="vertical" gap="4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <Stack direction="vertical" gap="2">
              {/* Type + mood + check-in variant badges */}
              <div className="flex items-center gap-3 flex-wrap">
                {!isCheckin && entry.noteFolderPath && (
                  <Tag variant="primary" size="xs" muted label={entry.noteFolderPath} />
                )}

                {isCheckin && entry.mood !== null && entry.mood !== undefined && (
                  <Tag variant={moodTagVariant(entry.mood)} size="xs">
                    <span className="inline-flex items-center gap-1">
                      <span>Mood {entry.mood}/10</span>
                      <span className="opacity-70">{moodLabel(entry.mood)}</span>
                    </span>
                  </Tag>
                )}

                {isCheckin && entry.checkInType && (
                  <Tag
                    variant="primary"
                    size="xs"
                    muted
                    label={
                      entry.checkInType === "morning"
                        ? "🌅 Morning"
                        : entry.checkInType === "evening"
                          ? "🌙 Evening"
                          : "📝 Basic"
                    }
                  />
                )}
              </div>

              {/* Title */}
              {title && (
                <Heading level={3} size="md" weight="semibold">
                  {title}
                </Heading>
              )}
            </Stack>

            {/* Date & time — suppressHydrationWarning because locale formatting differs between server and client */}
            <Text size="sm" color="muted" className="shrink-0 mt-1">
              <span suppressHydrationWarning>{dateTime}</span>
            </Text>
          </div>

          {/* Preview text */}
          {preview && (
            <Text size="sm" color="muted" className="leading-relaxed">
              {preview}
            </Text>
          )}

          {/* Emotions + triggers tags for check-ins */}
          {isCheckin &&
            ((entry.emotions?.length ?? 0) > 0 || (entry.triggers?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-2">
                {entry.emotions?.map((emotion) => {
                  const refType = emotionTypeByLabel?.[emotion];
                  return (
                    <Tag
                      key={emotion}
                      variant={refType ? REF_TYPE_TAG_VARIANT[refType] : "info"}
                      size="xs"
                      muted={!refType}
                      label={emotion}
                    />
                  );
                })}
                {entry.triggers?.map((trigger) => {
                  const refType = triggerTypeByLabel?.[trigger];
                  return (
                    <Tag
                      key={trigger}
                      variant={refType ? REF_TYPE_TAG_VARIANT[refType] : "primary"}
                      size="xs"
                      muted={!refType}
                      label={trigger}
                    />
                  );
                })}
              </div>
            )}
        </Stack>
      </div>
    </Link>
  );
}
