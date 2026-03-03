"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Container,
  Stack,
  Heading,
  Text,
  Button,
  GradientButton,
  Input,
  Tabs,
  Spinner,
} from "@madecki/ui";
import type { EntryResponse, ListEntriesResponse } from "@diary/shared";
import { EntryCard } from "./EntryCard";
import { fetchEntries } from "@/lib/api";

const TYPE_TABS = [
  { label: "All", value: "" },
  { label: "Check-ins", value: "checkin" },
  { label: "Short Notes", value: "short_note" },
];

interface EntriesPageContentProps {
  initialEntries: EntryResponse[];
  initialCursor: string | null;
}

export function EntriesPageContent({
  initialEntries,
  initialCursor,
}: EntriesPageContentProps) {
  const [entries, setEntries] = useState<EntryResponse[]>(initialEntries);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    let result = entries;

    if (typeFilter) {
      result = result.filter((e) => e.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        if (e.type === "checkin") {
          return [
            ...e.whatImGratefulFor,
            ...e.whatWouldMakeDayGreat,
            e.dailyAffirmation ?? "",
            ...e.highlightsOfTheDay,
            e.whatDidILearnToday ?? "",
            ...(e.emotions ?? []),
            ...(e.triggers ?? []),
          ].some((s) => s.toLowerCase().includes(q));
        }
        return (
          (e.title ?? "").toLowerCase().includes(q) ||
          (e.plainText ?? "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [entries, typeFilter, searchQuery]);

  const loadMore = useCallback(async () => {
    if (!cursor || isLoading) return;
    setIsLoading(true);
    try {
      const data: ListEntriesResponse = await fetchEntries({ cursor, limit: 20 });
      setEntries((prev) => [...prev, ...data.entries]);
      setCursor(data.nextCursor);
    } catch {
      // silently fail — user can retry
    } finally {
      setIsLoading(false);
    }
  }, [cursor, isLoading]);

  const tabs = TYPE_TABS.map((t) => ({
    ...t,
    isActive: t.value === typeFilter,
  }));

  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8">
        {/* Header */}
        <Stack direction="vertical" gap="5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <Stack direction="vertical" gap="2">
              <Heading level={1} size="3xl" weight="bold">
                My Diary
              </Heading>
              <Text color="muted" size="sm">
                {entries.length} {entries.length === 1 ? "entry" : "entries"}
              </Text>
            </Stack>

            <Stack direction="horizontal" gap="3" wrap>
              <Link href="/entries/new/checkin">
                <GradientButton size="md">New Check-in</GradientButton>
              </Link>
              <Link href="/entries/new/short-note">
                <Button variant="info" size="md">New Short Note</Button>
              </Link>
            </Stack>
          </div>

          {/* Search */}
          <Input
            name="search"
            label="Search entries"
            placeholder="Search by title, content, emotions, triggers or affirmations…"
            type="search"
            variant="secondary"
            onChange={setSearchQuery}
            defaultValue={searchQuery}
          />

          {/* Type filter tabs */}
          <Tabs tabs={tabs} onTabClick={setTypeFilter} />
        </Stack>

        {/* Entries list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <Text color="muted" size="lg">
              {searchQuery || typeFilter
                ? "No entries match your search."
                : "No entries yet. Create your first one!"}
            </Text>
            {!searchQuery && !typeFilter && (
              <Link href="/entries/new/checkin">
                <GradientButton size="lg">Start journaling</GradientButton>
              </Link>
            )}
          </div>
        ) : (
          <Stack direction="vertical" gap="4">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}

        {/* Load more */}
        {cursor && !searchQuery && !typeFilter && (
          <div className="flex justify-center pt-2">
            {isLoading ? (
              <Spinner size="md" />
            ) : (
              <Button variant="neutral" size="md" onClick={loadMore}>
                Load more
              </Button>
            )}
          </div>
        )}
      </Stack>
    </Container>
  );
}
