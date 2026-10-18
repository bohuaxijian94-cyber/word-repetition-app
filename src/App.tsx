import { useEffect, useState, type FormEvent } from "react";
import { db, seedDemo } from "./db";
import DemoGuide from "./DemoGuide";
import { isDemo, materialsKey, demoImport } from "./demo";
import {
  blankWord,
  validateWord,
  gradeWord,
  dueWords,
  importWords,
  csvExport,
  cloze,
  type Word,
  type Mode,
} from "./domain";
type Page = "home" | "review" | "words" | "import";
const labels: Record<Page, string> = {
  home: "今日の学習",
  review: "フラッシュカード",
  words: "単語帳",
  import: "一括取り込み",
};
const modes: Record<Mode, string> = {
  "ja-fr": "日本語 → フランス語",
  "fr-ja": "フランス語 → 日本語",
  listen: "聞き取り",
  cloze: "文の穴埋め",
};
function download(name: string, data: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function App() {
  const [page, setPage] = useState<Page>("home"),
    [words, setWords] = useState<Word[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const [draft, setDraft] = useState<Word>(blankWord),
    [editing, setEditing] = useState(false),
    [text, setText] = useState(""),
    [preview, setPreview] = useState<Word[] | null>(null);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [mode, setMode] = useState<Mode>("ja-fr"),
    [answer, setAnswer] = useState(""),
    [gender, setGender] = useState(""),
    [revealed, setRevealed] = useState(false),
    [reviewCount, setReviewCount] = useState(0);
  const [materials, setMaterials] = useState<
    { name: string; unit: string; url: string }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem(materialsKey) || "[]");
    } catch {
      return [];
    }
  });
  const [materialName, setMaterialName] = useState(""),
    [materialUnit, setMaterialUnit] = useState(""),
    [materialUrl, setMaterialUrl] = useState("");
  const refresh = async () => setWords(await db.words.toArray());
  useEffect(() => {
    seedDemo()
      .then(refresh)
      .then(() => setLoaded(true))
      .catch(() =>
        setError(
          "端末の保存領域にアクセスできません。ブラウザの設定を確認してください。",
        ),
      );
  }, []);
  const run = async (action: () => Promise<void>) => {
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "処理に失敗しました。");
    }
  };
  const filtered = words.filter(
    (w) =>
      !filter ||
      [w.test, w.source, w.unit, w.tags].some((s) => s.includes(filter)),
  );
  const due = dueWords(filtered),
    eligible = due.filter(
      (w) => mode !== "cloze" || (w.example && cloze(w) !== w.example),
    );
  const current = eligible[0];
  const resetAnswer = () => {
    setAnswer("");
    setGender("");
    setRevealed(false);
  };
  const navigate = (next: Page) => {
    setPage(next);
    setNotice("");
    setError("");
    resetAnswer();
  };
  const saveWord = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const problem = validateWord(draft);
      if (problem) throw new Error(problem);
      const word = {
        ...draft,
        french: draft.french.trim(),
        japanese: draft.japanese.trim(),
      };
      await db.words.put(word);
      await refresh();
      setDraft(blankWord());
      setEditing(false);
      setNotice("単語を保存しました。");
    });
  };
  const grade = (quality: number) =>
    void run(async () => {
      if (!current?.id) return;
      const now = Date.now();
      await db.transaction("rw", db.words, db.reviews, async () => {
        await db.words.put(gradeWord(current, quality, now));
        await db.reviews.add({ wordId: current.id!, time: now, quality });
      });
      await refresh();
      setReviewCount((n) => n + 1);
      resetAnswer();
    });
  const speak = () => {
    if (!current) return;
    if (!("speechSynthesis" in window)) {
      setError("このブラウザは音声再生に対応していません。");
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(current.french);
    utterance.lang = "fr-FR";
    utterance.rate = 0.85;
    speechSynthesis.speak(utterance);
  };
  const parse = () => {
    setPreview(null);
    setError("");
    try {
      setPreview(importWords(text));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const addMaterial = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (materialUrl) {
      try {
        if (!["https:", "http:"].includes(new URL(materialUrl).protocol))
          throw Error();
      } catch {
        setError("音声URLには http / https のURLを入力してください。");
        return;
      }
    }
    const next = [
      ...materials,
      {
        name: materialName.trim(),
        unit: materialUnit.trim(),
        url: materialUrl.trim(),
      },
    ];
    try {
      localStorage.setItem(materialsKey, JSON.stringify(next));
      setMaterials(next);
      setMaterialName("");
      setMaterialUnit("");
      setMaterialUrl("");
    } catch {
      setError("教材の保存に失敗しました。保存領域を確認してください。");
    }
  };
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-icon">f.</span>
          <span>
            Mon Français<small>わたしの、フランス語。</small>
          </span>
        </a>
        <div className="nav-label">APPRENDRE / 学ぶ</div>
        <nav>
          {(Object.keys(labels) as Page[]).map((key, i) => (
            <button
              key={key}
              className={page === key ? "nav active" : "nav"}
              onClick={() => navigate(key)}
            >
              <span>{["◈", "▱", "▤", "↓"][i]}</span>
              {labels[key]}
              <span className="nav-end">
                {key === "review" && dueWords(words).length > 0
                  ? dueWords(words).length
                  : ""}
              </span>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="leaf">✳</span>
          <p>
            少しずつ、毎日。
            <br />
            <small>Un petit pas chaque jour.</small>
          </p>
        </div>
        <div className="local">
          <span className="dot" /> データはこの端末に保存
        </div>
      </aside>
      <main>
        <header>
          <span>MON ESPACE D’APPRENTISSAGE</span>
          <span>
            {new Intl.DateTimeFormat("ja-JP", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
          </span>
        </header>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
          </div>
        )}
        {(isDemo || page === "home") && (
          <DemoGuide
            busy={demoBusy || !loaded}
            onWords={() => navigate("words")}
            onReview={() => {
              setFilter("");
              setMode("ja-fr");
              navigate("review");
            }}
            onImport={() => {
              navigate("import");
              setText(demoImport);
              setPreview(null);
            }}
            onReset={() =>
              void run(async () => {
                if (!isDemo) return;
                setDemoBusy(true);
                try {
                  await db.transaction("rw", db.words, db.reviews, async () => {
                    await db.words.clear();
                    await db.reviews.clear();
                  });
                  localStorage.removeItem(materialsKey);
                  setMaterials([]);
                  await seedDemo();
                  await refresh();
                  setFilter("");
                  setMode("ja-fr");
                  setReviewCount(0);
                  setQuery("");
                  setText("");
                  setPreview(null);
                  setEditing(false);
                  navigate("home");
                  setNotice("デモを最初の6語に戻しました。");
                } finally {
                  setDemoBusy(false);
                }
              })
            }
          />
        )}
        {page === "home" && (
          <>
            <div className="eyebrow">BONJOUR, ET BIENVENUE</div>
            <h1>今日も、ひとつずつ。</h1>
            <p className="subtitle">
              授業で出会った言葉を、自分の言葉にしていきましょう。
            </p>
            <section className="hero">
              <div>
                <div className="eyebrow">VOTRE RENDEZ-VOUS DU JOUR</div>
                <h2>記憶に、もう一度会いに。</h2>
                <p>
                  {dueWords(words).length
                    ? `今日は ${dueWords(words).length} 語があなたの復習を待っています。`
                    : "新しい単語を登録して、今日の学習を始めましょう。"}
                  <br />
                  思い出すたび、フランス語が少し近くなる。
                </p>
                <button
                  className="primary"
                  onClick={() =>
                    navigate(dueWords(words).length ? "review" : "words")
                  }
                >
                  {dueWords(words).length
                    ? "今日の復習をはじめる"
                    : "最初の単語を登録する"}{" "}
                  <span>→</span>
                </button>
                <small>自分で答える → 答え合わせ → 次の復習へ</small>
              </div>
              <div className="hero-art" aria-hidden="true">
                <span className="orbit" />
                <div className="paper back">un petit pas</div>
                <div className="paper front">
                  <span>LE MOT DU JOUR</span>
                  <b>apprendre</b>
                  <i>/ a.pʁɑ̃dʁ /</i>
                  <hr />
                  <em>学ぶ、身につける</em>
                  <small>J’apprends un peu chaque jour.</small>
                </div>
                <span className="spark">✳</span>
              </div>
            </section>
            <div className="stats">
              <div>
                <span>復習を待つ単語</span>
                <strong>
                  {dueWords(words).length}
                  <small>語</small>
                </strong>
                <p>今日の想起練習</p>
              </div>
              <div>
                <span>わたしの単語帳</span>
                <strong>
                  {words.length}
                  <small>語</small>
                </strong>
                <p>授業から積み重ねた言葉</p>
              </div>
              <div>
                <span>既知の単語</span>
                <strong>
                  {words.filter((w) => w.known).length}
                  <small>語</small>
                </strong>
                <p>復習対象から除外中</p>
              </div>
            </div>
            <div className="section-heading">
              <h2>今日の小さな一歩</h2>
              <span>VOTRE PARCOURS</span>
            </div>
            <div className="steps">
              <button onClick={() => navigate("words")}>
                <span className="step-num">01</span>
                <div>
                  <h3>授業の言葉を集める</h3>
                  <p>単語・例文を登録する</p>
                </div>
                <span>↗</span>
              </button>
              <button onClick={() => navigate("import")}>
                <span className="step-num">02</span>
                <div>
                  <h3>ノートから取り込む</h3>
                  <p>CSVやリストをそのまま貼り付け</p>
                </div>
                <span>↗</span>
              </button>
              <button onClick={() => navigate("review")}>
                <span className="step-num">03</span>
                <div>
                  <h3>思い出して、定着させる</h3>
                  <p>期限を迎えたカードを復習</p>
                </div>
                <span>↗</span>
              </button>
            </div>
            <div className="quote">
              “ Petit à petit, l’oiseau fait son nid. ”
              <span>少しずつ、鳥は巣を作る。— フランスのことわざ</span>
            </div>
          </>
        )}
        {page === "review" && (
          <>
            <div className="eyebrow">RÉVISER</div>
            <h1>思い出す練習。</h1>
            <p className="subtitle">
              答えを自分で考えてから、カードを開きましょう。
            </p>
            <section className="panel">
              <div className="toolbar">
                <label>
                  出題形式
                  <select
                    value={mode}
                    onChange={(e) => {
                      setMode(e.target.value as Mode);
                      resetAnswer();
                    }}
                  >
                    {Object.entries(modes).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  教材・単元・テスト・タグで絞り込み
                  <input
                    value={filter}
                    onChange={(e) => {
                      setFilter(e.target.value);
                      resetAnswer();
                    }}
                    placeholder="例：Q3、教科書1"
                  />
                </label>
              </div>
              <p className="muted">
                残り {eligible.length} 語 · このセッションで {reviewCount}{" "}
                語を復習
                {mode === "cloze"
                  ? " · 単語を含む例文があるカードのみ出題"
                  : ""}
              </p>
              {current ? (
                <div className="review-card">
                  <span className="eyebrow">{modes[mode]}</span>
                  <div className="prompt">
                    {mode === "ja-fr" ? (
                      current.japanese
                    ) : mode === "fr-ja" ? (
                      current.french
                    ) : mode === "cloze" ? (
                      cloze(current)
                    ) : (
                      <button className="secondary" onClick={speak}>
                        ▶ フランス語を聴く
                      </button>
                    )}
                  </div>
                  <label className="answer-label">
                    あなたの答え
                    <input
                      placeholder="思い出した答えを入力"
                      value={answer}
                      disabled={revealed}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                  </label>
                  {current.part === "名詞" && (
                    <fieldset disabled={revealed}>
                      <legend>名詞の性</legend>
                      {["m", "f"].map((g) => (
                        <label key={g}>
                          <input
                            type="radio"
                            name="gender"
                            value={g}
                            checked={gender === g}
                            onChange={() => setGender(g)}
                          />
                          {g === "m" ? "le（男性名詞）" : "la（女性名詞）"}
                        </label>
                      ))}
                    </fieldset>
                  )}
                  {!revealed ? (
                    <button
                      className="primary"
                      disabled={
                        !answer.trim() || (current.part === "名詞" && !gender)
                      }
                      onClick={() => setRevealed(true)}
                    >
                      答えを確認する
                    </button>
                  ) : (
                    <div className="reveal">
                      <span>
                        正解と見比べて、思い出せた度合いを選んでください。
                      </span>
                      <h2>
                        {current.gender === "m"
                          ? "le "
                          : current.gender === "f"
                            ? "la "
                            : ""}
                        {current.french}
                      </h2>
                      <p>{current.japanese}</p>
                      {current.part === "名詞" && (
                        <p>
                          {gender === current.gender
                            ? "✓ 名詞の性も正解です。"
                            : "名詞の性も一緒に覚えましょう。"}
                        </p>
                      )}
                      <p className="example">{current.example}</p>
                      {current.conjugations && (
                        <p>活用：{current.conjugations}</p>
                      )}
                      <div className="grades">
                        {[
                          [1, "忘れた"],
                          [3, "難しかった"],
                          [4, "思い出せた"],
                          [5, "簡単だった"],
                        ].map(([q, label]) => (
                          <button
                            className="secondary"
                            key={q}
                            onClick={() => grade(Number(q))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <small>
                        忘れた場合は間隔をリセットし、翌日に再出題します。
                      </small>
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty">
                  <span>✳</span>
                  <h2>
                    {words.length
                      ? "今の条件で、復習するカードはありません。"
                      : "まずは言葉を集めましょう。"}
                  </h2>
                  <p>
                    {words.length
                      ? "復習期日・絞り込み条件・例文の有無を確認してください。"
                      : "授業で習った単語を登録すると、ここから復習できます。"}
                  </p>
                  <button className="primary" onClick={() => navigate("words")}>
                    単語帳を開く →
                  </button>
                </div>
              )}
            </section>
          </>
        )}
        {page === "words" && (
          <>
            <div className="eyebrow">MON VOCABULAIRE</div>
            <h1>わたしの単語帳。</h1>
            <p className="subtitle">
              授業で出会った言葉に、例文と出典を添えて。
            </p>
            <div className="toolbar">
              <button
                className="primary"
                onClick={() => {
                  setDraft(blankWord());
                  setEditing(true);
                }}
              >
                ＋ 単語を登録
              </button>
              <button className="secondary" onClick={() => navigate("import")}>
                一括取り込み
              </button>
              <button
                className="secondary"
                onClick={() =>
                  download(
                    "mon-francais.csv",
                    csvExport(words),
                    "text/csv;charset=utf-8",
                  )
                }
              >
                CSV出力
              </button>
              <button
                className="secondary"
                onClick={() =>
                  void run(async () =>
                    download(
                      "mon-francais-backup.json",
                      JSON.stringify(
                        {
                          version: 1,
                          words,
                          reviews: await db.reviews.toArray(),
                          materials,
                        },
                        null,
                        2,
                      ),
                      "application/json",
                    ),
                  )
                }
              >
                JSONバックアップ
              </button>
            </div>
            {editing && (
              <section className="panel">
                <h2>{draft.id ? "単語を編集" : "新しい言葉を登録"}</h2>
                <form onSubmit={saveWord} className="word-form">
                  {(["french", "japanese"] as const).map((key) => (
                    <label key={key}>
                      {key === "french" ? "フランス語" : "日本語訳"} *
                      <input
                        required
                        value={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    品詞
                    <select
                      value={draft.part}
                      onChange={(e) =>
                        setDraft({ ...draft, part: e.target.value, gender: "" })
                      }
                    >
                      {["名詞", "動詞", "形容詞", "副詞", "文型", "その他"].map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </select>
                  </label>
                  {draft.part === "名詞" && (
                    <label>
                      名詞の性 *
                      <select
                        required
                        value={draft.gender}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            gender: e.target.value as Word["gender"],
                          })
                        }
                      >
                        <option value="">選択してください</option>
                        <option value="m">le（男性名詞）</option>
                        <option value="f">la（女性名詞）</option>
                      </select>
                    </label>
                  )}
                  {draft.part === "動詞" && (
                    <>
                      <label>
                        動詞分類
                        <select
                          value={draft.verbGroup}
                          onChange={(e) =>
                            setDraft({ ...draft, verbGroup: e.target.value })
                          }
                        >
                          <option value="">選択</option>
                          {["-er", "-ir", "-re", "不規則"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        直説法現在の活用
                        <input
                          value={draft.conjugations}
                          onChange={(e) =>
                            setDraft({ ...draft, conjugations: e.target.value })
                          }
                          placeholder="je parle, tu parles, …"
                        />
                      </label>
                    </>
                  )}
                  {(
                    [
                      "example",
                      "tags",
                      "source",
                      "unit",
                      "test",
                      "deadline",
                    ] as const
                  ).map((key, i) => (
                    <label key={key}>
                      {
                        [
                          "例文（穴埋めには単語の原形を含めてください）",
                          "タグ",
                          "出典教材",
                          "単元 / 週",
                          "テスト名",
                          "テストの期限",
                        ][i]
                      }
                      <input
                        type={key === "deadline" ? "date" : "text"}
                        value={draft[key]}
                        list={key === "source" ? "material-options" : undefined}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <datalist id="material-options">
                    {materials.map((m, i) => (
                      <option key={i} value={m.name} />
                    ))}
                  </datalist>
                  <div className="form-actions">
                    <button className="primary" type="submit">
                      保存する
                    </button>
                    <button
                      className="secondary"
                      type="button"
                      onClick={() => setEditing(false)}
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </section>
            )}
            <input
              className="search"
              aria-label="単語を検索"
              placeholder="フランス語・日本語・教材・タグを検索…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="word-list">
              {words
                .filter((w) =>
                  [w.french, w.japanese, w.tags, w.source, w.unit, w.test].some(
                    (s) => s.toLowerCase().includes(query.toLowerCase()),
                  ),
                )
                .map((w) => (
                  <article key={w.id} className="word-row">
                    <div>
                      <h3>
                        <small>
                          {w.gender === "m"
                            ? "le"
                            : w.gender === "f"
                              ? "la"
                              : ""}
                        </small>{" "}
                        {w.french}
                      </h3>
                      <p>
                        {w.japanese} <span className="tag">{w.part}</span>
                      </p>
                      <p className="muted">
                        {[w.source, w.unit, w.test, w.tags]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                      {w.example && <p className="example">{w.example}</p>}
                      <small>
                        {w.known
                          ? "既知 · SRS対象外"
                          : `次の復習：${new Date(w.due).toLocaleDateString("ja-JP")}`}
                      </small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="secondary"
                        onClick={() => {
                          setDraft(w);
                          setEditing(true);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        編集
                      </button>
                      <button
                        className="secondary"
                        onClick={() =>
                          void run(async () => {
                            await db.words.update(w.id!, {
                              known: !w.known,
                              ...(w.known ? { due: Date.now() } : {}),
                            });
                            await refresh();
                          })
                        }
                      >
                        {w.known ? "要復習に戻す" : "既知にする"}
                      </button>
                      <button
                        className="text-button"
                        onClick={() => {
                          if (confirm(`「${w.french}」を削除しますか？`))
                            void run(async () => {
                              await db.transaction(
                                "rw",
                                db.words,
                                db.reviews,
                                async () => {
                                  await db.words.delete(w.id!);
                                  await db.reviews
                                    .where("wordId")
                                    .equals(w.id!)
                                    .delete();
                                },
                              );
                              await refresh();
                            });
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {loaded && !words.length && (
              <div className="empty">
                <h2>まだ、真っ白な単語帳。</h2>
                <p>「単語を登録」または「一括取り込み」から始めましょう。</p>
              </div>
            )}
            <section className="panel">
              <h2>教材と音声リンク</h2>
              <p className="muted">
                教科書・参考書・単語帳を、単元ごとに登録できます。外部音声の再生には通信が必要です。
              </p>
              <form onSubmit={addMaterial} className="toolbar">
                <label>
                  教材名
                  <input
                    required
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    placeholder="教科書1"
                  />
                </label>
                <label>
                  単元 / 週
                  <input
                    value={materialUnit}
                    onChange={(e) => setMaterialUnit(e.target.value)}
                    placeholder="第3課"
                  />
                </label>
                <label>
                  音声URL（任意）
                  <input
                    type="url"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                  />
                </label>
                <button className="secondary">教材を追加</button>
              </form>
              {materials.map((m, i) => (
                <div className="material" key={i}>
                  <span>
                    {m.name} / {m.unit}
                  </span>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer">
                      音声を開く ↗
                    </a>
                  )}
                </div>
              ))}
            </section>
          </>
        )}
        {page === "import" && (
          <>
            <div className="eyebrow">IMPORTER</div>
            <h1>ノートから、単語帳へ。</h1>
            <p className="subtitle">
              Googleドキュメントの表や、Claudeで整えたリストを貼り付け。
            </p>
            <section className="panel">
              <h2>CSV・テキストを取り込む</h2>
              <p>カンマ区切り（CSV）またはタブ区切りに対応しています。</p>
              <p className="muted">
                列順：フランス語, 日本語訳, 品詞, 性(m/f), 例文, タグ, 教材,
                単元, テスト, 期限(YYYY-MM-DD)
                <br />
                名詞には性が必須です。ヘッダーは日本語・英語どちらも使えます。
              </p>
              <button
                className="text-button"
                onClick={() =>
                  download(
                    "template.csv",
                    "\uFEFFfrench,japanese,part,gender,example,tags,source,unit,test,deadline\nchat,猫,名詞,m,Le chat dort.,授業,教科書1,第3課,Q3,\n",
                    "text/csv;charset=utf-8",
                  )
                }
              >
                サンプルCSVをダウンロード ↓
              </button>
              <label className="file-label">
                CSV / TSV ファイルを選ぶ
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file)
                      void run(async () => {
                        setText(await file.text());
                        setPreview(null);
                      });
                  }}
                />
              </label>
              <label>
                テキスト貼り付け
                <textarea
                  rows={10}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setPreview(null);
                  }}
                  placeholder={
                    "french,japanese,part,gender,example\nchat,猫,名詞,m,Le chat dort."
                  }
                />
              </label>
              <button className="primary" onClick={parse}>
                取り込み内容を確認 →
              </button>
              {preview && (
                <div className="import-preview">
                  <h3>{preview.length} 語を取り込みます</h3>
                  <p>同じ単語も別カードとして追加されます。</p>
                  <ul>
                    {preview.slice(0, 20).map((w, i) => (
                      <li key={i}>
                        {w.gender === "m"
                          ? "le "
                          : w.gender === "f"
                            ? "la "
                            : ""}
                        {w.french} — {w.japanese}
                      </li>
                    ))}
                  </ul>
                  {preview.length > 20 && <p>ほか {preview.length - 20} 語</p>}
                  <button
                    className="primary"
                    onClick={() =>
                      void run(async () => {
                        await db.words.bulkAdd(preview);
                        await refresh();
                        setPreview(null);
                        setText("");
                        setNotice(`${preview.length} 語を取り込みました。`);
                      })
                    }
                  >
                    この内容で取り込む
                  </button>
                </div>
              )}
            </section>
            <p className="muted">
              保存先はこのブラウザのIndexedDBです。ブラウザデータの削除に備え、単語帳から定期的にJSONバックアップを保存してください。
            </p>
          </>
        )}
        <footer>
          <span>Mon Français</span>
          <span>毎日の小さな練習が、大きな自信に。</span>
        </footer>
      </main>
    </div>
  );
}
