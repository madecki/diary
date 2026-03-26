"use client";

import { Tag, Text } from "@madecki/ui";
import { type KeyboardEvent, useRef, useState } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label: string;
  placeholder?: string;
  maxTags?: number;
  error?: string;
}

export function TagInput({
  value,
  onChange,
  label,
  placeholder = "Type and press Enter…",
  maxTags = 5,
  error,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || value.includes(tag) || value.length >= maxTags) return;
    onChange([...value, tag]);
    setInputValue("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]!);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-icongray">
        {label}
        <span className="ml-2 text-xs text-lightgray">
          ({value.length}/{maxTags})
        </span>
      </label>

      <div
        className={`flex flex-wrap items-center gap-2 rounded-sm border ${
          error ? "border-danger/60" : "border-gray/50"
        } bg-darkgray/60 px-3 py-2 cursor-text min-h-[44px]`}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1">
            <Tag variant="primary" size="sm" muted label={tag} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-lightgray hover:text-danger transition-colors leading-none"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}

        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (inputValue.trim()) addTag(inputValue);
            }}
            placeholder={value.length === 0 ? placeholder : "Add more…"}
            className="flex-1 min-w-24 bg-transparent text-sm text-offwhite placeholder-lightgray outline-none"
            aria-label={label}
          />
        )}
      </div>

      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}
    </div>
  );
}
