import { test, expect } from "@playwright/test";
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
  await page
    .getByLabel("例文（穴埋めには単語の原形を含めてください）")
    .fill("Le chat dort.");
  await page.getByRole("button", { name: "保存する", exact: true }).click();
  await expect(page.getByText("単語を保存しました。")).toBeVisible();
  await page.reload();
  await page
    .locator("nav")
    .getByRole("button", { name: /単語帳/ })
    .click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await page.getByRole("button", { name: /フラッシュカード/ }).click();
  await expect(page.getByText("猫", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "答えを確認する" }),
  ).toBeDisabled();
  await page.getByLabel("あなたの答え").fill("chat");
  await page.getByLabel("le（男性名詞）").check();
  await page.getByRole("button", { name: "答えを確認する" }).click();
  await expect(page.getByRole("heading", { name: "le chat" })).toBeVisible();
  await page.getByRole("button", { name: "思い出せた", exact: true }).click();
  await expect(
    page.getByText("今の条件で、復習するカードはありません。"),
  ).toBeVisible();
  await page
    .locator("nav")
    .getByRole("button", { name: /一括取り込み/ })
    .click();
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
  await page
    .locator("nav")
    .getByRole("button", { name: /単語帳/ })
    .click();
  await expect(page.getByRole("heading", { name: "la maison" })).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSONバックアップ" }).click();
  expect((await dl).suggestedFilename()).toBe("mon-francais-backup.json");
  await page.getByRole("button", { name: /フラッシュカード/ }).click();
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
  await page
    .locator("nav")
    .getByRole("button", { name: /単語帳/ })
    .click();
  await expect(page.getByRole("heading", { name: "la maison" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobile layout and failed import leave stored data intact", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .locator("nav")
    .getByRole("button", { name: /一括取り込み/ })
    .click();
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
