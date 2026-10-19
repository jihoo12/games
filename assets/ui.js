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
export async function copy(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = "복사 완료!";
  } catch {
    button.textContent = "복사할 내용을 직접 선택해 주세요";
  }
  setTimeout(() => (button.textContent = "복사"), 1800);
}
export const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
};
