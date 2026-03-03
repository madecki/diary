"use client";

import { useEffect, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import type { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

interface BlockNoteEditorProps {
  initialContent?: unknown[];
  onChange?: (blocks: Block[], plainText: string, wordCount: number) => void;
  placeholder?: string;
  editable?: boolean;
}

function extractText(blocks: Block[]): { plainText: string; wordCount: number } {
  const lines: string[] = [];

  function traverse(block: Block): void {
    const content = block.content;
    if (Array.isArray(content)) {
      const text = content
        .map((inline) => {
          if (inline && typeof inline === "object" && "text" in inline) {
            return String((inline as { text: string }).text);
          }
          return "";
        })
        .join("");
      if (text.trim()) lines.push(text);
    }
    if (block.children?.length) {
      for (const child of block.children) {
        traverse(child as Block);
      }
    }
  }

  for (const block of blocks) {
    traverse(block);
  }

  const plainText = lines.join("\n").trim();
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  return { plainText, wordCount };
}

export function BlockNoteEditorComponent({
  initialContent,
  onChange,
  editable = true,
}: BlockNoteEditorProps) {
  const hasInitialized = useRef(false);

  const editor = useCreateBlockNote({
    initialContent:
      Array.isArray(initialContent) && initialContent.length > 0
        ? (initialContent as Block[])
        : undefined,
  });

  useEffect(() => {
    if (!onChange) return;
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      return;
    }
    const { plainText, wordCount } = extractText(editor.document);
    onChange(editor.document, plainText, wordCount);
  });

  return (
    <div className="bn-editor-wrapper">
      <BlockNoteView
        editor={editor}
        theme="dark"
        editable={editable}
        onChange={() => {
          if (!onChange) return;
          const { plainText, wordCount } = extractText(editor.document);
          onChange(editor.document, plainText, wordCount);
        }}
        style={{
          backgroundColor: "transparent",
        }}
      />
    </div>
  );
}
