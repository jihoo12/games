import { games } from "./games.js";
import { tools } from "./tools.js";
export const catalog = [
  [
    "pingpong",
    "핑퐁",
    "🏓",
    "컴퓨터와 겨루는 7점 승부",
    "game",
    "pingpong.html",
  ],
  [
    "snake",
    "스네이크",
    "🐍",
    "먹이를 모으고 길게 자라기",
    "game",
    "snakegame.html",
  ],
  ["2048", "2048", "🔢", "같은 숫자를 합쳐 2048에 도전", "game"],
  ["mines", "지뢰찾기", "💣", "숫자를 단서로 안전한 칸 찾기", "game"],
  ["memory", "메모리 카드", "🍒", "뒤집고 기억하고, 같은 그림 찾기", "game"],
  ["tictactoe", "틱택토", "⭕", "컴퓨터 또는 친구와 세 칸 잇기", "game"],
  ["lights", "불 끄기", "💡", "주변까지 바뀌는 5×5 퍼즐", "game"],
  ["reaction", "반응속도", "⚡", "초록색이 되는 순간 클릭!", "game"],
  ["guess", "숫자 맞히기", "🎯", "1부터 100까지, 일곱 번의 기회", "game"],
  ["rps", "가위바위보", "✌️", "컴퓨터와 가볍게 한 판", "game"],
  ["calculator", "계산기", "🧮", "사칙연산과 키보드 입력", "tool"],
  ["pomodoro", "뽀모도로", "🍅", "집중과 휴식을 나누는 타이머", "tool"],
  ["stopwatch", "스톱워치", "⏱️", "시간 측정과 랩 기록", "tool"],
  ["units", "단위 변환", "📏", "길이 · 무게 · 온도 · 넓이", "tool"],
  ["text", "글자 수 세기", "📝", "글자, 단어, 줄, UTF-8 바이트", "tool"],
  ["password", "비밀번호 생성", "🔐", "길이와 문자 조합을 직접 선택", "tool"],
  ["random", "랜덤 뽑기", "🎲", "주사위, 숫자, 목록에서 추첨", "tool"],
  ["color", "색상 도구", "🎨", "HEX와 RGB를 확인하고 복사", "tool"],
  ["date", "날짜 계산", "📅", "날짜 차이와 D-day 계산", "tool"],
  ["json", "JSON 정리", "🧩", "들여쓰기, 압축, 문법 확인", "tool"],
].map(([id, title, icon, description, type, url]) => ({
  id,
  title,
  icon,
  description,
  type,
  url,
}));
const main = document.querySelector("#main");
const id = new URLSearchParams(location.search).get("app");
const app = catalog.find((a) => a.id === id);
if (app && !app.url) {
  document.title = `${app.title} · 작은 놀이터`;
  main.innerHTML = `<a class="back" href="index.html">← 전체 놀이터</a><section class="app-heading"><div class="eyebrow">${app.type === "game" ? "PLAY / 게임" : "MAKE / 도구"}</div><h1>${app.icon} ${app.title}</h1><p>${app.description}</p></section><section class="workspace" id="workspace" aria-label="${app.title}"></section>`;
  (games[app.id] || tools[app.id])(document.querySelector("#workspace"));
} else {
  main.innerHTML = `<section class="hero"><div><div class="eyebrow">YOUR EVERYDAY PLAYGROUND</div><h1>잠깐의 여유,<br>작은 즐거움.</h1><p>머리를 깨우는 게임부터 매일 쓰는 도구까지.<br>마음 가는 것 하나 골라 시작해 보세요.</p></div><div class="hero-art" aria-hidden="true"><span>✳</span><span>🎲</span><span>⏱</span><span>↗</span></div></section><div class="toolbar" aria-label="분류"><button class="filter" data-filter="all" aria-pressed="true">전체 20</button><button class="filter" data-filter="game" aria-pressed="false">게임 10</button><button class="filter" data-filter="tool" aria-pressed="false">도구 10</button><input class="search" id="search" type="search" placeholder="무엇을 찾고 있나요?" aria-label="게임과 도구 검색"></div><div class="catalog-meta"><h2>오늘은 무엇을 해볼까요?</h2><span id="count" class="muted" role="status"></span></div><div class="cards" id="cards"></div>`;
  let filter = "all";
  function render() {
    const query = document
      .querySelector("#search")
      .value.trim()
      .toLocaleLowerCase();
    const items = catalog.filter(
      (a) =>
        (filter === "all" || a.type === filter) &&
        `${a.title} ${a.description} ${a.id}`
          .toLocaleLowerCase()
          .includes(query),
    );
    document.querySelector("#count").textContent = `${items.length}개`;
    document.querySelector("#cards").innerHTML =
      items
        .map(
          (a) =>
            `<a class="card ${a.type}" href="${a.url || `?app=${a.id}`}"><span class="card-icon" aria-hidden="true">${a.icon}</span><h3>${a.title}</h3><p>${a.description}</p><span class="card-tag">${a.type === "game" ? "PLAY · 게임" : "TOOL · 도구"} ↗</span></a>`,
        )
        .join("") ||
      '<p class="empty">검색 결과가 없어요. 다른 단어를 입력해 보세요.</p>';
  }
  document.querySelectorAll("[data-filter]").forEach(
    (button) =>
      (button.onclick = () => {
        filter = button.dataset.filter;
        document
          .querySelectorAll("[data-filter]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
        render();
      }),
  );
  document.querySelector("#search").oninput = render;
  render();
}
