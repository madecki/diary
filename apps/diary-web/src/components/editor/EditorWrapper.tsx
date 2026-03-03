"use client";

import dynamic from "next/dynamic";
import type { Block } from "@blocknote/core";
import { Spinner } from "@madecki/ui";

const BlockNoteEditorComponent = dynamic(
  () =>
    import("./BlockNoteEditor").then((mod) => ({
      default: mod.BlockNoteEditorComponent,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-10">
        <Spinner size="md" />
      </div>
    ),
  },
);

interface EditorWrapperProps {
  initialContent?: unknown[];
  onChange?: (blocks: Block[], plainText: string, wordCount: number) => void;
  editable?: boolean;
  label?: string;
  error?: string;
}

export function EditorWrapper({
  initialContent,
  onChange,
  editable = true,
  label,
  error,
}: EditorWrapperProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-icongray">{label}</label>
      )}
      <div
        className={`rounded-sm border ${
          error ? "border-danger/60" : "border-gray/50"
        } bg-darkgray/60 min-h-[200px] overflow-hidden`}
      >
        <BlockNoteEditorComponent
          initialContent={initialContent}
          onChange={onChange}
          editable={editable}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
