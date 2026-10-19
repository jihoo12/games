// Apply before the first paint; this script is also shared by the classic games.
(() => {
  const preference = matchMedia("(prefers-color-scheme: dark)");
  let choice = "auto";
  try {
    choice = JSON.parse(localStorage.getItem("playground:theme")) || "auto";
  } catch {}
  if (!["auto", "light", "dark"].includes(choice)) choice = "auto";
  function apply() {
    const theme =
      choice === "auto" ? (preference.matches ? "dark" : "light") : choice;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === "dark" ? "#141e19" : "#f5f4ed";
    document.dispatchEvent(new Event("themechange"));
  }
  preference.addEventListener("change", apply);
  apply();
  document.addEventListener("DOMContentLoaded", () => {
    const selector = document.querySelector("#theme");
    if (selector) {
      selector.value = choice;
      selector.addEventListener("change", () => {
        choice = selector.value;
        try {
          localStorage.setItem("playground:theme", JSON.stringify(choice));
        } catch {}
        apply();
      });
    }
    const id = location.pathname.endsWith("/pingpong.html")
      ? "pingpong"
      : location.pathname.endsWith("/snakegame.html")
        ? "snake"
        : null;
    if (id)
      try {
        const recent = JSON.parse(localStorage.getItem("playground:recent"));
        localStorage.setItem(
          "playground:recent",
          JSON.stringify(
            [
              id,
              ...(Array.isArray(recent)
                ? recent.filter((x) => x !== id && typeof x === "string")
                : []),
            ].slice(0, 5),
          ),
        );
      } catch {}
  });
})();
