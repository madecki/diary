"use client";

import { Button, Container, ContentBox, Heading, Stack, Text } from "@madecki/ui";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container size="md" centered>
      <Stack direction="vertical" gap="6" align="center" className="py-20 text-center">
        <ContentBox variant="danger">
          <Stack direction="vertical" gap="3">
            <Heading level={2} size="lg" weight="semibold">
              Something went wrong
            </Heading>
            <Text size="sm" color="muted">
              {error.message || "An unexpected error occurred."}
            </Text>
          </Stack>
        </ContentBox>
        <Stack direction="horizontal" gap="3">
          <Button variant="primary" size="md" onClick={reset}>
            Try again
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
