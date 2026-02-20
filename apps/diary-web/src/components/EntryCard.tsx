"use client";

import Link from "next/link";
import { Stack, Text } from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";

interface EntryCardProps {
  entry: EntryResponse;
}

const TYPE_STYLES: Record<string, string> = {
  checkin: "bg-info",
  short_note: "bg-blue",
};

const TYPE_LABELS: Record<string, string> = {
  checkin: "Check-in",
  short_note: "Note",
};

export function EntryCard({ entry }: EntryCardProps) {
  const preview =
    entry.plainText.length > 160
      ? `${entry.plainText.slice(0, 160)}…`
      : entry.plainText;

  const date = new Date(entry.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Link href={`/entries/${entry.id}`}>
      <div className="bg-darkgray rounded-sm p-5 hover:bg-gray transition-colors cursor-pointer">
        <Stack gap="3">
          {/* Header: badge + date + mood */}
          <Stack direction="horizontal" gap="3" align="center" wrap>
            <span
              className={`${TYPE_STYLES[entry.type]} text-primary text-xs font-semibold px-3 py-1 rounded-full`}
            >
              {TYPE_LABELS[entry.type]}
            </span>

            <Text size="xs" color="muted">
              {date}
            </Text>

            {entry.timeOfDay && (
              <Text size="xs" color="muted">
                · {entry.timeOfDay}
              </Text>
            )}

            {entry.mood !== null && (
              <span className="bg-gray text-offwhite text-xs font-semibold px-2 py-1 rounded-full">
                mood {entry.mood}/10
              </span>
            )}

            {entry.title && (
              <Text size="sm" weight="semibold" className="ml-auto">
                {entry.title}
              </Text>
            )}
          </Stack>

          {/* Preview */}
          {preview && (
            <Text size="sm" color="muted">
              {preview}
            </Text>
          )}

          {/* Tags */}
          {(entry.emotions.length > 0 || entry.triggers.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {entry.emotions.map((e) => (
                <span
                  key={`e-${e}`}
                  className="bg-info/20 text-info text-xs px-2 py-0.5 rounded-full"
                >
                  {e}
                </span>
              ))}
              {entry.triggers.map((t) => (
                <span
                  key={`t-${t}`}
                  className="bg-warning/20 text-warning text-xs px-2 py-0.5 rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </Stack>
      </div>
    </Link>
  );
}
