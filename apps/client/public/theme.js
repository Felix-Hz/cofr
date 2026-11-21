(() => {
  var t = null;
  try {
    t = localStorage.getItem("cofr-theme");
  } catch {}
  var dark =
    t === "dark" || (t !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  var root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
  root.style.colorScheme = dark ? "dark" : "light";
})();
