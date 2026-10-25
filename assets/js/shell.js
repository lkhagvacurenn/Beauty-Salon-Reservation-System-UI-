/* =========================================================
   App shell: builds the demo bar, header / sidebar, mobile
   navigation and a tiny hash router for each interface.

   Each interface page defines window.APP before loading this:
     APP = {
       id: "client" | "business" | "employee" | "admin",
       kind: "client" | "dashboard",
       title: "Үйлчлүүлэгч",
       nav: [{ id, label, icon, group? }],
       bottomNav: [...ids]          // phones (client & employee)
       user: { name, role, initials },
       phase: 2                      // which build phase fills the pages
     }
   Pages are <section data-page="id"> elements inside #pages.
   A nav item without a section gets a "coming next" placeholder.
   ========================================================= */
(function () {
  var APP = window.APP;
  var UI = window.UI;
  var B = UI.BASE;

  var INTERFACES = [
    { id: "client",   label: "Client",                  href: "client/index.html" },
    { id: "business", label: "Business Owner",          href: "business/index.html" },
    { id: "employee", label: "Employee",                href: "employee/index.html" },
    { id: "admin",    label: "Platform Administration", href: "admin/index.html" }
  ];

  function navItem(item) {
    return APP.nav.filter(function (n) { return n.id === item; })[0];
  }

  /* ---------- Demo bar ---------- */
  function demoBar() {
    var opts = INTERFACES.map(function (i) {
      return '<option value="' + B + i.href + '"' + (i.id === APP.id ? " selected" : "") + ">" + i.label + "</option>";
    }).join("");
    return (
      '<div class="demo-bar" role="region" aria-label="Demo navigation">' +
        '<a class="back-link" href="' + B + 'index.html"><i data-lucide="arrow-left"></i>Back to Welcome</a>' +
        '<span class="demo-label">UI demo · <b>' + APP.title + "</b></span>" +
        '<span class="spacer"></span>' +
        '<label class="sr-only" for="iface-switch">Switch interface</label>' +
        '<select id="iface-switch" class="demo-switch hide-mobile">' + opts + "</select>" +
      "</div>"
    );
  }

  /* ---------- Client chrome ----------
     Desktop (≥1024): only the logo on the left, search in the middle,
     menu links + theme on the right.
     Tablet / phone: logo + theme; the menu (incl. profile) moves to
     the bottom navigation bar.                                       */
  function clientChrome() {
    var links = APP.nav.filter(function (n) { return n.header !== false; }).map(function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '"><i data-lucide="' + n.icon + '"></i>' + n.label + "</a>";
    }).join("");
    return (
      '<header class="app-header"><div class="inner">' +
        UI.logo({ href: "#/" + homeId(), responsive: true }) +
        '<form class="header-search" id="header-search" role="search">' +
          '<label class="sr-only" for="header-q">Салон эсвэл үйлчилгээ хайх</label>' +
          '<div class="input-icon"><i data-lucide="search"></i><input id="header-q" class="input" type="search" placeholder="Салон, үйлчилгээ хайх" autocomplete="off"></div>' +
        "</form>" +
        '<nav class="header-nav" aria-label="Үндсэн цэс">' + links + UI.themeToggle("header-theme") + "</nav>" +
        '<div class="header-actions hide-desktop">' + UI.themeToggle() + "</div>" +
      "</div></header>"
    );
  }

  /* Account area: avatar menu when "logged in", login button otherwise.
     Login is simulated (localStorage), the UI never requires it. */
  function renderAccount() {
    var slot = document.getElementById("account-slot");
    if (!slot) return;
    var loggedIn = window.Session ? window.Session.isLoggedIn() : true;
    if (!loggedIn) {
      slot.innerHTML = '<a class="btn btn-primary btn-sm" href="#/login"><i data-lucide="log-in"></i><span class="hide-mobile">Нэвтрэх</span></a>';
    } else {
      var u = window.Session ? window.Session.user() : APP.user;
      slot.innerHTML =
        '<div class="menu-wrap">' +
          '<button class="account-btn" type="button" aria-haspopup="menu" aria-expanded="false" data-menu-toggle>' +
            UI.avatar(u, "", "width:36px;height:36px") +
            '<span class="hide-tablet-down account-name">' + u.name.split(" ")[0] + "</span>" +
            '<i data-lucide="chevron-down" class="icon-sm hide-tablet-down"></i>' +
          "</button>" +
          '<div class="menu" role="menu" hidden>' +
            '<div class="menu-head"><b>' + u.name + "</b><span>" + u.email + "</span></div>" +
            '<a role="menuitem" href="#/profile"><i data-lucide="user-round"></i>Профайл</a>' +
            '<a role="menuitem" href="#/bookings"><i data-lucide="calendar-check"></i>Миний захиалга</a>' +
            '<a role="menuitem" href="#/favorites"><i data-lucide="heart"></i>Хадгалсан</a>' +
            '<button role="menuitem" type="button" data-logout><i data-lucide="log-out"></i>Гарах</button>' +
          "</div>" +
        "</div>";
    }
    UI.icons();
  }

  function bottomNav() {
    if (!APP.bottomNav) return "";
    var items = APP.bottomNav.map(function (id) {
      var n = navItem(id);
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '"><i data-lucide="' + n.icon + '"></i><span>' + (n.short || n.label) + "</span></a>";
    }).join("");
    return '<nav class="bottom-nav" aria-label="Доод цэс">' + items + "</nav>";
  }

  /* ---------- Dashboard chrome ---------- */
  function sidebar() {
    var html = "", group = null;
    APP.nav.forEach(function (n) {
      if (n.group && n.group !== group) {
        html += '</nav><div class="sidebar-section">' + n.group + "</div><nav>";
        group = n.group;
      }
      html += '<a href="#/' + n.id + '" data-nav="' + n.id + '" title="' + n.label + '"><i data-lucide="' + n.icon + '"></i><span class="label">' + n.label + "</span></a>";
    });
    return (
      '<aside class="sidebar" id="sidebar" aria-label="Цэс">' +
        '<div class="sidebar-logo">' + UI.logo({ href: "#/" + APP.nav[0].id }) + "</div>" +
        "<nav>" + html + "</nav>" +
        '<div class="sidebar-foot">' + UI.avatar(APP.user) + '' +
          '<div class="who"><b>' + APP.user.name + "</b><span>" + APP.user.role + "</span></div></div>" +
      "</aside>" +
      '<div class="drawer-scrim" data-drawer-close></div>'
    );
  }

  function topbar() {
    return (
      '<div class="topbar">' +
        '<button class="icon-btn plain menu-btn" type="button" data-drawer-open aria-label="Цэс нээх" aria-controls="sidebar"><i data-lucide="menu"></i></button>' +
        '<h1 class="page-title" id="page-title"></h1>' +
        '<div class="topbar-actions">' + UI.themeToggle() +
          UI.avatar(APP.user, "show-mobile-only", "width:36px;height:36px") +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- Placeholder page for not-yet-built sections ---------- */
  function placeholder(n) {
    var s = document.createElement("section");
    s.setAttribute("data-page", n.id);
    s.innerHTML =
      '<div class="empty">' +
        '<div class="empty-icon"><i data-lucide="' + n.icon + '"></i></div>' +
        "<h3>" + n.label + "</h3>" +
        "<p>" + (n.soon || "Энэ хуудсыг " + APP.phase + "-р шатанд зурна. Одоогоор дизайн систем, навигаци болон горим солих боломж бэлэн байна.") + "</p>" +
        '<span class="badge badge-pink no-dot">' + (n.badge || "Phase " + APP.phase) + "</span>" +
        (n.soonLink ? '<a class="btn btn-secondary btn-sm" href="' + n.soonLink[1] + '">' + n.soonLink[0] + "</a>" : "") +
      "</div>";
    return s;
  }

  /* ---------- Router ----------
     #/page            → menu page
     #/page?id=3&q=x   → params passed to the page via "page:show"
     APP.routes lists extra pages that are not in the menu
     (e.g. salon detail, login).                                    */
  function homeId() { return APP.home || APP.nav[0].id; }
  function findRoute(id) {
    return navItem(id) || (APP.routes || []).filter(function (r) { return r.id === id; })[0];
  }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("?");
    var params = {};
    (parts[1] || "").split("&").forEach(function (kv) {
      if (!kv) return;
      var p = kv.split("=");
      params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || "").replace(/\+/g, " "));
    });
    return { id: parts[0] || homeId(), params: params };
  }
  /* Thin progress bar at the top of the window while a page switches */
  var lastPage = null;
  function routeLoader() {
    var b = document.getElementById("route-loader");
    if (!b) {
      b = document.createElement("div");
      b.id = "route-loader"; b.setAttribute("aria-hidden", "true");
      document.body.appendChild(b);
    }
    b.classList.remove("is-run"); void b.offsetWidth; b.classList.add("is-run");
  }
  function route() {
    var h = parseHash();
    var n = findRoute(h.id) || findRoute(homeId());
    if (n.id !== lastPage) { lastPage = n.id; routeLoader(); }
    if (n.redirect) { location.replace("#/" + n.redirect); return; }
    document.querySelectorAll("[data-page]").forEach(function (p) {
      p.hidden = p.getAttribute("data-page") !== n.id;
    });
    var active = n.parent || n.id;
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var t = document.getElementById("page-title");
    if (t) t.textContent = n.label;
    document.title = n.label + " · " + APP.title + " · Bloom UI";
    var dash = document.querySelector(".dash");
    if (dash) dash.classList.remove("drawer-open");
    closeMenus();
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("page:show", { detail: { id: n.id, params: h.params } }));
  }

  function closeMenus() {
    document.querySelectorAll(".menu").forEach(function (m) { m.hidden = true; });
    document.querySelectorAll("[data-menu-toggle]").forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
  }

  /* ---------- Build ---------- */
  function build() {
    var pages = document.getElementById("pages");
    APP.nav.concat(APP.routes || []).forEach(function (n) {
      if (!pages.querySelector('[data-page="' + n.id + '"]')) pages.appendChild(placeholder(n));
    });

    var body = document.body;
    body.insertAdjacentHTML("afterbegin", demoBar());

    if (APP.kind === "client") {
      var main = document.createElement("main");
      main.className = "client-main";
      main.id = "main";
      main.appendChild(pages);
      body.querySelector(".demo-bar").insertAdjacentHTML("afterend", clientChrome());
      body.appendChild(main);
      body.insertAdjacentHTML("beforeend", bottomNav());
    } else {
      var dash = document.createElement("div");
      dash.className = "dash" + (APP.bottomNav ? " mobile-bottom" : "");
      dash.innerHTML = sidebar() + '<div class="dash-main">' + topbar() + '<main class="dash-content" id="main"></main></div>';
      dash.querySelector("#main").appendChild(pages);
      body.appendChild(dash);
      body.insertAdjacentHTML("beforeend", bottomNav());
    }

    UI.icons();

    document.getElementById("iface-switch").addEventListener("change", function (e) {
      location.href = e.target.value;
    });
    document.addEventListener("click", function (e) {
      var d = document.querySelector(".dash");
      if (!d) return;
      if (e.target.closest("[data-drawer-open]")) d.classList.add("drawer-open");
      if (e.target.closest("[data-drawer-close]")) d.classList.remove("drawer-open");
    });
    // Account dropdown + simulated logout
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-menu-toggle]");
      if (t) {
        var m = t.parentElement.querySelector(".menu");
        var open = m.hidden;
        closeMenus();
        m.hidden = !open;
        t.setAttribute("aria-expanded", open ? "true" : "false");
        return;
      }
      if (e.target.closest("[data-logout]")) {
        window.Session && window.Session.logout();
        renderAccount();
        UI.toast("Та системээс гарлаа (демо)", "info");
        return;
      }
      if (!e.target.closest(".menu")) closeMenus();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenus(); });
    document.addEventListener("session:change", renderAccount);
    renderAccount();
    var hs = document.getElementById("header-search");
    if (hs) hs.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = document.getElementById("header-q").value.trim();
      location.hash = "#/salons" + (q ? "?q=" + encodeURIComponent(q) : "");
    });

    window.addEventListener("hashchange", route);
    route();
  }

  build();
})();
