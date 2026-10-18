import { describe, it, expect } from "vitest";
import {
  blankWord,
  validateWord,
  gradeWord,
  dueWords,
  importWords,
  csvExport,
  cloze,
} from "./domain";
describe("SRS", () => {
  it("schedules successful recall at 1, 3, 7 days and resets on failure", () => {
    let w = blankWord();
    for (const days of [1, 3, 7]) {
      w = gradeWord(w, 4, 0);
      expect(w.interval).toBe(days);
      expect(w.due).toBe(days * 86400000);
    }
    w = gradeWord(w, 1, 0);
    expect(w.repetitions).toBe(0);
    expect(w.interval).toBe(1);
    expect(w.ease).toBeGreaterThanOrEqual(1.3);
  });
  it("only returns due and unknown cards, prioritising test deadlines", () => {
    const w = blankWord();
    expect(
      dueWords(
        [
          { ...w, french: "later", due: 200 },
          { ...w, french: "known", known: true, due: 0 },
          { ...w, french: "normal", due: 0 },
          { ...w, french: "test", due: 0, deadline: "2026-10-20" },
        ],
        100,
      ).map((w) => w.french),
    ).toEqual(["test", "normal"]);
  });
});
describe("imports and validation", () => {
  it("requires gender for nouns and both translations", () => {
    expect(
      validateWord({ ...blankWord(), french: "chat", japanese: "猫" }),
    ).toContain("性");
    expect(
      validateWord({
        ...blankWord(),
        french: "chat",
        japanese: "猫",
        gender: "m",
      }),
    ).toBe("");
    expect(validateWord(blankWord())).toContain("日本語");
  });
  it("reads Japanese TSV copied from a document", () => {
    const [w] = importWords(
      "フランス語\t日本語訳\t品詞\t性\t教材\nchat\t猫\t名詞\tle\t教科書1",
    );
    expect(w.gender).toBe("m");
    expect(w.source).toBe("教科書1");
  });
  it("roundtrips commas, quotes and multiline examples", () => {
    const w = {
      ...blankWord(),
      french: "bonjour",
      japanese: "こんにちは",
      part: "その他",
      example: 'Il dit "bonjour",\net sourit.',
    };
    const [result] = importWords(csvExport([w]));
    expect(result.example).toBe(w.example);
    expect(result.french).toBe(w.french);
  });
  it("rejects invalid rows atomically, unmatched quotes, and empty lists", () => {
    expect(() => importWords("chat,猫,名詞,m\nmaison,家,名詞,")).toThrow(
      "2行目",
    );
    expect(() => importWords('"chat,猫')).toThrow("引用符");
    expect(() => importWords("french,japanese")).toThrow("追加");
  });
  it("handles regex characters literally in cloze", () => {
    expect(
      cloze({ ...blankWord(), french: "a+b", example: "Un a+b ici." }),
    ).toBe("Un _____ ici.");
  });
});
