import { redirect } from "next/navigation";

interface LegacyShortNotePageProps {
  searchParams: Promise<{ folder?: string }>;
}

export default async function LegacyShortNotePage({
  searchParams,
}: LegacyShortNotePageProps) {
  const params = await searchParams;
  const qs = params.folder ? `?folder=${encodeURIComponent(params.folder)}` : "";
  redirect(`/entries/new/note${qs}`);
}
