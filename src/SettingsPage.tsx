import { useState, type FormEvent } from "react";
import type { Settings, Exam } from "./learning";
export default function SettingsPage({
  settings,
  onSave,
  sources,
  units,
}: {
  settings: Settings;
  onSave: (s: Settings) => void;
  sources: string[];
  units: string[];
}) {
  const [draft, setDraft] = useState(settings),
    [message, setMessage] = useState(""),
    [permission, setPermission] = useState(
      "Notification" in window ? Notification.permission : "unsupported",
    );
  const [editingExam, setEditingExam] = useState<string | null>(null);
  const [exam, setExam] = useState<Omit<Exam, "id">>({
    name: "",
    deadline: "",
    source: "",
    units: [],
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    try {
      onSave(draft);
      setMessage("設定を保存しました。");
    } catch {
      setMessage("保存に失敗しました。ブラウザの保存領域を確認してください。");
    }
  };
  return (
    <>
      <div className="eyebrow">MES HABITUDES</div>
      <h1>自分のペースで。</h1>
      <section className="panel">
        <h2>学習とリマインダー</h2>
        <form className="word-form" onSubmit={submit}>
          <label>
            起床後の時刻
            <input
              type="time"
              required
              value={draft.wake}
              onChange={(e) => setDraft({ ...draft, wake: e.target.value })}
            />
          </label>
          <label>
            寝る前の時刻
            <input
              type="time"
              required
              value={draft.bed}
              onChange={(e) => setDraft({ ...draft, bed: e.target.value })}
            />
          </label>
          <label>
            1日の新規単語数
            <input
              type="number"
              min={1}
              max={100}
              required
              value={draft.newPerDay}
              onChange={(e) =>
                setDraft({ ...draft, newPerDay: Number(e.target.value) })
              }
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={draft.reminders}
              onChange={(e) =>
                setDraft({ ...draft, reminders: e.target.checked })
              }
            />
            リマインダーを使う
          </label>
          <p className="muted span-all">
            アプリを開いている間に、端末の現地時刻で通知します。閉じている間や端末のスリープ中の定時通知は保証できません。通知が許可されていない場合は画面内に表示します。
          </p>
          <div className="form-actions">
            <button className="primary">設定を保存</button>
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                try {
                  if ("Notification" in window)
                    setPermission(await Notification.requestPermission());
                } catch {
                  setMessage(
                    "通知を許可できませんでした。ブラウザのサイト設定を確認してください。",
                  );
                }
              }}
              disabled={permission === "unsupported"}
            >
              ブラウザ通知を許可
            </button>
            <span className="muted">
              {
                (
                  {
                    granted: "許可済み",
                    denied: "拒否されています（サイト設定で変更できます）",
                    default: "未設定",
                    unsupported: "このブラウザは通知に未対応",
                  } as Record<string, string>
                )[permission]
              }
            </span>
          </div>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      <section className="panel">
        <h2>小テスト・期末テストの範囲</h2>
        <p className="muted">
          単元を複数選べます。未選択なら全単元が対象です。設定後、復習画面の「テスト範囲」で選択してください。
        </p>
        <form
          className="word-form"
          onSubmit={(e) => {
            e.preventDefault();
            const value = { ...exam, id: editingExam || crypto.randomUUID() };
            const next = {
              ...draft,
              exams: editingExam
                ? draft.exams.map((x) => (x.id === editingExam ? value : x))
                : [...draft.exams, value],
            };
            try {
              onSave(next);
              setDraft(next);
              setExam({ name: "", deadline: "", source: "", units: [] });
              setMessage("テスト範囲を保存しました。");
              setEditingExam(null);
            } catch {
              setMessage("テスト範囲の保存に失敗しました。");
            }
          }}
        >
          <label>
            テスト名
            <input
              required
              value={exam.name}
              onChange={(e) => setExam({ ...exam, name: e.target.value })}
              placeholder="Q3_5週目 / 期末テスト"
            />
          </label>
          <label>
            テスト日
            <input
              type="date"
              required
              value={exam.deadline}
              onChange={(e) => setExam({ ...exam, deadline: e.target.value })}
            />
          </label>
          <label>
            対象教材
            <select
              value={exam.source}
              onChange={(e) => setExam({ ...exam, source: e.target.value })}
            >
              <option value="">全教材</option>
              {sources.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>対象単元（複数選択可）</legend>
            {units.length ? (
              units.map((u) => (
                <label key={u}>
                  <input
                    type="checkbox"
                    checked={exam.units.includes(u)}
                    onChange={(e) =>
                      setExam({
                        ...exam,
                        units: e.target.checked
                          ? [...exam.units, u]
                          : exam.units.filter((s) => s !== u),
                      })
                    }
                  />
                  {u}
                </label>
              ))
            ) : (
              <p className="muted">単語に単元を登録すると選択できます。</p>
            )}
          </fieldset>
          <div className="form-actions">
            <button className="primary">
              {editingExam ? "テスト範囲の変更を保存" : "テスト範囲を追加"}
            </button>
            {editingExam && (
              <button
                className="secondary"
                type="button"
                onClick={() => {
                  setEditingExam(null);
                  setExam({ name: "", deadline: "", source: "", units: [] });
                }}
              >
                範囲の編集をキャンセル
              </button>
            )}
          </div>
        </form>
        {draft.exams.map((ex) => (
          <article className="material" key={ex.id}>
            <span>
              {ex.name} · {ex.deadline}
              <br />
              {ex.source || "全教材"} / {ex.units.join("・") || "全単元"}
            </span>
            <button
              className="text-button"
              onClick={() => {
                setEditingExam(ex.id);
                setExam(ex);
              }}
            >
              範囲を編集
            </button>
            <button
              className="text-button"
              onClick={() => {
                const next = {
                  ...draft,
                  exams: draft.exams.filter((x) => x.id !== ex.id),
                };
                try {
                  onSave(next);
                  setDraft(next);
                  setMessage("テスト範囲を削除しました。");
                  if (editingExam === ex.id) {
                    setEditingExam(null);
                    setExam({ name: "", deadline: "", source: "", units: [] });
                  }
                } catch {
                  setMessage("削除に失敗しました。");
                }
              }}
            >
              範囲を削除
            </button>
          </article>
        ))}
      </section>
    </>
  );
}
