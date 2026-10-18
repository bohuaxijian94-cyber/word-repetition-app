import { describe, it, expect } from "vitest";
import { blankWord } from "./domain";
import {
  dayKey,
  previousDay,
  learnedToday,
  limitNewWords,
  quizIds,
  streak,
  matchesExam,
} from "./learning";
import { parseBackup } from "./backup";
const noon = new Date(2026, 9, 18, 12).getTime();
const yesterday = new Date(2026, 9, 17, 12).getTime();
describe("daily learning", () => {
  it("uses local calendar dates and first recall, not registration or repeated recall", () => {
    expect(dayKey(noon)).toBe("2026-10-18");
    expect(previousDay(noon)).toBe("2026-10-17");
    expect(
      learnedToday(
        [
          { wordId: 1, time: yesterday, quality: 4 },
          { wordId: 1, time: noon, quality: 4 },
          { wordId: 2, time: noon, quality: 4 },
        ],
        noon,
      ),
    ).toEqual([2]);
  });
  it("respects new-word limits while retaining previously seen cards", () => {
    const cards = [1, 2, 3].map((id) => ({ ...blankWord(), id }));
    expect(
      limitNewWords(
        cards,
        [{ wordId: 1, time: yesterday, quality: 1 }],
        1,
        noon,
      ).map((w) => w.id),
    ).toEqual([1, 2]);
    expect(
      limitNewWords(
        cards,
        [{ wordId: 1, time: noon, quality: 4 }],
        1,
        noon,
      ).map((w) => w.id),
    ).toEqual([1]);
  });
  it("selects today-first-learned at night and last night plus due in the morning", () => {
    const words = [
      { ...blankWord(), id: 1, due: noon + 86400000 },
      { ...blankWord(), id: 2, due: noon - 1000 },
      { ...blankWord(), id: 3, due: noon - 1000, known: true },
    ];
    const reviews = [{ wordId: 1, time: noon, quality: 4 }];
    expect(quizIds("night", words, reviews, null, noon)).toEqual([1]);
    expect(
      quizIds("morning", words, reviews, { day: "2026-10-17", ids: [1] }, noon),
    ).toEqual([1, 2]);
    expect(
      quizIds("morning", words, reviews, { day: "2026-10-16", ids: [1] }, noon),
    ).toEqual([2]);
  });
  it("counts yesterday streak without requiring today to be finished", () => {
    expect(streak([yesterday, yesterday - 86400000], noon)).toBe(2);
    expect(streak([noon, yesterday], noon)).toBe(2);
    expect(streak([], noon)).toBe(0);
  });
  it("filters multiple units and a textbook with exact identities", () => {
    const exam = {
      id: "1",
      name: "期末",
      deadline: "2026-11-01",
      source: "教科書1",
      units: ["第1課", "第3課"],
    };
    expect(
      matchesExam({ ...blankWord(), source: "教科書1", unit: "第3課" }, exam),
    ).toBe(true);
    expect(
      matchesExam({ ...blankWord(), source: "教科書2", unit: "第3課" }, exam),
    ).toBe(false);
  });
});
describe("backup validation", () => {
  const word = {
    ...blankWord(),
    id: 1,
    french: "chat",
    japanese: "猫",
    gender: "m",
  };
  it("reads existing exports and strips old review primary keys for safe remapping", () => {
    const backup = parseBackup(
      JSON.stringify({
        version: 1,
        words: [word],
        reviews: [{ id: 5, wordId: 1, time: noon, quality: 4 }],
        materials: [],
      }),
    );
    expect(backup.reviews[0]).toEqual({ wordId: 1, time: noon, quality: 4 });
  });
  it("rejects duplicate IDs, orphan history and unsafe audio URLs before any write", () => {
    for (const data of [
      { version: 1, words: [word, word], reviews: [], materials: [] },
      {
        version: 1,
        words: [word],
        reviews: [{ wordId: 2, time: noon, quality: 4 }],
        materials: [],
      },
      {
        version: 1,
        words: [word],
        reviews: [],
        materials: [{ name: "x", unit: "", url: "javascript:alert(1)" }],
      },
    ])
      expect(() => parseBackup(JSON.stringify(data))).toThrow();
  });
});
