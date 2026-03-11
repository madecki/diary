import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container, Stack, Spinner } from "@madecki/ui";
import { fetchEntry } from "@/lib/api";
import { CheckinForm } from "@/components/forms/CheckinForm";
import { NoteForm } from "@/components/forms/ShortNoteForm";

interface EntryPageProps {
  params: Promise<{ id: string }>;
}

async function EntryLoader({ id }: { id: string }) {
  let entry;
  try {
    entry = await fetchEntry(id);
  } catch {
    notFound();
  }

  if (entry.type === "checkin") {
    return <CheckinForm entry={entry} />;
  }

  return <NoteForm entry={entry} />;
}

function EntryFallback() {
  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8" align="center" className="py-16">
        <Spinner size="lg" />
      </Stack>
    </Container>
  );
}

export default async function EntryPage({ params }: EntryPageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<EntryFallback />}>
      <EntryLoader id={id} />
    </Suspense>
  );
}
