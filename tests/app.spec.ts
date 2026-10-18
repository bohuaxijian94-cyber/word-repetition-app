import { test, expect, type Page } from "@playwright/test";
async function openPage(page: Page, name: RegExp) {
  const button = page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("button", { name });
  if (await button.count()) {
    await button.click();
    return;
  }
  await page
    .getByRole("navigation", { name: "メインナビゲーション" })
    .getByRole("button", { name: "その他", exact: true })
    .click();
  await page.getByRole("button", { name }).click();
}
async function answerEntry(page: Page) {
  const entry = page.locator("details.answer-entry");
  if ((await entry.count()) && (await entry.getAttribute("open")) === null)
    await entry.locator("summary").click();
}
async function reviewOptions(page: Page) {
  const options = page.locator("details.review-options");
  if (
    (await options.count()) &&
    !((await options.getAttribute("open")) !== null)
  )
    await options.locator("summary").first().click();
}

test("register, persist, recall, grade, import, export and work offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "今日も、ひとつずつ。" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "最初の単語を登録する" }).click();
  await page.getByRole("button", { name: "＋ 単語を登録" }).click();
  await page.getByLabel("フランス語 *", { exact: true }).fill("chat");
  await page.getByLabel("日本語訳 *", { exact: true }).fill("猫");
  await page
    .getByRole("combobox", { name: "名詞の性 *", exact: true })
    .selectOption("m");
  await page.getByText("例文・授業の情報（任意）", { exact: true }).click();
  await page
    .getByLabel("例文（穴埋めには単語の原形を含めてください）")
    .fill("Le chat dort.");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await expect(page.getByText("単語を保存しました。")).toBeVisible();
  await page.reload();
  await openPage(page, /単語帳/);
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await openPage(page, /フラッシュカード/);
  await expect(page.getByText("猫", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "答えを確認する" }),
  ).toBeDisabled();
  await answerEntry(page);
  await page.getByLabel("あなたの答え").fill("chat");
  await page.getByLabel("le（男性名詞）").check();
  await page.getByRole("button", { name: "答えを確認する" }).click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await expect(
    page.getByText("今の条件で、復習するカードはありません。"),
  ).toBeVisible();
  await openPage(page, /一括取り込み/);
  await page
    .getByLabel("テキスト貼り付け")
    .fill(
      "french,japanese,part,gender,example\nmaison,家,名詞,f,La maison est jolie.\nparler,話す,動詞,,Je veux parler.",
    );
  await page.getByRole("button", { name: "取り込み内容を確認" }).click();
  await expect(
    page.getByRole("heading", { name: "2 語を取り込みます" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "この内容で取り込む" }).click();
  await expect(page.getByText("2 語を取り込みました。")).toBeVisible();
  await openPage(page, /単語帳/);
  await expect(page.getByRole("heading", { name: "la maison" })).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONバックアップ" }).click();
  expect((await dl).suggestedFilename()).toBe("mon-francais-backup.json");
  await openPage(page, /フラッシュカード/);
  await reviewOptions(page);
  await page.getByRole("combobox", { name: "出題形式" }).selectOption("cloze");
  await expect(page.getByText("La _____ est jolie.")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "今日も、ひとつずつ。" }),
  ).toBeVisible();
  await openPage(page, /単語帳/);
  await expect(page.getByRole("heading", { name: "la maison" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layout and failed import leave stored data intact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openPage(page, /一括取り込み/);
  await page
    .getByLabel("テキスト貼り付け")
    .fill("chat,猫,名詞,m\nmaison,家,名詞,");
  await page.getByRole("button", { name: "取り込み内容を確認" }).click();
  await expect(page.getByRole("alert")).toContainText("2行目");
  await expect(
    page.getByRole("button", { name: "この内容で取り込む" }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("guided demo can be reset without touching personal words or materials", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "最初の単語を登録する" }).click();
  await page.getByRole("button", { name: "＋ 単語を登録" }).click();
  await page.getByLabel("フランス語 *", { exact: true }).fill("étudier");
  await page.getByLabel("日本語訳 *", { exact: true }).fill("勉強する");
  await page
    .getByRole("combobox", { name: "品詞", exact: true })
    .selectOption("動詞");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await expect(page.getByText("単語を保存しました。")).toBeVisible();
  await page.getByLabel("教材名", { exact: true }).fill("自分の教材");
  await page.getByRole("button", { name: "教材を追加" }).click();
  await expect(page.getByText("自分の教材 /")).toBeVisible();
  await page.goto("/");
  await page.getByRole("link", { name: "デモを試す →" }).click();
  await page.getByText("デモの使い方 · 4ステップ", { exact: true }).click();
  await expect(
    page.getByText("デモ専用の単語帳です。自分の学習データには影響しません。"),
  ).toBeVisible();
  const guide = page.getByRole("region", { name: "デモの使い方" });
  await guide.getByRole("button", { name: "単語帳を開く" }).click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "étudier" })).toHaveCount(0);
  await expect(page.getByText("自分の教材 /")).toHaveCount(0);
  await guide.getByRole("button", { name: "次の説明へ" }).click();
  await guide.getByRole("button", { name: "復習を試す" }).click();
  await answerEntry(page);
  await page.getByLabel("あなたの答え").fill("chat");
  await page.getByLabel("le（男性名詞）").check();
  await page.getByRole("button", { name: "答えを確認する" }).click();
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await expect(page.getByText(/残り 5 語/)).toBeVisible();
  await guide.getByRole("button", { name: "次の説明へ" }).click();
  await guide.getByRole("button", { name: "取り込みを試す" }).click();
  await expect(page.getByLabel("テキスト貼り付け")).toContainText("pomme");
  await page.getByRole("button", { name: "取り込み内容を確認" }).click();
  await page.getByRole("button", { name: "この内容で取り込む" }).click();
  await expect(page.getByText("1 語を取り込みました。")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await guide.getByRole("button", { name: "デモを最初からやり直す" }).click();
  await expect(page.getByText("デモを最初の6語に戻しました。")).toBeVisible();
  await guide.getByRole("button", { name: "単語帳を開く" }).click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "la pomme" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "自分の学習に戻る" }).click();
  await openPage(page, /単語帳/);
  await expect(page.getByRole("heading", { name: "étudier" })).toBeVisible();
  await expect(page.getByText("自分の教材 /")).toBeVisible();
  await expect(page.getByRole("heading", { name: "le chat" })).toHaveCount(0);
});

test("daily cap, night quiz, statistics, persisted settings and non-destructive backup restore", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await openPage(page, /設定/);
  await page.getByLabel("1日の新規単語数", { exact: true }).fill("1");
  await page.getByRole("button", { name: "設定を保存", exact: true }).click();
  await expect(page.getByText("設定を保存しました。")).toBeVisible();
  await page.reload();
  await openPage(page, /設定/);
  await expect(page.getByLabel("1日の新規単語数", { exact: true })).toHaveValue(
    "1",
  );
  await openPage(page, /フラッシュカード/);
  await expect(page.getByText(/残り 1 語/)).toBeVisible();
  await answerEntry(page);
  await page.getByLabel("あなたの答え").fill("chat");
  await page.getByLabel("le（男性名詞）").check();
  await page.getByRole("button", { name: "答えを確認する" }).click();
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await expect(
    page.getByText("今の条件で、復習するカードはありません。"),
  ).toBeVisible();
  await openPage(page, /今日の学習/);
  await page.getByRole("button", { name: /寝る前クイズ/ }).click();
  await expect(page.getByText("猫", { exact: true })).toBeVisible();
  await answerEntry(page);
  await page.getByLabel("あなたの答え").fill("chat");
  await page.getByLabel("le（男性名詞）").check();
  await page.getByRole("button", { name: "答えを確認する" }).click();
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await openPage(page, /統計/);
  await expect(
    page.getByRole("heading", { name: "学習カレンダー" }),
  ).toBeVisible();
  await expect(page.locator(".stats strong").first()).toHaveText("2回");
  await openPage(page, /単語帳/);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONバックアップ" }).click();
  const download = await downloadPromise;
  const file = await download.path();
  await page.getByLabel("バックアップファイル").setInputFiles(file!);
  await expect(page.getByText(/単語 6 枚 \/ 復習履歴 1 件/)).toBeVisible();
  await page.getByRole("button", { name: "確認した内容を追加復元" }).click();
  await expect(
    page.getByText("バックアップを追加復元しました。"),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "le chat" })).toHaveCount(2);
});

test("reminder stays in-app when permission is denied, fires once, and five-minute quiz expires", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-18T07:00:00") });
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      value: class {
        static permission = "denied";
        static requestPermission() {
          return Promise.resolve("denied");
        }
      },
    });
  });
  await page.goto("/?demo=1");
  await openPage(page, /設定/);
  await page.getByLabel("起床後の時刻", { exact: true }).fill("07:00");
  await page.getByLabel("リマインダーを使う", { exact: true }).check();
  await page.getByRole("button", { name: "設定を保存", exact: true }).click();
  await expect(
    page.getByText("朝の5分。起床後ブースターを始めましょう。", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.clock.runFor(30000);
  await expect(
    page.getByText("朝の5分。起床後ブースターを始めましょう。", {
      exact: false,
    }),
  ).toHaveCount(0);
  await openPage(page, /今日の学習/);
  await page.getByRole("button", { name: /起床後ブースター/ }).click();
  await expect(page.getByText("猫", { exact: true })).toBeVisible();
  await page.clock.runFor(300000);
  await expect(page.getByText("5分の練習、おつかれさまでした。")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "答えを確認する" }),
  ).toHaveCount(0);
});

test("listening sends selected rate and text to speech API, loops, stops and marks daily completion", async ({
  page,
}) => {
  await page.addInitScript(
    `window.__speechCalls=[];Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{name:'French test voice',voiceURI:'test',lang:'fr-FR',localService:true}],addEventListener(){},removeEventListener(){},cancel(){},pause(){},resume(){},speak(u){window.__speechCalls.push({text:u.text,rate:u.rate,lang:u.lang});window.__lastUtterance=u;u.onstart?.();}}});`,
  );
  await page.goto("/?demo=1");
  await openPage(page, /リスニング/);
  await page
    .getByRole("combobox", { name: "再生する内容", exact: true })
    .selectOption("liaison:0");
  await page
    .getByRole("combobox", { name: "再生速度", exact: true })
    .selectOption("0.75");
  await page.getByLabel("リピート再生", { exact: true }).check();
  await page.getByRole("button", { name: "▶ 再生", exact: true }).click();
  expect(await page.evaluate("window.__speechCalls[0]")).toEqual({
    text: "les amis",
    rate: 0.75,
    lang: "fr-FR",
  });
  await page.evaluate("window.__lastUtterance.onend()");
  expect(await page.evaluate("window.__speechCalls.length")).toBe(2);
  await page.getByRole("button", { name: "一時停止", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "再開", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "■ 停止", exact: true }).click();
  await page.evaluate("window.__lastUtterance.onend()");
  expect(await page.evaluate("window.__speechCalls.length")).toBe(2);
  await page
    .getByRole("button", {
      name: "今日のシャドーイングを完了にする",
      exact: true,
    })
    .click();
  await openPage(page, /今日の学習/);
  await expect(page.getByText("今日のメニュー：1 / 3 完了")).toBeVisible();
});

test("exam scopes can be edited and filter several units, materials are editable without deleting words", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await openPage(page, /設定/);
  await page.getByLabel("テスト名", { exact: true }).fill("期末");
  await page.getByLabel("テスト日", { exact: true }).fill("2026-11-01");
  await page
    .getByRole("combobox", { name: "対象教材", exact: true })
    .selectOption("デモ教科書");
  await page.getByLabel("第3課", { exact: true }).check();
  await page
    .getByRole("button", { name: "テスト範囲を追加", exact: true })
    .click();
  await page.getByRole("button", { name: "範囲を編集", exact: true }).click();
  await page.getByLabel("テスト名", { exact: true }).fill("期末・修正版");
  await page
    .getByRole("button", { name: "テスト範囲の変更を保存", exact: true })
    .click();
  await expect(page.getByText("期末・修正版 · 2026-11-01")).toBeVisible();
  await openPage(page, /フラッシュカード/);
  await reviewOptions(page);
  await page
    .getByText("小テスト・期末テストの範囲を選ぶ", { exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "テスト範囲", exact: true })
    .selectOption({ label: "期末・修正版（2026-11-01）" });
  await expect(page.getByText("猫", { exact: true })).toBeVisible();
  await expect(page.getByText(/残り 6 語/)).toBeVisible();
  await openPage(page, /単語帳/);
  await page.getByLabel("教材名", { exact: true }).fill("教材A");
  await page.getByRole("button", { name: "教材を追加", exact: true }).click();
  await page.getByRole("button", { name: "教材を編集", exact: true }).click();
  await page.getByLabel("教材名", { exact: true }).fill("教材B");
  await page
    .getByRole("button", { name: "教材の変更を保存", exact: true })
    .click();
  await expect(page.getByText("教材B /")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "教材を削除", exact: true }).click();
  await expect(page.getByText("教材B /")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
});

test("oral recall skips typing without requesting microphone and keeps noun gender required", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await openPage(page, /フラッシュカード/);
  await page
    .getByLabel("声に出して答えた（文字入力を省略）", { exact: true })
    .check();
  await expect(
    page.getByRole("button", { name: "答えを確認する", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("le（男性名詞）").check();
  await page
    .getByRole("button", { name: "答えを確認する", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await expect(
    page.getByLabel("声に出して答えた（文字入力を省略）", { exact: true }),
  ).not.toBeChecked();
  await openPage(page, /統計/);
  await expect(
    page.getByText("まだ記録がありません", { exact: true }),
  ).toBeVisible();
});

test("speech input appends final French transcript, ignores late results and supports Japanese", async ({
  page,
}) => {
  await page.addInitScript(
    `window.__recognitions=[];window.SpeechRecognition=class {start(){window.__recognitions.push(this);}stop(){this.onend?.();}abort(){this.onend?.();}};`,
  );
  await page.goto("/?demo=1");
  await openPage(page, /フラッシュカード/);
  await answerEntry(page);
  await page.getByRole("button", { name: "🎙 音声で入力", exact: true }).click();
  expect(await page.evaluate("window.__recognitions[0].lang")).toBe("fr-FR");
  await page.evaluate(
    "window.__recognitions[0].onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'chat'}}]})",
  );
  await expect(page.getByLabel("あなたの答え", { exact: true })).toHaveValue(
    "chat",
  );
  await page.getByLabel("le（男性名詞）").check();
  await page
    .getByRole("button", { name: "答えを確認する", exact: true })
    .click();
  await page.evaluate(
    "window.__recognitions[0].onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'late text'}}]})",
  );
  await expect(page.getByLabel("あなたの答え", { exact: true })).toHaveValue(
    "chat",
  );
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await reviewOptions(page);
  await page
    .getByRole("combobox", { name: "出題形式", exact: true })
    .selectOption("fr-ja");
  await answerEntry(page);
  await page.getByRole("button", { name: "🎙 音声で入力", exact: true }).click();
  expect(await page.evaluate("window.__recognitions.at(-1).lang")).toBe(
    "ja-JP",
  );
});

test("denied speech input leaves keyboard and oral self-check available", async ({
  page,
}) => {
  await page.addInitScript(
    `window.webkitSpeechRecognition=class{start(){this.onerror?.({error:'not-allowed'});this.onend?.();}abort(){this.onend?.();}stop(){this.onend?.();}};Object.defineProperty(window,'SpeechRecognition',{value:undefined});`,
  );
  await page.goto("/?demo=1");
  await openPage(page, /フラッシュカード/);
  await answerEntry(page);
  await page.getByRole("button", { name: "🎙 音声で入力", exact: true }).click();
  await expect(page.getByText(/マイクが許可されていません/)).toBeVisible();
  await answerEntry(page);
  await page.getByLabel("あなたの答え", { exact: true }).fill("chat");
  await page.getByLabel("le（男性名詞）").check();
  await page
    .getByRole("button", { name: "答えを確認する", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
});

test("mobile Phase 2 has four fixed tabs, visible primary action and progressive controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo=1");
  const nav = page.getByRole("navigation", { name: "メインナビゲーション" });
  await expect(nav.getByRole("button")).toHaveCount(4);
  const start = page.getByRole("button", { name: "今日の復習をはじめる" });
  await expect(start).toBeInViewport();
  const box = await start.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const navBox = await nav.boundingBox();
  expect(navBox!.y).toBeGreaterThan(700);
  await start.click();
  await expect(page.getByText("猫", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "答えを確認する" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("combobox", { name: "出題形式" }),
  ).not.toBeVisible();
  await page.getByText("出題設定", { exact: true }).click();
  await expect(page.getByRole("combobox", { name: "出題形式" })).toBeVisible();
  await openPage(page, /単語帳/);
  await page.getByRole("button", { name: "＋ 単語を登録" }).click();
  await expect(page.getByLabel("フランス語 *", { exact: true })).toBeVisible();
  await expect(page.getByLabel("タグ", { exact: true })).not.toBeVisible();
  await page.getByText("例文・授業の情報（任意）", { exact: true }).click();
  await expect(page.getByLabel("タグ", { exact: true })).toBeVisible();
  await openPage(page, /設定/);
  await expect(
    page.getByRole("heading", { name: "自分のペースで。" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 640 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
