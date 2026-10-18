import { useEffect, useRef, useState } from "react";
import type { Word } from "./domain";
import SpeechInput from "./SpeechInput";
const liaison = [
  {
    text: "les amis",
    label: "les_amis",
    note: "/lez‿ami/：les の s を次の母音につなげます。",
  },
  {
    text: "vous avez",
    label: "vous_avez",
    note: "/vuz‿ave/：vous の s が /z/ になります。",
  },
  {
    text: "un ami",
    label: "un_ami",
    note: "/œ̃n‿ami/：un の n を次の母音につなげます。",
  },
  {
    text: "nous allons",
    label: "nous_allons",
    note: "/nuz‿alɔ̃/：nous の s が /z/ になります。",
  },
];
export default function ListeningPage({
  words,
  onComplete,
  completed,
}: {
  words: Word[];
  onComplete: () => void;
  completed: boolean;
}) {
  const supported = "speechSynthesis" in window;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [voice, setVoice] = useState(""),
    [speed, setSpeed] = useState("1"),
    [repeat, setRepeat] = useState(false),
    [status, setStatus] = useState("停止中"),
    [error, setError] = useState("");
  const entries = words
    .filter((w) => w.example)
    .map((w) => ({
      key: "word:" + w.id,
      text: w.example,
      label: `${w.french} — ${w.example}`,
    }));
  const [selection, setSelection] = useState(entries[0]?.key || "liaison:0"),
    [custom, setCustom] = useState("");
  const repeatRef = useRef(false),
    playId = useRef(0),
    utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);
  useEffect(() => {
    if (!supported) return;
    const update = () =>
      setVoices(
        speechSynthesis
          .getVoices()
          .filter((v) => v.lang.toLowerCase().startsWith("fr")),
      );
    update();
    speechSynthesis.addEventListener("voiceschanged", update);
    return () => {
      playId.current++;
      speechSynthesis.cancel();
      speechSynthesis.removeEventListener("voiceschanged", update);
    };
  }, [supported]);
  const text =
    selection === "custom"
      ? custom
      : selection.startsWith("liaison:")
        ? liaison[Number(selection.split(":")[1])]?.text || ""
        : entries.find((e) => e.key === selection)?.text || "";
  const stop = () => {
    playId.current++;
    if (supported) speechSynthesis.cancel();
    utteranceRef.current = null;
    setStatus("停止中");
  };
  const play = () => {
    stop();
    setError("");
    if (!supported) {
      setError("このブラウザは音声再生に対応していません。");
      return;
    }
    if (!text.trim()) {
      setError("再生するフランス語を入力・選択してください。");
      return;
    }
    const id = playId.current;
    const speak = () => {
      if (id !== playId.current) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      utterance.lang = "fr-FR";
      utterance.rate = Number(speed);
      const selected = voices.find((v) => v.voiceURI === voice);
      if (selected) utterance.voice = selected;
      utterance.onstart = () => {
        if (id === playId.current) setStatus("再生中");
      };
      utterance.onend = () => {
        if (id !== playId.current) return;
        if (repeatRef.current) speak();
        else {
          setStatus("停止中");
          utteranceRef.current = null;
        }
      };
      utterance.onerror = (event) => {
        if (id !== playId.current) return;
        setStatus("停止中");
        setError(
          `音声を再生できませんでした（${event.error}）。端末のフランス語音声と通信状態を確認してください。`,
        );
      };
      setStatus("再生を準備しています");
      speechSynthesis.speak(utterance);
    };
    speak();
  };
  return (
    <>
      <div className="eyebrow">ÉCOUTER ET RÉPÉTER</div>
      <h1>耳と口で、フランス語。</h1>
      <p className="subtitle">例文を聴いて、一拍遅れてまねしてみましょう。</p>
      <section className="panel">
        <h2>例文プレイヤー</h2>
        <label>
          再生する内容
          <select
            value={selection}
            onChange={(e) => {
              stop();
              setSelection(e.target.value);
            }}
          >
            <optgroup label="単語帳の例文">
              {entries.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="リエゾン練習">
              {liaison.map((l, i) => (
                <option key={l.label} value={"liaison:" + i}>
                  {l.label}
                </option>
              ))}
            </optgroup>
            <option value="custom">自由入力（日記のフランス語など）</option>
          </select>
        </label>
        {selection === "custom" && (
          <div>
            <label>
              読み上げるフランス語
              <textarea
                rows={4}
                value={custom}
                onChange={(e) => {
                  stop();
                  setCustom(e.target.value);
                }}
                placeholder="Aujourd’hui, j’apprends le français."
              />
            </label>
            <SpeechInput
              lang="fr-FR"
              label="フランス語で1文話す"
              onText={(value) => {
                stop();
                setCustom((previous) =>
                  [previous, value].filter(Boolean).join(" "),
                );
              }}
            />
            <p className="muted">
              今日習った語を使って、短い1文を話してみましょう。認識された文章を確認してから聴き直せます。保存や日記の記入は不要です。
            </p>
          </div>
        )}
        <p className="listening-text" lang="fr">
          {text || "フランス語を入力してください。"}
        </p>
        {selection.startsWith("liaison:") && (
          <p className="muted">
            {liaison[Number(selection.split(":")[1])]?.note}
          </p>
        )}
        <div className="toolbar">
          <label>
            再生速度
            <select
              value={speed}
              onChange={(e) => {
                stop();
                setSpeed(e.target.value);
              }}
            >
              <option value="0.75">0.75x（ゆっくり）</option>
              <option value="1">1.0x（標準）</option>
              <option value="1.25">1.25x（速め）</option>
            </select>
          </label>
          <label>
            フランス語の音声
            <select
              value={voice}
              onChange={(e) => {
                stop();
                setVoice(e.target.value);
              }}
            >
              <option value="">端末の既定のフランス語音声</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                  {v.localService ? "（端末内）" : "（通信が必要な場合あり）"}
                </option>
              ))}
            </select>
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={repeat}
              onChange={(e) => setRepeat(e.target.checked)}
            />
            リピート再生
          </label>
        </div>
        <div className="demo-actions">
          <button
            className="primary"
            onClick={play}
            disabled={!supported || !text.trim()}
          >
            ▶ 再生
          </button>
          <button
            className="secondary"
            onClick={() => {
              if (!supported) return;
              if (status === "一時停止") {
                speechSynthesis.resume();
                setStatus("再生中");
              } else {
                speechSynthesis.pause();
                setStatus("一時停止");
              }
            }}
            disabled={!supported || !["再生中", "一時停止"].includes(status)}
          >
            {status === "一時停止" ? "再開" : "一時停止"}
          </button>
          <button className="secondary" onClick={stop}>
            ■ 停止
          </button>
          <span role="status" className="muted">
            {status}
          </span>
        </div>
        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}
        <p className="muted">
          速度・音声・内容を変更したら、再生ボタンを押してください。読み上げは端末の音声合成を使用し、発音やリエゾンの実現は音声エンジンに依存します。
          {!voices.length
            ? "利用可能なフランス語音声がまだ検出されていません。端末の音声設定で追加できる場合があります。"
            : ""}{" "}
          オフライン再生には端末内のフランス語音声が必要です。
        </p>
      </section>
      <section className="panel">
        <h2>5分のシャドーイング</h2>
        <ol className="guide-list">
          <li>0.75xで意味と音を確認します。</li>
          <li>リピートをオンにして、音声より少し遅れてまねします。</li>
          <li>慣れたら1.0xに戻し、声に出して3回繰り返しましょう。</li>
        </ol>
        <button className="secondary" onClick={onComplete} disabled={completed}>
          {completed
            ? "✓ 今日のシャドーイングは完了"
            : "今日のシャドーイングを完了にする"}
        </button>
        <p className="muted">5分の練習ができたら、完了を記録しましょう。</p>
        <p className="muted">
          日記を書いたら「自由入力」に貼り付けて、自分の文章も聴き直せます。
        </p>
      </section>
    </>
  );
}
