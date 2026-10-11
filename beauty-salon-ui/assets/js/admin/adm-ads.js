/* =========================================================
   Bloom platform admin: advertisements (10.6, FR-37, FR-38)
   The admin creates every ad; advertisers have no accounts.
   Active ads within their dates appear in the client app.
   ========================================================= */
(function () {
  var st = { filter: "all" };
  var PLACES = { home: "Нүүр хуудасны баннер", search: "Салон хайлтын жагсаалт" };
  var ICONS = [["sparkles", "Гялбаа"], ["ticket-percent", "Хөнгөлөлт"], ["droplets", "Арьс арчилгаа"], ["gem", "Үнэт эдлэл"], ["scissors", "Үс засалт"], ["palette", "Будалт"], ["snowflake", "Өвөл"], ["gift", "Бэлэг"]];

  function state(a) {
    var t = BIZ.day(0);
    if (!a.active) return ["inactive", "Идэвхгүй", "info"];
    if (a.end < t) return ["ended", "Дууссан", "danger"];
    if (a.start > t) return ["scheduled", "Төлөвлөгдсөн", "warning"];
    return ["live", "Цацагдаж буй", "success"];
  }

  function render() {
    var el = BZ.el("ads"), ads = ADM.state.ads;
    var n = function (k) { return ads.filter(function (a) { return k === "all" || state(a)[0] === k; }).length; };
    var list = ads.filter(function (a) { return st.filter === "all" || state(a)[0] === st.filter; });
    var imp = ads.reduce(function (s, a) { return s + a.impressions; }, 0), clicks = ads.reduce(function (s, a) { return s + a.clicks; }, 0);
    el.innerHTML =
      '<div class="page-head"><div><h2>Сурталчилгаа</h2><p>Платформ дээр байршуулах зар. Сурталчлагч өөрийн бүртгэлгүй, зарыг зөвхөн админ оруулна.</p></div>' +
        '<button type="button" class="btn btn-primary" data-ad-edit=""><i data-lucide="plus"></i>Шинэ зар</button></div>' +
      '<div class="kpi-grid">' +
        AD.kpi("Цацагдаж буй", n("live"), "Яг одоо харагдаж буй") + AD.kpi("Төлөвлөгдсөн", n("scheduled"), "Эхлэх огноо болоогүй") +
        AD.kpi("Нийт үзэлт", imp.toLocaleString("en-US"), "Демо тоо") + AD.kpi("Нийт даралт", clicks.toLocaleString("en-US"), imp ? "CTR " + (clicks / imp * 100).toFixed(1) + "%" : "—") +
      "</div>" +
      '<div class="list-filters"><div class="chips" role="group" aria-label="Төлөв">' + [["all", "Бүгд"], ["live", "Цацагдаж буй"], ["scheduled", "Төлөвлөгдсөн"], ["ended", "Дууссан"], ["inactive", "Идэвхгүй"]].map(function (f) {
        return '<button type="button" class="chip" data-adf="' + f[0] + '" aria-pressed="' + (st.filter === f[0]) + '">' + f[1] + ' <span class="chip-count">' + n(f[0]) + "</span></button>";
      }).join("") + "</div></div>" +
      (list.length ? '<div class="ad-grid">' + list.map(card).join("") + "</div>" : BZ.empty("megaphone", "Зар олдсонгүй", "Шүүлтүүрээ өөрчлөх эсвэл шинэ зар нэмнэ үү."));
  }

  function card(a) {
    var s = state(a);
    return '<article class="card ad-card">' + preview(a, true) +
      '<div class="ad-card-body"><div class="ad-card-top"><b>' + BZ.esc(a.title) + '</b><span class="badge badge-' + s[2] + '">' + s[1] + "</span></div>" +
        '<ul class="meta-list"><li><i data-lucide="layout-template"></i>' + PLACES[a.placement] + "</li>" +
          '<li><i data-lucide="calendar-range"></i>' + a.start + " – " + a.end + "</li>" +
          '<li><i data-lucide="link"></i><span class="ad-url">' + BZ.esc(a.url) + "</span></li>" +
          '<li><i data-lucide="mouse-pointer-click"></i>' + a.impressions.toLocaleString("en-US") + " үзэлт · " + a.clicks + " даралт" + (a.impressions ? " · CTR " + (a.clicks / a.impressions * 100).toFixed(1) + "%" : "") + "</li></ul>" +
        '<div class="ad-card-foot">' + BZ.sw("ad-on-" + a.id, a.active, "Идэвхтэй").replace("<input", '<input data-ad-toggle="' + a.id + '"') +
          '<button type="button" class="btn btn-secondary btn-sm" data-ad-edit="' + a.id + '"><i data-lucide="pencil"></i>Засах</button></div></div></article>';
  }

  /* Same look as the banner on the client home page */
  function preview(a, small) {
    var visual = a.image ? '<span class="adp-img"><img src="' + a.image + '" alt=""></span>' : '<span class="adp-icon"><i data-lucide="' + (a.icon || "sparkles") + '"></i></span>';
    return '<div class="adp' + (small ? " is-small" : "") + '"><span class="adp-label">Сурталчилгаа</span>' + visual +
      '<span class="adp-text"><b>' + BZ.esc(a.title || "Зарын гарчиг") + "</b><span>" + BZ.esc(a.text || "Зарын тайлбар энд харагдана.") + "</span><small>" + BZ.esc(a.sponsor || "Сурталчлагч") + "</small></span>" +
      '<span class="btn btn-secondary btn-sm adp-cta">' + BZ.esc(a.cta || "Дэлгэрэнгүй") + '<i data-lucide="arrow-up-right"></i></span></div>';
  }

  function edit(id) {
    var src = id ? ADM.state.ads.filter(function (a) { return a.id === id; })[0] : null;
    var a = src ? JSON.parse(JSON.stringify(src)) : { title: "", text: "", cta: "Дэлгэрэнгүй", url: "", icon: "sparkles", sponsor: "", image: "", placement: "home", start: BIZ.day(0), end: BIZ.day(30), active: true, impressions: 0, clicks: 0 };
    var body =
      '<div class="ad-editor"><div class="ad-form">' +
        '<div class="field"><span class="label-like">Зураг</span><div class="ad-img-pick">' + BZ.img(a.image, "Зарын зураг", "ad-img") +
          '<div><label class="btn btn-secondary btn-sm"><i data-lucide="upload"></i>Зураг сонгох<input type="file" accept="image/*" id="ad-file" hidden></label>' +
          '<button type="button" class="btn btn-ghost btn-sm" id="ad-img-del"' + (a.image ? "" : " hidden") + '>Устгах</button><span class="hint">JPG, PNG · 2.5MB хүртэл. Зураггүй бол дүрс тэмдэг харагдана.</span></div></div></div>' +
        BZ.field("ad-icon", "Дүрс тэмдэг", BZ.select("ad-icon", ICONS, a.icon), "Зураг оруулаагүй үед") +
        BZ.field("ad-title", "Гарчиг", BZ.input("ad-title", a.title, "text", 'maxlength="60"'), "60 тэмдэгт хүртэл", true) +
        BZ.field("ad-text", "Тайлбар", '<textarea class="textarea" id="ad-text" maxlength="140" rows="2">' + BZ.esc(a.text) + "</textarea>", "140 тэмдэгт хүртэл", true) +
        '<div class="form-grid">' +
          BZ.field("ad-cta", "Товчны бичвэр", BZ.input("ad-cta", a.cta, "text", 'maxlength="20"'), "", true) +
          BZ.field("ad-sponsor", "Сурталчлагч", BZ.input("ad-sponsor", a.sponsor, "text", 'maxlength="40"'), "Байгууллагын нэр", true) +
        "</div>" +
        BZ.field("ad-url", "Холбоос", BZ.input("ad-url", a.url, "url", 'placeholder="https://… эсвэл #/salons"'), "Гадаад холбоос (https://) эсвэл апп доторх хуудас (#/…)", true) +
        BZ.field("ad-place", "Байршил", BZ.select("ad-place", Object.keys(PLACES).map(function (k) { return [k, PLACES[k]]; }), a.placement), "", true) +
        '<div class="form-grid">' +
          BZ.field("ad-start", "Эхлэх огноо", BZ.input("ad-start", a.start, "date"), "", true) +
          BZ.field("ad-end", "Дуусах огноо", BZ.input("ad-end", a.end, "date"), "", true) +
        "</div>" +
        '<div class="field">' + BZ.sw("ad-active", a.active, "Идэвхтэй") + '<span class="hint">Идэвхгүй зар огнооноос үл хамааран харагдахгүй.</span></div>' +
      "</div>" +
      '<div class="ad-side"><span class="label-like">Урьдчилан харах</span><div id="ad-prev">' + preview(a) + '</div><p class="xs muted" id="ad-prev-note"></p></div></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="ad-save"><i data-lucide="check"></i>' + (src ? "Хадгалах" : "Нэмэх") + "</button></div>";
    var m = BZ.modal("ad-modal", src ? "Зар засах" : "Шинэ зар", body, { size: "modal-xl", sub: src ? a.id.toUpperCase() : "Хэрэглэгчдэд харагдах сурталчилгаа" });

    function read() {
      a.title = BZ.val("ad-title"); a.text = BZ.val("ad-text"); a.cta = BZ.val("ad-cta"); a.sponsor = BZ.val("ad-sponsor"); a.url = BZ.val("ad-url");
      a.icon = BZ.val("ad-icon"); a.placement = BZ.val("ad-place"); a.start = BZ.val("ad-start"); a.end = BZ.val("ad-end"); a.active = BZ.val("ad-active");
    }
    function update() {
      read();
      m.querySelector("#ad-prev").innerHTML = preview(a); UI.icons();
      var s = state(a);
      m.querySelector("#ad-prev-note").textContent = PLACES[a.placement] + " · " + (s[0] === "live" ? "Хадгалмагц харагдана" : s[0] === "scheduled" ? a.start + "-нээс харагдана" : s[0] === "ended" ? "Хугацаа дууссан тул харагдахгүй" : "Идэвхгүй тул харагдахгүй");
    }
    m.addEventListener("input", update); m.addEventListener("change", update); update();
    m.querySelector("#ad-file").addEventListener("change", function (e) {
      BZ.readImage(e.target.files[0], function (raw) { shrink(raw, function (data) {
        a.image = data; m.querySelector(".ad-img").outerHTML = BZ.img(data, "Зарын зураг", "ad-img"); m.querySelector("#ad-img-del").hidden = false; update();
      }); });
    });
    m.querySelector("#ad-img-del").addEventListener("click", function () {
      a.image = ""; m.querySelector(".ad-img").outerHTML = BZ.img("", "", "ad-img"); this.hidden = true; m.querySelector("#ad-file").value = ""; update();
    });
    m.querySelector("#ad-save").addEventListener("click", function () {
      read();
      var ok = BZ.setErr("ad-title", a.title.length >= 3 ? "" : "Гарчиг оруулна уу");
      ok = BZ.setErr("ad-text", a.text.length >= 5 ? "" : "Тайлбар оруулна уу") && ok;
      ok = BZ.setErr("ad-cta", a.cta ? "" : "Товчны бичвэр оруулна уу") && ok;
      ok = BZ.setErr("ad-sponsor", a.sponsor ? "" : "Сурталчлагчийн нэр оруулна уу") && ok;
      ok = BZ.setErr("ad-url", !a.url ? "Холбоос оруулна уу" : /^https?:\/\/[^\s.]+\.[^\s]+$/.test(a.url) || /^#\/[a-z]/.test(a.url) ? "" : "https:// эсвэл #/ -ээр эхэлсэн зөв холбоос оруулна уу") && ok;
      ok = BZ.setErr("ad-start", a.start ? "" : "Огноо сонгоно уу") && ok;
      ok = BZ.setErr("ad-end", !a.end ? "Огноо сонгоно уу" : a.end < a.start ? "Дуусах огноо эхлэхээс хойш байх ёстой" : "") && ok;
      if (!ok) { BZ.firstError(); return; }
      if (src) { for (var k in a) src[k] = a[k]; ADM.log("megaphone", "“" + a.title + "” зарыг шинэчиллээ"); }
      else { a.id = BZ.uid("ad"); ADM.state.ads.unshift(a); ADM.log("megaphone", "“" + a.title + "” шинэ зар нэмлээ"); }
      ADM.save(); UI.closeModal("ad-modal"); UI.toast(src ? "Зар хадгалагдлаа" : "Зар нэмэгдлээ", "success"); BZ.refresh();
    });
  }

  /* Keep stored banners small (the demo saves them in localStorage) */
  function shrink(src, cb) {
    var im = new Image();
    im.onload = function () {
      var k = Math.min(1, 720 / im.width), c = document.createElement("canvas");
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.82));
    };
    im.onerror = function () { UI.toast("Зургийг уншиж чадсангүй", "error"); };
    im.src = src;
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-adf]"))) { st.filter = t.dataset.adf; BZ.refresh(); }
    else if ((t = e.target.closest("[data-ad-edit]"))) edit(t.dataset.adEdit);
  });
  document.addEventListener("change", function (e) {
    var id = e.target.dataset && e.target.dataset.adToggle; if (!id) return;
    var a = ADM.state.ads.filter(function (x) { return x.id === id; })[0];
    a.active = e.target.checked; ADM.log(a.active ? "play" : "pause", "“" + a.title + "” зарыг " + (a.active ? "идэвхжүүллээ" : "идэвхгүй болголоо"));
    UI.toast("Зар " + (a.active ? "идэвхжлээ" : "идэвхгүй боллоо"), a.active ? "success" : "info"); BZ.refresh();
  });

  BZ.page("ads", render);
})();
