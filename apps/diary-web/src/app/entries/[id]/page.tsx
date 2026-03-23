"use client";

import { CheckinForm } from "@/components/forms/CheckinForm";
import { NoteForm } from "@/components/forms/ShortNoteForm";
import { fetchEntry } from "@/lib/api";
import type { EntryResponse } from "@diary/shared";
import { Button, Container, Heading, Spinner, Stack, Text } from "@madecki/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

function LoadingFallback() {
  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8" align="center" className="py-16">
        <Spinner size="lg" />
      </Stack>
    </Container>
  );
}

function NotFoundFallback() {
  return (
    <Container size="md" centered>
      <Stack direction="vertical" gap="6" align="center" className="py-20 text-center">
        <Heading level={1} size="4xl" weight="bold" color="muted">
          404
        </Heading>
        <Stack direction="vertical" gap="2">
          <Heading level={2} size="xl" weight="semibold">
            Page not found
          </Heading>
          <Text color="muted">This entry may have been deleted or the URL is incorrect.</Text>
        </Stack>
        <Link href="/">
          <Button variant="primary" size="md">
            Back to diary
          </Button>
        </Link>
      </Stack>
    </Container>
  );
}

export default function EntryPage() {
  const params = useParams<{ id: string }>();
  const [entry, setEntry] = useState<EntryResponse | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    fetchEntry(params.id)
      .then(setEntry)
      .catch(() => setNotFound(true));
  }, [params.id]);

  if (notFound) return <NotFoundFallback />;
  if (!entry) return <LoadingFallback />;

  if (entry.type === "checkin") {
    return <CheckinForm entry={entry} />;
  }

  return <NoteForm entry={entry} />;
}
