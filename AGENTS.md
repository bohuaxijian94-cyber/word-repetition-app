# Mon Français — 作業を小さく進めるための案内

再開時は docs/PROJECT_HANDOFF.md の短い引き継ぎを最初に確認する。最新ソースは mon-francais-web（mainではない）。必要な詳細だけ各資料へ進む。

- スマホ優先。Appleの明快な階層・段階的な開示・44px以上の操作領域を参考にする。4タブ（今日・単語帳・記録・その他）、ホームの主操作は通常復習。
- ユーザーは学習成果と入力負担の少なさを重視。日記・文型チェック・学習時間の入力義務は追加しない。音声自己チェック・任意のブラウザ音声入力を再利用する。
- 根拠なく「試験7日前から全カードを毎日」にしない。SRSとDexie v1の変更には具体的な説明と事前承認が必要。研究の判断は docs/RESEARCH_DECISIONS.md。
- 既存モジュールを再利用し、無関係なファイル・ログの全文を読まない。新しい依存・サービス・計測機能は必要性を確認してから。
- App.tsx:画面接続、domain.ts:SRS/CSV、learning.ts:学習キュー/集計、useLearning.ts:ローカル設定、各 *Page.tsx:画面。demo.ts/db.tsで通常とデモを分離。
- ビルド: npm run build。単体: npm test。画面・導線・保存を変えたら npm run test:e2e（4173を空ける）。通過後は変更や懸念がなければ反復しない。
- Playwrightの openPage/answerEntry/reviewOptions は実際の4タブ・折りたたみ操作を使う。テスト用に隠しボタンや設定を開くコードを本体へ入れない。
- GitHub Pages向け: npm run build:pages。公開ソースは mon-francais-web、生成物は gh-pages。標準ビルドの dist をそのまま公開しない。
- 設定API・公開サイト確認はネットワーク制限で失敗する場合がある。pushと公開先の表示検証を区別する。録音・実音声認識は端末依存、APIモックの試験と区別する。
- チャットは簡潔に。判断・必要な結果・残る制約に絞り、同じ説明や許可確認を繰り返さない。
