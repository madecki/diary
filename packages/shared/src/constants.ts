export const DEFAULT_ACTOR_USER_ID = "local-user";
export const EVENT_VERSION = 1 as const;
export const EVENT_SCHEMA = "diary.event.v1" as const;
export const EVENT_SOURCE = "diary" as const;

export const DIARY_EVENT_NAMES = {
  ENTRY_CREATED: "diary.entry.created",
  ENTRY_UPDATED: "diary.entry.updated",
} as const;

export const NATS_STREAM_NAME = "DIARY_EVENTS";
export const NATS_SUBJECTS = [
  "diary.entry.created",
  "diary.entry.updated",
  "diary.entry.deleted",
] as const;

export const ENTRY_TYPES = {
  CHECKIN: "checkin",
  NOTE: "note",
} as const;
