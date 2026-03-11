"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Container,
  Stack,
  Heading,
  Text,
  Button,
  Input,
  Tabs,
  Spinner,
} from "@madecki/ui";
import type { BrowseFolderItem, EntryResponse, ListEntriesResponse } from "@diary/shared";
import { EntryCard } from "./EntryCard";
import { CreateFolderModal } from "./CreateFolderModal";
import { DeleteFolderModal } from "./DeleteFolderModal";
import { RenameFolderModal } from "./RenameFolderModal";
import {
  browseNotes,
  createNoteFolder,
  deleteNoteFolder,
  fetchEntries,
  renameNoteFolder,
} from "@/lib/api";

const TYPE_TABS = [
  { label: "Check-ins", value: "checkins" },
  { label: "Notes", value: "notes" },
];

interface EntriesPageContentProps {
  initialEntries: EntryResponse[];
  initialCursor: string | null;
}

export function EntriesPageContent({
  initialEntries,
  initialCursor,
}: EntriesPageContentProps) {
  const [entries, setEntries] = useState<EntryResponse[]>(initialEntries);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteFolders, setNoteFolders] = useState<BrowseFolderItem[]>([]);
  const [noteEntries, setNoteEntries] = useState<EntryResponse[]>([]);
  const [currentFolderPath, setCurrentFolderPath] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<BrowseFolderItem | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [folderToRename, setFolderToRename] = useState<BrowseFolderItem | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlView = searchParams.get("view");
  const view: "checkins" | "notes" =
    urlView === "checkins" ? "checkins" : "notes";
  const folderFromUrl = normalizeFolderPath(searchParams.get("folder"));

  const setUrlState = useCallback(
    (nextView: "checkins" | "notes", folder?: string | null) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("view", nextView);
      if (nextView === "notes" && folder) {
        next.set("folder", folder);
      } else {
        next.delete("folder");
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const loadNotes = useCallback(
    async (path: string | null) => {
      try {
        const data = await browseNotes(path ?? undefined);
        setNoteFolders(data.folders);
        setNoteEntries(data.notes);
        setCurrentFolderPath(data.currentPath);
      } catch {
        setNoteFolders([]);
        setNoteEntries([]);
        setCurrentFolderPath(path);
      }
    },
    [],
  );

  useEffect(() => {
    if (view !== "notes") return;
    void loadNotes(folderFromUrl);
  }, [view, folderFromUrl, loadNotes]);

  const filtered = useMemo(() => {
    let result =
      view === "notes"
        ? noteEntries
        : entries.filter((e) => e.type === "checkin");

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((e) => {
        if (e.type === "checkin") {
          return [
            ...e.whatImGratefulFor,
            ...e.whatWouldMakeDayGreat,
            e.dailyAffirmation ?? "",
            ...e.highlightsOfTheDay,
            e.whatDidILearnToday ?? "",
            ...(e.emotions ?? []),
            ...(e.triggers ?? []),
          ].some((s) => s.toLowerCase().includes(q));
        }
        return (
          (e.title ?? "").toLowerCase().includes(q) ||
          (e.plainText ?? "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [entries, noteEntries, view, searchQuery]);

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
    isActive: t.value === view,
  }));

  const checkins = useMemo(
    () => entries.filter((e) => e.type === "checkin"),
    [entries],
  );

  const breadcrumbSegments = (currentFolderPath ?? "")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <Container size="lg" centered>
      <Stack direction="vertical" gap="8">
        {/* Header */}
        <Stack direction="vertical" gap="5">
          <Stack direction="vertical" gap="2">
            <Heading level={1} size="3xl" weight="bold">
              My Diary
            </Heading>
            <Text color="muted" size="sm">
              {view === "notes"
                ? `${filtered.length} ${filtered.length === 1 ? "note" : "notes"}`
                : `${checkins.length} ${checkins.length === 1 ? "check-in" : "check-ins"}`}
            </Text>
          </Stack>

          {/* Search */}
          <Input
            name="search"
            label={view === "notes" ? "Search notes in this folder" : "Search entries"}
            placeholder={
              view === "notes"
                ? "Search notes by title and content…"
                : "Search by title, content, emotions, triggers or affirmations…"
            }
            type="search"
            variant="secondary"
            onChange={setSearchQuery}
            defaultValue={searchQuery}
          />

          {/* Type filter tabs */}
          <Tabs
            key={`tabs-${view}`}
            tabs={tabs}
            onTabClick={(next) => {
              if (next === "checkins" || next === "notes") {
                setUrlState(next, next === "notes" ? currentFolderPath : null);
              }
            }}
          />

          {view === "notes" && (
            <Stack direction="vertical" gap="3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-icongray flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setUrlState("notes", null)}
                    className={currentFolderPath ? "underline hover:text-white" : "text-white"}
                  >
                    Root
                  </button>
                  {breadcrumbSegments.map((segment, idx) => {
                    const path = breadcrumbSegments.slice(0, idx + 1).join("/");
                    return (
                      <span key={path} className="inline-flex items-center gap-2">
                        <span>/</span>
                        <button
                          type="button"
                          onClick={() => setUrlState("notes", path)}
                          className={
                            path === currentFolderPath
                              ? "text-white"
                              : "underline hover:text-white"
                          }
                        >
                          {segment}
                        </button>
                      </span>
                    );
                  })}
                </div>

                <Stack direction="horizontal" gap="2">
                  <Link
                    href={
                      folderFromUrl
                        ? `/entries/new/note?folder=${encodeURIComponent(folderFromUrl)}`
                        : "/entries/new/note"
                    }
                  >
                    <Button variant="success" size="sm">Add new</Button>
                  </Link>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create folder
                  </Button>
                </Stack>
              </div>

              {noteFolders.length > 0 && (
                <Stack direction="vertical" gap="3">
                  {noteFolders.map((folder) => (
                    <FolderCard
                      key={folder.id}
                      folder={folder}
                      onNavigate={(path) => setUrlState("notes", path)}
                      onRename={(f) => setFolderToRename(f)}
                      onRemove={(f) => setFolderToDelete(f)}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
          )}

          {view === "checkins" && (
            <div className="flex justify-end">
              <Link href="/entries/new/checkin">
                <Button variant="success" size="sm">Add new</Button>
              </Link>
            </div>
          )}
        </Stack>

        {/* Entries list */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-16 text-center">
            <Text color="muted" size="lg">
              {searchQuery
                ? view === "notes"
                  ? "No notes match your search in this folder."
                  : "No entries match your search."
                : view === "notes"
                  ? "No notes yet. Add your first one!"
                  : "No check-ins yet. Add your first one!"}
            </Text>
          </div>
        ) : (
          <Stack direction="vertical" gap="4">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}

        {/* Load more (checkins only, loads from the paginated entries list) */}
        {cursor && !searchQuery && view === "checkins" && (
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

      <CreateFolderModal
        isOpen={showCreateModal}
        parentPath={currentFolderPath}
        onCancel={() => setShowCreateModal(false)}
        onConfirm={async (name) => {
          const path = currentFolderPath ? `${currentFolderPath}/${name}` : name;
          await createNoteFolder({ path });
          setShowCreateModal(false);
          await loadNotes(currentFolderPath);
        }}
      />

      <DeleteFolderModal
        folder={folderToDelete}
        isDeleting={isDeletingFolder}
        onCancel={() => setFolderToDelete(null)}
        onConfirm={async () => {
          if (!folderToDelete) return;
          setIsDeletingFolder(true);
          try {
            const hasChildren =
              folderToDelete.notesCount > 0 || folderToDelete.foldersCount > 0;
            await deleteNoteFolder(folderToDelete.path, hasChildren);
            setFolderToDelete(null);
            await loadNotes(currentFolderPath);
          } finally {
            setIsDeletingFolder(false);
          }
        }}
      />

      <RenameFolderModal
        folder={folderToRename}
        onCancel={() => setFolderToRename(null)}
        onConfirm={async (newName) => {
          if (!folderToRename) return;
          await renameNoteFolder({ path: folderToRename.path, newName });
          setFolderToRename(null);
          await loadNotes(currentFolderPath);
        }}
      />
    </Container>
  );
}

interface FolderCardProps {
  folder: BrowseFolderItem;
  onNavigate: (path: string) => void;
  onRename: (folder: BrowseFolderItem) => void;
  onRemove: (folder: BrowseFolderItem) => void;
}

function FolderCard({ folder, onNavigate, onRename, onRemove }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const summaryParts = [
    folder.foldersCount > 0
      ? `${folder.foldersCount} ${folder.foldersCount === 1 ? "folder" : "folders"}`
      : null,
    folder.notesCount > 0
      ? `${folder.notesCount} ${folder.notesCount === 1 ? "note" : "notes"}`
      : null,
  ].filter(Boolean);

  const summary = summaryParts.length > 0 ? summaryParts.join(", ") : "Empty";

  return (
    <div className="w-full bg-info/10 border border-info/35 rounded-sm p-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-left flex-1 min-w-0"
          onClick={() => onNavigate(folder.path)}
        >
          <Heading level={3} size="md" weight="semibold">
            {folder.name}
          </Heading>
          <Text size="sm" color="muted">
            {summary}
          </Text>
        </button>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-sm text-icongray hover:text-white hover:bg-gray/30 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Folder actions"
          >
            •••
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 min-w-32 rounded-sm bg-darkgray border border-gray/50 py-1 shadow-lg">
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-white hover:bg-gray/30 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  onRename(folder);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-gray/30 transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove(folder);
                }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function normalizeFolderPath(path: string | null): string | null {
  if (!path) return null;
  const normalized = path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
  return normalized.length > 0 ? normalized : null;
}
