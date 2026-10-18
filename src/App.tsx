import { useEffect, useState, type FormEvent } from "react";
import { db, seedDemo, type Review } from "./db";
import SettingsPage from "./SettingsPage";
import Icon from "./Icon";
import SpeechInput from "./SpeechInput";
import ListeningPage from "./ListeningPage";
import StatsPage from "./StatsPage";
import BackupRestore from "./BackupRestore";
import { useLearning } from "./useLearning";
import {
  dayKey,
  limitNewWords,
  quizIds,
  matchesExam,
  type Quiz,
} from "./learning";
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
type Page =
  | "home"
  | "review"
  | "words"
  | "import"
  | "stats"
  | "settings"
  | "listening"
  | "more";
const labels: Record<Page, string> = {
  home: "今日の学習",
  review: "フラッシュカード",
  words: "単語帳",
  import: "一括取り込み",
  stats: "統計",
  settings: "設定",
  listening: "リスニング",
  more: "その他",
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
  const learning = useLearning();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [now, setNow] = useState(Date.now());
  const [examId, setExamId] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [working, setWorking] = useState(false);
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
    [spokenAnswer, setSpokenAnswer] = useState(false),
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
  const [editingMaterial, setEditingMaterial] = useState<number | null>(null);
  const [materialName, setMaterialName] = useState(""),
    [materialUnit, setMaterialUnit] = useState(""),
    [materialUrl, setMaterialUrl] = useState("");
  const refresh = async () => {
    const [nextWords, nextReviews] = await Promise.all([
      db.words.toArray(),
      db.reviews.toArray(),
    ]);
    setWords(nextWords);
    setReviews(nextReviews);
  };
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
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
  const selectedExam = learning.settings.exams.find((e) => e.id === examId);
  const unitOptions = [
    ...new Set(words.map((w) => w.unit).filter(Boolean)),
  ].sort();
  const sourceOptions = [
    ...new Set(words.map((w) => w.source).filter(Boolean)),
  ].sort();
  const filtered = words
    .filter(
      (w) =>
        (!selectedExam || matchesExam(w, selectedExam)) &&
        (!selectedUnits.length || selectedUnits.includes(w.unit)),
    )
    .filter(
      (w) =>
        !filter ||
        [w.test, w.source, w.unit, w.tags].some((s) => s.includes(filter)),
    );
  const due = limitNewWords(
      dueWords(filtered, now),
      reviews,
      learning.settings.newPerDay,
      now,
    ),
    quizExpired = quiz ? now - quiz.started >= 300000 : false,
    sessionQueue = quiz
      ? quizExpired
        ? []
        : words.filter(
            (w) =>
              !w.known &&
              quiz.ids.includes(w.id!) &&
              !quiz.done.includes(w.id!),
          )
      : due,
    eligible = sessionQueue.filter(
      (w) => mode !== "cloze" || (w.example && cloze(w) !== w.example),
    );
  const current = eligible[0];
  const todayQueue = limitNewWords(
    dueWords(words, now),
    reviews,
    learning.settings.newPerDay,
    now,
  );
  const completedTasks =
    Number(
      learning.practice.some(
        (r) => r.kind === "morning" && dayKey(r.time) === dayKey(now),
      ),
    ) +
    Number(
      learning.practice.some(
        (r) => r.kind === "night" && dayKey(r.time) === dayKey(now),
      ),
    ) +
    Number(learning.listeningDays.includes(dayKey(now)));
  const resetAnswer = () => {
    setAnswer("");
    setSpokenAnswer(false);
    setGender("");
    setRevealed(false);
  };
  const navigate = (next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (next !== "review") setQuiz(null);
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
  const grade = (quality: number) => {
    if (working) return;
    setWorking(true);
    void run(async () => {
      if (!current?.id) return;
      const time = Date.now();
      if (quiz) {
        if (time - quiz.started >= 300000) return;
        learning.addPractice({
          wordId: current.id,
          time,
          quality,
          kind: quiz.kind,
        });
        setQuiz({ ...quiz, done: [...quiz.done, current.id] });
      } else {
        await db.transaction("rw", db.words, db.reviews, async () => {
          await db.words.put(gradeWord(current, quality, time));
          await db.reviews.add({ wordId: current.id!, time, quality });
        });
      }
      await refresh();
      setReviewCount((n) => n + 1);
      resetAnswer();
    }).finally(() => setWorking(false));
  };
  const startQuiz = (kind: Quiz["kind"]) => {
    const ids = quizIds(
      kind,
      words,
      reviews,
      learning.night,
      Date.now(),
      learning.settings.newPerDay,
    );
    if (kind === "night") {
      try {
        learning.saveNight({ day: dayKey(), ids });
      } catch {
        setError("寝る前クイズの保存に失敗しました。");
        return;
      }
    }
    setQuiz({ kind, ids, done: [], started: Date.now() });
    setMode("ja-fr");
    setFilter("");
    setExamId("");
    setSelectedUnits([]);
    setReviewCount(0);
    navigate("review");
  };
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
    const value = {
      name: materialName.trim(),
      unit: materialUnit.trim(),
      url: materialUrl.trim(),
    };
    if (!value.name) {
      setError("教材名を入力してください。");
      return;
    }
    const next =
      editingMaterial === null
        ? [...materials, value]
        : materials.map((m, i) => (i === editingMaterial ? value : m));
    try {
      localStorage.setItem(materialsKey, JSON.stringify(next));
      setMaterials(next);
      setMaterialName("");
      setMaterialUnit("");
      setMaterialUrl("");
      setEditingMaterial(null);
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
        <nav aria-label="メインナビゲーション">
          {(["home", "words", "stats", "more"] as const).map((key) => {
            const active =
              key === page || (key === "home" && page === "review") ||
              (key === "more" &&
                ["import", "settings", "listening"].includes(page));
            return (
              <button
                key={key}
                className={active ? "nav active" : "nav"}
                aria-label={key === "stats" ? "記録（統計）" : labels[key]}
                aria-current={active ? "page" : undefined}
                onClick={() => navigate(key)}
              >
                <Icon name={key} />
                <span>
                  {
                    {
                      home: "今日",
                      words: "単語帳",
                      stats: "記録",
                      more: "その他",
                    }[key]
                  }
                </span>
              </button>
            );
          })}
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
          <span className="app-title">Mon Français</span>
          <span>
            {new Intl.DateTimeFormat("ja-JP", {
              month: "long",
              day: "numeric",
              weekday: "long",
            }).format(new Date())}
          </span>
        </header>
        {learning.reminder && (
          <div className="notice" role="status">
            {learning.reminder}{" "}
            <button
              className="text-button"
              onClick={() => learning.setReminder("")}
            >
              閉じる
            </button>
          </div>
        )}
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
        {page === "home" && (
          <>
            <h1>今日も、ひとつずつ。</h1>
            <p className="subtitle">覚えた言葉を、使える言葉に。</p>
            <section className="hero" aria-label="今日の復習">
              <div>
                <span className="eyebrow">今日の復習</span>
                <h2>
                  {!words.length
                    ? "最初の言葉を、ひとつ。"
                    : todayQueue.length
                      ? `${todayQueue.length} 語を思い出そう。`
                      : "今日の復習は完了です。"}
                </h2>
                <p>
                  {!words.length
                    ? "授業で出会った単語から始めましょう。"
                    : todayQueue.length
                      ? "声に出して答えるだけ。文字入力も使えます。"
                      : dueWords(words, now).length
                        ? "新しい単語の続きは明日。今日はここまででも大丈夫です。"
                        : "次の復習日に、また会いましょう。"}
                </p>
                <button
                  className="primary"
                  onClick={() => {
                    if (todayQueue.length) {
                      setQuiz(null);
                      setFilter("");
                      setExamId("");
                      setSelectedUnits([]);
                      setReviewCount(0);
                      navigate("review");
                    } else {
                      setDraft(blankWord());
                      setEditing(true);
                      navigate("words");
                    }
                  }}
                >
                  {todayQueue.length
                    ? "今日の復習をはじめる"
                    : words.length
                      ? "単語を追加する"
                      : "最初の単語を登録する"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="hero-count" aria-hidden="true">
                {todayQueue.length}
                <span>語</span>
              </div>
            </section>
            <div className="home-summary">
              <span>
                単語帳 <strong>{words.length}</strong> 語
              </span>
              <span>
                今日の復習{" "}
                <strong>
                  {reviews.filter((r) => dayKey(r.time) === dayKey(now))
                    .length +
                    learning.practice.filter(
                      (r) => dayKey(r.time) === dayKey(now),
                    ).length}
                </strong>{" "}
                回
              </span>
              <button className="text-button" onClick={() => navigate("stats")}>
                記録を見る →
              </button>
            </div>
            <section className="practice-options">
              <div className="section-heading">
                <h2>もう少し練習する</h2>
                <span>任意・各5分を目安に</span>
              </div>
              <div className="action-list">
                <button onClick={() => startQuiz("morning")}>
                  <span className="action-icon">
                    <Icon name="review" />
                  </span>
                  <span>
                    <strong>起床後ブースター</strong>
                    <small>直近の寝る前セットと、復習の続き</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
                <button onClick={() => startQuiz("night")}>
                  <span className="action-icon">
                    <Icon name="review" />
                  </span>
                  <span>
                    <strong>寝る前クイズ</strong>
                    <small>今日、新しく覚えた言葉をもう一度</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
                <button onClick={() => navigate("listening")}>
                  <span className="action-icon">
                    <Icon name="listening" />
                  </span>
                  <span>
                    <strong>シャドーイング</strong>
                    <small>聴いて、声に出す</small>
                  </span>
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            </section>
            <p className="task-progress">
              今日のメニュー：{completedTasks} / 3 完了{" "}
              <progress
                aria-label="追加練習の完了数"
                max={3}
                value={completedTasks}
              />
            </p>
          </>
        )}
        {page === "review" && (
          <>
            <div className="eyebrow">RÉVISER</div>
            <h1>思い出す練習。</h1>
            <p className="subtitle">
              答えを自分で考えてから、カードを開きましょう。
            </p>
            {quiz && (
              <section className="notice" aria-label="5分クイズ">
                <strong>
                  {quiz.kind === "morning"
                    ? "起床後ブースター"
                    : "寝る前クイズ"}
                </strong>
                <p>
                  残り{" "}
                  {Math.max(
                    0,
                    Math.ceil((300000 - (now - quiz.started)) / 1000),
                  )}{" "}
                  秒 · {quiz.done.length} 枚を練習
                </p>
                <p>
                  通常のSRS期日は変更しません。
                  {quiz.kind === "night"
                    ? "今日初めて通常復習したカードが対象です。"
                    : "昨晩のカードと期限切れカードが対象です。"}
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setQuiz(null);
                    setReviewCount(0);
                    resetAnswer();
                  }}
                >
                  通常の復習に戻る
                </button>
              </section>
            )}
            <section className="panel">
              <details className="review-options">
                <summary>出題設定</summary>
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
                {!quiz && (
                  <details className="exam-filter">
                    <summary>小テスト・期末テストの範囲を選ぶ</summary>
                    <label>
                      テスト範囲
                      <select
                        value={examId}
                        onChange={(e) => {
                          setExamId(e.target.value);
                          resetAnswer();
                        }}
                      >
                        <option value="">すべての範囲</option>
                        {learning.settings.exams.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}（{e.deadline}）
                          </option>
                        ))}
                      </select>
                    </label>
                    <fieldset>
                      <legend>単元を複数選択</legend>
                      {unitOptions.map((unit) => (
                        <label key={unit}>
                          <input
                            type="checkbox"
                            checked={selectedUnits.includes(unit)}
                            onChange={(e) => {
                              setSelectedUnits(
                                e.target.checked
                                  ? [...selectedUnits, unit]
                                  : selectedUnits.filter((u) => u !== unit),
                              );
                              resetAnswer();
                            }}
                          />
                          {unit}
                        </label>
                      ))}
                    </fieldset>
                    <p className="muted">
                      設定画面でテストの範囲と期限を登録できます。新しい単語の出題上限は1日
                      {learning.settings.newPerDay}語です。
                    </p>
                  </details>
                )}
              </details>
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
                  {!revealed && (
                    <label className="check-label spoken-answer">
                      <input
                        type="checkbox"
                        checked={spokenAnswer}
                        onChange={(e) => setSpokenAnswer(e.target.checked)}
                      />
                      声に出して答えた（文字入力を省略）
                    </label>
                  )}
                  <details className="answer-entry">
                    <summary>文字・音声で入力する</summary>
                    <label className="answer-label">
                      あなたの答え
                      <input
                        placeholder="思い出した答えを入力"
                        value={answer}
                        disabled={revealed}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                    </label>
                    {!revealed && (
                      <>
                        {" "}
                        <SpeechInput
                          lang={mode === "fr-ja" ? "ja-JP" : "fr-FR"}
                          onText={(text) =>
                            setAnswer((previous) =>
                              [previous, text].filter(Boolean).join(" "),
                            )
                          }
                        />
                      </>
                    )}
                  </details>
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
                        (!answer.trim() && !spokenAnswer) ||
                        (current.part === "名詞" && !gender)
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
                            disabled={working}
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
                    {quizExpired
                      ? "5分の練習、おつかれさまでした。"
                      : quiz && quiz.ids.length === 0
                        ? "対象のカードがまだありません。"
                        : words.length
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
                          learning: {
                            settings: learning.settings,
                            listeningDays: learning.listeningDays,
                            practice: learning.practice.filter((r) =>
                              words.some((w) => w.id === r.wordId),
                            ),
                            night: learning.night
                              ? {
                                  ...learning.night,
                                  ids: learning.night.ids.filter((id) =>
                                    words.some((w) => w.id === id),
                                  ),
                                }
                              : null,
                          },
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
                    <div key={key}>
                      <label>
                        {key === "french" ? "フランス語" : "日本語訳"} *
                        <input
                          required
                          value={draft[key]}
                          onChange={(e) =>
                            setDraft({ ...draft, [key]: e.target.value })
                          }
                        />
                      </label>
                      <SpeechInput
                        lang={key === "french" ? "fr-FR" : "ja-JP"}
                        label={
                          key === "french"
                            ? "フランス語を音声入力"
                            : "日本語訳を音声入力"
                        }
                        onText={(text) =>
                          setDraft((previous) => ({
                            ...previous,
                            [key]: [previous[key], text]
                              .filter(Boolean)
                              .join(" "),
                          }))
                        }
                      />
                    </div>
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
                  <details className="optional-fields">
                    <summary>例文・授業の情報（任意）</summary>
                    <div className="word-form">
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
                            list={
                              key === "source" ? "material-options" : undefined
                            }
                            onChange={(e) =>
                              setDraft({ ...draft, [key]: e.target.value })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </details>
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
                <button className="secondary">
                  {editingMaterial === null ? "教材を追加" : "教材の変更を保存"}
                </button>
                {editingMaterial !== null && (
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => {
                      setEditingMaterial(null);
                      setMaterialName("");
                      setMaterialUnit("");
                      setMaterialUrl("");
                    }}
                  >
                    教材の編集をキャンセル
                  </button>
                )}
              </form>
              {materials.map((m, i) => (
                <div className="material" key={i}>
                  <span>
                    {m.name} / {m.unit}
                  </span>
                  <button
                    className="text-button"
                    onClick={() => {
                      setEditingMaterial(i);
                      setMaterialName(m.name);
                      setMaterialUnit(m.unit);
                      setMaterialUrl(m.url);
                    }}
                  >
                    教材を編集
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (
                        confirm(
                          "この教材の登録を削除しますか？単語カードは残ります。",
                        )
                      )
                        void run(async () => {
                          const next = materials.filter(
                            (_, index) => index !== i,
                          );
                          localStorage.setItem(
                            materialsKey,
                            JSON.stringify(next),
                          );
                          setMaterials(next);
                          setEditingMaterial(null);
                          setMaterialName("");
                          setMaterialUnit("");
                          setMaterialUrl("");
                        });
                    }}
                  >
                    教材を削除
                  </button>
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer">
                      音声を開く ↗
                    </a>
                  )}
                </div>
              ))}
            </section>
            <BackupRestore
              onRestore={async (backup, restoreSettings) => {
                const nextMaterials = [...materials, ...backup.materials];
                const previousLearning = {
                  settings: learning.settings,
                  practice: learning.practice,
                  night: learning.night,
                  listeningDays: learning.listeningDays,
                };
                const previous = localStorage.getItem(materialsKey);
                localStorage.setItem(
                  materialsKey,
                  JSON.stringify(nextMaterials),
                );
                try {
                  await db.transaction("rw", db.words, db.reviews, async () => {
                    const ids = new Map<number, number>();
                    for (const word of backup.words) {
                      const { id, ...value } = word;
                      ids.set(id!, await db.words.add(value));
                    }
                    for (const review of backup.reviews)
                      await db.reviews.add({
                        ...review,
                        wordId: ids.get(review.wordId)!,
                      });
                    if (backup.learning) {
                      const value = backup.learning;
                      learning.restore({
                        listeningDays: [
                          ...new Set([
                            ...learning.listeningDays,
                            ...(value.listeningDays || []),
                          ]),
                        ],
                        settings: restoreSettings
                          ? value.settings
                          : learning.settings,
                        practice: [
                          ...learning.practice,
                          ...value.practice.map((r) => ({
                            ...r,
                            wordId: ids.get(r.wordId)!,
                          })),
                        ],
                        night: restoreSettings
                          ? value.night
                            ? {
                                ...value.night,
                                ids: value.night.ids.map((id) => ids.get(id)!),
                              }
                            : null
                          : learning.night,
                      });
                    }
                  });
                } catch (e) {
                  if (backup.learning) learning.restore(previousLearning);
                  if (previous === null) localStorage.removeItem(materialsKey);
                  else localStorage.setItem(materialsKey, previous);
                  throw e;
                }
                setMaterials(nextMaterials);
                await refresh();
              }}
            />
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
        {page === "settings" && (
          <SettingsPage
            settings={learning.settings}
            onSave={learning.updateSettings}
            sources={sourceOptions}
            units={unitOptions}
          />
        )}
        {page === "stats" && (
          <StatsPage
            words={words}
            reviews={reviews}
            practice={learning.practice}
            listeningDays={learning.listeningDays}
          />
        )}
        {page === "listening" && (
          <ListeningPage
            words={words}
            completed={learning.listeningDays.includes(dayKey(now))}
            onComplete={() => void run(async () => learning.markListening())}
          />
        )}
        {page === "more" && (
          <>
            <h1>その他</h1>
            <p className="subtitle">必要な機能を、ここから。</p>
            <section className="action-list more-list">
              {(["review", "import", "listening", "settings"] as const).map(
                (key) => (
                  <button key={key} onClick={() => navigate(key)}>
                    <span className="action-icon">
                      <Icon name={key} />
                    </span>
                    <span>
                      <strong>{labels[key]}</strong>
                      <small>
                        {
                          {
                            review: "出題形式とテスト範囲を選ぶ",
                            import: "CSVや授業のリストを貼り付ける",
                            listening: "速度を変えて、例文を聴く",
                            settings: "新規単語数・通知・テストの範囲",
                          }[key]
                        }
                      </small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </button>
                ),
              )}
            </section>
            <p className="privacy-note">
              学習データは、このブラウザに保存されます。
            </p>
          </>
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
                  learning.reset();
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
        <footer>
          <span>Mon Français</span>
          <span>毎日の小さな練習が、大きな自信に。</span>
        </footer>
      </main>
    </div>
  );
}
