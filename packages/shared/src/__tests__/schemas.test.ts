import { describe, expect, it } from "vitest";
import {
  CreateCheckinSchema,
  DiaryEventPayloadSchema,
  EntryResponseSchema,
  ListEntriesQuerySchema,
  OutboxQuerySchema,
  ReplayBodySchema,
  UpdateCheckinSchema,
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
    const result = CreateCheckinSchema.parse({
      ...validMorning,
      localDateTime: "2026-02-20T09:30",
    });
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
    expect(() => CreateCheckinSchema.parse({ ...validMorning, dailyAffirmation: "   " })).toThrow();
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

  it("accepts valid basic check-in with required note", () => {
    const result = CreateCheckinSchema.parse({
      checkInType: "basic" as const,
      mood: 5,
      emotions: ["calm"],
      triggers: ["work"],
      contentJson: { blocks: [] },
      plainText: "Daily reflection.",
      wordCount: 2,
    });
    expect(result.checkInType).toBe("basic");
    expect(result.plainText).toBe("Daily reflection.");
  });

  it("rejects basic check-in without note", () => {
    expect(() =>
      CreateCheckinSchema.parse({
        checkInType: "basic" as const,
        mood: 5,
        emotions: ["calm"],
        triggers: ["work"],
      }),
    ).toThrow();
  });

  it("accepts morning check-in with optional rich note (all three fields)", () => {
    const result = CreateCheckinSchema.parse({
      ...validMorning,
      contentJson: { blocks: [] },
      plainText: "Side note",
      wordCount: 2,
    });
    expect(result.plainText).toBe("Side note");
  });

  it("rejects partial optional note on create", () => {
    expect(() =>
      CreateCheckinSchema.parse({
        ...validMorning,
        plainText: "only this",
      }),
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

  it("accepts basic update with only mood", () => {
    const result = UpdateCheckinSchema.parse({
      checkInType: "basic",
      mood: 4,
    });
    expect(result.checkInType).toBe("basic");
  });

  it("accepts clearing check-in note with null triple for morning", () => {
    const result = UpdateCheckinSchema.parse({
      checkInType: "morning",
      contentJson: null,
      plainText: null,
      wordCount: null,
    });
    expect(result.plainText).toBeNull();
  });

  it("rejects clearing note on basic check-in", () => {
    expect(() =>
      UpdateCheckinSchema.parse({
        checkInType: "basic",
        contentJson: null,
        plainText: null,
        wordCount: null,
      }),
    ).toThrow();
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

  it("accepts optional cursor", () => {
    const result = ListEntriesQuerySchema.parse({ cursor: "01ARZ3NDEKTSV4RRFFQ69G5FAX" });
    expect(result.cursor).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAX");
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
        checkInNotePlainText: null,
      },
      metadata: { source: "diary", schema: "diary.event.v1" },
    },
  };

  it("accepts valid event payload", () => {
    expect(DiaryEventPayloadSchema.parse(validEvent)).toMatchObject(validEvent);
  });

  it("rejects wrong event version", () => {
    expect(() => DiaryEventPayloadSchema.parse({ ...validEvent, eventVersion: 2 })).toThrow();
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
      contentJson: null,
      plainText: null,
      wordCount: null,
      localDateTime: "2026-02-20T09:30",
      createdAt: "2026-02-20T10:00:00.000Z",
      updatedAt: "2026-02-20T10:00:00.000Z",
    };
    expect(EntryResponseSchema.parse(entry)).toMatchObject(entry);
  });
});
