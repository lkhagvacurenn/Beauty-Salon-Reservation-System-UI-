/* =========================================================
   Bloom client: "Үйлчилгээ" (search + map on one page)
   - search box, active filter chips, sort, results list
   - interactive DEMO map (pan, zoom, markers, "search this area")
   - floating bottom-left filter button → panel / bottom sheet
   The map is a labelled mock. To use Google Maps later, replace
   Map.render() / Map.setTransform() with the Maps JS API and keep
   the same pin data (branch.map) and callbacks.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, B = window.Bloom, E = window.Engine;

  /* ---------- Filter state ---------- */
  function emptyFilters() {
    return { q: "", cats: [], services: [], districts: [], near: false, pmin: 0, pmax: 200000,
      rating: 0, today: false, date: "", time: "", discount: false, sort: "relevant" };
  }
  var F = B.load("bloom-filters", null) || emptyFilters();     // applied filters (kept between visits)
  var draft = null;                                            // filters being edited in the panel
  var area = null;                                             // salon ids inside "search this area"
  var userLoc = null;                                          // demo location {x, y}
  var view = "list";                                           // phone: list | map
  var selected = null;                                         // selected salon id
  var PRICE_MAX = 200000;

  function persist() { B.save("bloom-filters", F); }

  var ALL_SERVICES = [];
  D.SALONS.forEach(function (s) {
    s.services.forEach(function (x) { if (ALL_SERVICES.indexOf(x.name) === -1) ALL_SERVICES.push(x.name); });
  });

  /* ---------- Matching ---------- */
  var availCache = {};
  function availability(s) {
    if (availCache[s.id]) return availCache[s.id];
    var cheapest = s.services.slice().sort(function (a, b) { return a.price - b.price; })[0];
    var b = s.branches[0];
    var nf = E.nextFree(s, b, [cheapest.id], cheapest.duration);
    availCache[s.id] = { next: nf, service: cheapest, branch: b };
    return availCache[s.id];
  }
  function availableOn(s, dateKey, time) {
    var d = E.fromKey(dateKey);
    return s.branches.some(function (b) {
      return s.services.some(function (x) {
        if (b.excludes.indexOf(x.id) > -1) return false;
        var sl = E.slots(s, b, "any", d, x.duration, [x.id]);
        return time ? sl.some(function (t) { return t.ok && t.time === time; }) : sl.some(function (t) { return t.ok; });
      });
    });
  }

  function relevantServices(s, f) {
    return s.services.filter(function (x) {
      if (f.cats.length && f.cats.indexOf(x.cat) === -1) return false;
      if (f.services.length && f.services.indexOf(x.name) === -1) return false;
      if (f.q) {
        var q = f.q.toLowerCase();
        if (s.name.toLowerCase().indexOf(q) === -1 && x.name.toLowerCase().indexOf(q) === -1 && B.catName(x.cat).toLowerCase().indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function distanceKm(s) {
    if (!userLoc) return null;
    return Math.min.apply(null, s.branches.map(function (b) {
      var dx = b.map.x - userLoc.x, dy = (b.map.y - userLoc.y) * 0.75;
      return Math.sqrt(dx * dx + dy * dy) * 0.18;
    }));
  }

  function matches(s, f) {
    if (f.q) {
      var q = f.q.toLowerCase();
      var hay = [s.name, s.district, s.address].concat(s.services.map(function (x) { return x.name; }), s.cats.map(B.catName)).join(" ").toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    if (f.cats.length && !f.cats.some(function (c) { return s.cats.indexOf(c) > -1; })) return false;
    if (f.services.length && !s.services.some(function (x) { return f.services.indexOf(x.name) > -1; })) return false;
    if (f.districts.length && !f.districts.some(function (d) {
      return s.district === d || s.branches.some(function (b) { return b.address.indexOf(d) === 0; });
    })) return false;
    if (f.near && userLoc && distanceKm(s) > 3) return false;
    var svcs = relevantServices(s, f);
    if (!svcs.some(function (x) { return x.price >= f.pmin && x.price <= f.pmax; })) return false;
    if (f.rating && s.rating < f.rating) return false;
    if (f.today) { var a = availability(s); if (!a.next || a.next.offset !== 0) return false; }
    if (f.date || f.time) {
      var dk = f.date || E.dateKey(E.today());
      if (!availableOn(s, dk, f.time)) return false;
    }
    if (f.discount && !B.discountFor(s.id)) return false;
    return true;
  }

  function matchPrice(s, f) {
    var svcs = relevantServices(s, f).filter(function (x) { return x.price >= f.pmin && x.price <= f.pmax; });
    if (!svcs.length) svcs = s.services;
    return Math.min.apply(null, svcs.map(function (x) { return x.price; }));
  }

  function results(f, useArea) {
    var list = D.SALONS.filter(function (s) { return matches(s, f); });
    if (useArea && area) list = list.filter(function (s) { return area.indexOf(s.id) > -1; });
    var sorters = {
      relevant: function (a, b) { return (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating; },
      rating: function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; },
      priceAsc: function (a, b) { return matchPrice(a, f) - matchPrice(b, f); },
      priceDesc: function (a, b) { return matchPrice(b, f) - matchPrice(a, f); },
      nearest: function (a, b) { return (distanceKm(a) || 0) - (distanceKm(b) || 0); }
    };
    return list.sort(sorters[f.sort] || sorters.relevant);
  }

  function activeCount(f) {
    var n = f.cats.length + f.services.length + f.districts.length;
    if (f.near) n++;
    if (f.pmin > 0 || f.pmax < PRICE_MAX) n++;
    if (f.rating) n++;
    if (f.today) n++;
    if (f.date) n++;
    if (f.time) n++;
    if (f.discount) n++;
    if (f.sort !== "relevant") n++;
    return n;
  }

  var SORTS = { relevant: "Хамааралтай", rating: "Өндөр үнэлгээтэй", priceAsc: "Хямд үнээс", priceDesc: "Үнэтэйгээс", nearest: "Ойр байгаагаас" };

  /* ---------- Page skeleton ---------- */
  function renderPage(params) {
    var el = document.querySelector('[data-page="salons"]');
    if (params.q != null) F.q = params.q;
    if (params.cat) { F = emptyFilters(); F.cats = [params.cat]; }
    if (params.district) F.districts = [params.district];
    if (params.discount) { F.discount = true; }
    if (params.view === "map") view = "map";
    area = null;

    el.innerHTML =
      '<div class="discover" data-view="' + view + '">' +
        '<div class="discover-list">' +
          '<form class="discover-search" id="discover-search" role="search">' +
            '<div class="input-icon"><i data-lucide="search"></i>' +
              '<label class="sr-only" for="dq">Салон эсвэл үйлчилгээ хайх</label>' +
              '<input id="dq" class="input" type="search" placeholder="Салон, үйлчилгээ, дүүрэг…" value="' + B.esc(F.q) + '" autocomplete="off"></div>' +
            '<button class="btn btn-primary" type="submit">Хайх</button>' +
          "</form>" +
          '<div class="view-switch segmented" role="tablist" aria-label="Харагдац">' +
            '<button type="button" role="tab" data-view-btn="list" aria-selected="' + (view === "list") + '"><i data-lucide="list"></i>Жагсаалт</button>' +
            '<button type="button" role="tab" data-view-btn="map" aria-selected="' + (view === "map") + '"><i data-lucide="map"></i>Газрын зураг</button>' +
          "</div>" +
          '<div class="active-filters" id="active-filters" aria-live="polite"></div>' +
          '<div class="results-head"><p id="result-count" class="small"></p>' +
            '<label class="sort-select"><span class="sr-only">Эрэмбэлэх</span><i data-lucide="arrow-up-down"></i>' +
            '<select class="select" id="sort-select">' +
              Object.keys(SORTS).map(function (k) { return '<option value="' + k + '">' + SORTS[k] + "</option>"; }).join("") +
            "</select></label></div>" +
          '<div class="results" id="results"></div>' +
        "</div>" +
        '<div class="discover-map">' + mapHTML() + "</div>" +
      "</div>" +
      '<button class="fab-filter" type="button" id="fab-filter" aria-haspopup="dialog" aria-controls="filter-panel">' +
        '<i data-lucide="sliders-horizontal"></i><span>Шүүлтүүр</span><b class="fab-count" id="fab-count" hidden></b>' +
      "</button>";

    ensurePanel();
    UI.icons();
    Map.init();
    update();
  }

  /* ---------- Results ---------- */
  function cardExtra(s) {
    var a = availability(s);
    var svc = relevantServices(s, F)[0];
    var html = "";
    if (svc && (F.cats.length || F.services.length || F.q)) {
      html += '<p class="match-line"><i data-lucide="tag"></i>' + svc.name + " · <b>" + B.money(svc.price) + "</b> · " + svc.duration + " мин</p>";
    }
    var dist = distanceKm(s);
    if (dist != null) html += '<p class="match-line"><i data-lucide="navigation"></i>Танаас ~' + dist.toFixed(1) + " км</p>";
    if (a.next) {
      var label = a.next.offset === 0 ? "Өнөөдөр" : a.next.offset === 1 ? "Маргааш" : E.shortDate(a.next.date);
      html +=
        '<div class="slot-row"><span class="xs muted">' + label + " сул цаг:</span>" +
        a.next.slots.slice(0, 3).map(function (t) {
          return '<a class="slot-chip" href="#/book?id=' + s.id + "&service=" + a.service.id + "&date=" + E.dateKey(a.next.date) + "&time=" + t.time + '">' + t.time + "</a>";
        }).join("") + "</div>";
    } else {
      html += '<p class="next-slot">Ойрын 7 хоногт сул цаг алга</p>';
    }
    return html;
  }

  function update() {
    var list = results(F, true);
    var box = document.getElementById("results");
    if (!box) return;
    var ad = D.SEARCH_ADS && D.SEARCH_ADS[0];
    box.innerHTML = (ad && list.length ? '<div class="ad-banner search-ad"><span class="ad-label">Сурталчилгаа</span><div class="ad-slides">' +
        '<a class="ad-slide is-active" href="' + B.esc(ad.url) + '"' + (ad.url.indexOf("http") === 0 ? " data-external" : "") + ">" + BloomAd.visual(ad) +
        '<span class="ad-text"><b>' + B.esc(ad.title) + "</b><span>" + B.esc(ad.text) + "</span><small>" + B.esc(ad.sponsor) + "</small></span>" +
        '<span class="btn btn-secondary btn-sm ad-cta">' + B.esc(ad.cta) + '<i data-lucide="arrow-up-right"></i></span></a></div></div>' : "") +
      (list.length
      ? '<div class="salon-grid">' + list.map(function (s) { return B.salonCard(s, cardExtra(s)); }).join("") + "</div>"
      : '<div class="empty"><div class="empty-icon"><i data-lucide="search-x"></i></div><h3>Тохирох салон олдсонгүй</h3>' +
        "<p>Хайлтын үг эсвэл шүүлтүүрээ өөрчлөөд дахин оролдоно уу.</p>" +
        '<button class="btn btn-primary btn-sm" type="button" data-clear-all>Шүүлтүүр цэвэрлэх</button></div>');

    document.getElementById("result-count").innerHTML = "<b>" + list.length + "</b> салон олдлоо" + (area ? ' · <span class="muted">газрын зургийн харагдаж буй хэсэгт</span>' : "");
    document.getElementById("sort-select").value = F.sort;
    renderChips();
    var n = activeCount(F);
    var c = document.getElementById("fab-count");
    c.hidden = !n; c.textContent = n;
    document.getElementById("fab-filter").setAttribute("aria-label", "Шүүлтүүр нээх" + (n ? ", " + n + " идэвхтэй" : ""));
    Map.renderPins(list);
    UI.icons();
    persist();
  }

  /* Removable chips above results */
  function renderChips() {
    var chips = [];
    function chip(label, key, value) { chips.push('<button type="button" class="chip is-active" data-remove="' + key + '" data-value="' + B.esc(value || "") + '">' + label + '<i data-lucide="x"></i></button>'); }
    if (F.q) chip("“" + B.esc(F.q) + "”", "q");
    F.cats.forEach(function (c) { chip(B.catName(c), "cats", c); });
    F.services.forEach(function (x) { chip(x, "services", x); });
    F.districts.forEach(function (d) { chip(d, "districts", d); });
    if (F.near) chip("3 км дотор", "near");
    if (F.pmin > 0 || F.pmax < PRICE_MAX) chip(B.money(F.pmin) + " – " + B.money(F.pmax), "price");
    if (F.rating) chip(F.rating.toFixed(1) + "+ үнэлгээ", "rating");
    if (F.today) chip("Өнөөдөр сул", "today");
    if (F.date) chip(E.shortDate(E.fromKey(F.date)), "date");
    if (F.time) chip(F.time + "-д сул", "time");
    if (F.discount) chip("Discount Hour", "discount");
    if (F.sort !== "relevant") chip("Эрэмбэ: " + SORTS[F.sort], "sort");
    if (area) chip("Газрын зургийн хэсэг", "area");
    var box = document.getElementById("active-filters");
    box.innerHTML = chips.length ? chips.join("") + '<button type="button" class="link-btn" data-clear-all>Бүгдийг цэвэрлэх</button>' : "";
  }

  function removeFilter(key, value) {
    if (key === "q") { F.q = ""; var i = document.getElementById("dq"); if (i) i.value = ""; }
    else if (key === "cats" || key === "services" || key === "districts") F[key] = F[key].filter(function (v) { return v !== value; });
    else if (key === "price") { F.pmin = 0; F.pmax = PRICE_MAX; }
    else if (key === "rating") F.rating = 0;
    else if (key === "sort") F.sort = "relevant";
    else if (key === "date" || key === "time") F[key] = "";
    else if (key === "area") { area = null; Map.hideAreaBtn(); }
    else F[key] = false;
    update();
  }

  /* ---------- Filter panel ---------- */
  function ensurePanel() {
    if (document.getElementById("filter-panel")) return;
    var ov = document.createElement("div");
    ov.className = "overlay sheet-on-mobile filter-overlay";
    ov.id = "filter-panel";
    ov.setAttribute("aria-hidden", "true");
    ov.innerHTML =
      '<div class="modal filter-modal" role="dialog" aria-modal="true" aria-labelledby="filter-title">' +
        '<div class="modal-head"><div><h3 id="filter-title">Шүүлтүүр</h3><p class="xs muted" id="filter-sub"></p></div>' +
        '<button class="icon-btn plain" type="button" data-close-modal aria-label="Хаах"><i data-lucide="x"></i></button></div>' +
        '<div class="filter-body" id="filter-body"></div>' +
        '<div class="filter-foot"><button class="btn btn-ghost" type="button" data-draft-clear>Бүгдийг цэвэрлэх</button>' +
        '<button class="btn btn-primary" type="button" data-apply id="apply-btn">Шүүх</button></div>' +
      "</div>";
    document.body.appendChild(ov);
  }

  function chipGroup(key, items, multi) {
    return '<div class="row-wrap">' + items.map(function (it) {
      var val = it[0], on = multi ? draft[key].indexOf(val) > -1 : String(draft[key]) === String(val);
      return '<button type="button" class="chip" aria-pressed="' + on + '" data-f="' + key + '" data-v="' + B.esc(String(val)) + '"' + (multi ? " data-multi" : "") + ">" +
        (it[2] ? '<i data-lucide="' + it[2] + '"></i>' : "") + it[1] + "</button>";
    }).join("") + "</div>";
  }

  function renderPanel() {
    var svcNames = ALL_SERVICES.filter(function (name) {
      if (!draft.cats.length) return true;
      return D.SALONS.some(function (s) { return s.services.some(function (x) { return x.name === name && draft.cats.indexOf(x.cat) > -1; }); });
    });
    var times = [];
    for (var t = 10 * 60; t <= 20 * 60; t += 60) times.push(E.fmt(t));
    var minDate = E.dateKey(E.today());
    var max = E.today(); max.setDate(max.getDate() + 30);

    document.getElementById("filter-body").innerHTML =
      fieldset("Үйлчилгээний төрөл", chipGroup("cats", D.CATEGORIES.map(function (c) { return [c.id, c.name, c.icon]; }), true)) +
      fieldset("Үйлчилгээ", chipGroup("services", svcNames.map(function (n) { return [n, n]; }), true)) +
      fieldset("Байршил",
        chipGroup("districts", D.DISTRICTS.map(function (d) { return [d, d]; }), true) +
        '<label class="switch mt-4"><input type="checkbox" data-fcheck="near"' + (draft.near ? " checked" : "") + '><span class="track"></span>Ойролцоох салон (3 км дотор)</label>' +
        (userLoc ? "" : '<p class="xs muted" style="margin:6px 0 0">Асаахад демо байршил (Сүхбаатарын талбай орчим) ашиглана.</p>')) +
      fieldset("Үнэ",
        '<div class="price-range">' +
          '<div class="range-values"><span id="pmin-v">' + B.money(draft.pmin) + '</span><span id="pmax-v">' + B.money(draft.pmax) + "</span></div>" +
          '<div class="dual-range">' +
            '<input type="range" min="0" max="' + PRICE_MAX + '" step="5000" value="' + draft.pmin + '" data-range="pmin" aria-label="Доод үнэ">' +
            '<input type="range" min="0" max="' + PRICE_MAX + '" step="5000" value="' + draft.pmax + '" data-range="pmax" aria-label="Дээд үнэ">' +
          "</div>" +
          '<div class="row-wrap"><button type="button" class="chip" data-price="0-40000">40,000₮ хүртэл</button><button type="button" class="chip" data-price="40000-80000">40–80 мянга</button><button type="button" class="chip" data-price="80000-200000">80,000₮-өөс дээш</button></div>' +
        "</div>") +
      fieldset("Үнэлгээ", chipGroup("rating", [[0, "Бүгд"], [4, "4.0+", "star"], [4.5, "4.5+", "star"], [4.8, "4.8+", "star"]], false)) +
      fieldset("Сул цаг",
        '<label class="check"><input type="checkbox" data-fcheck="today"' + (draft.today ? " checked" : "") + "> Өнөөдөр сул цагтай</label>" +
        '<div class="grid grid-2 mt-4">' +
          '<div class="field"><label for="f-date">Өдөр сонгох</label><input class="input" type="date" id="f-date" min="' + minDate + '" max="' + E.dateKey(max) + '" value="' + draft.date + '"></div>' +
          '<div class="field"><label for="f-time">Цаг</label><select class="select" id="f-time"><option value="">Хамаагүй</option>' +
            times.map(function (x) { return '<option' + (draft.time === x ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></div>" +
        "</div>") +
      fieldset("Урамшуулал", '<label class="check"><input type="checkbox" data-fcheck="discount"' + (draft.discount ? " checked" : "") + '> <i data-lucide="timer" class="icon-sm"></i> Discount Hour-тэй салон</label>') +
      fieldset("Эрэмбэлэх", chipGroup("sort", Object.keys(SORTS).map(function (k) { return [k, SORTS[k]]; }), false));

    var n = activeCount(draft), count = results(draft, false).length;
    document.getElementById("filter-sub").textContent = n ? n + " шүүлтүүр сонгосон" : "Олон сонголт хийж болно";
    var btn = document.getElementById("apply-btn");
    btn.textContent = count ? count + " салон харах" : "Тохирох салон алга";
    btn.disabled = false;
    UI.icons();
  }
  function fieldset(title, body) { return '<fieldset class="f-group"><legend>' + title + "</legend>" + body + "</fieldset>"; }

  function openPanel() {
    draft = JSON.parse(JSON.stringify(F));   // reopen with the applied filters
    renderPanel();
    UI.openModal("filter-panel");
  }

  /* ---------- Demo map ---------- */
  var Map = (function () {
    var s = 1, tx = 0, ty = 0, el, canvas, pinLayer, popup, moved = false;
    var DISTRICT_LABELS = [["Сонгинохайрхан", 12, 26], ["Баянгол", 27, 47], ["Чингэлтэй", 42, 22], ["Сүхбаатар", 60, 24], ["Баянзүрх", 80, 34], ["Хан-Уул", 40, 90]];

    function svg() {
      return (
        '<svg class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
          '<rect class="m-land" width="100" height="100"/>' +
          '<path class="m-park" d="M62 4 Q74 2 80 10 Q78 18 68 17 Q60 14 62 4Z"/>' +
          '<path class="m-park" d="M6 78 Q14 72 22 78 Q20 88 10 88 Q4 85 6 78Z"/>' +
          '<path class="m-river" d="M0 86 C20 80 30 92 48 86 S78 74 100 80"/>' +
          '<path class="m-road big" d="M0 52 L100 50"/>' +
          '<path class="m-road big" d="M50 0 L52 100"/>' +
          '<path class="m-road" d="M0 32 L100 30"/><path class="m-road" d="M0 66 L100 64"/>' +
          '<path class="m-road" d="M28 0 L30 100"/><path class="m-road" d="M72 0 L74 100"/>' +
          '<path class="m-road" d="M10 0 L14 100"/><path class="m-road" d="M88 0 L90 100"/>' +
          '<path class="m-road" d="M30 52 L50 32 L72 30"/>' +
        "</svg>" +
        DISTRICT_LABELS.map(function (d) { return '<span class="m-label" style="left:' + d[1] + "%;top:" + d[2] + '%">' + d[0] + "</span>"; }).join("")
      );
    }

    function html() {
      return (
        '<div class="map" id="map" tabindex="0" aria-label="Салонуудын байршлын жишээ газрын зураг. Чирч хөдөлгөх, + / − товчоор томруулна.">' +
          '<div class="map-canvas" id="map-canvas">' + svg() + "</div>" +
          '<div class="map-pins" id="map-pins"></div>' +
          '<div class="map-popup" id="map-popup" hidden></div>' +
          '<button type="button" class="btn btn-secondary btn-sm map-area-btn" id="map-area-btn" hidden><i data-lucide="scan-search"></i>Энэ хэсгээс хайх</button>' +
          '<div class="map-controls">' +
            '<button type="button" class="icon-btn" data-zoom="in" aria-label="Томруулах"><i data-lucide="plus"></i></button>' +
            '<button type="button" class="icon-btn" data-zoom="out" aria-label="Жижигрүүлэх"><i data-lucide="minus"></i></button>' +
            '<button type="button" class="icon-btn" data-locate aria-label="Миний байршил (демо)"><i data-lucide="locate-fixed"></i></button>' +
          "</div>" +
          '<span class="map-badge"><i data-lucide="info"></i>Жишээ газрын зураг · Байршлууд бодит биш</span>' +
        "</div>"
      );
    }

    function apply() {
      canvas.style.transform = "translate(" + tx + "px," + ty + "px) scale(" + s + ")";
      var W = el.clientWidth, H = el.clientHeight;
      pinLayer.querySelectorAll("[data-pin]").forEach(function (p) {
        var x = tx + (+p.dataset.x / 100) * W * s, y = ty + (+p.dataset.y / 100) * H * s;
        p.style.transform = "translate(" + x + "px," + y + "px)";
      });
      if (popup && !popup.hidden && popup.dataset.x) placePopup();
    }
    function clamp() {
      var W = el.clientWidth, H = el.clientHeight;
      tx = Math.min(0, Math.max(W - W * s, tx));
      ty = Math.min(0, Math.max(H - H * s, ty));
    }
    function zoom(f, cx, cy) {
      var ns = Math.max(1, Math.min(3, s * f));
      cx = cx == null ? el.clientWidth / 2 : cx; cy = cy == null ? el.clientHeight / 2 : cy;
      tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns;
      clamp(); apply(); changed();
    }
    function changed() { moved = true; document.getElementById("map-area-btn").hidden = false; }
    function hideAreaBtn() { moved = false; var b = document.getElementById("map-area-btn"); if (b) b.hidden = true; }

    function init() {
      el = document.getElementById("map"); canvas = document.getElementById("map-canvas");
      pinLayer = document.getElementById("map-pins"); popup = document.getElementById("map-popup");
      s = 1; tx = 0; ty = 0;
      var drag = null;
      el.addEventListener("pointerdown", function (e) {
        if (e.target.closest("button, a, .map-popup")) return;
        drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty }; el.setPointerCapture(e.pointerId); el.classList.add("grabbing");
      });
      el.addEventListener("pointermove", function (e) {
        if (!drag) return;
        tx = drag.tx + e.clientX - drag.x; ty = drag.ty + e.clientY - drag.y;
        clamp(); apply();
        if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 6 && s > 1) changed();
      });
      el.addEventListener("pointerup", function () { drag = null; el.classList.remove("grabbing"); });
      el.addEventListener("wheel", function (e) {
        e.preventDefault();
        var r = el.getBoundingClientRect();
        zoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
      }, { passive: false });
      el.addEventListener("keydown", function (e) {
        var k = { ArrowLeft: [40, 0], ArrowRight: [-40, 0], ArrowUp: [0, 40], ArrowDown: [0, -40] }[e.key];
        if (k) { e.preventDefault(); tx += k[0]; ty += k[1]; clamp(); apply(); if (s > 1) changed(); }
        if (e.key === "+" || e.key === "=") zoom(1.25);
        if (e.key === "-") zoom(0.8);
      });
      window.addEventListener("resize", function () { if (document.getElementById("map")) { clamp(); apply(); } });
      apply();
    }

    function renderPins(list) {
      if (!pinLayer) return;
      var html = "";
      list.forEach(function (sl) {
        sl.branches.forEach(function (b) {
          html += '<button type="button" class="map-pin' + (selected === sl.id ? " is-active" : "") + '" data-pin="' + sl.id + '" data-branch="' + b.id + '" data-x="' + b.map.x + '" data-y="' + b.map.y + '" aria-label="' + B.esc(sl.name + ", " + b.name) + '">' +
            '<span class="pin-price">' + B.money(B.priceFrom(sl)).replace("₮", "") + "₮</span></button>";
        });
      });
      if (userLoc) html += '<span class="map-me" data-pin="me" data-x="' + userLoc.x + '" data-y="' + userLoc.y + '" title="Таны байршил (демо)"></span>';
      pinLayer.innerHTML = html;
      if (selected && !list.some(function (x) { return x.id === selected; })) closePopup();
      apply();
    }

    function placePopup() {
      var W = el.clientWidth, H = el.clientHeight;
      var x = tx + (+popup.dataset.x / 100) * W * s, y = ty + (+popup.dataset.y / 100) * H * s;
      var pw = popup.offsetWidth, ph = popup.offsetHeight;
      var left = Math.max(8, Math.min(W - pw - 8, x - pw / 2));
      var top = y - ph - 44; if (top < 8) top = y + 14;
      popup.style.left = left + "px"; popup.style.top = Math.min(top, H - ph - 8) + "px";
    }

    function openPopup(salonId, branchId) {
      var sl = B.salonById(salonId), b = E.branch(sl, branchId);
      selected = salonId;
      popup.dataset.x = b.map.x; popup.dataset.y = b.map.y;
      var q = encodeURIComponent(b.address + ", Улаанбаатар");
      popup.innerHTML =
        '<button class="icon-btn plain popup-close" type="button" data-popup-close aria-label="Хаах"><i data-lucide="x"></i></button>' +
        '<div class="popup-media">' + B.cover(sl) + "</div>" +
        '<div class="popup-body"><b>' + B.esc(sl.name) + "</b>" +
          '<span class="row small">' + B.stars(sl.rating) + '<span class="muted">' + sl.reviews + " сэтгэгдэл</span></span>" +
          '<span class="xs muted">' + b.name + " · " + b.address + "</span>" +
          '<div class="row-wrap popup-actions">' +
            '<a class="btn btn-primary btn-sm" href="#/salon?id=' + sl.id + "&branch=" + b.id + '">Дэлгэрэнгүй</a>' +
            '<a class="btn btn-secondary btn-sm" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Google Maps</a>' +
          "</div><span class=\"xs muted\">Жишээ хаяг: Google Maps дээр бодит салон гарахгүй байж болно.</span></div>";
      popup.hidden = false;
      UI.icons();
      placePopup();
      highlight(salonId);
    }
    function closePopup() { if (popup) popup.hidden = true; selected = null; highlight(null); }

    function highlight(id) {
      document.querySelectorAll(".map-pin").forEach(function (p) { p.classList.toggle("is-active", p.dataset.pin === id); });
      document.querySelectorAll(".discover .salon-card").forEach(function (c) { c.classList.toggle("is-active", c.dataset.salon === id); });
    }

    /* Center on a salon's first branch (when a list card is chosen) */
    function focusSalon(id) {
      var sl = B.salonById(id), b = sl.branches[0];
      var W = el.clientWidth, H = el.clientHeight;
      if (s < 1.6) s = 1.6;
      tx = W / 2 - (b.map.x / 100) * W * s; ty = H / 2 - (b.map.y / 100) * H * s;
      clamp(); apply();
      openPopup(id, b.id);
    }

    function visibleSalons() {
      var W = el.clientWidth, H = el.clientHeight, ids = [];
      D.SALONS.forEach(function (sl) {
        sl.branches.forEach(function (b) {
          var x = tx + (b.map.x / 100) * W * s, y = ty + (b.map.y / 100) * H * s;
          if (x >= 0 && x <= W && y >= 0 && y <= H && ids.indexOf(sl.id) === -1) ids.push(sl.id);
        });
      });
      return ids;
    }

    return { html: html, init: init, renderPins: renderPins, openPopup: openPopup, closePopup: closePopup,
      zoom: zoom, focusSalon: focusSalon, visibleSalons: visibleSalons, hideAreaBtn: hideAreaBtn, highlight: highlight };
  })();
  function mapHTML() { return Map.html(); }

  function setLocation() {
    if (!userLoc) { userLoc = { x: 53, y: 40 }; UI.toast("Демо байршил: Сүхбаатарын талбай орчим", "info"); }
  }

  function setView(v) {
    view = v;
    var d = document.querySelector(".discover");
    d.setAttribute("data-view", v);
    document.querySelectorAll("[data-view-btn]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.viewBtn === v ? "true" : "false"); });
    if (v === "map") requestAnimationFrame(function () { Map.renderPins(results(F, true)); });
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) { if (e.detail.id === "salons") renderPage(e.detail.params); });

  document.addEventListener("click", function (e) {
    if (!document.querySelector(".discover") && !e.target.closest("#filter-panel")) return;
    var t;
    if (e.target.closest("#fab-filter")) return openPanel();
    if ((t = e.target.closest("[data-remove]"))) return removeFilter(t.dataset.remove, t.dataset.value);
    if (e.target.closest("[data-clear-all]")) {
      F = emptyFilters(); area = null; Map.hideAreaBtn();
      var q = document.getElementById("dq"); if (q) q.value = "";
      update(); UI.toast("Шүүлтүүр цэвэрлэгдлээ", "info"); return;
    }
    if ((t = e.target.closest("[data-view-btn]"))) return setView(t.dataset.viewBtn);

    /* Panel controls */
    if ((t = e.target.closest("[data-f]"))) {
      var key = t.dataset.f, val = t.dataset.v;
      if (key === "rating") val = +val;
      if (t.hasAttribute("data-multi")) {
        var i = draft[key].indexOf(val);
        if (i > -1) draft[key].splice(i, 1); else draft[key].push(val);
      } else {
        draft[key] = val;
        if (key === "sort" && val === "nearest") setLocation();
      }
      renderPanel(); return;
    }
    if ((t = e.target.closest("[data-price]"))) {
      var p = t.dataset.price.split("-"); draft.pmin = +p[0]; draft.pmax = +p[1]; renderPanel(); return;
    }
    if (e.target.closest("[data-draft-clear]")) { draft = emptyFilters(); draft.q = F.q; renderPanel(); return; }
    if (e.target.closest("[data-apply]")) {
      F = draft; UI.closeModal("filter-panel"); update();
      UI.toast(activeCount(F) ? activeCount(F) + " шүүлтүүр хэрэгжлээ" : "Шүүлтүүргүй бүх салон", "success");
      return;
    }

    /* Map */
    if ((t = e.target.closest(".map-pin"))) return Map.openPopup(t.dataset.pin, t.dataset.branch);
    if (e.target.closest("[data-popup-close]")) return Map.closePopup();
    if ((t = e.target.closest("[data-zoom]"))) return Map.zoom(t.dataset.zoom === "in" ? 1.4 : 1 / 1.4);
    if (e.target.closest("[data-locate]")) { setLocation(); update(); return; }
    if (e.target.closest("#map-area-btn")) {
      area = Map.visibleSalons(); Map.hideAreaBtn(); update();
      UI.toast("Газрын зургийн харагдаж буй хэсгээр шүүлээ", "info");
      if (view === "map" && window.innerWidth < 1024) setView("list");
      return;
    }

    /* Selecting a card on desktop highlights its marker */
    var card = e.target.closest(".discover .salon-card");
    if (card && window.innerWidth >= 1024 && !e.target.closest("a, button")) Map.focusSalon(card.dataset.salon);
  });

  document.addEventListener("mouseover", function (e) {
    var card = e.target.closest(".discover .salon-card");
    if (!card || window.innerWidth < 1024) return;
    document.querySelectorAll(".map-pin").forEach(function (p) { p.classList.toggle("is-hover", p.dataset.pin === card.dataset.salon); });
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!draft || !t.closest || !t.closest("#filter-panel")) return;
    if (t.dataset.range) {
      draft[t.dataset.range] = +t.value;
      if (draft.pmin > draft.pmax) { if (t.dataset.range === "pmin") draft.pmax = draft.pmin; else draft.pmin = draft.pmax; }
      document.getElementById("pmin-v").textContent = B.money(draft.pmin);
      document.getElementById("pmax-v").textContent = B.money(draft.pmax);
      var n = results(draft, false).length;
      document.getElementById("apply-btn").textContent = n ? n + " салон харах" : "Тохирох салон алга";
    }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "sort-select") { F.sort = t.value; if (F.sort === "nearest") setLocation(); update(); return; }
    if (!draft || !t.closest || !t.closest("#filter-panel")) return;
    if (t.dataset.fcheck) { draft[t.dataset.fcheck] = t.checked; if (t.dataset.fcheck === "near" && t.checked) setLocation(); renderPanel(); }
    if (t.id === "f-date") { draft.date = t.value; renderPanel(); }
    if (t.id === "f-time") { draft.time = t.value; renderPanel(); }
    if (t.dataset.range) renderPanel();
  });
  document.addEventListener("submit", function (e) {
    if (e.target.id !== "discover-search") return;
    e.preventDefault();
    F.q = document.getElementById("dq").value.trim();
    update();
  });
})();
