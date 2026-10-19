import { games } from "./games.js";
import { tools } from "./tools.js";
import { read, save, copy } from "./ui.js";
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
const params = new URLSearchParams(location.search);
const app = catalog.find((a) => a.id === params.get("app"));
const storedFavorites = read("favorites", []);
let favorites = new Set(
  Array.isArray(storedFavorites)
    ? storedFavorites.filter((id) => catalog.some((a) => a.id === id))
    : [],
);
const href = (app) => app.url || `?app=${app.id}`;
function favoriteButton(app) {
  const selected = favorites.has(app.id);
  return `<button class="favorite" data-favorite="${app.id}" aria-pressed="${selected}" aria-label="${app.title} 즐겨찾기${selected ? " 해제" : " 추가"}" title="즐겨찾기">${selected ? "★" : "☆"}</button>`;
}
function card(app) {
  return `<article class="card ${app.type}"><a class="card-link" href="${href(app)}"><span class="card-icon" aria-hidden="true">${app.icon}</span><h3>${app.title}</h3><p>${app.description}</p><span class="card-tag">${app.type === "game" ? "PLAY · 게임" : "TOOL · 도구"} ↗</span></a>${favoriteButton(app)}</article>`;
}
function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  save("favorites", [...favorites]);
}
if (app?.url) {
  location.replace(app.url);
} else if (app) {
  document.title = `${app.title} · 작은 놀이터`;
  const recent = read("recent", []);
  save(
    "recent",
    [
      app.id,
      ...(Array.isArray(recent)
        ? recent.filter((id) => id !== app.id && typeof id === "string")
        : []),
    ].slice(0, 5),
  );
  const related = catalog
    .filter((a) => a.type === app.type && a.id !== app.id)
    .slice(0, 3);
  main.innerHTML = `<a class="back" href="index.html?resume=1">← 전체 놀이터</a><section class="app-heading"><div class="eyebrow">${app.type === "game" ? "PLAY / 게임" : "MAKE / 도구"}</div><div class="detail-title"><h1>${app.icon} ${app.title}</h1>${favoriteButton(app)}</div><p>${app.description}</p><button class="subtle" id="share">링크 복사</button></section><section class="workspace" id="workspace" aria-label="${app.title}"></section><section class="related"><h2>${app.type === "game" ? "다음 게임도 즐겨보세요" : "함께 쓰기 좋은 도구"}</h2><div class="quick-links">${related.map((a) => `<a href="${href(a)}">${a.icon} ${a.title} <span aria-hidden="true">↗</span></a>`).join("")}</div></section>`;
  (games[app.id] || tools[app.id])(document.querySelector("#workspace"));
  document.querySelector("#share").onclick = (e) => {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("app", app.id);
    url.hash = "";
    copy(url.href, e.currentTarget);
  };
  main.querySelector("[data-favorite]").onclick = (e) => {
    toggleFavorite(app.id);
    const button = e.currentTarget;
    button.setAttribute("aria-pressed", String(favorites.has(app.id)));
    button.setAttribute(
      "aria-label",
      `${app.title} 즐겨찾기${favorites.has(app.id) ? " 해제" : " 추가"}`,
    );
    button.textContent = favorites.has(app.id) ? "★" : "☆";
  };
} else {
  const counts = {
    all: catalog.length,
    game: catalog.filter((a) => a.type === "game").length,
    tool: catalog.filter((a) => a.type === "tool").length,
  };
  const recent = read("recent", []);
  const recentApps = (Array.isArray(recent) ? recent : [])
    .slice(0, 5)
    .map((id) => catalog.find((a) => a.id === id))
    .filter(Boolean);
  main.innerHTML = `<section class="hero"><div><div class="eyebrow">YOUR EVERYDAY PLAYGROUND</div><h1>잠깐의 여유,<br>작은 즐거움.</h1><p>머리를 깨우는 게임부터 매일 쓰는 도구까지.<br>마음 가는 것 하나 골라 시작해 보세요.</p></div><div class="hero-art" aria-hidden="true"><span>✳</span><span>🎲</span><span>⏱</span><span>↗</span></div></section>${recentApps.length ? `<section class="recent"><h2>최근에 사용했어요</h2><div class="quick-links">${recentApps.map((a) => `<a href="${href(a)}">${a.icon} ${a.title}</a>`).join("")}</div></section>` : ""}<div class="toolbar" aria-label="분류"><button class="filter" data-filter="all" aria-pressed="true">전체 ${counts.all}</button><button class="filter" data-filter="game" aria-pressed="false">게임 ${counts.game}</button><button class="filter" data-filter="tool" aria-pressed="false">도구 ${counts.tool}</button><button class="filter" data-filter="favorite" aria-pressed="false">★ 즐겨찾기</button><div class="search-wrap"><input class="search" id="search" type="search" placeholder="무엇을 찾고 있나요?" aria-label="게임과 도구 검색" aria-keyshortcuts="/"><span class="search-key" aria-hidden="true">/</span></div></div><div class="catalog-meta"><h2>오늘은 무엇을 해볼까요?</h2><span id="count" class="muted" role="status"></span></div><div class="cards" id="cards"></div>`;
  const previous = params.has("resume") ? read("catalog-state", {}) : {};
  let filter = params.get("filter") || previous?.filter || "all";
  if (!["all", "game", "tool", "favorite"].includes(filter)) filter = "all";
  const search = document.querySelector("#search");
  search.value =
    params.get("q") ??
    (typeof previous?.query === "string" ? previous.query : "");
  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const items = catalog.filter(
      (a) =>
        (filter === "all" ||
          (filter === "favorite" ? favorites.has(a.id) : a.type === filter)) &&
        `${a.title} ${a.description} ${a.id}`
          .toLocaleLowerCase()
          .includes(query),
    );
    const labels = {
      all: "오늘은 무엇을 해볼까요?",
      game: "가볍게 한 판 즐겨보세요",
      tool: "필요할 때 꺼내 쓰세요",
      favorite: "자주 쓰는 것만 모았어요",
    };
    document.querySelector(".catalog-meta h2").textContent = labels[filter];
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.filter === filter)),
      );
    document.querySelector("#count").textContent = `${items.length}개`;
    document.querySelector("#cards").innerHTML =
      items.map(card).join("") ||
      `<div class="empty"><p>${filter === "favorite" && !query ? "카드의 ☆를 눌러 자주 쓰는 게임과 도구를 모아보세요." : "검색 결과가 없어요. 다른 단어를 입력해 보세요."}</p><button id="clear-search">전체 보기</button></div>`;
    document.querySelector("#clear-search")?.addEventListener("click", () => {
      search.value = "";
      filter = "all";
      render();
      search.focus();
    });
    save("catalog-state", { filter, query: search.value });
    const url = new URL(location.href);
    url.search = "";
    if (filter !== "all") url.searchParams.set("filter", filter);
    if (search.value) url.searchParams.set("q", search.value);
    history.replaceState(null, "", url);
  }
  document.querySelectorAll("[data-filter]").forEach(
    (button) =>
      (button.onclick = () => {
        filter = button.dataset.filter;
        render();
      }),
  );
  document.querySelector("#cards").onclick = (e) => {
    const button = e.target.closest("[data-favorite]");
    if (!button) return;
    const id = button.dataset.favorite;
    toggleFavorite(id);
    render();
    document
      .querySelector(`[data-favorite="${id}"]`)
      ?.focus({ preventScroll: true });
  };
  search.oninput = render;
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "/" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
    ) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === "Escape" && document.activeElement === search) {
      search.value = "";
      render();
    }
  });
  render();
}
