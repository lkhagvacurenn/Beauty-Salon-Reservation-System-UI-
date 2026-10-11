/* =========================================================
   Shared UI helpers: logo, icons, toast, modal / bottom sheet
   Exposed as window.UI
   ========================================================= */
(function () {
  // Pages inside client/, business/ ... set <body data-base="../">
  var BASE = document.body.getAttribute("data-base") || "";

  /* ----- Logo -------------------------------------------------
     Symbol: the supplied flower image (assets/logo/logo-symbol.png).
     Combination: the same symbol + the "Bloom" wordmark, coded in
     HTML/CSS so it stays sharp and follows the light/dark theme.  */
  var LOGO = {
    symbol: "assets/logo/logo-symbol.png",
    wordmark: "Bloom"
  };

  function combinationHTML() {
    return (
      '<span class="logo-combo">' +
        '<img src="' + BASE + LOGO.symbol + '" alt="">' +
        '<span class="logo-word"><b>' + LOGO.wordmark + '</b></span>' +
      "</span>"
    );
  }

  /**
   * logo({ href, responsive })
   * responsive: symbol on phones, combination on tablet/desktop.
   */
  function logo(opts) {
    opts = opts || {};
    var href = opts.href || BASE + "index.html";
    return (
      '<a class="logo" href="' + href + '"' + (opts.responsive ? " data-responsive" : "") + ' aria-label="Bloom">' +
        combinationHTML() +
        '<img class="logo-symbol" src="' + BASE + LOGO.symbol + '" alt="">' +
      "</a>"
    );
  }

  function themeToggle(extraClass) {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return (
      '<button type="button" class="icon-btn theme-toggle ' + (extraClass || "") + '" data-theme-toggle aria-pressed="' + dark + '" aria-label="Гэрэлтэй / харанхуй горим солих" title="Горим солих">' +
        '<i data-lucide="moon" class="when-light"></i><i data-lucide="sun" class="when-dark"></i>' +
      "</button>"
    );
  }

  function icons() {
    if (window.lucide) window.lucide.createIcons();
  }

  /* ----- Toast ----- */
  function toast(message, type) {
    var stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      stack.setAttribute("role", "status");
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    var icon = type === "error" ? "circle-alert" : type === "info" ? "info" : "circle-check";
    var el = document.createElement("div");
    el.className = "toast " + (type || "success");
    el.innerHTML = '<i data-lucide="' + icon + '"></i><span></span>';
    el.querySelector("span").textContent = message;
    stack.appendChild(el);
    icons();
    setTimeout(function () {
      el.classList.add("leaving");
      setTimeout(function () { el.remove(); }, 300);
    }, 3200);
  }

  /* ----- Modal / bottom sheet -----
     <div class="overlay [sheet-on-mobile]" id="x" aria-hidden="true">
       <div class="modal" role="dialog" aria-modal="true">…</div></div>
     Open:  [data-open-modal="x"]   Close: [data-close-modal], Esc, scrim */
  var lastFocus = null;
  function openModal(id) {
    var ov = document.getElementById(id);
    if (!ov) return;
    lastFocus = document.activeElement;
    ov.classList.add("is-open");
    ov.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var f = ov.querySelector("input, select, textarea, button:not([data-close-modal]), [tabindex]");
    if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function closeModal(ov) {
    if (typeof ov === "string") ov = document.getElementById(ov);
    if (!ov) return;
    ov.classList.remove("is-open");
    ov.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".overlay.is-open")) document.body.style.overflow = "";
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  document.addEventListener("click", function (e) {
    var opener = e.target.closest("[data-open-modal]");
    if (opener) { e.preventDefault(); openModal(opener.getAttribute("data-open-modal")); return; }
    var closer = e.target.closest("[data-close-modal]");
    if (closer) { closeModal(closer.closest(".overlay")); return; }
    if (e.target.classList && e.target.classList.contains("overlay")) closeModal(e.target);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    var open = document.querySelector(".overlay.is-open");
    if (open) closeModal(open);
  });

  /* ----- Confirm dialog for destructive actions ----- */
  function confirmDialog(opts, onYes) {
    var id = "confirm-dialog";
    var ov = document.getElementById(id);
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "overlay";
      ov.id = id;
      ov.setAttribute("aria-hidden", "true");
      ov.innerHTML =
        '<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" style="max-width:420px">' +
          '<div class="modal-head"><h3 id="confirm-title"></h3></div>' +
          '<p class="muted" id="confirm-text"></p>' +
          '<div class="modal-foot"><button class="btn btn-secondary" data-close-modal>Болих</button>' +
          '<button class="btn btn-danger" id="confirm-yes"></button></div></div>';
      document.body.appendChild(ov);
    }
    document.body.appendChild(ov); /* stay above any modal opened after it */
    ov.querySelector("#confirm-title").textContent = opts.title || "Та итгэлтэй байна уу?";
    ov.querySelector("#confirm-text").textContent = opts.text || "";
    var yes = ov.querySelector("#confirm-yes");
    yes.textContent = opts.confirmLabel || "Тийм";
    yes.onclick = function () { closeModal(ov); if (onYes) onYes(); };
    openModal(id);
  }

  /* ----- Avatar: real photo when there is one, initials otherwise.
     If the photo fails to load it removes itself and the initials show. */
  function avatar(p, cls, style) {
    p = p || {};
    var ini = p.initials || (p.name || "?").split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
    var src = String(p.photo || "").replace(/"/g, "&quot;");
    return '<span class="avatar' + (cls ? " " + cls : "") + (src ? " has-photo" : "") + '"' + (style ? ' style="' + style + '"' : "") + ">" + ini +
      (src ? '<img src="' + src + '" alt="" onerror="this.parentNode.classList.remove(\'has-photo\');this.remove()">' : "") + "</span>";
  }

  window.UI = {
    avatar: avatar,
    BASE: BASE,
    LOGO: LOGO,
    logo: logo,
    themeToggle: themeToggle,
    icons: icons,
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    confirm: confirmDialog
  };
})();
