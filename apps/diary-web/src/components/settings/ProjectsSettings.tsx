"use client";

import { useState } from "react";
import { Button, ButtonTransparent, GradientButton, Heading, Input, Spinner, Text } from "@madecki/ui";
import type { ProjectResponse } from "@diary/shared";
import { createProject, updateProject, deleteProject } from "@/lib/api";

// ── Add Form ─────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (name: string, description: string) => Promise<void>;
  onCancel: () => void;
}

function AddForm({ onAdd, onCancel }: AddFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onAdd(trimmedName, description.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-darkgray rounded-sm border border-gray/30 p-5 flex flex-col gap-4">
      <Heading level={4} size="sm" weight="semibold">New project</Heading>
      <div className="flex flex-col gap-3">
        <Input
          name="projectName"
          label="Name"
          placeholder="e.g. Work, Personal, Side project…"
          variant="secondary"
          onChange={(v) => {
            setName(v);
            if (error) setError("");
          }}
          defaultValue={name}
        />
        <Input
          name="projectDescription"
          label="Description (optional)"
          placeholder="What is this project about?"
          variant="secondary"
          onChange={setDescription}
          defaultValue={description}
        />
      </div>
      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}
      <div className="flex gap-2">
        <GradientButton type="button" disabled={isSaving} onClick={handleSubmit}>
          {isSaving ? "Creating…" : "Create"}
        </GradientButton>
        <ButtonTransparent variant="neutral" type="button" disabled={isSaving} onClick={onCancel}>
          Cancel
        </ButtonTransparent>
      </div>
    </div>
  );
}

// ── Edit Form ─────────────────────────────────────────────────────────

interface EditFormProps {
  project: ProjectResponse;
  onSave: (id: string, name: string, description: string | null) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ project, onSave, onCancel }: EditFormProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Project name is required");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      await onSave(project.id, trimmedName, description.trim() || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        name="editName"
        label="Name"
        variant="secondary"
        onChange={(v) => {
          setName(v);
          if (error) setError("");
        }}
        defaultValue={name}
      />
      <Input
        name="editDescription"
        label="Description (optional)"
        variant="secondary"
        onChange={setDescription}
        defaultValue={description}
      />
      {error && (
        <Text size="sm" color="danger">
          {error}
        </Text>
      )}
      <div className="flex gap-2">
        <Button variant="success" size="sm" type="button" disabled={isSaving} onClick={handleSave}>
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <ButtonTransparent variant="neutral" type="button" disabled={isSaving} onClick={onCancel}>
          Cancel
        </ButtonTransparent>
      </div>
    </div>
  );
}

// ── Project Card ─────────────────────────────────────────────────────

interface ProjectCardProps {
  project: ProjectResponse;
  onEdit: (p: ProjectResponse) => void;
  onDelete: (p: ProjectResponse) => void;
  isEditing: boolean;
  isDeleting: boolean;
  onSave: (id: string, name: string, description: string | null) => Promise<void>;
  onCancelEdit: () => void;
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  isEditing,
  isDeleting,
  onSave,
  onCancelEdit,
}: ProjectCardProps) {
  return (
    <div className="bg-darkgray rounded-sm border border-gray/30 p-5">
      {isEditing ? (
        <EditForm project={project} onSave={onSave} onCancel={onCancelEdit} />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <Text weight="semibold">{project.name}</Text>
            {project.description && (
              <Text size="sm" color="muted">
                {project.description}
              </Text>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <ButtonTransparent
              variant="neutral"
              type="button"
              onClick={() => onEdit(project)}
            >
              Edit
            </ButtonTransparent>
            <Button
              variant="danger"
              size="sm"
              type="button"
              disabled={isDeleting}
              onClick={() => onDelete(project)}
            >
              {isDeleting ? "…" : "Delete"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ProjectsSettings ─────────────────────────────────────────────────

interface ProjectsSettingsProps {
  projects: ProjectResponse[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ProjectsSettings({ projects, isLoading, onRefresh }: ProjectsSettingsProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  async function handleAdd(name: string, description: string) {
    await createProject({ name, description: description || undefined });
    setShowAdd(false);
    onRefresh();
  }

  async function handleSave(id: string, name: string, description: string | null) {
    await updateProject(id, { name, description });
    setEditingId(null);
    onRefresh();
  }

  async function handleDelete(project: ProjectResponse) {
    setDeletingId(project.id);
    setDeleteError("");
    try {
      await deleteProject(project.id);
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <Heading level={3} size="md" weight="semibold">Projects</Heading>
          <Text size="sm" color="muted">
            Group notes across folders into a project.
          </Text>
        </div>
        {!showAdd && (
          <Button
            variant="success"
            size="sm"
            type="button"
            onClick={() => {
              setShowAdd(true);
              setEditingId(null);
            }}
          >
            Add project
          </Button>
        )}
      </div>

      {showAdd && <AddForm onAdd={handleAdd} onCancel={() => setShowAdd(false)} />}

      {isLoading ? (
        <div className="flex items-center gap-2 py-3">
          <Spinner size="sm" />
          <Text size="sm" color="muted">Loading…</Text>
        </div>
      ) : projects.length === 0 && !showAdd ? (
        <Text size="sm" color="muted">No projects yet. Create one to organise your notes.</Text>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isEditing={editingId === project.id}
              isDeleting={deletingId === project.id}
              onEdit={(p) => {
                setEditingId(p.id);
                setShowAdd(false);
              }}
              onSave={handleSave}
              onCancelEdit={() => setEditingId(null)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {deleteError && (
        <Text size="sm" color="danger">
          {deleteError}
        </Text>
      )}
    </div>
  );
}
