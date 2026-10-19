const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { existsSync, mkdirSync } = require("node:fs");
const base = process.env.BASE_URL || "http://127.0.0.1:8000";
mkdirSync("test-results", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
  const go = async (id) => {
    await page.goto(`${base}/${id ? "?app=" + id : ""}`);
    await page.locator(id ? "#workspace" : "#cards").waitFor();
  };
  const status = () => page.locator("#status").innerText();
  let checks = 0;
  const ok = (condition, message) => {
    assert.ok(condition, message);
    checks++;
  };
  await go();
  ok((await page.locator(".card").count()) === 20, "20 catalog items");
  await page.getByRole("button", { name: "게임 10", exact: true }).click();
  ok((await page.locator(".card").count()) === 10, "game filter");
  await page.getByRole("button", { name: "도구 10", exact: true }).click();
  ok((await page.locator(".card").count()) === 10, "tool filter");
  await page.locator("#search").fill("JSON");
  ok((await page.locator(".card").count()) === 1, "search");
  await page.locator("#search").fill("<script>");
  ok((await page.locator(".card").count()) === 0, "empty search");
  await go();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  const ids = [
    "2048",
    "mines",
    "memory",
    "tictactoe",
    "lights",
    "reaction",
    "guess",
    "rps",
    "calculator",
    "pomodoro",
    "stopwatch",
    "units",
    "text",
    "password",
    "random",
    "color",
    "date",
    "json",
  ];
  for (const id of ids) {
    await go(id);
    ok(
      (await page.locator("#workspace").innerText()).length > 0,
      `${id} renders`,
    );
  }
  console.log("Catalog and routes passed. Checking games…");
  await go("tictactoe");
  await page.locator("#mode").selectOption("friend");
  for (const n of [0, 3, 1, 4, 2])
    await page.locator(`[data-i="${n}"]`).click();
  ok((await status()).includes("X 승리"), "tictactoe win");
  await page.locator("#reset").click();
  ok((await status()).includes("X 차례"), "ttt reset");
  await page.locator("#mode").selectOption("cpu");
  await page.locator('[data-i="0"]').click();
  await page.locator("#board").getByText("O", { exact: true }).waitFor();
  ok(
    await page
      .locator("#board")
      .innerText()
      .then((s) => s.includes("O")),
    "cpu replies",
  );
  await go("memory");
  const known = new Map();
  // Peek at two unknown cards per turn, then use remembered pairs.
  for (
    let round = 0;
    round < 40 && !(await status()).includes("완성");
    round++
  ) {
    const remaining = await page
      .locator("#board button:not([disabled])")
      .evaluateAll((bs) => bs.map((b) => +b.dataset.i));
    const byValue = new Map();
    let pair;
    for (const i of remaining) {
      const v = known.get(i);
      if (v) {
        if (byValue.has(v)) {
          pair = [byValue.get(v), i];
          break;
        }
        byValue.set(v, i);
      }
    }
    const first = pair
      ? pair[0]
      : (remaining.find((i) => !known.has(i)) ?? remaining[0]);
    await page.locator(`[data-i="${first}"]`).click();
    const value = await page.locator(`[data-i="${first}"]`).innerText();
    known.set(first, value);
    const second = pair
      ? pair[1]
      : (remaining.find((i) => i !== first && known.get(i) === value) ??
        remaining.find((i) => i !== first && !known.has(i)) ??
        remaining.find((i) => i !== first));
    await page.locator(`[data-i="${second}"]`).click();
    known.set(second, await page.locator(`[data-i="${second}"]`).innerText());
    await page.waitForTimeout(800);
  }
  ok((await status()).includes("완성"), "memory full game");
  await go("mines");
  await page.locator('[data-i="27"]').click();
  ok(!(await status()).includes("밟았"), "first mine click safe");
  ok((await page.locator(".revealed").count()) >= 9, "first neighbors safe");
  const hidden = page.locator("#board button:not([disabled])").first();
  await hidden.click({ button: "right" });
  ok(
    await page
      .locator("#board")
      .innerText()
      .then((s) => s.includes("🚩")),
    "mine flag",
  );
  await page.locator("#reset").click();
  ok((await page.locator("#board button").count()) === 64, "mine reset");
  await go("2048");
  const before = await page.locator("#board").innerText();
  for (const dir of ["left", "up", "right", "down"])
    await page.locator(`[data-dir="${dir}"]`).click();
  ok((await page.locator("#board").innerText()) !== before, "2048 changes");
  await page.locator("#reset").click();
  ok((await page.locator("#score").innerText()) === "0", "2048 reset");
  await go("lights");
  const states = await page
    .locator("#board button")
    .evaluateAll((bs) => bs.map((b) => (b.classList.contains("lit") ? 1 : 0)));
  // Solve Ax=b over GF(2) to verify every generated lights puzzle is playable.
  const matrix = states.map((v, i) => [
    ...Array.from({ length: 25 }, (_, j) =>
      i === j ||
      (Math.floor(i / 5) === Math.floor(j / 5) && Math.abs(i - j) === 1) ||
      Math.abs(i - j) === 5
        ? 1
        : 0,
    ),
    v,
  ]);
  let row = 0;
  const pivots = [];
  for (let col = 0; col < 25; col++) {
    const p = matrix.findIndex((r, i) => i >= row && r[col]);
    if (p < 0) continue;
    [matrix[row], matrix[p]] = [matrix[p], matrix[row]];
    for (let r = 0; r < 25; r++)
      if (r !== row && matrix[r][col])
        for (let c = col; c <= 25; c++) matrix[r][c] ^= matrix[row][c];
    pivots.push(col);
    row++;
  }
  for (let r = 0; r < pivots.length; r++)
    if (matrix[r][25]) await page.locator(`[data-i="${pivots[r]}"]`).click();
  ok((await status()).includes("성공"), "lights puzzle solved");
  await go("reaction");
  await page.locator("#pad").click();
  await page.locator("#pad").click();
  ok(
    await page
      .locator("#pad")
      .innerText()
      .then((s) => s.includes("너무 빨랐")),
    "reaction early click",
  );
  await page.locator("#pad").click();
  await page.locator("#pad.go").waitFor({ timeout: 5000 });
  await page.locator("#pad").click();
  ok((await status()).includes("1회 측정"), "reaction measurement");
  await go("guess");
  await page.locator("#guess").fill("50");
  await page.locator("#submit").click();
  ok(
    await page
      .locator("#history")
      .innerText()
      .then((s) => s.includes("50")),
    "guess history",
  );
  await page.locator("#reset").click();
  ok((await status()).includes("7번"), "guess reset");
  await go("rps");
  await page.locator('[data-i="0"]').click();
  ok(
    (await page.locator("#score").innerText()) !== "0승 · 0무 · 0패",
    "rps score",
  );
  console.log("Games passed. Checking tools…");
  await go("calculator");
  await page.keyboard.type("12+3");
  await page.keyboard.press("Enter");
  ok(
    (await page.locator("#display").inputValue()) === "15",
    "calculator keyboard",
  );
  await page.keyboard.type("/0");
  await page.keyboard.press("Enter");
  ok((await status()).includes("0으로"), "zero division handled");
  await page.clock.install();
  await go("pomodoro");
  await page.locator('[data-preset="5"]').click();
  ok((await page.locator("#time").innerText()) === "05:00", "timer preset");
  await page.locator("#minutes").fill("1");
  await page.locator("#minutes").dispatchEvent("change");
  await page.locator("#toggle").click();
  await page.clock.fastForward(61000);
  ok((await status()).includes("시간이 다"), "timer completion");
  await go("stopwatch");
  await page.locator("#toggle").click();
  await page.clock.fastForward(1234);
  await page.locator("#lap").click();
  ok((await page.locator("#laps li").count()) === 1, "stopwatch lap");
  await page.locator("#toggle").click();
  const time = await page.locator("#time").innerText();
  await page.clock.fastForward(2000);
  ok((await page.locator("#time").innerText()) === time, "stopwatch pause");
  await go("units");
  await page.locator("#category").selectOption("temperature");
  await page.locator("#value").fill("100");
  ok(
    await page
      .locator("#result")
      .innerText()
      .then((s) => s.includes("212")),
    "temperature conversion",
  );
  await go("text");
  await page.locator("#text").fill("가 😀\nA");
  ok(
    await page
      .locator("#result")
      .innerText()
      .then((s) => s.includes("5자") && s.includes("10바이트")),
    "unicode counter",
  );
  await go("password");
  const pwd = await page.locator("#result").inputValue();
  ok(
    pwd.length === 20 &&
      /[A-Z]/.test(pwd) &&
      /[a-z]/.test(pwd) &&
      /[0-9]/.test(pwd) &&
      /[^a-z0-9]/i.test(pwd),
    "password groups",
  );
  for (const id of ["upper", "lower", "number", "symbol"])
    await page.locator("#" + id).uncheck();
  await page.locator("#generate").click();
  ok((await status()).includes("하나 이상"), "password validation");
  await go("random");
  await page.locator("#mode").selectOption("list");
  await page.locator("#list").fill("A\nB\nA\nC");
  await page.locator("#count").fill("3");
  await page.locator("#draw").click();
  ok(
    new Set((await page.locator("#result").innerText()).split("\n")).size === 3,
    "unique list sampling",
  );
  await page.locator("#mode").selectOption("number");
  await page.locator("#min").fill("10");
  await page.locator("#max").fill("1");
  await page.locator("#draw").click();
  ok((await status()).includes("범위"), "random range validation");
  await go("color");
  await page.locator("#hex").fill("#abc");
  ok(
    (await page.locator("#rgb").innerText()) === "rgb(170, 187, 204)",
    "short hex",
  );
  await page.locator("#hex").fill("bad");
  ok((await status()).includes("형식"), "color validation");
  await go("date");
  await page.locator("#from").fill("2024-02-28");
  await page.locator("#to").fill("2024-03-01");
  ok(
    await page
      .locator("#difference")
      .innerText()
      .then((s) => s.includes("2일")),
    "leap year difference",
  );
  await page.locator("#days").fill("2");
  ok(
    await page
      .locator("#offset")
      .innerText()
      .then((s) => s.includes("2024-03-01")),
    "date addition",
  );
  await go("json");
  await page.locator("#input").fill('{"x":"<img src=x onerror=alert(1)>"}');
  await page.locator("#format").click();
  ok((await status()).includes("올바른"), "valid json");
  ok(
    (await page.locator("#workspace img").count()) === 0,
    "text is not interpreted as HTML",
  );
  await page.locator("#input").fill("{");
  await page.locator("#format").click();
  ok((await status()).includes("JSON 오류"), "json invalid");
  for (const file of ["pingpong.html", "snakegame.html"]) {
    await page.goto(base + "/" + file);
    ok(
      (await page.getByRole("link", { name: "← 전체 놀이터" }).count()) === 1,
      "legacy backlink",
    );
    await page.getByRole("button", { name: "시작하기" }).click();
    ok(
      await page.locator("#ov").evaluate((e) => e.classList.contains("hide")),
      "legacy starts",
    );
  }

  console.log("Tools passed. Checking saved state, focus, and new controls…");
  // Shared navigation: favorites, recent history, URL state, keyboard shortcuts.
  await go();
  await page.locator('[data-favorite="2048"]').click();
  await page.locator('[data-filter="favorite"]').click();
  ok((await page.locator(".card").count()) === 1, "favorite filter");
  await page.reload();
  ok((await page.locator(".card").count()) === 1, "favorite persisted");
  await page.locator('[data-favorite="2048"]').click();
  ok((await page.locator(".empty").count()) === 1, "favorite empty state");
  await page.locator("#clear-search").click();
  await page.keyboard.press("/");
  ok(
    await page.locator("#search").evaluate((e) => e === document.activeElement),
    "search shortcut",
  );
  await page.locator("#search").fill("계산기");
  ok(page.url().includes("q="), "search encoded in URL");
  await page.locator(".card-link").click();
  await page.locator(".back").click();
  ok(
    (await page.locator("#search").inputValue()) === "계산기" &&
      (await page.locator(".card").count()) === 1,
    "catalog state restored",
  );
  ok((await page.locator(".recent a").count()) > 0, "recent list");
  await page.locator("#theme").selectOption("dark");
  await go("units");
  ok(
    (await page.locator("html").getAttribute("data-theme")) === "dark",
    "theme persists across pages",
  );
  await page.goto(base + "/snakegame.html");
  ok(
    (await page.locator("html").getAttribute("data-theme")) === "dark",
    "legacy shares theme",
  );
  // Keyboard focus remains inside boards, arrow navigation and F flag shortcut.
  await go("lights");
  await page.locator('[data-i="0"]').focus();
  await page.keyboard.press("Enter");
  ok(
    await page.evaluate(() => document.activeElement.dataset.i === "0"),
    "lights preserves focused cell",
  );
  await page.keyboard.press("ArrowRight");
  ok(
    await page.evaluate(() => document.activeElement.dataset.i === "1"),
    "board arrow navigation",
  );
  await go("memory");
  await page.locator('[data-i="0"]').focus();
  await page.keyboard.press("Enter");
  ok(
    await page.evaluate(
      () => document.activeElement.closest("#board") !== null,
    ),
    "memory preserves board focus",
  );
  await go("mines");
  await page.locator('[data-i="0"]').focus();
  await page.keyboard.press("f");
  ok(
    (await page.locator('[data-i="0"]').innerText()) === "🚩",
    "keyboard flag",
  );
  // Deterministic 2048 save/undo and recovery from malformed storage.
  await page.evaluate(() =>
    localStorage.setItem(
      "playground:2048-state",
      JSON.stringify({ grid: [2, 2, ...Array(14).fill(0)], score: 0 }),
    ),
  );
  await go("2048");
  await page.locator('[data-dir="left"]').click();
  ok((await page.locator("#score").innerText()) === "4", "2048 merge score");
  const moved = await page.locator("#board").innerText();
  await page.reload();
  ok(
    (await page.locator("#board").innerText()) === moved,
    "2048 reload resumes",
  );
  await page.locator('[data-dir="down"]').click();
  await page.locator("#undo").click();
  ok(
    (await page.locator("#board").innerText()) === moved,
    "2048 undo restores exact grid",
  );
  ok(await page.locator("#undo").isDisabled(), "undo consumed");
  await page.evaluate(() =>
    localStorage.setItem("playground:2048-state", '{"grid":[3],"score":-1}'),
  );
  await page.reload();
  ok(
    (await page.locator("#board .cell").count()) === 16 &&
      (await page.locator("#score").innerText()) === "0",
    "bad 2048 save recovers",
  );
  // Copy labels return to their original wording and empty results cannot be copied.
  await go("color");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text) => (window.lastCopied = text) },
      configurable: true,
    }),
  );
  await page.locator("#copy").click();
  ok((await page.evaluate(() => window.lastCopied)) === "#286249", "HEX copy");
  await page.clock.fastForward(2100);
  ok(
    (await page.locator("#copy").innerText()) === "HEX 복사",
    "copy original label restored",
  );
  await page.locator("#channel-0").fill("255");
  ok(
    (await page.locator("#hex").inputValue()) === "#ff6249",
    "RGB input updates HEX",
  );
  await page.locator("#channel-1").fill("256");
  ok(await page.locator("#copy").isDisabled(), "invalid RGB disables copy");
  await page.locator("#hex").fill("#ffffff");
  ok(
    await page
      .locator("#contrast")
      .innerText()
      .then((s) => s.includes("21.00:1")),
    "WCAG contrast output",
  );
  // Password options immediately update result, no stale copy after invalid input.
  await go("password");
  await page.locator("#length").fill("32");
  ok(
    (await page.locator("#result").inputValue()).length === 32,
    "password length updates immediately",
  );
  await page.locator("#length").fill("0");
  ok(
    await page.locator("#copy").isDisabled(),
    "invalid password cannot copy stale result",
  );
  // JSON indentation, download content, and invalidation on edit.
  await go("json");
  await page.locator("#input").fill('{"x":1}');
  await page.locator("#indent").selectOption("4");
  await page.locator("#input").press("Control+Enter");
  ok(
    (await page.locator("#output").inputValue()).includes('    "x"'),
    "JSON indent and keyboard shortcut",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download").click();
  const downloaded = await downloadPromise;
  ok(downloaded.suggestedFilename() === "formatted.json", "JSON file download");
  await page.locator("#input").fill('{"x":2}');
  ok(
    (await page.locator("#download").isDisabled()) &&
      (await page.locator("#output").inputValue()) === "",
    "JSON edit clears stale output",
  );
  // Timer survives refresh, preserves pause and reflects selected preset.
  await go("pomodoro");
  await page.locator('[data-preset="5"]').click();
  ok(
    (await page.locator('[data-preset="5"]').getAttribute("aria-pressed")) ===
      "true",
    "timer active preset",
  );
  await page.locator("#toggle").click();
  await page.clock.fastForward(10000);
  await page.reload();
  ok(
    (await page.locator("#minutes").isDisabled()) &&
      (await page.locator("#time").innerText()) === "04:50",
    "running timer restored",
  );
  await page.locator("#toggle").click();
  const paused = await page.locator("#time").innerText();
  await page.clock.fastForward(5000);
  await page.reload();
  ok(
    (await page.locator("#time").innerText()) === paused &&
      !(await page.locator("#minutes").isDisabled()),
    "paused timer restored",
  );
  // Space key repeats do not cause a reaction false start.
  await go("reaction");
  await page.locator("#pad").focus();
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  ok(
    (await page.locator("#pad").innerText()) === "기다리세요…",
    "reaction ignores held key",
  );
  await page.keyboard.up("Space");
  await page.clock.fastForward(4100);
  await page.keyboard.press("Space");
  ok((await status()).includes("1회 측정"), "reaction keyboard measurement");
  // Classic games: touch-friendly pause/resume and a visible restart after pausing.
  await page.goto(base + "/snakegame.html");
  await page.locator("#start").click();
  await page.locator("#pause").click();
  ok(
    (await page.locator("#start").isVisible()) &&
      (await page.locator("#start").innerText()) === "계속하기",
    "snake resume control visible",
  );
  await page.locator("#start").click();
  ok(
    await page.locator("#ov").evaluate((e) => e.classList.contains("hide")),
    "snake resumes",
  );
  await page.clock.runFor(2000);
  ok(
    (await page.locator("#start").isVisible()) &&
      (await page.locator("#start").innerText()) === "다시 하기",
    "snake restart remains visible after pause",
  );
  await page.locator("#start").click();
  ok(
    await page.locator("#ov").evaluate((e) => e.classList.contains("hide")),
    "snake restarts",
  );
  await page.goto(base + "/pingpong.html");
  await page.locator("#b").click();
  await page.locator("#pause").click();
  await page.locator("#b").click();
  ok(
    await page.locator("#ov").evaluate((e) => e.classList.contains("hide")),
    "pong resumes via button",
  );
  await page.locator("#pause").click();
  await page.keyboard.press("Space");
  ok(
    await page.locator("#ov").evaluate((e) => e.classList.contains("hide")),
    "pong resumes via space",
  );
  // Storage-disabled mode must still work.
  const restricted = await browser.newContext();
  await restricted.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  const restrictedPage = await restricted.newPage();
  const restrictedErrors = [];
  restrictedPage.on("pageerror", (e) => restrictedErrors.push(e.message));
  await restrictedPage.goto(base);
  await restrictedPage.locator("#cards").waitFor();
  ok(
    (await restrictedPage.locator(".card").count()) === 20,
    "home with blocked storage",
  );
  await restrictedPage.goto(base + "/?app=2048");
  await restrictedPage.locator("#board").waitFor();
  ok(
    (await restrictedPage.locator("#board .cell").count()) === 16 &&
      restrictedErrors.length === 0,
    "game with blocked storage",
  );
  await restricted.close();
  console.log("Interaction checks passed. Checking mobile layouts…");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [width, theme] of [
    [320, "light"],
    [390, "dark"],
  ]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#theme").selectOption(theme);
    for (const id of ["", ...ids]) {
      await go(id);
      ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${id || "home"} ${width}px ${theme} no overflow`,
      );
    }
  }
  console.log(
    "Mobile layouts passed. Checking WCAG rules in light and dark themes…",
  );
  const auditContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const auditPage = await auditContext.newPage();
  for (const theme of ["light", "dark"]) {
    for (const route of [
      "",
      ...ids.map((id) => "?app=" + id),
      "pingpong.html",
      "snakegame.html",
    ]) {
      await auditPage.goto(base + "/" + route);
      await auditPage.locator("#theme").selectOption(theme);
      await auditPage.addScriptTag({ path: require.resolve("axe-core") });
      const violations = await auditPage.evaluate(async () => {
        const result = await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return result.violations.map(
          (v) =>
            `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
        );
      });
      ok(
        violations.length === 0,
        `${theme} ${route || "home"} accessibility: ${violations.join("; ")}`,
      );
    }
  }
  await auditContext.close();
  await go();
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await go("2048");
  await page.screenshot({
    path: "test-results/2048-mobile.png",
    fullPage: true,
  });
  ok(errors.length === 0, "browser errors: " + errors.join(", "));
  console.log(
    `PASS: ${checks} browser assertions across 20 apps, desktop + mobile. No console or HTTP errors.`,
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
