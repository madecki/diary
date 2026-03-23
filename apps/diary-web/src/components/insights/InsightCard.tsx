"use client";

import type { InsightResponse } from "@/lib/api";
import { Heading, Text } from "@madecki/ui";
import { useCallback, useEffect, useState } from "react";
import { InsightsSkeleton } from "./InsightsSkeleton";

const STORAGE_KEYS = {
  daily: "diary-insight-daily-collapsed",
  weekly: "diary-insight-weekly-collapsed",
} as const;

function readCollapsed(key: string): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}

function writeCollapsed(key: string, collapsed: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, collapsed ? "1" : "0");
}

function formatGeneratedAt(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

export type InsightCardProps = {
  variant: "daily" | "weekly";
  insight: InsightResponse | null;
  /** Show previous completed content while a new job is running */
  stableCompleted: InsightResponse | null;
  showRegeneratingOverlay: boolean;
  showTimeout: boolean;
  isInitialLoading: boolean;
};

export function InsightCard({
  variant,
  insight,
  stableCompleted,
  showRegeneratingOverlay,
  showTimeout,
  isInitialLoading,
}: InsightCardProps) {
  const storageKey = STORAGE_KEYS[variant];
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed(storageKey));
  }, [storageKey]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsed(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const title = variant === "daily" ? "Today's Summary" : "Weekly Summary";
  const icon = variant === "daily" ? "☀️" : "📅";

  const status = insight?.status;
  const isPendingLike = status === "pending" || status === "processing";
  const displayContent =
    insight?.status === "completed" && insight.content
      ? insight.content
      : stableCompleted?.status === "completed" && stableCompleted.content
        ? stableCompleted.content
        : null;
  const displayCompletedAt =
    insight?.status === "completed"
      ? insight.completedAt
      : stableCompleted?.status === "completed"
        ? stableCompleted.completedAt
        : null;

  if (isInitialLoading && !insight && !stableCompleted) {
    return <InsightsSkeleton />;
  }

  if (!insight && !stableCompleted && !isInitialLoading) {
    return null;
  }

  return (
    <div className="relative w-full rounded-sm border border-info/25 bg-info/5 p-5">
      {showRegeneratingOverlay && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-primary/70 backdrop-blur-[1px]">
          <Text size="sm" color="muted">
            Regenerating…
          </Text>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0" aria-hidden>
            {icon}
          </span>
          <Heading level={3} size="md" weight="semibold" className="truncate">
            {title}
          </Heading>
        </div>
        <span className="text-icongray text-sm shrink-0">{collapsed ? "Show" : "Hide"}</span>
      </button>

      {!collapsed && (
        <div className="mt-4 space-y-3">
          {showTimeout && isPendingLike && (
            <Text size="sm" color="muted">
              Taking longer than expected. You can keep writing — insights will update when ready.
            </Text>
          )}

          {insight?.status === "failed" && (
            <Text size="sm" color="muted">
              Couldn&apos;t generate insight.
            </Text>
          )}

          {isPendingLike && !displayContent && !showTimeout && <InsightsSkeleton />}

          {displayContent && (
            <>
              <Text size="sm" className="whitespace-pre-wrap text-offwhite/95 leading-relaxed">
                {displayContent}
              </Text>
              {formatGeneratedAt(displayCompletedAt) && (
                <Text size="xs" color="muted">
                  Generated {formatGeneratedAt(displayCompletedAt)}
                </Text>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
