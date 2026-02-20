import { describe, it, expect } from "vitest";
import {
  CreateCheckinSchema,
  CreateShortNoteSchema,
  UpdateCheckinSchema,
  UpdateShortNoteSchema,
  ListEntriesQuerySchema,
  DiaryEventPayloadSchema,
  EntryResponseSchema,
  OutboxQuerySchema,
  ReplayBodySchema,
} from "../index.js";

describe("CreateCheckinSchema", () => {
  const valid = {
    mood: 7,
    contentJson: { type: "doc", content: [] },
    plainText: "Feeling good today",
    wordCount: 3,
    emotions: ["happy"],
    triggers: ["exercise"],
  };

  it("accepts valid checkin", () => {
    expect(CreateCheckinSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional timeOfDay and localDate", () => {
    const withOptionals = { ...valid, timeOfDay: "morning", localDate: "2026-02-20" };
    expect(CreateCheckinSchema.parse(withOptionals).timeOfDay).toBe("morning");
  });

  it("rejects mood outside 1-10", () => {
    expect(() => CreateCheckinSchema.parse({ ...valid, mood: 0 })).toThrow();
    expect(() => CreateCheckinSchema.parse({ ...valid, mood: 11 })).toThrow();
  });

  it("rejects empty emotions array", () => {
    expect(() => CreateCheckinSchema.parse({ ...valid, emotions: [] })).toThrow();
  });

  it("rejects more than 5 triggers", () => {
    expect(() =>
      CreateCheckinSchema.parse({
        ...valid,
        triggers: ["a", "b", "c", "d", "e", "f"],
      }),
    ).toThrow();
  });

  it("rejects invalid localDate format", () => {
    expect(() =>
      CreateCheckinSchema.parse({ ...valid, localDate: "20-02-2026" }),
    ).toThrow();
  });
});

describe("CreateShortNoteSchema", () => {
  const valid = {
    contentJson: { type: "doc", content: [] },
    plainText: "Quick thought",
    wordCount: 2,
  };

  it("accepts valid short note", () => {
    expect(CreateShortNoteSchema.parse(valid)).toMatchObject(valid);
  });

  it("accepts optional title", () => {
    const result = CreateShortNoteSchema.parse({ ...valid, title: "My Note" });
    expect(result.title).toBe("My Note");
  });

  it("rejects title longer than 200 characters", () => {
    expect(() =>
      CreateShortNoteSchema.parse({ ...valid, title: "x".repeat(201) }),
    ).toThrow();
  });
});

describe("UpdateCheckinSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateCheckinSchema.parse({ mood: 5 });
    expect(result.mood).toBe(5);
    expect(result.contentJson).toBeUndefined();
  });

  it("accepts empty object", () => {
    expect(UpdateCheckinSchema.parse({})).toEqual({});
  });

  it("allows nullable timeOfDay", () => {
    const result = UpdateCheckinSchema.parse({ timeOfDay: null });
    expect(result.timeOfDay).toBeNull();
  });
});

describe("UpdateShortNoteSchema", () => {
  it("accepts partial update", () => {
    const result = UpdateShortNoteSchema.parse({ title: "Updated" });
    expect(result.title).toBe("Updated");
  });

  it("allows nullable title", () => {
    const result = UpdateShortNoteSchema.parse({ title: null });
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
        plainText: "Test",
        wordCount: 1,
        localDate: "2026-02-20",
        timeOfDay: null,
        mood: 7,
        emotions: ["happy"],
        triggers: ["work"],
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
  it("accepts a checkin response", () => {
    const entry = {
      id: "01ARZ",
      type: "checkin",
      contentJson: {},
      plainText: "test",
      wordCount: 1,
      mood: 5,
      emotions: ["calm"],
      triggers: ["meditation"],
      timeOfDay: "morning",
      title: null,
      localDate: "2026-02-20",
      createdAt: "2026-02-20T10:00:00.000Z",
      updatedAt: "2026-02-20T10:00:00.000Z",
    };
    expect(EntryResponseSchema.parse(entry)).toMatchObject(entry);
  });

  it("accepts a short_note response", () => {
    const entry = {
      id: "01ARZ",
      type: "short_note",
      contentJson: {},
      plainText: "test",
      wordCount: 1,
      mood: null,
      emotions: [],
      triggers: [],
      timeOfDay: null,
      title: "My Note",
      localDate: "2026-02-20",
      createdAt: "2026-02-20T10:00:00.000Z",
      updatedAt: "2026-02-20T10:00:00.000Z",
    };
    expect(EntryResponseSchema.parse(entry)).toMatchObject(entry);
  });
});
