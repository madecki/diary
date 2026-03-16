"use client";

import { useEffect, useState } from "react";
import { Container, Stack, Spinner, ContentBox } from "@madecki/ui";
import { fetchEntries } from "@/lib/api";
import { EntriesPageContent } from "@/components/entries/EntriesPageContent";
import type { EntryResponse } from "@diary/shared";

export default function HomePage() {
  const [entries, setEntries] = useState<EntryResponse[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntries({ limit: 20 })
      .then((data) => {
        // Defensive: API contract is ListEntriesResponse, but guard against
        // unexpected shapes (e.g. legacy/no-auth transition) so we never pass undefined.
        setEntries(data.entries ?? []);
        setCursor(data.nextCursor ?? null);
      })
      .catch((err: unknown) => {
        // 401 → api.ts handles redirect to /login; don't show an error for that
        if (err instanceof Error && err.message === "Session expired") return;
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
      });
  }, []);

  if (error) {
    return (
      <Container size="lg" centered>
        <Stack direction="vertical" gap="5" className="py-16">
          <ContentBox variant="warning">
            <span className="text-sm">
              Could not load entries. Make sure the API is running.
            </span>
          </ContentBox>
        </Stack>
      </Container>
    );
  }

  if (entries === null) {
    return (
      <Container size="lg" centered>
        <Stack direction="vertical" gap="8" align="center" className="py-16">
          <Spinner size="lg" />
        </Stack>
      </Container>
    );
  }

  return <EntriesPageContent initialEntries={entries} initialCursor={cursor} />;
}
