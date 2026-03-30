import { redirect } from "next/navigation";

/** Legacy URL from when diary included standalone notes — check-ins live here now. */
export default function LegacyShortNotePage() {
  redirect("/entries/new/checkin");
}
