/* =========================================================
   Bloom client: salon detail page  (#/salon?id=sarnai&branch=…)
   Overview gallery (salon interior) + Instagram-style service
   photo album, both with a lightbox, branch selector (changes prices, services,
   specialists, address, hours, map), selectable services,
   specialists, reviews, hours, location, cancellation rules and
   a sticky "Цаг захиалах" box.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, B = window.Bloom, E = window.Engine;
  var S = null, BR = null, picked = [], galleryIndex = 0;
  var lbList = [], lbMode = "gallery", workCat = "all", workAll = false;

  function likes() { return B.load("bloom-review-likes", {}); }

  /* ---------- Sections ---------- */
  function gallery() {
    var g = S.gallery;
    return (
      '<div class="gallery">' +
        g.slice(0, 5).map(function (src, i) {
          return '<button type="button" class="gallery-item' + (i === 0 ? " is-main" : "") + '" data-gallery="' + i + '" aria-label="Зураг ' + (i + 1) + " / " + g.length + ' томоор харах">' +
            '<div class="cover tone-' + ((S.tone + i) % 7) + '"><i data-lucide="' + B.catIcon(S.cats[i % S.cats.length]) + '"></i>' +
            '<img src="' + src + '" alt="" loading="lazy" onerror="this.remove()"></div>' +
            (i === 0 ? '<span class="gallery-tag"><i data-lucide="store"></i>Салоны орчин</span>' : "") +
            (i === 4 ? '<span class="gallery-more"><i data-lucide="images"></i>Бүх зураг</span>' : "") +
          "</button>";
        }).join("") +
      "</div>"
    );
  }

  function branchPicker() {
    if (S.branches.length < 2) return "";
    return (
      '<div class="branch-picker" role="radiogroup" aria-label="Салбар сонгох">' +
        S.branches.map(function (b) {
          var on = b.id === BR.id;
          return '<button type="button" role="radio" aria-checked="' + on + '" class="branch-opt" data-branch="' + b.id + '">' +
            '<i data-lucide="map-pin"></i><span><b>' + b.name + "</b><small>" + b.address.split(",")[0] + "</small></span></button>";
        }).join("") +
      "</div>"
    );
  }

  function serviceRow(x) {
    var p = E.price(S, BR, x), base = x.price;
    var dh = D.DISCOUNT_HOURS.filter(function (h) { return h.salonId === S.id && h.serviceId === x.id; })[0];
    var on = picked.indexOf(x.id) > -1;
    return (
      '<li class="svc-row' + (on ? " is-picked" : "") + '">' +
        '<div class="svc-info"><b>' + x.name + "</b>" +
          '<div class="svc-meta"><span><i data-lucide="clock"></i>' + x.duration + " мин</span>" +
            (x.deposit ? '<span class="badge badge-info no-dot">Урьдчилгаа ' + B.money(x.deposit) + "</span>" : '<span class="badge badge-success no-dot">Урьдчилгаагүй</span>') +
            (dh ? '<span class="badge badge-pink no-dot"><i data-lucide="timer"></i>' + dh.days + " " + dh.from + "–" + dh.to + " −" + dh.percent + "%</span>" : "") +
            (!x.cancellable ? '<span class="badge badge-warning no-dot">Цуцлах боломжгүй</span>' : "") +
          "</div></div>" +
        '<div class="svc-price"><b>' + B.money(p) + "</b>" + (p !== base ? '<small class="muted">Үндсэн үнэ ' + B.money(base) + "</small>" : "") + "</div>" +
        '<button type="button" class="btn btn-sm ' + (on ? "btn-primary" : "btn-secondary") + ' svc-add" data-pick="' + x.id + '" aria-pressed="' + on + '">' +
          '<i data-lucide="' + (on ? "check" : "plus") + '"></i><span>' + (on ? "Сонгосон" : "Сонгох") + "</span></button>" +
      "</li>"
    );
  }

  function services() {
    var list = E.branchServices(S, BR);
    var missing = S.services.filter(function (x) { return list.indexOf(x) === -1; });
    var cats = [];
    list.forEach(function (x) { if (cats.indexOf(x.cat) === -1) cats.push(x.cat); });
    return (
      '<section class="detail-section" id="sec-services"><div class="section-head"><div><h2>Үйлчилгээ</h2><p>' + BR.name + "-ын үнэ. Нэг дор хэд хэдэн үйлчилгээ сонгож болно.</p></div></div>" +
      cats.map(function (c) {
        return '<div class="svc-group"><h3><i data-lucide="' + B.catIcon(c) + '"></i>' + B.catName(c) + "</h3>" +
          '<ul class="svc-list">' + list.filter(function (x) { return x.cat === c; }).map(serviceRow).join("") + "</ul></div>";
      }).join("") +
      (missing.length ? '<p class="note"><i data-lucide="info"></i>' + missing.map(function (x) { return x.name; }).join(", ") + " үйлчилгээ энэ салбарт байхгүй. Өөр салбар сонгоно уу.</p>" : "") +
      (BR.priceFactor && BR.priceFactor !== 1 ? '<p class="note"><i data-lucide="info"></i>Энэ салбарын үнэ төв салбараас ' + (BR.priceFactor > 1 ? "өндөр" : "хямд") + " байна.</p>" : "") +
      "</section>"
    );
  }

  /* ---------- Service photo album (Instagram-style 3-column grid) ----------
     Real work photos of each service. Only services offered at the
     selected branch are shown; tapping opens the photo with the
     service, price, specialist and a "Цаг захиалах" link.          */
  function workList() {
    var ids = E.branchServices(S, BR).map(function (x) { return x.id; });
    return (S.servicePhotos || []).filter(function (p) { return ids.indexOf(p.serviceId) > -1 && (workCat === "all" || p.cat === workCat); });
  }
  function works() {
    var ids = E.branchServices(S, BR).map(function (x) { return x.id; });
    var all = (S.servicePhotos || []).filter(function (p) { return ids.indexOf(p.serviceId) > -1; });
    if (!all.length) return "";
    var cats = []; all.forEach(function (p) { if (cats.indexOf(p.cat) === -1) cats.push(p.cat); });
    if (cats.indexOf(workCat) === -1) workCat = "all";
    var list = workList(), shown = workAll ? list : list.slice(0, 9);
    return (
      '<section class="detail-section" id="sec-works"><div class="section-head"><div><h2>Үйлчилгээний зураг</h2><p>Ажилчдын хийсэн бодит ажлын зураг. Зураг дээр дарж үнэ, ажилтныг харна.</p></div>' +
        '<span class="work-count"><i data-lucide="grid-3x3"></i>' + all.length + " зураг</span></div>" +
      (cats.length > 1 ? '<div class="chip-row work-chips" role="tablist" aria-label="Ангилал">' +
        [["all", "Бүгд", "layout-grid"]].concat(cats.map(function (c) { return [c, B.catName(c), B.catIcon(c)]; })).map(function (c) {
          return '<button type="button" class="chip' + (workCat === c[0] ? " is-active" : "") + '" role="tab" aria-selected="' + (workCat === c[0]) + '" data-work-cat="' + c[0] + '"><i data-lucide="' + c[2] + '"></i>' + c[1] + "</button>";
        }).join("") + "</div>" : "") +
      '<div class="work-grid">' + shown.map(function (p, i) {
        var x = E.service(S, p.serviceId);
        return '<button type="button" class="work-item" data-work="' + i + '" aria-label="' + B.esc(x.name) + ' зураг томоор харах">' +
          '<div class="cover tone-' + ((S.tone + i) % 7) + '"><i data-lucide="' + B.catIcon(p.cat) + '"></i><img src="' + p.src + '" alt="" loading="lazy" onerror="this.remove()"></div>' +
          '<span class="work-hover"><b>' + B.esc(x.name) + '</b><span><i data-lucide="heart"></i>' + p.likes + "</span></span></button>";
      }).join("") + "</div>" +
      (list.length > 9 ? '<div class="work-more"><button type="button" class="btn btn-secondary btn-sm" data-work-all>' + (workAll ? '<i data-lucide="chevron-up"></i>Хураах' : '<i data-lucide="images"></i>Бүх ' + list.length + " зургийг харах") + "</button></div>" : "") +
      "</section>"
    );
  }
  function redrawWorks() {
    var sec = document.getElementById("sec-works");
    if (sec) { sec.outerHTML = works(); UI.icons(); }
  }

  function staff() {
    var list = S.employees.filter(function (e) { return e.branch === BR.id; });
    return (
      '<section class="detail-section" id="sec-staff"><div class="section-head"><div><h2>Ажилчид</h2><p>' + list.length + " ажилтан " + BR.name + "-д ажилладаг.</p></div></div>" +
      '<div class="staff-row">' +
      list.map(function (e) {
        return '<article class="staff-card">' + UI.avatar(e, "avatar-lg") +
          "<b>" + e.name + '</b><span class="xs muted">' + e.role + "</span>" +
          '<span class="row small">' + B.stars(e.rating) + '<span class="muted">· ' + e.years + " жил</span></span>" +
          '<span class="xs muted">' + e.days.map(function (d) { return E.WEEKDAYS[d].slice(0, 2); }).join(", ") + " · " + e.start + "–" + e.end + "</span>" +
          '<a class="btn btn-secondary btn-sm" href="#/book?id=' + S.id + "&branch=" + BR.id + "&emp=" + e.id + '">Энэ ажилтанд захиалах</a></article>';
      }).join("") +
      "</div></section>"
    );
  }

  /* The signed-in customer's own reviews for this salon (written in "Миний захиалга") */
  function myReviews() {
    var mine = B.load("bloom-my-reviews", {}), u = Session.user(), n = u.name.split(" ");
    return E.myBookings().filter(function (b) { return b.salonId === S.id && mine[b.ref]; }).map(function (b) {
      var r = mine[b.ref];
      return { id: "my-" + b.ref, author: n[0] + " " + (n[1] || "").slice(0, 1) + ".", rating: r.rating, date: r.date, service: b.services.join(", "), text: r.text, likes: 0, mine: true };
    });
  }

  function reviews() {
    var L = likes();
    var total = S.distribution.reduce(function (a, b) { return a + b; }, 0);
    return (
      '<section class="detail-section" id="sec-reviews"><div class="section-head"><div><h2>Сэтгэгдэл</h2><p>Зөвхөн үйлчилгээ авч дууссан үйлчлүүлэгч сэтгэгдэл бичнэ.</p></div></div>' +
      '<div class="review-summary">' +
        '<div class="review-score"><b>' + S.rating.toFixed(1) + "</b>" + '<span class="stars-row">' + starIcons(S.rating) + "</span>" +
          '<span class="xs muted">' + S.reviews + " сэтгэгдэл</span></div>" +
        '<div class="review-bars">' +
          S.distribution.map(function (n, i) {
            var pct = Math.round(n / total * 100);
            return '<div class="bar-row"><span>' + (5 - i) + '</span><i data-lucide="star"></i><div class="bar"><span style="width:' + pct + '%"></span></div><span class="xs muted">' + pct + "%</span></div>";
          }).join("") +
        "</div>" +
      "</div>" +
      '<ul class="review-list">' +
      myReviews().concat(S.reviewList).map(function (r) {
        var liked = !!L[r.id];
        return '<li class="review"><div class="review-head"><span class="avatar">' + r.author.slice(0, 1) + "</span>" +
          "<div><b>" + r.author + '</b><span class="xs muted">' + r.date + " · " + r.service + "</span></div>" +
          '<span class="stars-row small">' + starIcons(r.rating) + "</span></div>" +
          '<p class="review-text">' + r.text + "</p>" +
          '<div class="row-wrap"><span class="badge badge-success no-dot"><i data-lucide="badge-check"></i>Баталгаажсан захиалга</span>' + (r.mine ? '<span class="badge badge-pink no-dot">Таны сэтгэгдэл</span>' : "") +
          '<button type="button" class="like-btn" data-like="' + r.id + '" aria-pressed="' + liked + '"><i data-lucide="thumbs-up"></i>Тустай · <b>' + (r.likes + (liked ? 1 : 0)) + "</b></button></div></li>";
      }).join("") +
      "</ul>" +
      '<p class="note"><i data-lucide="message-square-heart"></i>Та энд үйлчилгээ авсан бол "Миний захиалга" хэсгээс дууссан захиалга бүрт нэг удаа сэтгэгдэл үлдээнэ.</p>' +
      "</section>"
    );
  }
  function starIcons(r) {
    var h = "";
    for (var i = 1; i <= 5; i++) h += '<i data-lucide="star" class="' + (i <= Math.round(r) ? "on" : "") + '"></i>';
    return h;
  }

  function info() {
    var rows = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
      var closed = BR.closed.indexOf(d) > -1, isToday = new Date().getDay() === d;
      return '<tr' + (isToday ? ' class="is-today"' : "") + "><td>" + E.WEEKDAYS[d] + (isToday ? " (өнөөдөр)" : "") + "</td><td>" + (closed ? '<span class="muted">Амарна</span>' : BR.open + "–" + BR.close) + "</td></tr>";
    }).join("");
    var q = encodeURIComponent(BR.address + ", Улаанбаатар");
    var cancelList = E.branchServices(S, BR);
    return (
      '<section class="detail-section info-grid" id="sec-info">' +
        '<div><h2 class="h-sm">Ажлын цаг</h2><table class="hours"><tbody>' + rows + "</tbody></table></div>" +
        '<div><h2 class="h-sm">Байршил</h2>' +
          '<div class="mini-map" aria-hidden="true"><svg viewBox="0 0 100 60" preserveAspectRatio="none"><rect class="m-land" width="100" height="60"/><path class="m-road big" d="M0 30 L100 28"/><path class="m-road" d="M50 0 L52 60"/><path class="m-road" d="M20 0 L24 60"/><path class="m-road" d="M78 0 L80 60"/><path class="m-river" d="M0 54 C30 48 60 60 100 50"/></svg>' +
          '<span class="mini-pin"><i data-lucide="map-pin"></i></span><span class="map-badge"><i data-lucide="info"></i>Жишээ байршил</span></div>' +
          '<p class="small"><b>' + BR.name + "</b><br>" + BR.address + "</p>" +
          '<div class="row-wrap"><a class="btn btn-secondary btn-sm" href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Google Maps-д нээх</a>' +
          '<a class="btn btn-ghost btn-sm" href="tel:' + BR.phone.replace(/-/g, "") + '"><i data-lucide="phone"></i>' + BR.phone + "</a></div>" +
          '<p class="xs muted">Зохиомол демо хаяг тул Google Maps дээр бодит салон гарахгүй байж болно.</p></div>' +
        '<div class="span-2"><h2 class="h-sm">Цуцлах нөхцөл</h2><ul class="cancel-list">' +
          cancelList.map(function (x) {
            return "<li><span>" + x.name + "</span>" + (x.cancellable ? '<span class="badge badge-success no-dot">' + x.cancelHours + " цагийн өмнө цуцлах боломжтой</span>" : '<span class="badge badge-warning no-dot">Цуцлах боломжгүй</span>') + "</li>";
          }).join("") +
          '</ul><p class="xs muted">Урьдчилгаа автоматаар буцаагдахгүй. Цуцлалт, буцаалтыг салон тус бүр шийднэ.</p></div>' +
      "</section>"
    );
  }

  /* ---------- Booking box (sidebar on desktop, bottom bar on phone) ---------- */
  function bookBox() {
    var t = picked.length ? E.totals(S, BR, picked, null, null, null) : null;
    var href = "#/book?id=" + S.id + "&branch=" + BR.id + (picked.length ? "&services=" + picked.join(",") : "");
    return (
      '<div class="book-box-inner">' +
        (t
          ? '<p class="xs muted">' + picked.length + " үйлчилгээ · " + t.duration + " мин</p>" +
            '<ul class="picked-list">' + t.lines.map(function (l) { return "<li><span>" + l.service.name + "</span><b>" + B.money(l.price) + "</b></li>"; }).join("") + "</ul>" +
            '<div class="box-total"><span>Нийт</span><b>' + B.money(t.subtotal) + "</b></div>" +
            (t.deposit ? '<p class="xs muted">Урьдчилгаа ' + B.money(t.deposit) + ", үлдэгдлийг салонд төлнө.</p>" : '<p class="xs muted">Урьдчилгаа шаардлагагүй.</p>')
          : '<p class="small"><b>Үйлчилгээ сонгоогүй байна</b></p><p class="xs muted">Доорх жагсаалтаас сонгох эсвэл шууд захиалах хуудсанд сонгоно уу.</p>') +
        '<a class="btn btn-primary btn-block" href="' + href + '"><i data-lucide="calendar-check"></i>Цаг захиалах</a>' +
      "</div>"
    );
  }
  function mobileBar() {
    var t = picked.length ? E.totals(S, BR, picked, null, null, null) : null;
    var href = "#/book?id=" + S.id + "&branch=" + BR.id + (picked.length ? "&services=" + picked.join(",") : "");
    return '<div class="mobile-book-bar"><div>' +
      (t ? '<b>' + B.money(t.subtotal) + '</b><span class="xs muted">' + picked.length + " үйлчилгээ · " + t.duration + " мин</span>"
         : '<b>' + B.money(B.priceFrom(S)) + '-өөс</b><span class="xs muted">Үйлчилгээ сонгоогүй</span>') +
      '</div><a class="btn btn-primary" href="' + href + '">Цаг захиалах</a></div>';
  }
  function refreshBox() {
    var box = document.getElementById("book-box"); if (box) box.innerHTML = bookBox();
    var bar = document.getElementById("mobile-bar"); if (bar) bar.innerHTML = mobileBar();
    UI.icons();
  }

  /* ---------- Page ---------- */
  function render(params) {
    var el = document.querySelector('[data-page="salon"]');
    S = E.salon(params.id);
    if (!S) {
      el.innerHTML = '<div class="empty"><div class="empty-icon"><i data-lucide="store"></i></div><h3>Салон олдсонгүй</h3><p>Холбоос буруу эсвэл салон идэвхгүй болсон байна.</p><a class="btn btn-primary btn-sm" href="#/salons">Салон хайх</a></div>';
      UI.icons(); return;
    }
    if (!BR || BR.id !== params.branch || !S.branches.some(function (b) { return b === BR; })) BR = E.branch(S, params.branch);
    if (params.id !== render.last) { picked = []; workCat = "all"; workAll = false; render.last = params.id; }
    picked = picked.filter(function (id) { return BR.excludes.indexOf(id) === -1; });
    var dh = B.discountFor(S.id);
    var a = E.nextFree(S, BR, [S.services[0].id], S.services[0].duration);

    el.innerHTML =
      '<nav class="crumbs" aria-label="Зам"><a href="#/salons"><i data-lucide="arrow-left"></i>Үйлчилгээ</a><span>/</span><span>' + B.esc(S.name) + "</span></nav>" +
      gallery() +
      '<div class="detail-layout">' +
        '<div class="detail-main">' +
          '<header class="detail-head">' +
            '<div class="detail-title"><h1 class="display">' + B.esc(S.name) + "</h1>" + B.favButton(S) + "</div>" +
            '<p class="detail-sub">' + S.tagline + "</p>" +
            '<div class="row-wrap small">' + B.stars(S.rating) + '<a href="#sec-reviews" data-jump="sec-reviews">' + S.reviews + " сэтгэгдэл</a>" +
              '<span class="muted"><i data-lucide="map-pin" class="icon-sm"></i> ' + S.district + " дүүрэг</span>" +
              (a ? '<span class="badge badge-success no-dot">' + (a.offset === 0 ? "Өнөөдөр сул цагтай" : "Дараагийн сул цаг " + E.shortDate(a.date)) + "</span>" : "") +
              (dh ? '<span class="badge badge-pink no-dot"><i data-lucide="timer"></i>Хямдралтай цаг −' + dh.percent + "%</span>" : "") +
              '<button type="button" class="link-btn" data-share><i data-lucide="share-2" class="icon-sm"></i> Хуваалцах</button>' +
            "</div>" +
            '<p class="detail-desc">' + S.description + "</p>" +
          "</header>" +
          (S.branches.length > 1 ? '<section class="detail-section"><h2 class="h-sm">Салбар сонгох</h2>' + branchPicker() + '<p class="xs muted">Салбар солиход үнэ, үйлчилгээ, ажилтан, хаяг, ажлын цаг өөрчлөгдөнө.</p></section>' : "") +
          '<div class="detail-tabs" role="navigation" aria-label="Хэсгүүд">' +
            '<a href="#sec-services" data-jump="sec-services">Үйлчилгээ</a><a href="#sec-works" data-jump="sec-works">Зураг</a><a href="#sec-staff" data-jump="sec-staff">Ажилчид</a>' +
            '<a href="#sec-reviews" data-jump="sec-reviews">Сэтгэгдэл</a><a href="#sec-info" data-jump="sec-info">Цаг, байршил</a></div>' +
          services() + works() + staff() + reviews() + info() +
          BloomAd.slot("salon", { host: "detail-ad-main" }) +
        "</div>" +
        /* Side column: booking box, then the 300×250 ad right below it (desktop) */
        '<div class="detail-side">' +
          '<aside class="book-box" id="book-box" aria-label="Захиалгын товч">' + bookBox() + "</aside>" +
          BloomAd.slot("salon", { host: "detail-ad-side" }) +
        "</div>" +
      "</div>" +
      '<div id="mobile-bar">' + mobileBar() + "</div>" +
      B.footer();
    UI.icons();
  }

  /* ---------- Lightbox ---------- */
  function ensureLightbox() {
    if (document.getElementById("lightbox")) return;
    var ov = document.createElement("div");
    ov.className = "overlay lightbox"; ov.id = "lightbox"; ov.setAttribute("aria-hidden", "true");
    ov.innerHTML = '<div class="modal lightbox-modal" role="dialog" aria-modal="true" aria-label="Зургийн цомог">' +
      '<button class="icon-btn lightbox-close" type="button" data-close-modal aria-label="Хаах"><i data-lucide="x"></i></button>' +
      '<div class="lightbox-stage" id="lightbox-stage"></div>' +
      '<div class="lightbox-nav"><button class="icon-btn" type="button" data-lb="-1" aria-label="Өмнөх зураг"><i data-lucide="chevron-left"></i></button>' +
      '<span id="lightbox-count" class="small"></span><button class="icon-btn" type="button" data-lb="1" aria-label="Дараах зураг"><i data-lucide="chevron-right"></i></button></div></div>';
    document.body.appendChild(ov);
  }
  function showImage(i) {
    var g = lbList; galleryIndex = (i + g.length) % g.length;
    var stage = document.getElementById("lightbox-stage"), p = g[galleryIndex];
    if (lbMode === "gallery") {
      stage.innerHTML = '<div class="cover tone-' + ((S.tone + galleryIndex) % 7) + '"><i data-lucide="image"></i><img src="' + p + '" alt="' + B.esc(S.name) + " зураг " + (galleryIndex + 1) + '" onerror="this.remove()"></div>';
    } else {
      var x = E.service(S, p.serviceId), emp = S.employees.filter(function (e) { return e.id === p.employeeId; })[0];
      stage.innerHTML = '<div class="work-view"><div class="cover tone-' + ((S.tone + galleryIndex) % 7) + '"><i data-lucide="' + B.catIcon(p.cat) + '"></i><img src="' + p.src + '" alt="' + B.esc(x.name) + '" onerror="this.remove()"></div>' +
        '<div class="work-info"><span class="badge badge-pink no-dot"><i data-lucide="' + B.catIcon(p.cat) + '"></i>' + B.catName(p.cat) + "</span>" +
          "<h3>" + B.esc(x.name) + '</h3><p class="row small"><b>' + B.money(E.price(S, BR, x)) + '</b><span class="muted">· ' + x.duration + " мин</span></p>" +
          (emp ? '<p class="work-by">' + UI.avatar(emp) + "<span><b>" + emp.name + '</b><span class="xs muted">' + emp.role + "</span></span></p>" : "") +
          '<p class="work-likes"><i data-lucide="heart"></i>' + p.likes + " хүнд таалагдсан</p>" +
          '<a class="btn btn-primary btn-block" href="#/book?id=' + S.id + "&branch=" + BR.id + "&service=" + x.id + (emp ? "&emp=" + emp.id : "") + '" data-close-modal><i data-lucide="calendar-plus"></i>Цаг захиалах</a></div></div>';
    }
    document.getElementById("lightbox-count").textContent = (galleryIndex + 1) + " / " + g.length;
    UI.icons();
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) { if (e.detail.id === "salon") render(e.detail.params); });

  document.addEventListener("click", function (e) {
    var page = document.querySelector('[data-page="salon"]');
    if (page.hidden && !e.target.closest("#lightbox")) return;
    var t;
    if ((t = e.target.closest("[data-gallery]"))) { ensureLightbox(); lbMode = "gallery"; lbList = S.gallery; showImage(+t.dataset.gallery); UI.openModal("lightbox"); return; }
    if ((t = e.target.closest("[data-work]"))) { ensureLightbox(); lbMode = "work"; lbList = workList(); showImage(+t.dataset.work); UI.openModal("lightbox"); return; }
    if ((t = e.target.closest("[data-work-cat]"))) { workCat = t.dataset.workCat; workAll = false; redrawWorks(); return; }
    if (e.target.closest("[data-work-all]")) { workAll = !workAll; redrawWorks(); return; }
    if ((t = e.target.closest("[data-lb]"))) { showImage(galleryIndex + +t.dataset.lb); return; }
    if ((t = e.target.closest("[data-branch]")) && page.contains(t)) {
      BR = E.branch(S, t.dataset.branch);
      var before = picked.length;
      history.replaceState(null, "", "#/salon?id=" + S.id + "&branch=" + BR.id);
      render({ id: S.id, branch: BR.id });
      UI.toast(BR.name + " сонгогдлоо" + (picked.length < before ? ". Энэ салбарт байхгүй үйлчилгээг хаслаа." : ""), "info");
      return;
    }
    if ((t = e.target.closest("[data-pick]"))) {
      var id = t.dataset.pick, i = picked.indexOf(id);
      if (i > -1) picked.splice(i, 1); else picked.push(id);
      var row = t.closest(".svc-row");
      row.outerHTML = serviceRow(E.service(S, id));
      refreshBox(); return;
    }
    if ((t = e.target.closest("[data-like]"))) {
      var L = likes(); L[t.dataset.like] = !L[t.dataset.like]; B.save("bloom-review-likes", L);
      var r = myReviews().concat(S.reviewList).filter(function (x) { return x.id === t.dataset.like; })[0];
      t.setAttribute("aria-pressed", !!L[r.id]);
      t.querySelector("b").textContent = r.likes + (L[r.id] ? 1 : 0);
      return;
    }
    if ((t = e.target.closest("[data-jump]"))) {
      e.preventDefault();
      var sec = document.getElementById(t.dataset.jump);
      if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
      return;
    }
    if (e.target.closest("[data-share]")) {
      var url = location.href;
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(function () {});
      UI.toast("Салоны холбоос хуулагдлаа", "success");
    }
  });

  document.addEventListener("keydown", function (e) {
    var lb = document.getElementById("lightbox");
    if (!lb || !lb.classList.contains("is-open")) return;
    if (e.key === "ArrowRight") showImage(galleryIndex + 1);
    if (e.key === "ArrowLeft") showImage(galleryIndex - 1);
  });
})();
