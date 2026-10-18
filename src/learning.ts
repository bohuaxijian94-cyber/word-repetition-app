import { dueWords, type Word } from "./domain";
import type { Review } from "./db";
export function dayKey(time = Date.now()): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function previousDay(time = Date.now()) {
  const d = new Date(time);
  d.setDate(d.getDate() - 1);
  return dayKey(d.getTime());
}
export function learnedToday(reviews: Review[], now = Date.now()): number[] {
  const first = new Map<number, number>();
  for (const r of reviews)
    first.set(r.wordId, Math.min(first.get(r.wordId) ?? Infinity, r.time));
  return [...first]
    .filter(([, time]) => dayKey(time) === dayKey(now))
    .map(([id]) => id);
}
export function limitNewWords(
  queue: Word[],
  reviews: Review[],
  limit: number,
  now = Date.now(),
): Word[] {
  const seen = new Set(reviews.map((r) => r.wordId));
  let available = Math.max(0, limit - learnedToday(reviews, now).length);
  return queue.filter((w) => seen.has(w.id!) || available-- > 0);
}
export function streak(times: number[], now = Date.now()): number {
  const days = new Set(times.map((t) => dayKey(t)));
  const d = new Date(now);
  if (!days.has(dayKey(now))) d.setDate(d.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(d.getTime()))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}
export type Exam = {
  id: string;
  name: string;
  deadline: string;
  source: string;
  units: string[];
};
export type Settings = {
  wake: string;
  bed: string;
  newPerDay: number;
  reminders: boolean;
  exams: Exam[];
};
export const defaultSettings: Settings = {
  wake: "07:00",
  bed: "22:30",
  newPerDay: 10,
  reminders: false,
  exams: [],
};
export type Practice = {
  wordId: number;
  time: number;
  quality: number;
  kind: "morning" | "night";
};
export type Night = { day: string; ids: number[] };
export type Quiz = {
  kind: "morning" | "night";
  ids: number[];
  done: number[];
  started: number;
};
export function quizIds(
  kind: Quiz["kind"],
  words: Word[],
  reviews: Review[],
  night: Night | null,
  now = Date.now(),
  limit = 10,
): number[] {
  const dueIds = new Set(
    limitNewWords(dueWords(words, now), reviews, limit, now).map((w) => w.id),
  );
  const ids =
    kind === "night"
      ? new Set(learnedToday(reviews, now))
      : new Set(
          night && (night.day === previousDay(now) || night.day === dayKey(now))
            ? night.ids
            : [],
        );
  return words
    .filter(
      (w) =>
        !w.known &&
        (ids.has(w.id!) || (kind === "morning" && dueIds.has(w.id))),
    )
    .map((w) => w.id!);
}
export function matchesExam(w: Word, exam: Exam): boolean {
  return (
    (!exam.source || w.source === exam.source) &&
    (!exam.units.length || exam.units.includes(w.unit))
  );
}
export function safeUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
export type LearningBackup = {
  settings: Settings;
  practice: Practice[];
  night: Night | null;
  listeningDays?: string[];
};

export function delayedRecall(reviews: Review[]) {
  const last = new Map<number, number>();
  let total = 0,
    successful = 0;
  for (const review of [...reviews].sort((a, b) => a.time - b.time)) {
    const previous = last.get(review.wordId);
    if (previous !== undefined && review.time - previous >= 86400000) {
      total++;
      if (review.quality >= 3) successful++;
    }
    last.set(review.wordId, review.time);
  }
  return {
    total,
    successful,
    percent: total ? Math.round((100 * successful) / total) : null,
  };
}
