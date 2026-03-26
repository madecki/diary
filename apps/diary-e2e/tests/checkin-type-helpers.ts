import type { Page } from "@playwright/test";

const CHECKIN_TYPE_LABELS = {
  morning: "🌅 Morning",
  evening: "🌙 Evening",
  basic: "📝 Basic",
} as const;

export type CheckInTypeKey = keyof typeof CHECKIN_TYPE_LABELS;

/** Opens the check-in form type combobox and selects morning, evening, or basic. */
export async function selectCheckInType(page: Page, type: CheckInTypeKey): Promise<void> {
  await page.getByTestId("checkin-type").click();
  await page.getByRole("option", { name: CHECKIN_TYPE_LABELS[type] }).click();
}
