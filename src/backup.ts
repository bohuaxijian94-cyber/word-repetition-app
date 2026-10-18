import type { Word } from "./domain";
import { validateWord } from "./domain";
import type { Review } from "./db";
import { safeUrl, type LearningBackup } from "./learning";
export type Material = { name: string; unit: string; url: string };
export type Backup = {
  version: 1;
  words: Word[];
  reviews: Review[];
  materials: Material[];
  learning?: LearningBackup;
};
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const natural = (x: unknown): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= 0;
const identifier = (x: unknown): x is number =>
  natural(x) && Number.isSafeInteger(x) && x > 0;
export function parseBackup(text: string): Backup {
  const data: unknown = JSON.parse(text);
  if (
    !object(data) ||
    data.version !== 1 ||
    !Array.isArray(data.words) ||
    !Array.isArray(data.reviews) ||
    !Array.isArray(data.materials)
  )
    throw new Error("このアプリのJSONバックアップを選んでください。");
  const ids = new Set<number>();
  const words = data.words.map((value, i) => {
    if (!object(value)) throw new Error(`単語${i + 1}の形式が不正です。`);
    const strings = [
      "french",
      "japanese",
      "part",
      "gender",
      "example",
      "tags",
      "source",
      "unit",
      "test",
      "deadline",
      "conjugations",
      "verbGroup",
    ];
    if (
      strings.some((key) => typeof value[key] !== "string") ||
      !identifier(value.id) ||
      ids.has(value.id) ||
      typeof value.known !== "boolean" ||
      !["created", "due", "interval", "ease", "repetitions"].every((key) =>
        natural(value[key]),
      ) ||
      !["", "m", "f"].includes(value.gender as string)
    )
      throw new Error(`単語${i + 1}のデータが不正です。`);
    ids.add(value.id);
    const w = value as unknown as Word;
    const problem = validateWord(w);
    if (problem) throw new Error(`単語${i + 1}: ${problem}`);
    return w;
  });
  const reviews = data.reviews.map((value) => {
    if (
      !object(value) ||
      !identifier(value.wordId) ||
      !ids.has(value.wordId) ||
      !natural(value.time) ||
      ![1, 3, 4, 5].includes(value.quality as number)
    )
      throw new Error("復習履歴のデータが不正です。");
    return {
      wordId: value.wordId,
      time: value.time,
      quality: value.quality as number,
    };
  });
  const materials = data.materials.map((value) => {
    if (
      !object(value) ||
      ["name", "unit", "url"].some((key) => typeof value[key] !== "string") ||
      (value.url && !safeUrl(value.url as string))
    )
      throw new Error("教材データが不正です。");
    return {
      name: value.name as string,
      unit: value.unit as string,
      url: value.url as string,
    };
  });
  let learning: LearningBackup | undefined;
  if (data.learning !== undefined) {
    const raw = data.learning;
    if (
      !object(raw) ||
      !object(raw.settings) ||
      !Array.isArray(raw.practice) ||
      !(raw.night === null || object(raw.night))
    )
      throw new Error("学習設定の形式が不正です。");
    const st = raw.settings;
    const time = (v: unknown) =>
      typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
    const day = (v: unknown) =>
      typeof v === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      Number.isFinite(Date.parse(v));
    if (
      !time(st.wake) ||
      !time(st.bed) ||
      !identifier(st.newPerDay) ||
      st.newPerDay > 100 ||
      typeof st.reminders !== "boolean" ||
      !Array.isArray(st.exams)
    )
      throw new Error("学習設定の内容が不正です。");
    for (const exam of st.exams)
      if (
        !object(exam) ||
        typeof exam.id !== "string" ||
        typeof exam.name !== "string" ||
        !day(exam.deadline) ||
        typeof exam.source !== "string" ||
        !Array.isArray(exam.units) ||
        exam.units.some((u) => typeof u !== "string")
      )
        throw new Error("テスト範囲の形式が不正です。");
    for (const record of raw.practice)
      if (
        !object(record) ||
        !identifier(record.wordId) ||
        !ids.has(record.wordId) ||
        !natural(record.time) ||
        ![1, 3, 4, 5].includes(record.quality as number) ||
        !["morning", "night"].includes(record.kind as string)
      )
        throw new Error("朝晩の練習履歴が不正です。");
    if (
      raw.night !== null &&
      (!day(raw.night.day) ||
        !Array.isArray(raw.night.ids) ||
        raw.night.ids.some((id) => !identifier(id) || !ids.has(id)))
    )
      throw new Error("寝る前のセットが不正です。");
    if (
      raw.listeningDays !== undefined &&
      (!Array.isArray(raw.listeningDays) ||
        raw.listeningDays.some((v) => !day(v)))
    )
      throw new Error("リスニングの記録が不正です。");
    learning = raw as unknown as LearningBackup;
  }
  return { version: 1, words, reviews, materials, learning };
}
