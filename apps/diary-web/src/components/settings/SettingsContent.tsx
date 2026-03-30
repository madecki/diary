"use client";

import { fetchEmotions, fetchTriggers } from "@/lib/api";
import type { EmotionResponse, TriggerResponse } from "@diary/shared";
import { useCallback, useEffect, useState } from "react";
import { EmotionsTriggersSettings } from "./EmotionsTriggersSettings";

export function SettingsContent() {
  const [emotions, setEmotions] = useState<EmotionResponse[]>([]);
  const [triggers, setTriggers] = useState<TriggerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [emos, trigs] = await Promise.all([fetchEmotions(), fetchTriggers()]);
      setEmotions(emos);
      setTriggers(trigs);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-10">
      <EmotionsTriggersSettings
        emotions={emotions}
        triggers={triggers}
        isLoading={isLoading}
        onRefresh={load}
      />
    </div>
  );
}
