"use client";

import { type InsightResponse, type LatestInsightsResponse, fetchLatestInsights } from "@/lib/api";
import {
  clearDiaryInsightsRegenerationPending,
  peekDiaryInsightsRegenerationPending,
} from "@/lib/insight-regeneration-flag";
import { Stack } from "@madecki/ui";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { InsightCard } from "./InsightCard";
import { InsightsSkeleton } from "./InsightsSkeleton";

const POLL_MS = 3000;
const POLL_MAX_MS = 120_000;
const REGEN_POLL_MS = 2000;
const REGEN_GIVE_UP_MS = 35_000;

function needsPolling(data: LatestInsightsResponse | null): boolean {
  if (!data) return false;
  const busy = (x: InsightResponse | null) =>
    x !== null && (x.status === "pending" || x.status === "processing");
  return busy(data.daily) || busy(data.weekly);
}

export function InsightsPanel() {
  const [data, setData] = useState<LatestInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [expectingRegeneration, setExpectingRegeneration] = useState(
    peekDiaryInsightsRegenerationPending,
  );
  const stableDaily = useRef<InsightResponse | null>(null);
  const stableWeekly = useRef<InsightResponse | null>(null);
  const pollingStartedAt = useRef<number | null>(null);
  const expectingRegenRef = useRef(false);

  useLayoutEffect(() => {
    if (!expectingRegeneration) return;
    stableDaily.current = null;
    stableWeekly.current = null;
    expectingRegenRef.current = true;
  }, [expectingRegeneration]);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchLatestInsights();
      setData(next);
      if (!expectingRegenRef.current) {
        if (next.daily?.status === "completed") {
          stableDaily.current = next.daily;
        }
        if (next.weekly?.status === "completed") {
          stableWeekly.current = next.weekly;
        }
      }
      if (expectingRegenRef.current && needsPolling(next)) {
        expectingRegenRef.current = false;
        clearDiaryInsightsRegenerationPending();
        setExpectingRegeneration(false);
        if (next.daily?.status === "completed") {
          stableDaily.current = next.daily;
        }
        if (next.weekly?.status === "completed") {
          stableWeekly.current = next.weekly;
        }
      }
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!expectingRegeneration) return;
    const id = window.setInterval(() => {
      void refresh();
    }, REGEN_POLL_MS);
    return () => clearInterval(id);
  }, [expectingRegeneration, refresh]);

  useEffect(() => {
    if (!expectingRegeneration) return;
    const t = window.setTimeout(() => {
      if (!expectingRegenRef.current) return;
      expectingRegenRef.current = false;
      clearDiaryInsightsRegenerationPending();
      setExpectingRegeneration(false);
      void refresh();
    }, REGEN_GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [expectingRegeneration, refresh]);

  const polling = needsPolling(data);

  useEffect(() => {
    if (!polling) {
      pollingStartedAt.current = null;
      setTimedOut(false);
      return;
    }

    if (pollingStartedAt.current === null) {
      pollingStartedAt.current = Date.now();
    }

    const startedAt = pollingStartedAt.current;

    const pollId = window.setInterval(() => {
      void refresh();
    }, POLL_MS);

    const timeoutId = window.setInterval(() => {
      if (Date.now() - startedAt >= POLL_MAX_MS) {
        setTimedOut(true);
      }
    }, 1000);

    return () => {
      window.clearInterval(pollId);
      window.clearInterval(timeoutId);
    };
  }, [polling, refresh]);

  if (expectingRegeneration) {
    return (
      <Stack direction="vertical" gap="4" className="w-full">
        <InsightsSkeleton />
        <InsightsSkeleton />
      </Stack>
    );
  }

  if (!loading && data && !data.daily && !data.weekly) {
    return null;
  }

  const daily = data?.daily ?? null;
  const weekly = data?.weekly ?? null;

  const dailyRegenerating =
    !!daily &&
    (daily.status === "pending" || daily.status === "processing") &&
    !!stableDaily.current &&
    stableDaily.current.id !== daily.id;

  const weeklyRegenerating =
    !!weekly &&
    (weekly.status === "pending" || weekly.status === "processing") &&
    !!stableWeekly.current &&
    stableWeekly.current.id !== weekly.id;

  const showDaily = daily !== null || stableDaily.current !== null || loading;
  const showWeekly = weekly !== null || stableWeekly.current !== null || loading;

  if (!showDaily && !showWeekly && !loading) {
    return null;
  }

  const timeoutActive = timedOut && polling;

  return (
    <Stack direction="vertical" gap="4" className="w-full">
      {showDaily && (
        <InsightCard
          variant="daily"
          insight={daily}
          stableCompleted={stableDaily.current}
          showRegeneratingOverlay={dailyRegenerating}
          showTimeout={timeoutActive}
          isInitialLoading={loading && !daily && !stableDaily.current}
        />
      )}
      {showWeekly && (
        <InsightCard
          variant="weekly"
          insight={weekly}
          stableCompleted={stableWeekly.current}
          showRegeneratingOverlay={weeklyRegenerating}
          showTimeout={timeoutActive}
          isInitialLoading={loading && !weekly && !stableWeekly.current}
        />
      )}
    </Stack>
  );
}
