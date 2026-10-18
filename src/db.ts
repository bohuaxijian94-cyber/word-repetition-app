import Dexie, { type Table } from "dexie";
import type { Word } from "./domain";
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
    super("mon-francais");
    this.version(1).stores({
      words: "++id,due,known,source,test",
      reviews: "++id,wordId,time",
    });
  }
}
export const db = new Database();
