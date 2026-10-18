import { useState } from "react";
import { isDemo } from "./demo";
type Props = {
  onWords: () => void;
  onReview: () => void;
  onImport: () => void;
  onReset: () => void;
  busy: boolean;
};
export default function DemoGuide({
  onWords,
  onReview,
  onImport,
  onReset,
  busy,
}: Props) {
  const [step, setStep] = useState(0);
  const lessons = [
    {
      title: "単語帳を見てみる",
      body: "「単語帳を開く」で、猫（le chat）や家（la maison）など6語を確認できます。「編集」で例文・教材・テスト名を見てみましょう。",
      label: "単語帳を開く",
      action: onWords,
    },
    {
      title: "1語、思い出して答える",
      body: "「猫」が出たら chat と入力し、le（男性名詞）を選んで「答えを確認する」を押します。「思い出せた」で採点すると、次の復習は翌日です。正誤は自分で見比べて採点します。",
      label: "復習を試す",
      action: onReview,
    },
    {
      title: "授業のリストを取り込む",
      body: "りんご（pomme）のサンプルを貼り付け済みの画面へ進みます。「取り込み内容を確認」→「この内容で取り込む」の順に押すと、1語追加されます。自分の授業ではGoogleドキュメントの表やCSVを使えます。",
      label: "取り込みを試す",
      action: onImport,
    },
    {
      title: "保存して、明日につなぐ",
      body: "「CSV出力」で単語リストをダウンロードできます。採点したカードは翌日以降の期日に再出題されます。デモを終えたら「自分の学習に戻る」で、本番用の単語帳を開いてください。",
      label: "出力ボタンを見に行く",
      action: onWords,
    },
  ];
  const lesson = lessons[step];
  if (!isDemo)
    return (
      <section className="demo-entry" aria-label="はじめての方へ">
        <div>
          <strong>はじめての方へ · 3分で使い方を体験</strong>
          <p>サンプル6語で、登録・復習・取り込みの流れを試せます。</p>
        </div>
        <a className="primary" href={import.meta.env.BASE_URL + "?demo=1"}>
          デモを試す →
        </a>
      </section>
    );
  return (
    <section className="demo-guide" aria-label="デモの使い方">
      <div className="demo-top">
        <div>
          <span className="eyebrow">ESSAYEZ / 体験デモ</span>
          <h2>まずは、3分だけ試してみましょう。</h2>
          <p>デモ専用の単語帳です。自分の学習データには影響しません。</p>
        </div>
        <a href={import.meta.env.BASE_URL}>自分の学習に戻る ↗</a>
      </div>
      <ol className="demo-tabs">
        {lessons.map((l, i) => (
          <li key={l.title}>
            <button
              aria-current={step === i ? "step" : undefined}
              onClick={() => setStep(i)}
            >
              <span>{i + 1}</span>
              {l.title}
            </button>
          </li>
        ))}
      </ol>
      <div className="demo-lesson">
        <span className="eyebrow">STEP {step + 1} / 4</span>
        <h3>{lesson.title}</h3>
        <p>{lesson.body}</p>
        <div className="demo-actions">
          <button className="primary" onClick={lesson.action} disabled={busy}>
            {lesson.label} →
          </button>
          {step < 3 && (
            <button className="secondary" onClick={() => setStep(step + 1)}>
              次の説明へ
            </button>
          )}
          <button
            className="text-button"
            onClick={() => {
              if (
                confirm(
                  "デモ専用データを最初の6語に戻します。自分の学習データは変更しません。",
                )
              ) {
                onReset();
                setStep(0);
              }
            }}
            disabled={busy}
          >
            デモを最初からやり直す
          </button>
        </div>
      </div>
    </section>
  );
}
