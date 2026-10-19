export const $ = (root, selector) => root.querySelector(selector);
export function status(root, message) {
  $(root, "#status").textContent = message;
}
export const statusHTML =
  '<p class="status" id="status" role="status" aria-live="polite"></p>';
export function save(key, value) {
  try {
    localStorage.setItem(`playground:${key}`, JSON.stringify(value));
  } catch {
    /* Private mode or full storage: keep playing. */
  }
}
export function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(`playground:${key}`)) ?? fallback;
  } catch {
    return fallback;
  }
}
const copyTimers = new WeakMap();
export async function copy(text, button) {
  const original = button.dataset.copyLabel || button.textContent;
  button.dataset.copyLabel = original;
  clearTimeout(copyTimers.get(button));
  if (!text) {
    button.textContent = "복사할 내용이 없어요";
  } else {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "복사 완료!";
    } catch {
      button.textContent = "복사가 차단됐어요 · 내용을 직접 선택해 주세요";
    }
  }
  copyTimers.set(
    button,
    setTimeout(() => {
      if (button.isConnected) button.textContent = original;
    }, 2000),
  );
}
// Updating a board must not drop keyboard users back to the top of the page.
export function renderBoard(root, html) {
  const board = $(root, "#board");
  const active = document.activeElement;
  const hadFocus = board.contains(active);
  const index = active?.dataset?.i;
  board.innerHTML = html;
  if (hadFocus) {
    const same =
      index === undefined
        ? null
        : board.querySelector(`[data-i="${index}"]:not(:disabled)`);
    const target = same || board.querySelector("button:not(:disabled)");
    board.tabIndex = -1;
    (target || board).focus({ preventScroll: true });
  }
}
export function boardNavigation(root, width) {
  const board = $(root, "#board");
  board.addEventListener("keydown", (event) => {
    const button = event.target.closest("button[data-i]");
    if (!button) return;
    const step = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -width,
      ArrowDown: width,
    }[event.key];
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const buttons = [...board.querySelectorAll("button[data-i]")];
    if (event.key === "Home" || event.key === "End") {
      const available = buttons.filter((b) => !b.disabled);
      (event.key === "Home" ? available[0] : available.at(-1))?.focus();
      return;
    }
    let index = +button.dataset.i + step;
    while (index >= 0 && index < buttons.length) {
      if (!buttons[index].disabled) {
        buttons[index].focus();
        break;
      }
      index += step;
    }
  });
}
export function download(text, filename, type = "text/plain;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
