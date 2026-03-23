"use client";

import { Button, Container, Heading, Stack, Text } from "@madecki/ui";
import Link from "next/link";

export default function NotFound() {
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
