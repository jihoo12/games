import {
  randomInt,
  shuffled,
  units as unitDefinitions,
  convert,
  textStats,
  dateDifference,
  colorInfo,
} from "./core.js";
import {
  $,
  status,
  statusHTML,
  copy,
  formatTime,
  download,
  read,
  save,
} from "./ui.js";

function calculator(root) {
  root.innerHTML = `<p class="hint">버튼 또는 숫자·사칙연산 키를 사용하세요. Enter: 계산, Backspace: 지우기, Escape: 초기화. 연산은 입력 순서대로 계산합니다.</p><div class="calc-expression" id="expression" aria-live="polite"></div><input id="display" class="display mono" aria-label="계산 결과" value="0" readonly><div class="keypad">${["C", "⌫", "±", "÷", "7", "8", "9", "×", "4", "5", "6", "−", "1", "2", "3", "+", "0", ".", "="].map((k) => `<button data-key="${k}" class="${k === "=" ? "primary wide" : ""}">${k}</button>`).join("")}</div>${statusHTML}`;
  let current = "0",
    stored = null,
    operator = null,
    fresh = true;
  const display = $(root, "#display");
  function operation(a, b, op) {
    return op === "+"
      ? a + b
      : op === "−"
        ? a - b
        : op === "×"
          ? a * b
          : b === 0
            ? NaN
            : a / b;
  }
  function press(key) {
    status(root, "");
    if (key === "C") {
      current = "0";
      stored = null;
      operator = null;
      fresh = true;
    } else if (/^[0-9]$/.test(key)) {
      if (fresh || current === "0") {
        current = key;
        fresh = false;
      } else if (current.length < 16) current += key;
    } else if (key === ".") {
      if (fresh) {
        current = "0.";
        fresh = false;
      } else if (!current.includes(".")) current += ".";
    } else if (key === "⌫") {
      current = fresh ? "0" : current.slice(0, -1) || "0";
      fresh = false;
    } else if (key === "±") {
      if (Number(current) !== 0) current = String(-Number(current));
    } else if (["+", "−", "×", "÷", "="].includes(key)) {
      if (stored !== null && operator && !fresh) {
        const value = operation(stored, Number(current), operator);
        if (!Number.isFinite(value)) {
          current = "0";
          stored = operator = null;
          fresh = true;
          status(root, "계산할 수 없어요. 0으로 나누거나 범위를 벗어났습니다.");
          display.value = current;
          return;
        }
        current = String(Number(value.toPrecision(12)));
      }
      stored = key === "=" ? null : Number(current);
      operator = key === "=" ? null : key;
      fresh = true;
    }
    display.value = current;
    $(root, "#expression").textContent =
      stored !== null && operator ? `${stored} ${operator}` : "";
  }
  root
    .querySelectorAll("[data-key]")
    .forEach((b) => (b.onclick = () => press(b.dataset.key)));
  document.addEventListener("keydown", (e) => {
    if (
      e.ctrlKey ||
      e.metaKey ||
      e.altKey ||
      e.target.closest("header") ||
      /SELECT|TEXTAREA/.test(e.target.tagName)
    )
      return;
    const mapped =
      { "/": "÷", "*": "×", "-": "−", Enter: "=", Escape: "C", Backspace: "⌫" }[
        e.key
      ] || e.key;
    if (
      /^[0-9.+]$/.test(mapped) ||
      ["÷", "×", "−", "=", "C", "⌫"].includes(mapped)
    ) {
      e.preventDefault();
      press(mapped);
    }
  });
}

function pomodoro(root) {
  root.innerHTML = `<div class="stack"><div class="row timer-presets"><button data-preset="25" aria-pressed="true">집중 25분</button><button data-preset="5" aria-pressed="false">짧은 휴식 5분</button><button data-preset="15" aria-pressed="false">긴 휴식 15분</button></div><label>사용자 지정 (1~180분)<input type="number" id="minutes" value="25" min="1" max="180" step="1"></label><div class="big center" id="time" role="timer">25:00</div><div class="progress" role="progressbar" aria-label="타이머 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="progress"></span></div><div class="row"><button class="primary" id="toggle">시작</button><button id="reset">초기화</button></div>${statusHTML}<p class="hint">탭을 열어 두세요. 완료 시 화면과 소리로 알려드려요. 기기가 잠자기 상태이거나 소리가 차단되면 알림이 늦거나 들리지 않을 수 있어요.</p></div>`;
  const savedTimer = read("pomodoro-state", null);
  const title = document.title;
  let lastSaved = "";
  let duration = 25 * 60000,
    remaining = duration,
    deadline = 0,
    running = false,
    audio;
  function draw() {
    $(root, "#time").textContent = formatTime(
      Math.ceil(remaining / 1000) * 1000,
    );
    const progress = Math.max(
      0,
      Math.min(100, 100 * (1 - remaining / duration)),
    );
    $(root, "#progress").style.width = `${progress}%`;
    $(root, ".progress").setAttribute(
      "aria-valuenow",
      String(Math.round(progress)),
    );
    root
      .querySelectorAll("[data-preset]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(+b.dataset.preset * 60000 === duration),
        ),
      );
    document.title =
      remaining <= 0
        ? `완료! · ${title}`
        : running
          ? `${$(root, "#time").textContent} · ${title}`
          : title;
    const state = {
      duration,
      remaining: Math.ceil(remaining / 1000) * 1000,
      deadline,
      running,
    };
    const serialized = JSON.stringify(state);
    state.remaining = Math.min(duration, state.remaining);
    if (serialized !== lastSaved) {
      save("pomodoro-state", state);
      lastSaved = serialized;
    }
    $(root, "#toggle").textContent = running
      ? "일시정지"
      : remaining <= 0
        ? "다시 시작"
        : "시작";
  }
  function beep() {
    try {
      if (!audio) return;
      const oscillator = audio.createOscillator(),
        gain = audio.createGain();
      oscillator.connect(gain);
      gain.connect(audio.destination);
      gain.gain.setValueAtTime(0.15, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.6);
      oscillator.frequency.value = 660;
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.6);
    } catch {
      /* Visual completion is always available. */
    }
  }
  function reset() {
    running = false;
    remaining = duration;
    $(root, "#minutes").disabled = false;
    status(root, "집중할 준비가 되었나요?");
    draw();
  }
  $(root, "#minutes").onchange = () => {
    const n = Number($(root, "#minutes").value);
    if (!Number.isInteger(n) || n < 1 || n > 180) {
      status(root, "1~180 사이의 정수로 입력해 주세요.");
      return;
    }
    duration = n * 60000;
    reset();
  };
  root.querySelectorAll("[data-preset]").forEach(
    (b) =>
      (b.onclick = () => {
        $(root, "#minutes").value = b.dataset.preset;
        duration = +b.dataset.preset * 60000;
        reset();
      }),
  );
  $(root, "#toggle").onclick = () => {
    if (running) {
      remaining = Math.max(0, deadline - Date.now());
      running = false;
      $(root, "#minutes").disabled = false;
      status(root, "일시정지했어요.");
    } else {
      const n = Number($(root, "#minutes").value);
      if (!Number.isInteger(n) || n < 1 || n > 180) {
        status(root, "1~180 사이의 정수로 입력해 주세요.");
        return;
      }
      if (remaining <= 0) remaining = duration;
      deadline = Date.now() + remaining;
      running = true;
      $(root, "#minutes").disabled = true;
      status(root, "타이머 진행 중");
      try {
        audio ||= new (window.AudioContext || window.webkitAudioContext)();
        audio.resume().catch(() => {});
      } catch {
        /* Optional audio. */
      }
    }
    draw();
  };
  setInterval(() => {
    if (!running) return;
    remaining = Math.max(0, deadline - Date.now());
    if (!remaining) {
      running = false;
      $(root, "#minutes").disabled = false;
      status(root, "시간이 다 됐어요! 수고하셨습니다.");
      beep();
    }
    draw();
  }, 100);
  $(root, "#reset").onclick = reset;
  if (
    savedTimer &&
    Number.isFinite(savedTimer.duration) &&
    savedTimer.duration >= 60000 &&
    savedTimer.duration <= 10800000 &&
    Number.isFinite(savedTimer.remaining) &&
    savedTimer.remaining >= 0 &&
    savedTimer.remaining <= savedTimer.duration &&
    Number.isFinite(savedTimer.deadline) &&
    typeof savedTimer.running === "boolean"
  ) {
    duration = savedTimer.duration;
    deadline = savedTimer.deadline;
    running = savedTimer.running;
    remaining = running
      ? Math.max(0, deadline - Date.now())
      : savedTimer.remaining;
    if (!remaining) running = false;
    $(root, "#minutes").value = duration / 60000;
    $(root, "#minutes").disabled = running;
    status(
      root,
      remaining <= 0
        ? "시간이 다 됐어요! 수고하셨습니다."
        : running
          ? "진행 중인 타이머를 이어서 표시해요."
          : "이전 타이머를 불러왔어요.",
    );
    draw();
  } else reset();
}

function stopwatch(root) {
  root.innerHTML = `<div class="big center" id="time" role="timer">00:00.00</div><div class="row actions"><button class="primary" id="toggle">시작</button><button id="lap" disabled>랩 기록</button><button id="reset">초기화</button></div><button id="export" class="actions" disabled>랩 기록 저장 (.csv)</button><p class="hint" id="lap-hint">시작한 뒤 랩 기록을 눌러 구간별 시간을 남겨보세요.</p><ol id="laps" class="lap-list"></ol>${statusHTML}`;
  let elapsed = 0,
    started = 0,
    running = false,
    count = 0,
    lastLap = 0,
    records = [];
  const total = () => elapsed + (running ? performance.now() - started : 0);
  const format = (ms) =>
    `${formatTime(ms)}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;
  function draw() {
    $(root, "#time").textContent = format(total());
  }
  $(root, "#toggle").onclick = () => {
    if (running) {
      elapsed = total();
      running = false;
    } else {
      started = performance.now();
      running = true;
    }
    $(root, "#toggle").textContent = running ? "일시정지" : "계속";
    $(root, "#lap").disabled = !running;
    draw();
  };
  $(root, "#lap").onclick = () => {
    if (!running) return;
    const time = total(),
      li = document.createElement("li");
    li.textContent = `랩 ${++count}: ${format(time)} (+${format(time - lastLap)})`;
    $(root, "#laps").prepend(li);
    records.push([count, format(time), format(time - lastLap)]);
    lastLap = time;
    $(root, "#export").disabled = false;
    $(root, "#lap-hint").hidden = true;
  };
  $(root, "#export").onclick = () =>
    download(
      "\ufeff랩,누적 시간,구간 시간\n" +
        records.map((row) => row.join(",")).join("\n"),
      "stopwatch-laps.csv",
      "text/csv;charset=utf-8",
    );
  $(root, "#reset").onclick = () => {
    elapsed = started = count = lastLap = 0;
    records = [];
    $(root, "#export").disabled = true;
    $(root, "#lap-hint").hidden = false;
    running = false;
    $(root, "#toggle").textContent = "시작";
    $(root, "#lap").disabled = true;
    $(root, "#laps").replaceChildren();
    draw();
  };
  setInterval(() => {
    if (running) draw();
  }, 31);
}

function units(root) {
  root.innerHTML = `<div class="stack"><label>종류<select id="category">${Object.entries(
    unitDefinitions,
  )
    .map(([id, u]) => `<option value="${id}">${u.label}</option>`)
    .join(
      "",
    )}</select></label><label>값<input type="number" id="value" value="1" step="any"></label><div class="columns"><label>입력 단위<select id="from"></select></label><label>변환 단위<select id="to"></select></label></div><button id="swap">⇄ 단위 바꾸기</button><output class="result big" id="result" aria-live="polite"></output></div>`;
  function draw() {
    const c = $(root, "#category").value,
      v = $(root, "#value").value,
      n = convert(Number(v), c, $(root, "#from").value, $(root, "#to").value);
    $(root, "#result").textContent =
      v === "" || !Number.isFinite(n)
        ? "값을 확인해 주세요."
        : `${Number(n.toPrecision(12)).toLocaleString("ko-KR", { maximumSignificantDigits: 12 })} ${$(root, "#to").selectedOptions[0].textContent}`;
  }
  function populate() {
    const options = Object.entries(
      unitDefinitions[$(root, "#category").value].units,
    )
      .map(([id, u]) => `<option value="${id}">${u[0]}</option>`)
      .join("");
    $(root, "#from").innerHTML = options;
    $(root, "#to").innerHTML = options;
    $(root, "#to").selectedIndex = 1;
    draw();
  }
  $(root, "#category").onchange = populate;
  ["#value", "#from", "#to"].forEach((id) => ($(root, id).oninput = draw));
  $(root, "#swap").onclick = () => {
    const v = $(root, "#from").value;
    $(root, "#from").value = $(root, "#to").value;
    $(root, "#to").value = v;
    draw();
  };
  populate();
}

function text(root) {
  root.innerHTML = `<div class="stack"><label>분석할 글<textarea id="text" placeholder="여기에 글을 입력하거나 붙여 넣으세요."></textarea></label><div class="result" id="result" aria-live="polite"></div><div class="row"><button id="trim">줄 앞뒤 공백 정리</button><button id="copy">복사</button><button id="clear">비우기</button></div><p class="hint">글자 수는 유니코드 코드 포인트 기준입니다. 조합형 이모지는 여러 글자로 셀 수 있어요. 단어는 공백 기준으로 구분합니다.</p></div>`;
  function draw() {
    const s = textStats($(root, "#text").value);
    $(root, "#result").textContent =
      `공백 포함 ${s.characters.toLocaleString()}자 · 공백 제외 ${s.compact.toLocaleString()}자\n${s.words.toLocaleString()}단어 · ${s.lines.toLocaleString()}줄 · UTF-8 ${s.bytes.toLocaleString()}바이트`;
  }
  $(root, "#text").oninput = draw;
  $(root, "#trim").onclick = () => {
    $(root, "#text").value = $(root, "#text")
      .value.split("\n")
      .map((s) => s.trim())
      .join("\n");
    draw();
  };
  $(root, "#clear").onclick = () => {
    $(root, "#text").value = "";
    draw();
  };
  $(root, "#copy").onclick = (e) =>
    copy($(root, "#text").value, e.currentTarget);
  draw();
}

function password(root) {
  root.innerHTML = `<div class="stack"><label>길이 (4~128)<input id="length" type="number" min="4" max="128" step="1" value="20"></label><div class="row">${[
    ["upper", "대문자"],
    ["lower", "소문자"],
    ["number", "숫자"],
    ["symbol", "기호"],
  ]
    .map(
      ([id, label]) =>
        `<label class="check"><input type="checkbox" id="${id}" checked>${label}</label>`,
    )
    .join(
      "",
    )}</div><button class="primary" id="generate">새 비밀번호 생성</button><label>생성 결과<input id="result" class="mono" readonly autocomplete="off" spellcheck="false"></label><button id="copy">복사</button>${statusHTML}<p class="hint">Web Crypto 난수로 생성하며 선택한 문자 종류를 각각 한 개 이상 포함합니다. 생성한 비밀번호를 저장하거나 서버로 전송하지 않아요.</p></div>`;
  const groups = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    number: "0123456789",
    symbol: "!@#$%^&*()-_=+[]{}:,.?",
  };
  function generate() {
    const length = Number($(root, "#length").value),
      sets = Object.entries(groups)
        .filter(([id]) => $(root, `#${id}`).checked)
        .map(([, v]) => v);
    if (
      !Number.isInteger(length) ||
      length < 4 ||
      length > 128 ||
      !sets.length
    ) {
      $(root, "#result").value = "";
      $(root, "#copy").disabled = true;
      status(root, "길이는 4~128, 문자 종류는 하나 이상 선택해 주세요.");
      return;
    }
    const all = sets.join(""),
      chars = sets.map((s) => s[randomInt(0, s.length - 1)]);
    while (chars.length < length) chars.push(all[randomInt(0, all.length - 1)]);
    $(root, "#result").value = shuffled(chars).join("");
    $(root, "#copy").disabled = false;
    status(root, `${length}자리 · ${sets.length}가지 문자 종류`);
  }
  $(root, "#generate").onclick = generate;
  root
    .querySelectorAll("input:not([readonly])")
    .forEach((input) => input.addEventListener("input", generate));
  $(root, "#copy").onclick = (e) =>
    copy($(root, "#result").value, e.currentTarget);
  generate();
}

function random(root) {
  root.innerHTML = `<div class="stack"><label>뽑기 방식<select id="mode"><option value="dice">주사위 2개</option><option value="number">범위에서 숫자 뽑기</option><option value="list">목록에서 뽑기 (중복 없이)</option></select></label><div class="columns" id="range" hidden><label>최솟값<input type="number" id="min" value="1" step="1"></label><label>최댓값<input type="number" id="max" value="100" step="1"></label></div><div class="stack" id="list-options" hidden><label>후보 목록 (한 줄에 하나씩, 같은 이름은 한 번만)<textarea id="list" placeholder="김밥\n라면\n떡볶이"></textarea></label><label>뽑을 개수 (최대 100개)<input type="number" id="count" value="1" min="1" max="100" step="1"></label></div><button class="primary" id="draw">뽑기</button><output class="result center" id="result" aria-live="polite">어떤 결과가 나올까요?</output>${statusHTML}</div>`;
  $(root, "#mode").onchange = () => {
    const mode = $(root, "#mode").value;
    $(root, "#range").hidden = mode !== "number";
    $(root, "#list-options").hidden = mode !== "list";
    status(root, "");
    $(root, "#result").textContent = "어떤 결과가 나올까요?";
  };
  $(root, "#draw").onclick = () => {
    try {
      const mode = $(root, "#mode").value;
      let output;
      if (mode === "dice") {
        const a = randomInt(1, 6),
          b = randomInt(1, 6);
        output = `${["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][a - 1]} ${["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][b - 1]}\n${a} + ${b} = ${a + b}`;
      } else if (mode === "number") {
        if (!$(root, "#min").value || !$(root, "#max").value)
          throw Error("최솟값과 최댓값을 입력해 주세요.");
        output = String(
          randomInt(
            Number($(root, "#min").value),
            Number($(root, "#max").value),
          ),
        );
      } else {
        const items = [
            ...new Set(
              $(root, "#list")
                .value.split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            ),
          ],
          count = Number($(root, "#count").value);
        if (
          !Number.isInteger(count) ||
          count < 1 ||
          count > 100 ||
          count > items.length
        )
          throw Error("후보 수와 뽑을 개수를 확인하세요 (1~100개).");
        output = shuffled(items).slice(0, count).join("\n");
      }
      $(root, "#result").textContent = output;
      status(root, "추첨 완료!");
    } catch (error) {
      $(root, "#result").textContent = "추첨 조건을 확인해 주세요.";
      status(root, error.message);
    }
  };
}

function color(root) {
  root.innerHTML = `<div class="stack"><label>색상 선택<input type="color" id="picker" value="#286249" style="height:60px"></label><label>HEX<input class="mono" id="hex" value="#286249" maxlength="7" spellcheck="false" autocomplete="off"></label><div class="rgb-fields">${["R", "G", "B"].map((c, i) => `<label>${c}<input type="number" id="channel-${i}" min="0" max="255" step="1" value="0" inputmode="numeric"></label>`).join("")}</div><div id="swatch" class="swatch">이 색 위의 글자는 이렇게 보여요</div><output class="result mono" id="rgb" aria-live="polite"></output><p class="hint" id="contrast"></p><div class="row"><button id="copy">HEX 복사</button><button id="copy-rgb">RGB 복사</button><button id="random">랜덤 색상</button></div>${statusHTML}</div>`;
  function draw(value) {
    const info = colorInfo(value.trim());
    const valid = !!info;
    $(root, "#copy").disabled = $(root, "#copy-rgb").disabled = !valid;
    $(root, "#hex").setAttribute("aria-invalid", String(!valid));
    if (!valid) {
      status(root, "#abc 또는 #aabbcc 형식으로 입력해 주세요.");
      return;
    }
    $(root, "#picker").value = info.hex;
    $(root, "#swatch").style.backgroundColor = info.hex;
    $(root, "#swatch").style.color = info.foreground;
    $(root, "#rgb").textContent = `rgb(${info.rgb.join(", ")})`;
    $(root, "#contrast").textContent =
      `검정 글자 대비 ${info.black.toFixed(2)}:1 · 흰 글자 대비 ${info.white.toFixed(2)}:1 (일반 텍스트 WCAG AA 기준 4.5:1 이상)`;
    info.rgb.forEach((n, i) => ($(root, `#channel-${i}`).value = n));
    $(root, "#copy").dataset.hex = info.hex;
    status(root, "");
  }
  $(root, "#picker").oninput = (e) => {
    $(root, "#hex").value = e.target.value;
    draw(e.target.value);
  };
  $(root, "#hex").oninput = (e) => draw(e.target.value);
  root.querySelectorAll('[id^="channel-"]').forEach(
    (input) =>
      (input.oninput = () => {
        const values = [0, 1, 2].map((i) => $(root, `#channel-${i}`).value);
        if (
          values.some(
            (v) => v === "" || !Number.isInteger(+v) || +v < 0 || +v > 255,
          )
        ) {
          status(root, "R, G, B는 0~255 사이의 정수로 입력해 주세요.");
          $(root, "#copy").disabled = $(root, "#copy-rgb").disabled = true;
          return;
        }
        const hex =
          "#" + values.map((n) => (+n).toString(16).padStart(2, "0")).join("");
        $(root, "#hex").value = hex;
        draw(hex);
      }),
  );
  $(root, "#copy").onclick = (e) =>
    copy(e.currentTarget.dataset.hex, e.currentTarget);
  $(root, "#copy-rgb").onclick = (e) =>
    copy($(root, "#rgb").textContent, e.currentTarget);
  $(root, "#random").onclick = () => {
    const hex = "#" + randomInt(0, 0xffffff).toString(16).padStart(6, "0");
    $(root, "#hex").value = hex;
    draw(hex);
  };
  draw("#286249");
}

function date(root) {
  const today = new Date(),
    localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
  root.innerHTML = `<div class="stack"><div class="columns"><label>기준 날짜<input type="date" id="from" value="${localDate}"></label><label>목표 날짜<input type="date" id="to" value="${localDate}"></label></div><output id="difference" class="result" aria-live="polite"></output><hr style="width:100%;border:0;border-top:1px solid var(--line)"><label>기준 날짜에서 며칠 뒤? (음수는 이전)<input type="number" id="days" value="100" min="-365000" max="365000" step="1"></label><output class="result" id="offset" aria-live="polite"></output><p class="hint">날짜 차이는 시작일을 제외한 달력 날짜 기준입니다. 같은 날은 0일이에요.</p></div>`;
  function draw() {
    const from = $(root, "#from").value,
      to = $(root, "#to").value,
      n = dateDifference(from, to);
    $(root, "#difference").textContent = Number.isFinite(n)
      ? `${Math.abs(n).toLocaleString()}일 ${n > 0 ? "남음 · D−" + n : n < 0 ? "지남 · D+" + Math.abs(n) : "· D-Day"}`
      : "날짜를 모두 선택해 주세요.";
    const days = Number($(root, "#days").value);
    if (
      !from ||
      !$(root, "#days").value ||
      !Number.isInteger(days) ||
      Math.abs(days) > 365000
    ) {
      $(root, "#offset").textContent =
        "기준 날짜와 일수를 확인해 주세요 (±365,000일 이내).";
      return;
    }
    const result = new Date(Date.parse(`${from}T00:00:00Z`) + days * 86400000);
    $(root, "#offset").textContent = Number.isFinite(result.getTime())
      ? `${Math.abs(days).toLocaleString()}일 ${days >= 0 ? "후" : "전"}: ${result.toISOString().slice(0, 10)}`
      : "계산 범위를 벗어났어요.";
  }
  ["#from", "#to", "#days"].forEach((id) => ($(root, id).oninput = draw));
  draw();
}

function json(root) {
  root.innerHTML = `<div class="stack"><label>JSON 입력<textarea id="input" class="mono" spellcheck="false" placeholder='{"hello":"world","items":[1,2,3]}'></textarea></label><label>들여쓰기<select id="indent"><option value="2">공백 2칸</option><option value="4">공백 4칸</option><option value="tab">탭</option></select></label><div class="row"><button class="primary" id="format">보기 좋게 정리</button><button id="minify">압축</button><button id="clear">비우기</button></div>${statusHTML}<label>결과<textarea id="output" class="mono" readonly spellcheck="false"></textarea></label><div class="row"><button id="copy" disabled>복사</button><button id="download" disabled>JSON 파일 저장</button></div><p class="hint">Ctrl/⌘ + Enter로 정리할 수 있어요. 표준 JSON 문법만 지원합니다. JavaScript 객체나 주석은 허용하지 않아요. 큰 정수는 JavaScript 숫자 정밀도에 따라 달라질 수 있습니다.</p></div>`;
  function process(spaces) {
    try {
      const parsed = JSON.parse($(root, "#input").value);
      $(root, "#output").value = JSON.stringify(parsed, null, spaces);
      $(root, "#copy").disabled = $(root, "#download").disabled = false;
      status(root, "올바른 JSON입니다.");
    } catch (error) {
      $(root, "#output").value = "";
      $(root, "#copy").disabled = $(root, "#download").disabled = true;
      status(root, `JSON 오류: ${error.message}`);
    }
  }
  $(root, "#format").onclick = () =>
    process(
      $(root, "#indent").value === "tab" ? "\t" : +$(root, "#indent").value,
    );
  $(root, "#download").onclick = () =>
    download(
      $(root, "#output").value,
      "formatted.json",
      "application/json;charset=utf-8",
    );
  $(root, "#input").oninput = () => {
    $(root, "#output").value = "";
    $(root, "#copy").disabled = $(root, "#download").disabled = true;
    status(root, "입력을 수정했어요. 정리 또는 압축을 눌러 주세요.");
  };
  $(root, "#input").onkeydown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      $(root, "#format").click();
    }
  };
  $(root, "#minify").onclick = () => process(0);
  $(root, "#clear").onclick = () => {
    $(root, "#input").value = $(root, "#output").value = "";
    $(root, "#copy").disabled = $(root, "#download").disabled = true;
    status(root, "");
  };
  $(root, "#copy").onclick = (e) =>
    copy($(root, "#output").value, e.currentTarget);
}
export const tools = {
  calculator,
  pomodoro,
  stopwatch,
  units,
  text,
  password,
  random,
  color,
  date,
  json,
};
