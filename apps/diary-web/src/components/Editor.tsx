"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export interface EditorData {
  contentJson: Record<string, unknown>;
  plainText: string;
  wordCount: number;
}

interface EditorProps {
  initialContent?: Record<string, unknown>;
  onChange: (data: EditorData) => void;
  placeholder?: string;
}

export function Editor({
  initialContent,
  onChange,
  placeholder = "Start writing…",
}: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent ?? undefined,
    onUpdate({ editor: e }) {
      const text = e.getText();
      onChange({
        contentJson: e.getJSON() as Record<string, unknown>,
        plainText: text,
        wordCount: text.trim() === "" ? 0 : text.trim().split(/\s+/).length,
      });
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  return (
    <div className="tiptap-editor bg-darkgray rounded-sm border border-gray p-5">
      <EditorContent editor={editor} />
    </div>
  );
}
