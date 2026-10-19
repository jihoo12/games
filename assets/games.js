import {
  winner,
  moveGrid,
  randomInt,
  shuffled,
  neighbors,
  isGame2048State,
} from "./core.js";
import {
  $,
  status,
  statusHTML,
  read,
  save,
  renderBoard,
  boardNavigation,
} from "./ui.js";

function tictactoe(root) {
  root.innerHTML = `<label>플레이 모드<select id="mode"><option value="cpu">컴퓨터와 (나는 X)</option><option value="friend">친구와 번갈아</option></select></label>${statusHTML}<div class="board three" id="board"></div><button id="reset">새 게임</button>`;
  let board, turn, ended, timer;
  function draw() {
    renderBoard(
      root,
      board
        .map(
          (v, i) =>
            `<button data-i="${i}" aria-label="${i + 1}번 칸${v ? `: ${v}` : ""}" ${v || ended || (turn === "O" && $(root, "#mode").value === "cpu") ? "disabled" : ""}>${v}</button>`,
        )
        .join(""),
    );
    const result = winner(board);
    status(
      root,
      result === "draw"
        ? "무승부!"
        : result
          ? `${result} 승리!`
          : `${turn} 차례${turn === "O" && $(root, "#mode").value === "cpu" ? " · 컴퓨터가 생각 중…" : ""}`,
    );
  }
  function play(i) {
    board[i] = turn;
    ended = !!winner(board);
    turn = turn === "X" ? "O" : "X";
    draw();
    if (!ended && turn === "O" && $(root, "#mode").value === "cpu")
      timer = setTimeout(() => play(bestMove()), 280);
  }
  function minimax(cells, player) {
    const result = winner(cells);
    if (result) return result === "O" ? 10 : result === "X" ? -10 : 0;
    const scores = [];
    cells.forEach((v, i) => {
      if (!v) {
        cells[i] = player;
        scores.push(minimax(cells, player === "O" ? "X" : "O"));
        cells[i] = "";
      }
    });
    return player === "O" ? Math.max(...scores) : Math.min(...scores);
  }
  function bestMove() {
    let best = -Infinity,
      move;
    board.forEach((v, i) => {
      if (!v) {
        board[i] = "O";
        const score = minimax(board, "X");
        board[i] = "";
        if (score > best) {
          best = score;
          move = i;
        }
      }
    });
    return move;
  }
  function reset() {
    clearTimeout(timer);
    board = Array(9).fill("");
    turn = "X";
    ended = false;
    draw();
  }
  $(root, "#board").onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (b && !b.disabled) play(+b.dataset.i);
  };
  $(root, "#reset").onclick = reset;
  $(root, "#mode").onchange = reset;
  boardNavigation(root, 3);
  reset();
}

function memory(root) {
  root.innerHTML = `<p class="hint">두 장씩 뒤집어 같은 그림 8쌍을 찾아보세요.</p>${statusHTML}<div id="board" class="board four"></div><button id="reset">새 게임</button>`;
  let cards, open, found, moves, locked, timer;
  function draw() {
    renderBoard(
      root,
      cards
        .map(
          (v, i) =>
            `<button data-i="${i}" class="${found.has(i) ? "matched" : ""}" ${found.has(i) || open.includes(i) ? "disabled" : ""} aria-label="${i + 1}번 카드: ${found.has(i) || open.includes(i) ? v : "뒤집힘"}">${found.has(i) || open.includes(i) ? v : "?"}</button>`,
        )
        .join(""),
    );
    status(
      root,
      found.size === 16
        ? `완성! ${moves}번 만에 모두 찾았어요.`
        : `시도 ${moves}회 · 찾은 쌍 ${found.size / 2} / 8`,
    );
  }
  $(root, "#board").onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (!b || b.disabled || locked) return;
    open.push(+b.dataset.i);
    if (open.length === 2) {
      moves++;
      if (cards[open[0]] === cards[open[1]]) {
        open.forEach((i) => found.add(i));
        open = [];
      } else {
        locked = true;
        timer = setTimeout(() => {
          open = [];
          locked = false;
          draw();
        }, 750);
      }
    }
    draw();
  };
  function reset() {
    clearTimeout(timer);
    cards = shuffled([..."🍒🍋🍇🍉🥝🍑🍓🍊", ..."🍒🍋🍇🍉🥝🍑🍓🍊"]);
    open = [];
    found = new Set();
    moves = 0;
    locked = false;
    draw();
  }
  $(root, "#reset").onclick = reset;
  boardNavigation(root, 4);
  reset();
}

function mines(root) {
  root.innerHTML = `<p class="hint">8×8 보드에 지뢰 10개. 첫 칸과 주변은 안전해요. 우클릭, F 키 또는 깃발 모드로 표시하세요. 방향키로 칸을 이동할 수 있어요.</p><div class="row"><button id="flag" aria-pressed="false">🚩 깃발 모드: 꺼짐</button><button id="reset">새 게임</button></div>${statusHTML}<div id="board" class="board eight"></div>`;
  let bombs,
    revealed,
    flags,
    ended,
    first,
    flagMode = false,
    exploded = -1;
  function draw() {
    renderBoard(
      root,
      Array.from({ length: 64 }, (_, i) => {
        const n = bombs ? neighbors(i).filter((j) => bombs.has(j)).length : 0;
        const text =
          ended && bombs?.has(i)
            ? "💣"
            : flags.has(i)
              ? "🚩"
              : revealed.has(i)
                ? n || "·"
                : "";
        return `<button data-i="${i}" data-number="${revealed.has(i) ? n : 0}" class="${revealed.has(i) ? "revealed" : ""} ${i === exploded ? "exploded" : ""}" aria-label="${Math.floor(i / 8) + 1}행 ${(i % 8) + 1}열: ${text || "닫힘"}" ${ended || revealed.has(i) ? "disabled" : ""}>${text}</button>`;
      }).join(""),
    );
    status(
      root,
      ended
        ? revealed.size === 54
          ? "성공! 모든 안전한 칸을 찾았어요."
          : "지뢰를 밟았어요. 다시 도전해 보세요!"
        : `남은 깃발 ${10 - flags.size} · 열린 칸 ${revealed.size} / 54`,
    );
  }
  function reveal(i) {
    if (revealed.has(i) || flags.has(i) || ended) return;
    if (first) {
      const safe = new Set([i, ...neighbors(i)]);
      bombs = new Set(
        shuffled(
          Array.from({ length: 64 }, (_, n) => n).filter((n) => !safe.has(n)),
        ).slice(0, 10),
      );
      first = false;
    }
    if (bombs.has(i)) {
      exploded = i;
      ended = true;
      draw();
      return;
    }
    const queue = [i];
    while (queue.length) {
      const j = queue.pop();
      if (revealed.has(j) || flags.has(j)) continue;
      revealed.add(j);
      if (!neighbors(j).some((n) => bombs.has(n)))
        queue.push(...neighbors(j).filter((n) => !revealed.has(n)));
    }
    if (revealed.size === 54) ended = true;
    draw();
  }
  function flag(i) {
    if (ended || revealed.has(i)) return;
    if (flags.has(i)) flags.delete(i);
    else if (flags.size < 10) flags.add(i);
    draw();
  }
  $(root, "#board").onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (b && !b.disabled) (flagMode ? flag : reveal)(+b.dataset.i);
  };
  $(root, "#board").oncontextmenu = (e) => {
    e.preventDefault();
    const b = e.target.closest("[data-i]");
    if (b) flag(+b.dataset.i);
  };
  $(root, "#board").addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
      const button = e.target.closest("[data-i]");
      if (button) {
        e.preventDefault();
        flag(+button.dataset.i);
      }
    }
  });
  $(root, "#flag").onclick = () => {
    flagMode = !flagMode;
    $(root, "#flag").setAttribute("aria-pressed", String(flagMode));
    $(root, "#flag").textContent =
      `🚩 깃발 모드: ${flagMode ? "켜짐" : "꺼짐"}`;
  };
  function reset() {
    bombs = null;
    exploded = -1;
    revealed = new Set();
    flags = new Set();
    ended = false;
    first = true;
    draw();
  }
  $(root, "#reset").onclick = reset;
  boardNavigation(root, 8);
  reset();
}

function game2048(root) {
  root.innerHTML = `<div class="row"><span>점수 <b id="score">0</b> · 최고 <b id="best">0</b></span><button id="undo" disabled>한 수 되돌리기</button><button id="reset">새 게임</button></div><p class="hint">진행 상황은 자동 저장돼요. 방향키, 스와이프, 아래 버튼으로 이동하세요. 2048 이후에도 계속할 수 있어요.</p><div id="board" class="board four" role="group" aria-label="2048 보드" tabindex="0" style="touch-action:none"></div><div class="row center" style="justify-content:center">${["up", "left", "down", "right"].map((d, i) => `<button data-dir="${d}" aria-label="${["위", "왼쪽", "아래", "오른쪽"][i]}">${["↑", "←", "↓", "→"][i]}</button>`).join("")}</div>${statusHTML}`;
  let grid,
    score,
    best = Number(read("2048-best", 0)) || 0,
    start,
    previous = null;
  function spawn() {
    const empty = grid.flatMap((n, i) => (n ? [] : [i]));
    if (empty.length)
      grid[empty[randomInt(0, empty.length - 1)]] = Math.random() < 0.9 ? 2 : 4;
  }
  function draw() {
    $(root, "#board").innerHTML = grid
      .map(
        (n, i) =>
          `<div class="cell tile-${n > 64 ? "high" : n}" role="img" aria-label="${Math.floor(i / 4) + 1}행 ${(i % 4) + 1}열: ${n || "빈 칸"}" style="font-size:${n >= 100000 ? ".85rem" : n >= 10000 ? "1.1rem" : ""}">${n || ""}</div>`,
      )
      .join("");
    $(root, "#score").textContent = score;
    $(root, "#best").textContent = best;
    $(root, "#undo").disabled = !previous;
    save("2048-state", { grid, score });
    const over = ["up", "down", "left", "right"].every(
      (d) => !moveGrid(grid, d).changed,
    );
    status(
      root,
      over
        ? "이동할 수 없어요. 새 게임으로 다시 도전!"
        : grid.includes(2048)
          ? "2048 달성! 계속해서 기록을 높여 보세요."
          : "같은 숫자를 합쳐 보세요.",
    );
  }
  function move(d) {
    const next = moveGrid(grid, d);
    if (!next.changed) return;
    previous = { grid: [...grid], score };
    grid = next.grid;
    score += next.score;
    if (score > best) {
      best = score;
      save("2048-best", best);
    }
    spawn();
    draw();
  }
  root
    .querySelectorAll("[data-dir]")
    .forEach((b) => (b.onclick = () => move(b.dataset.dir)));
  document.addEventListener("keydown", (e) => {
    const d = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    }[e.key];
    if (
      d &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    ) {
      e.preventDefault();
      move(d);
    }
  });
  const board = $(root, "#board");
  board.onpointerdown = (e) => {
    start = [e.clientX, e.clientY];
    board.setPointerCapture(e.pointerId);
  };
  board.onpointerup = (e) => {
    if (!start) return;
    const dx = e.clientX - start[0],
      dy = e.clientY - start[1];
    start = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 24)
      move(
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up",
      );
  };
  board.onpointercancel = () => (start = null);
  function reset() {
    previous = null;
    grid = Array(16).fill(0);
    score = 0;
    spawn();
    spawn();
    draw();
  }
  $(root, "#reset").onclick = reset;
  $(root, "#undo").onclick = () => {
    if (!previous) return;
    grid = previous.grid;
    score = previous.score;
    previous = null;
    draw();
  };
  const saved = read("2048-state", null);
  if (isGame2048State(saved)) {
    grid = saved.grid;
    score = saved.score;
    best = Math.max(best, score);
    draw();
  } else reset();
}

function lights(root) {
  root.innerHTML = `<p class="hint">누른 칸과 상하좌우 칸의 불이 바뀝니다. 모든 불을 꺼보세요. 풀 수 있는 퍼즐만 나와요.</p>${statusHTML}<div id="board" class="board five"></div><button id="reset">새 퍼즐</button>`;
  let cells, moves;
  function toggle(i) {
    [i, i % 5 > 0 ? i - 1 : -1, i % 5 < 4 ? i + 1 : -1, i - 5, i + 5]
      .filter((n) => n >= 0 && n < 25)
      .forEach((n) => (cells[n] = !cells[n]));
  }
  function draw() {
    const won = !cells.some(Boolean);
    renderBoard(
      root,
      cells
        .map(
          (v, i) =>
            `<button data-i="${i}" class="${v ? "lit" : ""}" aria-label="${i + 1}번 불" aria-pressed="${v}" ${won ? "disabled" : ""}>${v ? "●" : "·"}</button>`,
        )
        .join(""),
    );
    status(
      root,
      won
        ? `성공! ${moves}번 만에 모두 껐어요.`
        : `이동 ${moves}회 · 켜진 불 ${cells.filter(Boolean).length}개`,
    );
  }
  $(root, "#board").onclick = (e) => {
    const b = e.target.closest("[data-i]");
    if (b && !b.disabled) {
      toggle(+b.dataset.i);
      moves++;
      draw();
    }
  };
  function reset() {
    do {
      cells = Array(25).fill(false);
      shuffled(Array.from({ length: 25 }, (_, i) => i))
        .slice(0, 12)
        .forEach(toggle);
    } while (!cells.some(Boolean));
    moves = 0;
    draw();
  }
  $(root, "#reset").onclick = reset;
  boardNavigation(root, 5);
  reset();
}

function reaction(root) {
  root.innerHTML = `<p class="hint">시작을 누르고 기다리세요. 초록색이 되면 클릭하거나 스페이스바를 누르세요. 화면과 입력 장치에 따라 측정값이 달라질 수 있어요.</p><button id="pad" class="reaction-pad">눌러서 시작</button>${statusHTML}<button id="reset">기록 초기화</button>`;
  let phase = "idle",
    timer,
    started,
    results = [];
  const pad = $(root, "#pad");
  function activate() {
    if (phase === "idle") {
      phase = "wait";
      pad.className = "reaction-pad wait";
      pad.textContent = "기다리세요…";
      timer = setTimeout(
        () => {
          phase = "go";
          started = performance.now();
          pad.className = "reaction-pad go";
          pad.textContent = "지금!";
        },
        randomInt(1500, 4000),
      );
    } else if (phase === "wait") {
      clearTimeout(timer);
      phase = "idle";
      pad.className = "reaction-pad";
      pad.textContent = "너무 빨랐어요! 눌러서 다시 시작";
    } else {
      const ms = Math.round(performance.now() - started);
      results.push(ms);
      phase = "idle";
      pad.className = "reaction-pad";
      pad.textContent = `${ms} ms · 눌러서 다시 측정`;
      status(
        root,
        `${results.length}회 측정 · 평균 ${Math.round(results.reduce((a, b) => a + b, 0) / results.length)} ms · 최고 ${Math.min(...results)} ms`,
      );
    }
  }
  pad.onclick = (e) => {
    if (e.detail === 0) activate();
  };
  pad.onpointerdown = (e) => {
    if (e.button === 0) {
      e.preventDefault();
      pad.focus();
      activate();
    }
  };
  pad.onkeydown = (e) => {
    if (e.code === "Space" || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) activate();
    }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && phase !== "idle") {
      clearTimeout(timer);
      phase = "idle";
      pad.className = "reaction-pad";
      pad.textContent = "눌러서 다시 시작";
      status(root, "탭을 벗어나 측정을 취소했어요.");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !e.repeat && e.target == document.body) {
      e.preventDefault();
      activate();
    }
  });
  $(root, "#reset").onclick = () => {
    clearTimeout(timer);
    phase = "idle";
    results = [];
    pad.className = "reaction-pad";
    pad.textContent = "눌러서 시작";
    status(root, "");
  };
}

function guess(root) {
  root.innerHTML = `<p class="hint">1~100 사이의 정수를 맞혀 보세요. 더 큰지, 작은지 알려드려요.</p><form class="stack" id="form"><label>예상 숫자<input type="number" id="guess" min="1" max="100" step="1" required inputmode="numeric" autocomplete="off"></label><button class="primary" id="submit">확인</button></form>${statusHTML}<div class="result" id="history">아직 시도하지 않았어요.</div><button id="reset" class="actions">새 게임</button>`;
  let target, attempts, ended, history, low, high, used;
  $(root, "#form").onsubmit = (e) => {
    e.preventDefault();
    const n = Number($(root, "#guess").value);
    if (ended || !Number.isInteger(n) || n < 1 || n > 100) return;
    if (used.has(n)) {
      status(root, "이미 입력한 숫자예요. 다른 숫자를 골라보세요.");
      return;
    }
    used.add(n);
    if (n < target) low = Math.max(low, n + 1);
    if (n > target) high = Math.min(high, n - 1);
    attempts++;
    ended = n === target || attempts === 7;
    history.push(
      `${n}: ${n === target ? "정답!" : n < target ? "UP ↑" : "DOWN ↓"}`,
    );
    $(root, "#history").textContent = history.join("\n");
    status(
      root,
      n === target
        ? `정답! ${attempts}번 만에 맞혔어요.`
        : ended
          ? `기회가 끝났어요. 정답은 ${target}!`
          : `${n < target ? "더 큰" : "더 작은"} 숫자예요. 남은 기회 ${7 - attempts}번 · 가능 범위 ${low}~${high}`,
    );
    $(root, "#submit").disabled = ended;
    $(root, "#guess").value = "";
    $(root, "#guess").focus();
  };
  function reset() {
    target = randomInt(1, 100);
    low = 1;
    high = 100;
    used = new Set();
    attempts = 0;
    ended = false;
    history = [];
    $(root, "#guess").value = "";
    $(root, "#submit").disabled = false;
    $(root, "#history").textContent = "아직 시도하지 않았어요.";
    status(root, "기회 7번!");
  }
  $(root, "#reset").onclick = reset;
  reset();
}

function rps(root) {
  root.innerHTML = `<div class="row">${["✊", "✋", "✌️"].map((s, i) => `<button class="choice" data-i="${i}" aria-label="${["바위", "보", "가위"][i]}">${s}</button>`).join("")}</div>${statusHTML}<div class="result center" id="score"></div><button class="actions" id="reset">기록 초기화</button>`;
  let wins = 0,
    draws = 0,
    losses = 0;
  function draw() {
    $(root, "#score").textContent = `${wins}승 · ${draws}무 · ${losses}패`;
  }
  root.querySelectorAll("[data-i]").forEach(
    (b) =>
      (b.onclick = () => {
        const me = +b.dataset.i,
          cpu = randomInt(0, 2),
          result = (me - cpu + 3) % 3;
        if (result === 0) draws++;
        else if (result === 1) wins++;
        else losses++;
        status(
          root,
          `나 ${["✊", "✋", "✌️"][me]} : 컴퓨터 ${["✊", "✋", "✌️"][cpu]} · ${result === 0 ? "무승부!" : result === 1 ? "승리!" : "다음 기회에!"}`,
        );
        draw();
      }),
  );
  $(root, "#reset").onclick = () => {
    wins = draws = losses = 0;
    status(root, "하나를 골라보세요.");
    draw();
  };
  $(root, "#reset").click();
}
export const games = {
  2048: game2048,
  tictactoe,
  memory,
  mines,
  lights,
  reaction,
  guess,
  rps,
};
