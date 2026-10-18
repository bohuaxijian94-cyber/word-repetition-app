import Dexie, { type Table } from "dexie";
import type { Word } from "./domain";
import { isDemo, demoWords } from "./demo";
export type Review = {
  id?: number;
  wordId: number;
  time: number;
  quality: number;
};
class Database extends Dexie {
  words!: Table<Word, number>;
  reviews!: Table<Review, number>;
  constructor() {
    super(isDemo ? "mon-francais-demo" : "mon-francais");
    this.version(1).stores({
      words: "++id,due,known,source,test",
      reviews: "++id,wordId,time",
    });
  }
}
export const db = new Database();

export async function seedDemo() {
  if (!isDemo) return;
  await db.transaction("rw", db.words, async () => {
    if ((await db.words.count()) === 0) await db.words.bulkAdd(demoWords());
  });
}
