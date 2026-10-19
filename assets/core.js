export const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
export function winner(board) {
  for (const line of winningLines)
    if (board[line[0]] && line.every((i) => board[i] === board[line[0]]))
      return board[line[0]];
  return board.every(Boolean) ? "draw" : null;
}
export function slideLine(line) {
  const cells = line.filter(Boolean),
    output = [];
  let score = 0;
  for (let i = 0; i < cells.length; i++) {
    if (cells[i] === cells[i + 1]) {
      output.push(cells[i] * 2);
      score += cells[i] * 2;
      i++;
    } else output.push(cells[i]);
  }
  while (output.length < line.length) output.push(0);
  return { line: output, score };
}
export function moveGrid(grid, direction) {
  const output = [...grid];
  let score = 0;
  for (let i = 0; i < 4; i++) {
    const indices = Array.from({ length: 4 }, (_, j) =>
      direction === "left" || direction === "right" ? i * 4 + j : j * 4 + i,
    );
    if (direction === "right" || direction === "down") indices.reverse();
    const result = slideLine(indices.map((n) => grid[n]));
    indices.forEach((n, j) => (output[n] = result.line[j]));
    score += result.score;
  }
  return { grid: output, score, changed: output.some((n, i) => n !== grid[i]) };
}
export function randomInt(min, max) {
  const range = max - min + 1;
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    range < 1 ||
    range > 4294967296
  )
    throw new Error("범위를 확인하세요 (최대 간격: 4,294,967,295).");
  const limit = Math.floor(4294967296 / range) * range,
    bytes = new Uint32Array(1);
  do {
    crypto.getRandomValues(bytes);
  } while (bytes[0] >= limit);
  return min + (bytes[0] % range);
}
export function shuffled(items) {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}
export function neighbors(index, width = 8, height = 8) {
  const list = [],
    x = index % width,
    y = Math.floor(index / width);
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (
        (dx || dy) &&
        x + dx >= 0 &&
        x + dx < width &&
        y + dy >= 0 &&
        y + dy < height
      )
        list.push((y + dy) * width + x + dx);
    }
  return list;
}
export const units = {
  length: {
    label: "길이",
    units: {
      m: ["미터 (m)", 1],
      km: ["킬로미터 (km)", 1000],
      cm: ["센티미터 (cm)", 0.01],
      mm: ["밀리미터 (mm)", 0.001],
      inch: ["인치 (in)", 0.0254],
      ft: ["피트 (ft)", 0.3048],
      mile: ["마일 (mi)", 1609.344],
    },
  },
  weight: {
    label: "무게",
    units: {
      kg: ["킬로그램 (kg)", 1],
      g: ["그램 (g)", 0.001],
      lb: ["파운드 (lb)", 0.45359237],
      oz: ["온스 (oz)", 0.028349523125],
    },
  },
  temperature: {
    label: "온도",
    units: { C: ["섭씨 (°C)", 1], F: ["화씨 (°F)", 1], K: ["켈빈 (K)", 1] },
  },
  area: {
    label: "넓이",
    units: {
      sqm: ["제곱미터 (m²)", 1],
      pyeong: ["평", 3.305785123966942],
      hectare: ["헥타르 (ha)", 10000],
    },
  },
};
export function convert(value, category, from, to) {
  if (category === "temperature") {
    const c =
      from === "F"
        ? ((value - 32) * 5) / 9
        : from === "K"
          ? value - 273.15
          : value;
    return to === "F" ? (c * 9) / 5 + 32 : to === "K" ? c + 273.15 : c;
  }
  return (
    (value * units[category].units[from][1]) / units[category].units[to][1]
  );
}
export function textStats(text) {
  return {
    characters: [...text].length,
    compact: [...text.replace(/\s/gu, "")].length,
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    lines: text ? text.split(/\r?\n/).length : 0,
    bytes: new TextEncoder().encode(text).length,
  };
}
export function dateDifference(from, to) {
  // UTC dates avoid daylight-saving changes affecting calendar day counts.
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000,
  );
}
