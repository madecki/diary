import type { RefType } from "@diary/shared";
import type { ColorVariants } from "@madecki/ui";

/** Tag/Button variant for difficult / neutral / pleasant (check-in form + list chips). */
export const REF_TYPE_TAG_VARIANT: Record<RefType, ColorVariants> = {
  difficult: "danger",
  neutral: "warning",
  pleasant: "success",
};
