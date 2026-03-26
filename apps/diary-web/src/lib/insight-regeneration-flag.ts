/** Set on the check-in flow before navigating home so InsightsPanel can show loading until new jobs appear. */
export const DIARY_INSIGHT_REGEN_SESSION_KEY = "diary-expect-insight-regen";

export function markDiaryInsightsRegenerationPending(): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(DIARY_INSIGHT_REGEN_SESSION_KEY, "1");
    }
  } catch {
    // ignore quota / private mode
  }
}

export function peekDiaryInsightsRegenerationPending(): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(DIARY_INSIGHT_REGEN_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearDiaryInsightsRegenerationPending(): void {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(DIARY_INSIGHT_REGEN_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}
