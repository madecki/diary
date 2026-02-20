"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Stack,
  Heading,
  Text,
  Button,
  ButtonTransparent,
  Tabs,
  Spinner,
  ContentBox,
} from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";
import { fetchEntries } from "@/lib/api";
import { EntryCard } from "./EntryCard";

export function EntryList() {
  const router = useRouter();
  const [entries, setEntries] = useState<EntryResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string | undefined>();

  const load = useCallback(
    async (cursor?: string, reset = false) => {
      setLoading(true);
      try {
        const data = await fetchEntries(cursor, 20, typeFilter);
        setEntries((prev) =>
          reset ? data.entries : [...prev, ...data.entries],
        );
        setNextCursor(data.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [typeFilter],
  );

  useEffect(() => {
    load(undefined, true);
  }, [load]);

  function handleFilter(value: string) {
    setTypeFilter(value === "all" ? undefined : value);
  }

  return (
    <Container size="md">
      <Stack gap="7">
        {/* Header */}
        <Stack direction="horizontal" justify="between" align="center" wrap>
          <Heading level={1} size="2xl" weight="bold">
            Diary
          </Heading>
          <Stack direction="horizontal" gap="3">
            <Button
              variant="neutral"
              onClick={() => router.push("/entries/new-checkin")}
            >
              New Check-in
            </Button>
            <ButtonTransparent
              variant="neutral"
              onClick={() => router.push("/entries/new-short-note")}
            >
              New Note
            </ButtonTransparent>
          </Stack>
        </Stack>

        {/* Filters */}
        <Tabs
          tabs={[
            { label: "All", value: "all" },
            { label: "Check-ins", value: "checkin" },
            { label: "Notes", value: "short_note" },
          ]}
          onTabClick={handleFilter}
        />

        {/* List */}
        {loading && entries.length === 0 ? (
          <Stack align="center">
            <Spinner size="lg" />
          </Stack>
        ) : entries.length === 0 ? (
          <ContentBox variant="info">
            <Text>No entries yet. Create a check-in or note to get started.</Text>
          </ContentBox>
        ) : (
          <Stack gap="4">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}

        {/* Load more */}
        {nextCursor && (
          <Stack align="center">
            <ButtonTransparent
              variant="neutral"
              onClick={() => load(nextCursor)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more"}
            </ButtonTransparent>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
