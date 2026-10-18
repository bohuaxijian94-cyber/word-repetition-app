import { blankWord, type Word } from "./domain";
export const isDemo =
  new URLSearchParams(window.location.search).get("demo") === "1";
export const materialsKey = isDemo
  ? "mon-francais-demo-materials"
  : "materials";
export const demoImport =
  "french,japanese,part,gender,example,tags,source,unit,test\npomme,りんご,名詞,f,Je mange une pomme.,デモ,デモ教科書,第3課,Q3";
export function demoWords(now = Date.now()): Word[] {
  const examples: Partial<Word>[] = [
    { french: "chat", japanese: "猫", gender: "m", example: "Le chat dort." },
    {
      french: "maison",
      japanese: "家",
      gender: "f",
      example: "La maison est jolie.",
    },
    {
      french: "livre",
      japanese: "本",
      gender: "m",
      example: "Je lis un livre.",
    },
    {
      french: "cahier",
      japanese: "ノート",
      gender: "m",
      example: "Voici mon cahier.",
    },
    {
      french: "parler",
      japanese: "話す",
      part: "動詞",
      example: "Je veux parler français.",
      verbGroup: "-er",
      conjugations:
        "je parle, tu parles, il/elle parle, nous parlons, vous parlez, ils/elles parlent",
    },
    {
      french: "bonjour",
      japanese: "こんにちは",
      part: "その他",
      example: "Je dis bonjour.",
    },
  ];
  return examples.map((example, i) => ({
    ...blankWord(),
    ...example,
    source: "デモ教科書",
    unit: "第3課",
    test: "Q3",
    tags: "デモ",
    created: now - 86400000,
    due: now - 60000 + i,
  }));
}
