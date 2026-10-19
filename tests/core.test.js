import test from "node:test";
import assert from "node:assert/strict";
import {
  winner,
  slideLine,
  moveGrid,
  neighbors,
  randomInt,
  shuffled,
  convert,
  textStats,
  dateDifference,
  isGame2048State,
  colorInfo,
} from "../assets/core.js";

test("틱택토: 모든 승리 방향, 무승부, 진행 중", () => {
  assert.equal(winner(["X", "X", "X", "", "", "", "", "", ""]), "X");
  assert.equal(winner(["O", "", "", "O", "", "", "O", "", ""]), "O");
  assert.equal(winner(["X", "", "", "", "X", "", "", "", "X"]), "X");
  assert.equal(winner(["X", "O", "X", "X", "O", "O", "O", "X", "X"]), "draw");
  assert.equal(winner(Array(9).fill("")), null);
});
test("2048: 한 이동에서 한 번만 합치고 점수를 계산", () => {
  assert.deepEqual(slideLine([2, 2, 2, 2]), { line: [4, 4, 0, 0], score: 8 });
  assert.deepEqual(slideLine([2, 2, 4, 0]), { line: [4, 4, 0, 0], score: 4 });
  assert.deepEqual(slideLine([0, 4, 0, 4]), { line: [8, 0, 0, 0], score: 8 });
});
test("2048: 네 방향 이동과 원본 보존, 변화 없음 감지", () => {
  const grid = [2, 2, 0, 0, ...Array(12).fill(0)];
  assert.deepEqual(moveGrid(grid, "left").grid.slice(0, 4), [4, 0, 0, 0]);
  assert.deepEqual(moveGrid(grid, "right").grid.slice(0, 4), [0, 0, 0, 4]);
  assert.deepEqual(moveGrid(grid, "down").grid.slice(12), [2, 2, 0, 0]);
  assert.equal(moveGrid(grid, "up").changed, false);
  assert.deepEqual(grid.slice(0, 4), [2, 2, 0, 0]);
  const full = Array.from({ length: 16 }, (_, i) =>
    (Math.floor(i / 4) + (i % 4)) % 2 ? 4 : 2,
  );
  for (const direction of ["left", "right", "up", "down"])
    assert.equal(moveGrid(full, direction).changed, false);
});
test("지뢰찾기: 모서리와 가장자리에서 이웃이 줄을 넘지 않음", () => {
  assert.deepEqual(neighbors(0), [1, 8, 9]);
  assert.deepEqual(neighbors(7), [6, 14, 15]);
  assert.equal(neighbors(27).length, 8);
  assert.deepEqual(neighbors(63), [54, 55, 62]);
});
test("난수: 경계값 검증과 셔플 원소 보존", () => {
  assert.equal(randomInt(7, 7), 7);
  assert.throws(() => randomInt(2, 1));
  assert.throws(() => randomInt(0, 4294967296));
  assert.throws(() => randomInt(1.5, 2));
  for (let i = 0; i < 100; i++) {
    const n = randomInt(-4, 4);
    assert.ok(Number.isInteger(n) && n >= -4 && n <= 4);
  }
  const input = [1, 2, 3, 4, 5];
  assert.deepEqual(shuffled(input).sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
});
test("단위: 길이, 무게, 넓이, 영하와 온도 왕복", () => {
  assert.equal(convert(1, "length", "km", "m"), 1000);
  assert.equal(convert(1, "length", "inch", "cm"), 2.54);
  assert.equal(convert(1, "weight", "lb", "kg"), 0.45359237);
  assert.equal(convert(32, "temperature", "F", "C"), 0);
  assert.equal(convert(-40, "temperature", "C", "F"), -40);
  assert.equal(convert(0, "temperature", "C", "K"), 273.15);
  assert.ok(
    Math.abs(convert(3.305785123966942, "area", "sqm", "pyeong") - 1) < 1e-10,
  );
});
test("글자: 빈 값, 한글·이모지, 공백, UTF-8 바이트", () => {
  assert.deepEqual(textStats(""), {
    characters: 0,
    compact: 0,
    words: 0,
    lines: 0,
    bytes: 0,
  });
  assert.deepEqual(textStats("가 😀\nA"), {
    characters: 5,
    compact: 3,
    words: 3,
    lines: 2,
    bytes: 10,
  });
});
test("날짜: 윤년, 연도 경계, 같은 날, 역방향, 잘못된 값", () => {
  assert.equal(dateDifference("2024-02-28", "2024-03-01"), 2);
  assert.equal(dateDifference("2025-12-31", "2026-01-01"), 1);
  assert.equal(dateDifference("2026-10-19", "2026-10-19"), 0);
  assert.equal(dateDifference("2026-10-19", "2026-10-18"), -1);
  assert.ok(Number.isNaN(dateDifference("", "")));
});

test("2048 저장 데이터: 정상 상태와 손상된 값 구별", () => {
  const valid = { grid: [2, 4, ...Array(14).fill(0)], score: 40 };
  assert.equal(isGame2048State(valid), true);
  for (const value of [
    null,
    {},
    { ...valid, grid: [2] },
    { ...valid, grid: Array(16).fill(0) },
    { ...valid, grid: [3, ...Array(15).fill(0)] },
    { ...valid, score: -1 },
    { ...valid, score: Infinity },
    { ...valid, grid: ["2", ...Array(15).fill(0)] },
  ]) {
    assert.equal(isGame2048State(value), false);
  }
});

test("색상: 축약 HEX, RGB, WCAG 명암 대비와 잘못된 입력", () => {
  const white = colorInfo("#fff"),
    black = colorInfo("#000000");
  assert.equal(white.hex, "#ffffff");
  assert.deepEqual(white.rgb, [255, 255, 255]);
  assert.equal(white.black, 21);
  assert.equal(white.white, 1);
  assert.equal(white.foreground, "#000000");
  assert.equal(black.foreground, "#ffffff");
  assert.equal(black.white, 21);
  assert.equal(black.black, 1);
  assert.deepEqual(colorInfo("#AbC").rgb, [170, 187, 204]);
  for (const value of ["red", "#12", "#gggggg", "#12345678", "<script>"])
    assert.equal(colorInfo(value), null);
});
