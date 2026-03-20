import { describe, it, expect } from "vitest";
import {
  CreateCheckinSchema,
  CreateNoteSchema,
  UpdateCheckinSchema,
  UpdateNoteSchema,
  ListEntriesQuerySchema,
  DiaryEventPayloadSchema,
  EntryResponseSchema,
  OutboxQuerySchema,
  ReplayBodySchema,
  CreateNoteFolderSchema,
} from "../index.js";

describe("CreateCheckinSchema", () => {
  const validMorning = {
    checkInType: "morning" as const,
    mood: 7,
    emotions: ["happy"],
    triggers: ["exercise"],
    whatImGratefulFor: ["Good health", "", ""],
    whatWouldMakeDayGreat: ["Stay focused", "", ""],
    dailyAffirmation: "I am capable",
  };

  const validEvening = {
    checkInType: "evening" as const,
    mood: 6,
    emotions: ["calm"],
    triggers: ["work"],
    highlightsOfTheDay: ["Completed the task", "", ""],
    whatDidILearnToday: "Patience is key",
  };

  it("accepts valid morning check-in", () => {
    const result = CreateCheckinSchema.parse(validMorning);
    expect(result.checkInType).toBe("morning");
  });

  it("accepts valid evening check-in", () => {
    const result = CreateCheckinSchema.parse(validEvening);
    expect(result.checkInType).toBe("evening");
  });

  it("accepts optional localDateTime", () => {
    const result = CreateCheckinSchema.parse({ ...validMorning, localDateTime: "2026-02-20T09:30" });
    expect(result.localDateTime).toBe("2026-02-20T09:30");
  });

  it("rejects when all three gratitude items are empty", () => {
    expect(() =>
      CreateCheckinSchema.parse({
        ...validMorning,
        whatImGratefulFor: ["", "", ""],
      }),
    ).toThrow();
  });

  it("rejects when dailyAffirmation is blank", () => {
    expect(() =>
      CreateCheckinSchema.parse({ ...validMorning, dailyAffirmation: "   " }),
    ).toThrow();
  });

  it("rejects missing mood", () => {
    const { mood: _mood, ...noMood } = validMorning;
    expect(() => CreateCheckinSchema.parse(noMood)).toThrow();
  });

  it("rejects empty emotions array", () => {
    expect(() => CreateCheckinSchema.parse({ ...validMorning, emotions: [] })).toThrow();
  });

  it("rejects mood out of range", () => {
    expect(() => CreateCheckinSchema.parse({ ...validMorning, mood: 11 })).toThrow();
  });

  it("rejects when all three highlights are empty for evening", () => {
    expect(() =>
      CreateCheckinSchema.parse({
        ...validEvening,
        highlightsOfTheDay: ["", "", ""],
      }),
    ).toThrow();
  });

  it("rejects when whatDidILearnToday is blank", () => {
    expect(() =>
      CreateCheckinSchema.parse({ ...validEvening, whatDidILearnToday: "  " }),
    ).toThrow();
  });

  it("rejects invalid localDateTime format", () => {
    expect(() =>
      CreateCheckinSchema.parse({ ...validMorning, localDateTime: "20-02-2026" }),
    ).toThrow();
  });

  it("rejects array of wrong length", () => {
    expect(() =>
      CreateCheckinSchema.parse({
        ...validMorning,
        whatImGratefulFor: ["only one item"],
      }),
    ).toThrow();
  });
});

describe("CreateNoteSchema", () => {
  const valid = {
    contentJson: { type: "doc", content: [] },
    plainText: "Quick thought",
    wordCount: 2,
  };

  it("accepts valid note", () => {
    expect(CreateNoteSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional title", () => {
    const result = CreateNoteSchema.parse({ ...valid, title: "My Note" });
    expect(result.title).toBe("My Note");
  });

  it("rejects title longer than 200 characters", () => {
    expect(() =>
      CreateNoteSchema.parse({ ...valid, title: "x".repeat(201) }),
    ).toThrow();
  });
});

describe("UpdateCheckinSchema", () => {
  it("accepts partial morning update with only affirmation", () => {
    const result = UpdateCheckinSchema.parse({
      checkInType: "morning",
      dailyAffirmation: "I am great",
    });
    expect(result.checkInType).toBe("morning");
    if (result.checkInType === "morning") {
      expect(result.dailyAffirmation).toBe("I am great");
      expect(result.whatImGratefulFor).toBeUndefined();
    }
  });

  it("accepts updating mood and emotions", () => {
    const result = UpdateCheckinSchema.parse({
      checkInType: "morning",
      mood: 9,
      emotions: ["grateful"],
    });
    expect(result.mood).toBe(9);
  });

  it("accepts partial evening update", () => {
    const result = UpdateCheckinSchema.parse({
      checkInType: "evening",
      whatDidILearnToday: "Consistency matters",
    });
    expect(result.checkInType).toBe("evening");
  });

  it("rejects missing checkInType", () => {
    expect(() => UpdateCheckinSchema.parse({ dailyAffirmation: "test" })).toThrow();
  });
});

describe("UpdateNoteSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateNoteSchema.parse({ title: "Updated" });
    expect(result.title).toBe("Updated");
  });

  it("allows nullable title", () => {
    const result = UpdateNoteSchema.parse({ title: null });
    expect(result.title).toBeNull();
  });
});

describe("ListEntriesQuerySchema", () => {
  it("applies default limit", () => {
    const result = ListEntriesQuerySchema.parse({});
    expect(result.limit).toBe(20);
  });

  it("coerces string limit to number", () => {
    const result = ListEntriesQuerySchema.parse({ limit: "50" });
    expect(result.limit).toBe(50);
  });

  it("accepts type filter", () => {
    const result = ListEntriesQuerySchema.parse({ type: "checkin" });
    expect(result.type).toBe("checkin");
  });

  it("rejects invalid type", () => {
    expect(() => ListEntriesQuerySchema.parse({ type: "invalid" })).toThrow();
  });
});

describe("DiaryEventPayloadSchema", () => {
  const validEvent = {
    eventName: "diary.entry.created",
    eventVersion: 1,
    eventId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    occurredAt: "2026-02-20T10:00:00.000Z",
    aggregate: { type: "checkin", id: "01ARZ3NDEKTSV4RRFFQ69G5FAX" },
    actor: { userId: "local-user" },
    globalSequence: 1,
    aggregateVersion: 1,
    data: {
      entrySnapshot: { id: "01ARZ3NDEKTSV4RRFFQ69G5FAX", type: "checkin" },
      derived: {
        localDateTime: "2026-02-20T09:30",
        checkInType: "morning",
        mood: 7,
        emotions: ["happy"],
        triggers: ["exercise"],
        whatImGratefulFor: ["Good health", "", ""],
        whatWouldMakeDayGreat: null,
        dailyAffirmation: "I am ready",
        highlightsOfTheDay: null,
        whatDidILearnToday: null,
      },
      metadata: { source: "diary", schema: "diary.event.v1" },
    },
  };

  it("accepts valid event payload", () => {
    expect(DiaryEventPayloadSchema.parse(validEvent)).toMatchObject(validEvent);
  });

  it("rejects wrong event version", () => {
    expect(() =>
      DiaryEventPayloadSchema.parse({ ...validEvent, eventVersion: 2 }),
    ).toThrow();
  });

  it("rejects wrong metadata source", () => {
    expect(() =>
      DiaryEventPayloadSchema.parse({
        ...validEvent,
        data: {
          ...validEvent.data,
          metadata: { source: "other", schema: "diary.event.v1" },
        },
      }),
    ).toThrow();
  });
});

describe("OutboxQuerySchema", () => {
  it("applies default limit", () => {
    const result = OutboxQuerySchema.parse({});
    expect(result.limit).toBe(100);
  });

  it("coerces afterGlobalSequence", () => {
    const result = OutboxQuerySchema.parse({ afterGlobalSequence: "42" });
    expect(result.afterGlobalSequence).toBe(42);
  });
});

describe("ReplayBodySchema", () => {
  it("defaults dryRun to false", () => {
    const result = ReplayBodySchema.parse({});
    expect(result.dryRun).toBe(false);
  });

  it("accepts range and dryRun", () => {
    const result = ReplayBodySchema.parse({
      fromGlobalSequence: 1,
      toGlobalSequence: 100,
      dryRun: true,
    });
    expect(result.dryRun).toBe(true);
    expect(result.fromGlobalSequence).toBe(1);
    expect(result.toGlobalSequence).toBe(100);
  });
});

describe("EntryResponseSchema", () => {
  it("accepts a morning check-in response", () => {
    const entry = {
      id: "01ARZ",
      type: "checkin",
      mood: 8,
      emotions: ["happy"],
      triggers: ["exercise"],
      checkInType: "morning",
      whatImGratefulFor: ["Good health", "", ""],
      whatWouldMakeDayGreat: ["Stay focused", "", ""],
      dailyAffirmation: "I am capable",
      highlightsOfTheDay: [],
      whatDidILearnToday: null,
      title: null,
      contentJson: null,
      plainText: null,
      wordCount: null,
      noteFolderId: null,
      noteFolderPath: null,
      projectId: null,
      project: null,
      tags: [],
      localDateTime: "2026-02-20T09:30",
      createdAt: "2026-02-20T10:00:00.000Z",
      updatedAt: "2026-02-20T10:00:00.000Z",
    };
    expect(EntryResponseSchema.parse(entry)).toMatchObject(entry);
  });

  it("accepts a note response", () => {
    const entry = {
      id: "01ARZ",
      type: "note",
      mood: null,
      emotions: [],
      triggers: [],
      checkInType: null,
      whatImGratefulFor: [],
      whatWouldMakeDayGreat: [],
      dailyAffirmation: null,
      highlightsOfTheDay: [],
      whatDidILearnToday: null,
      contentJson: {},
      plainText: "test",
      wordCount: 1,
      title: "My Note",
      noteFolderId: null,
      noteFolderPath: null,
      projectId: null,
      project: null,
      tags: [],
      localDateTime: "2026-02-20T09:30",
      createdAt: "2026-02-20T10:00:00.000Z",
      updatedAt: "2026-02-20T10:00:00.000Z",
    };
    expect(EntryResponseSchema.parse(entry)).toMatchObject(entry);
  });
});

describe("CreateNoteFolderSchema", () => {
  it("accepts nested folder path", () => {
    const result = CreateNoteFolderSchema.parse({ path: "work/projects/2026" });
    expect(result.path).toBe("work/projects/2026");
  });

  it("rejects blank path", () => {
    expect(() => CreateNoteFolderSchema.parse({ path: "  " })).toThrow();
  });
});
