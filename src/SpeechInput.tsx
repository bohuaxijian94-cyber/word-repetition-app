import { useEffect, useRef, useState } from "react";
type Result = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult:
    | ((event: { resultIndex: number; results: ArrayLike<Result> }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type Constructor = new () => Recognition;
export default function SpeechInput({
  lang,
  onText,
  disabled = false,
  label = "音声で入力",
}: {
  lang: string;
  onText: (text: string) => void;
  disabled?: boolean;
  label?: string;
}) {
  const api = window as unknown as {
    SpeechRecognition?: Constructor;
    webkitSpeechRecognition?: Constructor;
  };
  const Constructor = api.SpeechRecognition || api.webkitSpeechRecognition;
  const [active, setActive] = useState(false),
    [message, setMessage] = useState("");
  const recognition = useRef<Recognition | null>(null),
    callback = useRef(onText),
    enabled = useRef(!disabled);
  callback.current = onText;
  enabled.current = !disabled;
  useEffect(() => {
    if (disabled && recognition.current) {
      const current = recognition.current;
      recognition.current = null;
      current.abort();
      setActive(false);
    }
  }, [disabled]);
  useEffect(() => {
    setActive(false);
    return () => {
      const current = recognition.current;
      recognition.current = null;
      current?.abort();
    };
  }, [lang]);
  const start = () => {
    if (active) {
      recognition.current?.stop();
      return;
    }
    if (!Constructor || disabled) return;
    const current = new Constructor();
    recognition.current = current;
    current.lang = lang;
    current.continuous = false;
    current.interimResults = false;
    current.maxAlternatives = 1;
    setMessage("");
    current.onresult = (event) => {
      if (recognition.current !== current || !enabled.current) return;
      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++)
        if (event.results[i].isFinal)
          parts.push(event.results[i][0].transcript);
      const text = parts.join(" ").trim();
      if (text) {
        callback.current(text);
        setMessage(
          "音声を文字にしました。認識結果を確認して、必要なら直してください。",
        );
      }
    };
    current.onerror = (event) => {
      if (recognition.current !== current) return;
      const descriptions: Record<string, string> = {
        "not-allowed":
          "マイクが許可されていません。端末のキーボード音声入力か「声に出して答えた」も使えます。",
        "audio-capture":
          "マイクを利用できません。端末の接続や権限を確認してください。",
        network:
          "音声認識に接続できません。通信状態を確認するか、文字入力に切り替えてください。",
        "no-speech": "音声が聞き取れませんでした。もう一度お試しください。",
        "language-not-supported":
          "この端末では選択した言語の音声認識に対応していません。",
      };
      if (event.error !== "aborted")
        setMessage(
          descriptions[event.error] ||
            "音声入力を終了しました。文字入力でも続けられます。",
        );
      setActive(false);
    };
    current.onend = () => {
      if (recognition.current === current) {
        recognition.current = null;
        setActive(false);
      }
    };
    try {
      setActive(true);
      current.start();
    } catch {
      recognition.current = null;
      setActive(false);
      setMessage("音声入力を開始できませんでした。文字入力でも続けられます。");
    }
  };
  return (
    <div className="speech-input">
      <button
        type="button"
        className="secondary"
        aria-pressed={active}
        onClick={start}
        disabled={disabled || !Constructor}
      >
        {active ? "■ 音声入力を止める" : "🎙 " + label}
      </button>
      <small>
        {Constructor
          ? "ブラウザの音声認識を使います。音声がブラウザ提供元へ送信され、通信が必要になる場合があります。"
          : "このブラウザはアプリ内音声入力に未対応です。スマホのキーボードのマイクでも入力できます。"}
      </small>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
