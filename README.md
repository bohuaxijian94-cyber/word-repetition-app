# Mon Français

日本語UIの個人用フランス語学習アプリ。React / Vite / TypeScript / Dexie (IndexedDB)。外部サーバーやAPIキーは不要です。

## 開発

Node.js 22以上（この環境は24）、npmを使用します。

```sh
cd /workspace/word-repetition-app
npm ci
npm run dev -- --port 5173 --strictPort
```

## 検証

```sh
npm test
npm run build
npm run test:e2e
```

E2EはChromiumを使用します。このクラウドでは `/usr/bin/chromium` が利用できます。別の環境では `CHROMIUM_PATH` を指定するか、`npx playwright install chromium` を実行してください。

本番生成物は `dist/` です。`npm run preview -- --port 4173 --strictPort` で確認できます。Service Workerは本番ビルドでのみ有効です。初回オンライン読み込みとキャッシュ完了後、オフラインで登録・復習・取り込みができます。HTTPSまたはlocalhostが必要です。

## Phase 1

- ホーム：復習待ち・登録数・既知数
- 単語の登録・編集・削除、名詞の性の必須入力、動詞分類・現在活用
- 日→仏、仏→日、聞き取り、文穴埋め。入力・性の選択後に正解表示し、自己採点
- SM-2を基にした復習（初期EF 2.5、1→3→7日、失敗時は翌日にリセット）。期限を迎えた未知カードのみ出題
- 教材・単元・テスト名・タグで絞り込み。期限が近いテストのカードを優先
- CSV / TSV / Google Docs等の表の貼り付け。取り込み前に全行検証・プレビュー
- 既知マーク、CSV書き出し、JSONバックアップ書き出し
- 教材・単元と外部音声リンク

CSV列は `french,japanese,part,gender,example,tags,source,unit,test,deadline`。ヘッダーなしも同じ順で取り込めます。名詞のgenderは `m/f` または `le/la`。品詞は日本語か `noun/verb/adjective/adverb`。期限は `YYYY-MM-DD`。

例文の穴埋めは登録したフランス語の文字列を置換します。活用形の自動解析は行いません。採点は自己採点です。TTSは端末のフランス語音声に依存し、端末に音声がなければ利用できない場合があります。外部音声リンクは通信が必要です。

データはブラウザ・オリジンごとに保存されます。ブラウザデータの削除で消えるため、定期的にエクスポートしてください。CSVで単語を再取り込みできますが、復習履歴・既知状態は引き継ぎません。JSONの復元UIは未実装です。

Phase 2（朝晩クイズ・通知・詳細統計）とPhase 3（日記・リスニングプレイヤー）は未実装です。

## GitHub Pages

`npm run build:pages` で `/word-repetition-app/` 向けに生成します。
公開用ファイルは `gh-pages` ブランチ、ソースは `mon-francais-web` ブランチにあります。
GitHubの Settings → Pages → Build and deployment で、Sourceを **Deploy from a branch**、Branchを **gh-pages / (root)** に設定してください。
以後 `mon-francais-web` へのpush時は `.github/workflows/publish-pages.yml` が単体テスト・ビルド後に公開ブランチを更新します（GitHub Actionsが有効である必要があります）。
公開予定URL: https://bohuaxijian94-cyber.github.io/word-repetition-app/
公開サイトの学習データも閲覧者自身のブラウザ内だけに保存します。サイトを削除しても端末内データは自動削除されません。
