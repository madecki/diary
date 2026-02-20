"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container, Stack, Heading, Spinner, ContentBox, Text, ButtonTransparent } from "@madecki/ui";
import type { EntryResponse } from "@diary/shared";
import { CheckinForm } from "@/components/CheckinForm";
import { ShortNoteForm } from "@/components/ShortNoteForm";
import { fetchEntry } from "@/lib/api";

export default function EditEntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEntry(id)
      .then(setEntry)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <Container size="md">
        <Stack gap="5">
          <ContentBox variant="danger">
            <Text>{error}</Text>
          </ContentBox>
          <ButtonTransparent variant="neutral" onClick={() => router.push("/")}>
            Back to diary
          </ButtonTransparent>
        </Stack>
      </Container>
    );
  }

  if (!entry) {
    return (
      <Container size="md">
        <Stack align="center" gap="5">
          <Spinner size="lg" />
        </Stack>
      </Container>
    );
  }

  if (entry.type === "checkin") {
    return <CheckinForm entry={entry} />;
  }
  return <ShortNoteForm entry={entry} />;
}
