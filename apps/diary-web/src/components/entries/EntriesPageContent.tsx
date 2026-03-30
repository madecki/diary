"use client";

import { fetchEmotions, fetchEntries, fetchTriggers } from "@/lib/api";
import type { EntryResponse, ListEntriesResponse, RefType } from "@diary/shared";
import { Button, Container, Heading, Input, Spinner, Stack, Tabs, Text } from "@madecki/ui";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { InsightsPanel } from "../insights/InsightsPanel";
import { SettingsContent } from "../settings/SettingsContent";
import { EntryCard } from "./EntryCard";

const TYPE_TABS = [
  { label: "Check-ins", value: "checkins" },
  { label: "Settings", value: "settings" },
];

interface EntriesPageContentProps {
  initialEntries: EntryResponse[];
  initialCursor: string | null;
}

export function EntriesPageContent({ initialEntries, initialCursor }: EntriesPageContentProps) {
  const [entries, setEntries] = useState<EntryResponse[]>(initialEntries ?? []);
  const [cursor, setCursor] = useState<string | null>(initialCursor ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [emotionTypeByLabel, setEmotionTypeByLabel] = useState<Partial<Record<string, RefType>>>(
    {},
  );
  const [triggerTypeByLabel, setTriggerTypeByLabel] = useState<Partial<Record<string, RefType>>>(
    {},
  );

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlView = searchParams.get("view");
  const view: "checkins" | "settings" = urlView === "settings" ? "settings" : "checkins";

  const setUrlState = useCallback(
    (nextView: "checkins" | "settings") => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", nextView);
      next.delete("folder");
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchEmotions(), fetchTriggers()])
      .then(([emotions, triggers]) => {
        if (cancelled) return;
        setEmotionTypeByLabel(Object.fromEntries(emotions.map((e) => [e.label, e.type])));
        setTriggerTypeByLabel(Object.fromEntries(triggers.map((t) => [t.label, t.type])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isSettings = view === "settings";

  const filtered = useMemo(() => {
    let result: EntryResponse[] = entries ?? [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) =>
        [
          ...e.whatImGratefulFor,
          ...e.whatWouldMakeDayGreat,
          e.dailyAffirmation ?? "",
          ...e.highlightsOfTheDay,
          e.whatDidILearnToday ?? "",
          ...(e.emotions ?? []),
          ...(e.triggers ?? []),
          e.plainText ?? "",
        ].some((s) => s.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [entries, searchQuery]);

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
    id: t.value,
    isActive: t.value === view,
  }));

  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8">
        <Stack direction="vertical" gap="5">
          <Stack direction="vertical" gap="2">
            <Heading level={1} size="3xl" weight="bold">
              My Diary
            </Heading>
            {!isSettings && (
              <Text color="muted" size="sm">
                {(filtered ?? []).length} {(filtered ?? []).length === 1 ? "check-in" : "check-ins"}
              </Text>
            )}
          </Stack>

          {!isSettings && (
            <Input
              name="search"
              label="Search entries"
              placeholder="Search by content, emotions, triggers or affirmations…"
              type="search"
              variant="secondary"
              onChange={setSearchQuery}
              defaultValue={searchQuery}
            />
          )}

          <Tabs
            key={`tabs-${view}`}
            tabs={tabs}
            onTabClick={(next) => {
              if (next === "checkins" || next === "settings") {
                setUrlState(next);
              }
            }}
          />

          {view === "checkins" && (
            <div className="flex justify-end">
              <Link href="/entries/new/checkin">
                <Button variant="success" size="sm">
                  Add new
                </Button>
              </Link>
            </div>
          )}
        </Stack>

        {isSettings && <SettingsContent />}

        {!isSettings && <InsightsPanel />}

        {!isSettings &&
          ((filtered ?? []).length === 0 ? (
            <div className="flex flex-col items-center gap-5 py-16 text-center">
              <Text color="muted" size="lg">
                {searchQuery
                  ? "No entries match your search."
                  : "No check-ins yet. Add your first one!"}
              </Text>
            </div>
          ) : (
            <Stack direction="vertical" gap="4">
              {(filtered ?? []).map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  emotionTypeByLabel={emotionTypeByLabel}
                  triggerTypeByLabel={triggerTypeByLabel}
                />
              ))}
            </Stack>
          ))}

        {!isSettings && cursor && !searchQuery && (
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
