import { NoteForm } from "@/components/forms/ShortNoteForm";

export const metadata = {
  title: "New Note | Diary",
};

interface NewNotePageProps {
  searchParams: Promise<{ folder?: string }>;
}

export default async function NewNotePage({ searchParams }: NewNotePageProps) {
  const params = await searchParams;
  return <NoteForm initialFolderPath={params.folder ?? null} />;
}
