"use client";

import { useState, useEffect, useCallback } from "react";
import { Heading, Hr, Text } from "@madecki/ui";
import type { EmotionResponse, TriggerResponse, ProjectResponse, TagResponse } from "@diary/shared";
import { fetchEmotions, fetchTriggers, fetchProjects, fetchTags } from "@/lib/api";
import { EmotionsTriggersSettings } from "./EmotionsTriggersSettings";
import { ProjectsSettings } from "./ProjectsSettings";
import { TagsSettings } from "./TagsSettings";

export function SettingsContent() {
  const [emotions, setEmotions] = useState<EmotionResponse[]>([]);
  const [triggers, setTriggers] = useState<TriggerResponse[]>([]);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [tags, setTags] = useState<TagResponse[]>([]);
  const [isLoadingCheckin, setIsLoadingCheckin] = useState(true);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  const loadCheckinOptions = useCallback(async () => {
    setIsLoadingCheckin(true);
    try {
      const [emos, trigs] = await Promise.all([fetchEmotions(), fetchTriggers()]);
      setEmotions(emos);
      setTriggers(trigs);
    } catch {
      // silently fail
    } finally {
      setIsLoadingCheckin(false);
    }
  }, []);

  const loadNoteOptions = useCallback(async () => {
    setIsLoadingNotes(true);
    try {
      const [projs, tgs] = await Promise.all([fetchProjects(), fetchTags()]);
      setProjects(projs);
      setTags(tgs);
    } catch {
      // silently fail
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    void loadCheckinOptions();
    void loadNoteOptions();
  }, [loadCheckinOptions, loadNoteOptions]);

  return (
    <div className="flex flex-col gap-10">
      <EmotionsTriggersSettings
        emotions={emotions}
        triggers={triggers}
        isLoading={isLoadingCheckin}
        onRefresh={loadCheckinOptions}
      />

      <Hr />

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Heading level={2} size="lg" weight="semibold">
            Notes options
          </Heading>
          <Text size="sm" color="muted">
            Manage projects and tags that can be assigned to notes.
          </Text>
        </div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <div className="bg-darkgray rounded-sm border border-gray/30 p-5">
            <ProjectsSettings
              projects={projects}
              isLoading={isLoadingNotes}
              onRefresh={loadNoteOptions}
            />
          </div>
          <div className="bg-darkgray rounded-sm border border-gray/30 p-5">
            <TagsSettings
              tags={tags}
              isLoading={isLoadingNotes}
              onRefresh={loadNoteOptions}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

