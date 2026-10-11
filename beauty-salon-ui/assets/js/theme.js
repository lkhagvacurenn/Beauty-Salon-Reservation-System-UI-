/* =========================================================
   Theme (light / dark)
   Load this in <head> WITHOUT defer so the right theme is set
   before the first paint (no white flash in dark mode).
   - First visit: follows the device setting.
   - After the user toggles: saved in localStorage and shared
     by all four interfaces (same origin / same folder).
   ========================================================= */
(function () {
  var KEY = "bsrs-theme";
  var root = document.documentElement;

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function apply(theme) {
    root.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#19151B" : "#FFF9FA");
  }

  apply(stored() || systemTheme());

  // Follow device changes until the user makes an explicit choice.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
      if (!stored()) apply(e.matches ? "dark" : "light");
    });
  }

  // Keep tabs in sync (e.g. client open in one tab, admin in another).
  window.addEventListener("storage", function (e) {
    if (e.key === KEY && e.newValue) apply(e.newValue);
  });

  window.Theme = {
    get: function () { return root.getAttribute("data-theme"); },
    toggle: function () {
      var next = this.get() === "dark" ? "light" : "dark";
      apply(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
      return next;
    }
  };

  // Enable colour transitions only after first paint.
  window.addEventListener("load", function () {
    requestAnimationFrame(function () { root.classList.add("theme-ready"); });
  });

  // Any element with [data-theme-toggle] becomes a toggle.
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-theme-toggle]");
    if (!btn) return;
    var next = window.Theme.toggle();
    btn.setAttribute("aria-pressed", next === "dark" ? "true" : "false");
  });
})();
