import { useState } from "react";
import { parseBackup, type Backup } from "./backup";
export default function BackupRestore({
  onRestore,
}: {
  onRestore: (b: Backup, restoreSettings: boolean) => Promise<void>;
}) {
  const [backup, setBackup] = useState<Backup | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [restoreSettings, setRestoreSettings] = useState(false);
  return (
    <section className="panel">
      <h2>JSONバックアップを復元</h2>
      <p className="muted">
        単語・復習履歴・教材・朝晩の練習履歴を現在のデータに追加します。既存データを消しません。同じファイルを再度復元すると、重複して追加されます。
      </p>
      <label>
        バックアップファイル
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={async (e) => {
            setError("");
            setBackup(null);
            setMessage("");
            const file = e.target.files?.[0];
            if (file) {
              try {
                setBackup(parseBackup(await file.text()));
              } catch (e) {
                setError((e as Error).message);
              }
            }
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {backup && (
        <div className="import-preview">
          <p>
            単語 {backup.words.length} 枚 / 復習履歴 {backup.reviews.length} 件
            / 教材 {backup.materials.length} 件
          </p>
          {backup.learning && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={restoreSettings}
                onChange={(e) => setRestoreSettings(e.target.checked)}
              />
              時刻・新規単語数・テスト範囲・寝る前セットもバックアップの設定に戻す
            </label>
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await onRestore(backup, restoreSettings);
                setBackup(null);
                setMessage("バックアップを追加復元しました。");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "復元しています…" : "確認した内容を追加復元"}
          </button>
        </div>
      )}
    </section>
  );
}
