"use client";

import { useState, type KeyboardEvent } from "react";
import { Stack, Text } from "@madecki/ui";

interface TagInputProps {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

export function TagInput({
  label,
  tags,
  onChange,
  maxTags = 5,
  placeholder,
}: TagInputProps) {
  const [input, setInput] = useState("");

  function addTag() {
    const trimmed = input.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    onChange([...tags, trimmed]);
    setInput("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  }

  return (
    <Stack gap="2">
      <Text as="label" size="sm" weight="medium">
        {label}
      </Text>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-gray text-offwhite rounded-sm px-3 py-1 text-sm"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-icongray hover:text-danger ml-1"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {tags.length < maxTags && (
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ?? `Type and press Enter (${tags.length}/${maxTags})`
          }
          className="bg-darkgray border border-gray rounded-sm px-4 py-3 text-offwhite text-sm placeholder:text-lightgray focus:outline-none focus:border-blue transition-colors"
        />
      )}
    </Stack>
  );
}
