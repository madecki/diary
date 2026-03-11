import Link from "next/link";
import { Heading, Text, Stack } from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";
import { formatDate, truncate, moodLabel, moodColor } from "@/lib/utils";

interface EntryCardProps {
  entry: EntryResponse;
}

function checkinTitle(entry: EntryResponse): string | null {
  if (entry.checkInType === "morning") {
    return entry.whatImGratefulFor.find((s) => s.trim()) ?? null;
  }
  return entry.highlightsOfTheDay.find((s) => s.trim()) ?? null;
}

function checkinPreview(entry: EntryResponse): string | null {
  if (entry.checkInType === "morning") {
    return entry.dailyAffirmation ?? null;
  }
  return entry.whatDidILearnToday ?? null;
}

export function EntryCard({ entry }: EntryCardProps) {
  const isCheckin = entry.type === "checkin";
  const date = formatDate(entry.createdAt);

  const title = isCheckin ? checkinTitle(entry) : entry.title;
  const preview = isCheckin
    ? checkinPreview(entry)
    : truncate(entry.plainText ?? "", 150);

  return (
    <Link href={`/entries/${entry.id}`} className="block group">
      <div className="bg-darkgray rounded-sm p-6 border border-gray/30 transition-colors hover:border-lightgray/50 hover:bg-gray/20">
        <Stack direction="vertical" gap="4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <Stack direction="vertical" gap="2">
              {/* Type + mood + check-in variant badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center px-2 py-px rounded text-xs font-medium ${
                    isCheckin ? "bg-info/20 text-info" : "bg-blue/20 text-blue"
                  }`}
                >
                  {isCheckin ? "Check-in" : "Note"}
                </span>

                {!isCheckin && entry.noteFolderPath && (
                  <span className="inline-flex items-center px-2 py-px rounded text-xs font-medium bg-gray/40 text-icongray">
                    {entry.noteFolderPath}
                  </span>
                )}

                {isCheckin && entry.mood !== null && entry.mood !== undefined && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-px rounded text-xs font-medium ${
                      moodColor(entry.mood) === "success"
                        ? "bg-success/20 text-success"
                        : moodColor(entry.mood) === "danger"
                          ? "bg-danger/20 text-danger"
                          : moodColor(entry.mood) === "warning"
                            ? "bg-warning/20 text-warning"
                            : "bg-info/20 text-info"
                    }`}
                  >
                    <span>Mood {entry.mood}/10</span>
                    <span className="opacity-70">{moodLabel(entry.mood)}</span>
                  </span>
                )}

                {isCheckin && entry.checkInType && (
                  <span className="inline-flex items-center px-2 py-px rounded text-xs font-medium bg-gray/40 text-icongray">
                    {entry.checkInType === "morning" ? "🌅 Morning" : "🌙 Evening"}
                  </span>
                )}
              </div>

              {/* Title */}
              {title && (
                <Heading level={3} size="md" weight="semibold">
                  {title}
                </Heading>
              )}
            </Stack>

            {/* Date — suppressHydrationWarning because locale formatting differs between server and client */}
            <Text size="sm" color="muted" className="shrink-0 mt-1">
              <span suppressHydrationWarning>{date}</span>
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
                {entry.emotions?.map((emotion) => (
                  <span
                    key={emotion}
                    className="px-2 py-px bg-gray/40 text-icongray rounded text-xs"
                  >
                    {emotion}
                  </span>
                ))}
                {entry.triggers?.map((trigger) => (
                  <span
                    key={trigger}
                    className="px-2 py-px bg-gray/40 text-icongray rounded text-xs border border-lightgray/20"
                  >
                    {trigger}
                  </span>
                ))}
              </div>
            )}
        </Stack>
      </div>
    </Link>
  );
}
