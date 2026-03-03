import { Suspense } from "react";
import { Container, Stack, Spinner, ContentBox } from "@madecki/ui";
import { fetchEntries } from "@/lib/api";
import { EntriesPageContent } from "@/components/entries/EntriesPageContent";

export const dynamic = "force-dynamic";

async function EntriesLoader() {
  let data;
  try {
    data = await fetchEntries({ limit: 20 });
  } catch {
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

  return (
    <EntriesPageContent
      initialEntries={data.entries}
      initialCursor={data.nextCursor}
    />
  );
}

function EntriesFallback() {
  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8" align="center" className="py-16">
        <Spinner size="lg" />
      </Stack>
    </Container>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<EntriesFallback />}>
      <EntriesLoader />
    </Suspense>
  );
}
