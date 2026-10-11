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

  /* ---------- Client chrome ---------- */
  function clientChrome() {
    var links = APP.nav.filter(function (n) { return n.header !== false; }).map(function (n) {
      return '<a href="#/' + n.id + '" data-nav="' + n.id + '"><i data-lucide="' + n.icon + '"></i>' + n.label + "</a>";
    }).join("");
    var header =
      '<header class="app-header"><div class="inner">' +
        UI.logo({ href: "#/home", responsive: true }) +
        '<form class="header-search input-icon" role="search" data-search-form>' +
          '<i data-lucide="search"></i>' +
          '<label class="sr-only" for="header-q">Хайх</label>' +
          '<input id="header-q" class="input" type="search" placeholder="Салон, үйлчилгээ, байршил хайх…" autocomplete="off">' +
        "</form>" +
        '<nav class="header-nav" aria-label="Үндсэн цэс">' + links + "</nav>" +
        '<div class="header-actions">' +
          '<a class="icon-btn show-mobile-only" href="#/salons" aria-label="Хайх"><i data-lucide="search"></i></a>' +
          UI.themeToggle() +
          '<a class="icon-btn" href="#/profile" aria-label="Миний профайл" title="' + APP.user.name + '"><span class="avatar" style="width:34px;height:34px">' + APP.user.initials + "</span></a>" +
        "</div>" +
      "</div></header>";
    return header;
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
        '<div class="sidebar-foot"><span class="avatar">' + APP.user.initials + '</span>' +
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
          '<span class="avatar show-mobile-only" style="width:36px;height:36px">' + APP.user.initials + "</span>" +
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
        "<p>Энэ хуудсыг " + APP.phase + "-р шатанд зурна. Одоогоор дизайн систем, навигаци болон горим солих боломж бэлэн байна.</p>" +
        '<span class="badge badge-pink no-dot">Phase ' + APP.phase + "</span>" +
      "</div>";
    return s;
  }

  /* ---------- Router ---------- */
  function route() {
    var id = (location.hash.replace(/^#\/?/, "") || APP.nav[0].id).split("?")[0];
    var n = navItem(id) || APP.nav[0];
    document.querySelectorAll("[data-page]").forEach(function (p) {
      p.hidden = p.getAttribute("data-page") !== n.id;
    });
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === n.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var t = document.getElementById("page-title");
    if (t) t.textContent = n.label;
    document.title = n.label + " · " + APP.title + " · Beauty Salon UI";
    var dash = document.querySelector(".dash");
    if (dash) dash.classList.remove("drawer-open");
    window.scrollTo(0, 0);
    document.dispatchEvent(new CustomEvent("page:show", { detail: { id: n.id } }));
  }

  /* ---------- Build ---------- */
  function build() {
    var pages = document.getElementById("pages");
    APP.nav.forEach(function (n) {
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
    var sf = document.querySelector("[data-search-form]");
    if (sf) sf.addEventListener("submit", function (e) {
      e.preventDefault();
      location.hash = "#/salons";
    });

    window.addEventListener("hashchange", route);
    route();
  }

  build();
})();
