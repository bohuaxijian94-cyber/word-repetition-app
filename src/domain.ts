export type Mode = "ja-fr" | "fr-ja" | "listen" | "cloze";
export type Word = {
  id?: number;
  french: string;
  japanese: string;
  part: string;
  gender: "" | "m" | "f";
  example: string;
  tags: string;
  source: string;
  unit: string;
  test: string;
  deadline: string;
  known: boolean;
  conjugations: string;
  verbGroup: string;
  created: number;
  due: number;
  interval: number;
  ease: number;
  repetitions: number;
};
export const blankWord = (): Word => ({
  french: "",
  japanese: "",
  part: "名詞",
  gender: "",
  example: "",
  tags: "",
  source: "",
  unit: "",
  test: "",
  deadline: "",
  known: false,
  conjugations: "",
  verbGroup: "",
  created: Date.now(),
  due: Date.now(),
  interval: 0,
  ease: 2.5,
  repetitions: 0,
});
export function validateWord(word: Word) {
  if (!word.french.trim() || !word.japanese.trim())
    return "フランス語と日本語訳を入力してください。";
  if (word.part === "名詞" && !["m", "f"].includes(word.gender))
    return "名詞の性（le / la）を選んでください。";
  return "";
}
export function gradeWord(word: Word, quality: number, now = Date.now()): Word {
  if (![1, 3, 4, 5].includes(quality)) throw new Error("Invalid grade");
  const ease = Math.max(
    1.3,
    word.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02),
  );
  const repetitions = quality < 3 ? 0 : word.repetitions + 1;
  const interval =
    quality < 3
      ? 1
      : repetitions === 1
        ? 1
        : repetitions === 2
          ? 3
          : repetitions === 3
            ? 7
            : Math.round(word.interval * ease);
  return {
    ...word,
    ease,
    repetitions,
    interval,
    due: now + interval * 86400000,
  };
}
export function dueWords(words: Word[], now = Date.now()) {
  return words
    .filter((w) => !w.known && w.due <= now)
    .sort(
      (a, b) =>
        (a.deadline || "9999").localeCompare(b.deadline || "9999") ||
        a.due - b.due,
    );
}
// Quoted CSV/TSV including embedded newlines and escaped double quotes.
export function parseRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const first = clean.split("\n")[0];
  const separator = first.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (quoted && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (ch === separator || ch === "\n")) {
      row.push(cell.trim());
      cell = "";
      if (ch === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else cell += ch;
  }
  if (quoted)
    throw new Error("引用符が閉じていません。CSVの形式を確認してください。");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
const headers: Record<string, keyof Word> = {
  french: "french",
  フランス語: "french",
  japanese: "japanese",
  日本語: "japanese",
  日本語訳: "japanese",
  part: "part",
  品詞: "part",
  gender: "gender",
  性: "gender",
  example: "example",
  例文: "example",
  tags: "tags",
  タグ: "tags",
  source: "source",
  教材: "source",
  unit: "unit",
  単元: "unit",
  test: "test",
  テスト: "test",
  deadline: "deadline",
  期限: "deadline",
  conjugations: "conjugations",
  活用: "conjugations",
  verbgroup: "verbGroup",
  動詞分類: "verbGroup",
};
export function importWords(text: string): Word[] {
  const rows = parseRows(text);
  if (!rows.length) throw new Error("取り込むデータがありません。");
  const withHeader = ["french", "フランス語"].includes(
    rows[0][0].toLowerCase(),
  );
  const keys = withHeader
    ? rows.shift()!.map((h) => headers[h.toLowerCase()])
    : [
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
      ];
  if (!keys.includes("french") || !keys.includes("japanese"))
    throw new Error("フランス語・日本語の列が必要です。");
  if (!rows.length) throw new Error("ヘッダーの下に単語を追加してください。");
  return rows.map((row, index) => {
    const data: Record<string, string> = {};
    row.forEach((value, i) => {
      if (keys[i]) data[keys[i]] = value;
    });
    const gender =
      (
        { le: "m", la: "f", m: "m", f: "f", 男性: "m", 女性: "f" } as Record<
          string,
          string
        >
      )[data.gender?.toLowerCase()] || "";
    const word = {
      ...blankWord(),
      ...data,
      part:
        (
          {
            noun: "名詞",
            verb: "動詞",
            adjective: "形容詞",
            adverb: "副詞",
          } as Record<string, string>
        )[data.part] ||
        data.part ||
        "名詞",
      gender,
    } as Word;
    const error = validateWord(word);
    if (error) throw new Error(`${index + (withHeader ? 2 : 1)}行目：${error}`);
    if (
      word.deadline &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(word.deadline) ||
        !Number.isFinite(Date.parse(word.deadline)))
    )
      throw new Error(
        `${index + 1}行目：期限は YYYY-MM-DD 形式で指定してください。`,
      );
    return word;
  });
}
export function csvExport(words: Word[]): string {
  const keys: (keyof Word)[] = [
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
  const quote = (s: unknown) =>
    '"' + String(s ?? "").replaceAll('"', '""') + '"';
  return (
    "\uFEFF" +
    [
      keys.join(","),
      ...words.map((w) => keys.map((k) => quote(w[k])).join(",")),
    ].join("\r\n")
  );
}
export function cloze(word: Word) {
  return word.example.replace(
    new RegExp(word.french.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
    "_____",
  );
}
