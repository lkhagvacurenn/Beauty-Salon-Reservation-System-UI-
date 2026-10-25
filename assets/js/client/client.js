/* =========================================================
   Bloom client: state, shared components and pages
   Loaded BEFORE shell.js so page listeners are ready when the
   shell fires the first "page:show".
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA;

  /* ---------- Local storage helpers ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /* ---------- Simulated session (no real authentication) ---------- */
  window.Session = {
    isLoggedIn: function () { return load("bloom-session", { in: true }).in; },
    user: function () { return load("bloom-user", D.USER); },
    login: function () { save("bloom-session", { in: true }); document.dispatchEvent(new Event("session:change")); },
    logout: function () { save("bloom-session", { in: false }); document.dispatchEvent(new Event("session:change")); }
  };

  /* ---------- Favourites ---------- */
  var Favorites = {
    all: function () { return load("bloom-favorites", ["sarnai", "nomin"]); },
    has: function (id) { return this.all().indexOf(id) > -1; },
    toggle: function (id) {
      var list = this.all();
      var i = list.indexOf(id);
      if (i > -1) list.splice(i, 1); else list.push(id);
      save("bloom-favorites", list);
      return i === -1;
    }
  };

  /* ---------- Formatting ---------- */
  function money(n) { return n.toLocaleString("en-US") + "₮"; }
  function salonById(id) { return D.SALONS.filter(function (s) { return s.id === id; })[0]; }
  function priceFrom(s) { return Math.min.apply(null, s.services.map(function (x) { return x.price; })); }
  function catName(id) { var c = D.CATEGORIES.filter(function (c) { return c.id === id; })[0]; return c ? c.name : id; }
  function catIcon(id) { var c = D.CATEGORIES.filter(function (c) { return c.id === id; })[0]; return c ? c.icon : "sparkles"; }
  function esc(t) { var d = document.createElement("div"); d.textContent = t; return d.innerHTML; }

  /* Photo with graceful fallback: gradient + icon sits underneath,
     the <img> removes itself if it can't load (e.g. offline). */
  function cover(salon, extraClass) {
    return (
      '<div class="cover tone-' + salon.tone + " " + (extraClass || "") + '">' +
        '<i data-lucide="' + catIcon(salon.cats[0]) + '"></i>' +
        '<img src="' + salon.photo + '" alt="' + esc(salon.name) + '" loading="lazy" onerror="this.remove()">' +
      "</div>"
    );
  }

  function stars(rating) {
    return '<span class="rating"><i data-lucide="star"></i><b>' + rating.toFixed(1) + "</b></span>";
  }

  function favButton(salon) {
    var on = Favorites.has(salon.id);
    return (
      '<button class="fav-btn" type="button" data-fav="' + salon.id + '" aria-pressed="' + on + '" ' +
        'aria-label="' + (on ? "Хадгалснаас хасах: " : "Хадгалах: ") + esc(salon.name) + '">' +
        '<i data-lucide="heart"></i>' +
      "</button>"
    );
  }

  function discountFor(salonId) {
    return D.DISCOUNT_HOURS.filter(function (d) { return d.salonId === salonId; })[0];
  }

  /* ---------- Salon card (used on home, favourites, search) ---------- */
  function salonCard(s, extra) {
    var dh = discountFor(s.id);
    return (
      '<article class="salon-card" data-salon="' + s.id + '">' +
        '<a class="salon-card-media" href="#/salon?id=' + s.id + '" tabindex="-1" aria-hidden="true">' +
          cover(s) +
          (dh ? '<span class="media-tag"><i data-lucide="timer"></i>Хямдралтай цаг −' + dh.percent + "%</span>" : "") +
        "</a>" +
        favButton(s) +
        '<div class="salon-card-body">' +
          '<div class="salon-card-top">' +
            '<h3><a href="#/salon?id=' + s.id + '">' + esc(s.name) + "</a></h3>" +
            stars(s.rating) +
          "</div>" +
          '<p class="salon-loc"><i data-lucide="map-pin"></i>' + s.district + " дүүрэг · " + s.branches.length + " салбар</p>" +
          '<div class="salon-cats">' + s.cats.map(function (c) { return '<span>' + catName(c) + "</span>"; }).join("") + "</div>" +
          '<div class="salon-card-foot">' +
            '<div><span class="xs muted">' + s.reviews + " сэтгэгдэл</span>" +
              '<div class="price-from">' + money(priceFrom(s)) + '<span>-өөс</span></div></div>' +
            '<a class="btn btn-primary btn-sm" href="#/book?id=' + s.id + '">Цаг захиалах</a>' +
          "</div>" +
          (extra || '<p class="next-slot ' + (s.availableToday ? "is-today" : "") + '"><i data-lucide="clock"></i>' +
            (s.availableToday ? "Өнөөдөр сул цаг: " : "Дараагийн сул цаг: ") + "<b>" + s.nextSlot + "</b></p>") +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- Home page ---------- */
  function sectionHead(title, sub, link) {
    return (
      '<div class="section-head"><div><h2>' + title + "</h2></div>" +
      (link ? '<a class="see-all" href="' + link[1] + '">' + link[0] + '<i data-lucide="arrow-right"></i></a>' : "") +
      "</div>"
    );
  }

  function renderHome() {
    var el = document.querySelector('[data-page="home"]');
    var featured = D.SALONS.filter(function (s) { return s.featured; });
    var recommended = D.SALONS.slice().sort(function (a, b) { return b.rating - a.rating; }).filter(function (s) { return !s.featured; });

    el.innerHTML =
      /* Hero + search */
      '<section class="hero" aria-labelledby="hero-title">' +
        '<div class="hero-text">' +
          '<span class="eyebrow"><i data-lucide="sparkles"></i>Бүх үйлчилгээ нэг дор</span>' +
          '<h1 id="hero-title" class="display">Өөрт ойроос, <em>хамгийн хялбараар</em></h1>' +
          '<form class="search-card" id="hero-search" role="search">' +
            '<div class="search-field">' +
              '<label for="hero-q">Юу хайж байна вэ?</label>' +
              '<div class="input-icon"><i data-lucide="search"></i>' +
              '<input id="hero-q" class="input" type="search" placeholder="Салон эсвэл үйлчилгээ" autocomplete="off"></div>' +
            "</div>" +
            '<div class="search-field">' +
              '<label for="hero-d">Байршил</label>' +
              '<div class="input-icon"><i data-lucide="map-pin"></i>' +
              '<select id="hero-d" class="select" style="padding-left:42px"><option value="">Бүх дүүрэг</option>' +
                D.DISTRICTS.map(function (d) { return '<option value="' + d + '">' + d + "</option>"; }).join("") +
              "</select></div>" +
            "</div>" +
            '<button class="btn btn-primary btn-lg" type="submit"><i data-lucide="search"></i>Хайх</button>' +
          "</form>" +
          '<div class="quick-chips" aria-label="Түгээмэл хайлт">' +
            '<span class="xs muted">Түгээмэл:</span>' +
            ["Гель маникюр", "Эмэгтэй үс засалт", "Сормуус суулгах", "Массаж"].map(function (q) {
              return '<a class="chip" href="#/salons?q=' + encodeURIComponent(q) + '">' + q + "</a>";
            }).join("") +
          "</div>" +
        "</div>" +
        '<a class="hero-map" href="#/salons?view=map" aria-label="Салонуудыг газрын зураг дээр харах">' +
          '<div class="mini-map" aria-hidden="true">' +
            heroPins() +
            '<span class="mini-map-label">Жишээ газрын зураг</span>' +
          "</div>" +
          '<div class="float-card fc-1"><span class="avatar">4.9</span><div><b>Сарнай Бьюти Студио</b><span>312 сэтгэгдэл</span></div></div>' +
          '<div class="float-card fc-2"><i data-lucide="calendar-check"></i><div><b>Өнөөдөр 14:30</b><span>Сул цаг байна</span></div></div>' +
          '<span class="btn btn-secondary btn-sm hero-map-btn"><i data-lucide="map"></i>Газрын зургаар харах</span>' +
        "</a>" +
      "</section>" +

      /* Categories */
      '<section class="home-section">' +
        sectionHead("Үйлчилгээний төрөл", "Хүссэн үйлчилгээгээ сонгоод салонуудыг харна уу.", null) +
        '<div class="cat-row">' +
          D.CATEGORIES.map(function (c) {
            var n = D.SALONS.filter(function (s) { return s.cats.indexOf(c.id) > -1; }).length;
            return '<a class="cat-card" href="#/salons?cat=' + c.id + '"><span class="cat-icon"><i data-lucide="' + c.icon + '"></i></span><b>' + c.name + "</b><span>" + n + " салон</span></a>";
          }).join("") +
        "</div>" +
      "</section>" +

      /* Featured salons */
      '<section class="home-section">' +
        sectionHead("Онцлох салонууд", "Энэ долоо хоногт хамгийн өндөр үнэлгээ авсан", ["Бүх салон", "#/salons"]) +
        '<div class="featured-row">' +
          featured.map(function (f) {
            return (
              '<article class="featured-card">' +
                '<a class="featured-media" href="#/salon?id=' + f.id + '" tabindex="-1" aria-hidden="true">' + cover(f) + '<span class="media-tag"><i data-lucide="award"></i>Онцлох</span></a>' +
                favButton(f) +
                '<div class="featured-body">' +
                  '<div class="row">' + stars(f.rating) + '<span class="muted small">' + f.reviews + " сэтгэгдэл</span></div>" +
                  '<h3 class="display"><a href="#/salon?id=' + f.id + '">' + esc(f.name) + "</a></h3>" +
                  '<p class="muted small">' + esc(f.description) + "</p>" +
                  '<ul class="featured-facts">' +
                    '<li><i data-lucide="map-pin"></i>' + f.district + " дүүрэг · " + f.branches.length + " салбар</li>" +
                    '<li><i data-lucide="clock"></i>' + (f.availableToday ? "Өнөөдөр сул цаг: " : "Дараагийн сул цаг: ") + "<b>" + f.nextSlot + "</b></li>" +
                  "</ul>" +
                  '<div class="featured-services">' +
                    f.services.slice(0, 2).map(function (x) {
                      return '<div><span>' + x.name + '</span><span class="muted">' + x.duration + ' мин</span><b>' + money(x.price) + "</b></div>";
                    }).join("") +
                  "</div>" +
                  '<div class="row-wrap featured-actions">' +
                    '<a class="btn btn-primary btn-sm" href="#/book?id=' + f.id + '">Цаг захиалах</a>' +
                    '<a class="btn btn-secondary btn-sm" href="#/salon?id=' + f.id + '">Дэлгэрэнгүй</a>' +
                  "</div>" +
                "</div>" +
              "</article>"
            );
          }).join("") +
        "</div>" +
      "</section>" +

      /* Хямдралтай цаг */
      '<section class="home-section">' +
        sectionHead('<i data-lucide="timer" class="title-icon"></i>Хямдралтай цаг', "Тодорхой цагт хөнгөлөлттэй үнээр цаг захиалаарай.", ["Бүгдийг харах", "#/salons?discount=1"]) +
        '<div class="scroller">' +
          D.DISCOUNT_HOURS.map(function (d) {
            var s = salonById(d.salonId);
            var x = s.services.filter(function (v) { return v.id === d.serviceId; })[0];
            var newPrice = Math.round(x.price * (100 - d.percent) / 100 / 500) * 500;
            return (
              '<article class="deal-card">' +
                '<div class="deal-top"><span class="deal-pct">−' + d.percent + '%</span><span class="deal-time"><i data-lucide="clock"></i>' + d.from + "–" + d.to + "</span></div>" +
                "<h3>" + x.name + "</h3>" +
                '<p class="muted small">' + s.name + " · " + s.district + "</p>" +
                '<p class="xs muted">' + d.days + " · " + x.duration + " мин</p>" +
                '<div class="deal-foot"><div><s class="muted small">' + money(x.price) + '</s><b class="deal-price">' + money(newPrice) + "</b></div>" +
                '<a class="btn btn-primary btn-sm" href="#/book?id=' + s.id + "&service=" + x.id + '">Цаг захиалах</a></div>' +
              "</article>"
            );
          }).join("") +
        "</div>" +
      "</section>" +

      /* Advertisement: 1200×200 image banner (BloomAd, below) */
      BloomAd.slot("home", { host: "home-section" }) +

      /* Recommended */
      '<section class="home-section">' +
        sectionHead("Танд санал болгох салонууд", "Үнэлгээ өндөр, сул цагтай салонууд", ["Бүх салон", "#/salons"]) +
        '<div class="salon-grid">' + recommended.slice(0, 5).map(function (x) { return salonCard(x); }).join("") + "</div>" +
      "</section>" +

      footer();

    UI.icons();
  }

  /* Salon pins spread over the whole hero map */
  function heroPins() {
    var xs = D.SALONS.map(function (s) { return s.map.x; }), ys = D.SALONS.map(function (s) { return s.map.y; });
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    return D.SALONS.map(function (s) {
      var x = 14 + (s.map.x - x0) / ((x1 - x0) || 1) * 72, y = 26 + (s.map.y - y0) / ((y1 - y0) || 1) * 52;
      return '<span class="pin" style="left:' + x.toFixed(1) + "%;top:" + y.toFixed(1) + '%" title="' + esc(s.name) + '"><i data-lucide="map-pin"></i></span>';
    }).join("");
  }

  function footer() {
    return (
      '<footer class="client-footer">' +
        '<div>' + UI.logo({ href: "#/home" }) + '<p class="small muted">Гоо сайхны салон, үйлчилгээ, сул цагийг нэг дороос.</p></div>' +
        '<nav aria-label="Доод холбоос"><a href="#/salons">Үйлчилгээ</a><a href="#/salons?view=map">Газрын зураг</a><a href="#/bookings">Миний захиалга</a><a href="#/favorites">Хадгалсан</a>' +
        '<a class="biz-link" href="' + UI.BASE + 'business/index.html"><i data-lucide="store"></i>Бизнес эрхлэгч үү?</a></nav>' +
        '<p class="xs muted">© 2026 Bloom · Дипломын ажлын UI прототип. Бүх салон, хүн, үнэ, байршил нь зохиомол демо өгөгдөл.</p>' +
      "</footer>"
    );
  }

  /* ---------- Advertisements ----------
     Image + link only, in the fixed slots of D.AD_SLOTS. The box keeps the
     slot's aspect ratio and the image is fitted (contain), never cropped.
     Several live ads in one slot rotate every 6 s. */
  function adToday() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function liveAds(place) {
    var t = adToday();
    return (D.ADS || []).filter(function (a) { return a.placement === place && a.active && a.image && a.url && a.start <= t && a.end >= t; });
  }
  function adSrc(img) { return /^(data:|blob:|https?:)/.test(img) ? img : (UI.BASE || "") + img; }
  /* opts.host: wrap the slot in <section class="..."> (hidden with it if every image fails); opts.cls: extra class */
  function adSlot(place, opts) {
    opts = opts || {};
    var slot = D.AD_SLOTS && D.AD_SLOTS[place], list = opts.ads || liveAds(place);
    if (!slot || !list.length) return "";
    var html = '<div class="bad bad-' + place + (opts.cls ? " " + opts.cls : "") + '" data-bad="' + place + '" style="--bad-w:' + slot.w + 'px">' +
      '<div class="bad-frame" style="aspect-ratio:' + slot.w + " / " + slot.h + '">' +
        list.map(function (a, i) {
          var ext = a.url.charAt(0) !== "#";
          return '<a class="bad-slide' + (i === 0 ? " is-active" : "") + '" href="' + esc(a.url) + '" data-ad="' + esc(a.id) + '"' +
            (ext ? ' target="_blank" rel="noopener sponsored"' : ' rel="sponsored"') + (i === 0 ? "" : ' tabindex="-1"') + ">" +
            '<img src="' + esc(adSrc(a.image)) + '" alt="Сурталчилгаа" width="' + slot.w + '" height="' + slot.h + '" decoding="async" onerror="BloomAd.fail(this)"></a>';
        }).join("") +
        '<span class="bad-label">Зар</span>' +
      "</div>" +
      (list.length > 1 ? '<div class="bad-dots" aria-label="Сурталчилгаа сонгох">' + list.map(function (a, i) {
        return '<button type="button" aria-pressed="' + (i === 0) + '" aria-label="' + (i + 1) + '-р сурталчилгаа" data-bad-dot="' + i + '"></button>';
      }).join("") + "</div>" : "") +
    "</div>";
    return opts.host ? '<section class="' + opts.host + ' bad-host" aria-label="Сурталчилгаа">' + html + "</section>" : html;
  }
  function showAd(box, i) {
    var slides = box.querySelectorAll(".bad-slide"), dots = box.querySelectorAll("[data-bad-dot]");
    if (!slides.length) return;
    i = (i + slides.length) % slides.length; box.setAttribute("data-i", i);
    slides.forEach(function (s, k) { s.classList.toggle("is-active", k === i); if (k === i) s.removeAttribute("tabindex"); else s.setAttribute("tabindex", "-1"); });
    dots.forEach(function (d, k) { d.setAttribute("aria-pressed", k === i ? "true" : "false"); });
  }
  /* A creative that fails to load is dropped; an empty slot is hidden */
  function adFail(img) {
    var box = img.closest(".bad"), a = img.closest(".bad-slide");
    if (!box || !a) return;
    var slides = [].slice.call(box.querySelectorAll(".bad-slide")), k = slides.indexOf(a), dots = box.querySelectorAll("[data-bad-dot]");
    a.remove(); if (dots[k]) dots[k].remove();
    box.querySelectorAll("[data-bad-dot]").forEach(function (d, j) { d.setAttribute("data-bad-dot", j); d.setAttribute("aria-label", (j + 1) + "-р сурталчилгаа"); });
    var left = box.querySelectorAll(".bad-slide").length;
    if (left < 2) { var dd = box.querySelector(".bad-dots"); if (dd) dd.remove(); }
    if (!left) { box.hidden = true; var host = box.closest(".bad-host"); if (host && !host.querySelector(".bad:not([hidden])")) host.hidden = true; }
    else showAd(box, 0);
  }
  setInterval(function () {
    document.querySelectorAll(".bad").forEach(function (box) {
      if (box.offsetParent === null || box.querySelectorAll(".bad-slide").length < 2) return;
      if (box.matches(":hover") || box.contains(document.activeElement)) return;
      if (+box.getAttribute("data-hold") > Date.now()) return;
      showAd(box, (+box.getAttribute("data-i") || 0) + 1);
    });
  }, 6000);
  /* Every live ad of a slot as its own block, stacked one under another */
  function adStack(place, opts) {
    opts = opts || {};
    var list = liveAds(place);
    if (!list.length) return "";
    return '<section class="' + (opts.host || "") + ' bad-host bad-stack" aria-label="Сурталчилгаа">' +
      list.map(function (a) { return adSlot(place, { ads: [a], cls: opts.cls }); }).join("") + "</section>";
  }
  window.BloomAd = { slot: adSlot, stack: adStack, live: liveAds, fail: adFail };

  /* ---------- Favourites page ---------- */
  function renderFavorites() {
    var el = document.querySelector('[data-page="favorites"]');
    var list = Favorites.all().map(salonById).filter(Boolean);
    el.innerHTML =
      '<div class="page-head"><div><h1 class="display">Хадгалсан салонууд</h1></div>' +
      (list.length ? '<span class="badge badge-pink no-dot">' + list.length + " салон</span>" : "") + "</div>" +
      (list.length
        ? '<div class="salon-grid">' + list.map(function (x) { return salonCard(x); }).join("") + "</div>"
        : '<div class="empty"><div class="empty-icon"><i data-lucide="heart"></i></div><h3>Хадгалсан салон алга</h3>' +
          "<p>Таалагдсан салоныхоо зүрхэн тэмдэг дээр дарж хадгалаарай. Дараа нь эндээс хурдан олно.</p>" +
          '<a class="btn btn-primary btn-sm" href="#/salons">Салон хайх</a></div>');
    UI.icons();
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) {
    if (e.detail.id === "home") {
      if (e.detail.params.login && !Session.isLoggedIn()) {
        Session.login();
        UI.toast("Демо хэрэглэгчээр нэвтэрлээ");
      }
      renderHome();
    }
    if (e.detail.id === "favorites") renderFavorites();
  });

  document.addEventListener("click", function (e) {
    var fav = e.target.closest("[data-fav]");
    if (fav) {
      e.preventDefault();
      var id = fav.getAttribute("data-fav");
      var added = Favorites.toggle(id);
      var name = salonById(id).name;
      document.querySelectorAll('[data-fav="' + id + '"]').forEach(function (b) {
        b.setAttribute("aria-pressed", added);
        b.setAttribute("aria-label", (added ? "Хадгалснаас хасах: " : "Хадгалах: ") + name);
        b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
      });
      UI.toast(added ? name + " хадгалагдлаа" : name + " хадгалснаас хасагдлаа", added ? "success" : "info");
      if (!document.querySelector('[data-page="favorites"]').hidden) renderFavorites();
      return;
    }
    var dot = e.target.closest("[data-bad-dot]");
    if (dot) { var bx = dot.closest(".bad"); bx.setAttribute("data-hold", Date.now() + 9000); showAd(bx, +dot.getAttribute("data-bad-dot")); return; }
    var ext = e.target.closest("[data-external]");
    if (ext) {
      e.preventDefault();
      UI.toast("Сурталчилгааны холбоос шинэ цонхонд нээгдэнэ (демо): " + ext.getAttribute("href"), "info");
    }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "hero-search") return;
    e.preventDefault();
    var q = document.getElementById("hero-q").value.trim();
    var d = document.getElementById("hero-d").value;
    var params = [];
    if (q) params.push("q=" + encodeURIComponent(q));
    if (d) params.push("district=" + encodeURIComponent(d));
    location.hash = "#/salons" + (params.length ? "?" + params.join("&") : "");
  });

  window.Bloom = { Favorites: Favorites, money: money, salonById: salonById, salonCard: salonCard, cover: cover, stars: stars,
    favButton: favButton, catName: catName, catIcon: catIcon, esc: esc, priceFrom: priceFrom, discountFor: discountFor, footer: footer, load: load, save: save };
})();
