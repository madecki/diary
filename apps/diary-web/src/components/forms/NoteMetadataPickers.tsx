"use client";

import type { ProjectResponse, TagResponse } from "@diary/shared";
import { Button, Spinner, Text } from "@madecki/ui";

// ── Project Picker ────────────────────────────────────────────────────

interface ProjectPickerProps {
  projects: ProjectResponse[];
  value: string | null;
  onChange: (projectId: string | null) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ProjectPicker({
  projects,
  value,
  onChange,
  isLoading,
  disabled,
}: ProjectPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-icongray">Project (optional)</label>
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <Text size="sm" color="muted">
            Loading…
          </Text>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            id="project-none"
            variant="neutral"
            size="sm"
            isActive={value === null}
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
          >
            None
          </Button>
          {projects.map((project) => (
            <Button
              key={project.id}
              id={project.id}
              variant={project.color ?? "info"}
              size="sm"
              isActive={value === project.id}
              type="button"
              disabled={disabled}
              onClick={(maybeId?: string) => {
                if (maybeId === undefined) {
                  onChange(null);
                } else {
                  onChange(project.id);
                }
              }}
              label={value === project.id ? project.name : undefined}
            >
              {value !== project.id && project.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tag Picker ────────────────────────────────────────────────────────

interface TagPickerProps {
  tags: TagResponse[];
  value: string[];
  onChange: (tagIds: string[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function TagPicker({ tags, value, onChange, isLoading, disabled }: TagPickerProps) {
  function toggle(tagId: string) {
    if (value.includes(tagId)) {
      onChange(value.filter((id) => id !== tagId));
    } else {
      onChange([...value, tagId]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-icongray">
        Tags (optional)
        <span className="ml-2 text-xs text-lightgray">({value.length} selected)</span>
      </label>
      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Spinner size="sm" />
          <Text size="sm" color="muted">
            Loading…
          </Text>
        </div>
      ) : tags.length === 0 ? (
        <Text size="sm" color="muted">
          No tags yet. Add some in Settings.
        </Text>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const isSelected = value.includes(tag.id);
            return (
              <Button
                key={tag.id}
                id={tag.id}
                variant="neutral"
                size="sm"
                isActive={isSelected}
                label={isSelected ? tag.name : undefined}
                type="button"
                disabled={disabled}
                onClick={(maybeId?: string) => {
                  if (maybeId === undefined) {
                    onChange(value.filter((id) => id !== tag.id));
                  } else {
                    toggle(tag.id);
                  }
                }}
              >
                {!isSelected && tag.name}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
