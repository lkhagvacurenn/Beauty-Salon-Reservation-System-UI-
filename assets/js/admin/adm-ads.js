/* =========================================================
   Bloom platform admin: advertisements (10.6, FR-37, FR-38)
   The admin creates every ad; advertisers have no accounts.
   An ad is only an IMAGE + a LINK in one of three fixed
   placements (BLOOM_DATA.AD_SLOTS). The advertiser sends the
   image in the slot's size; a different ratio is fitted
   (contain), never cropped. Active ads within their dates
   appear in the client app.
   ========================================================= */
(function () {
  var st = { filter: "all" };
  var SLOTS = BLOOM_DATA.AD_SLOTS;
  var ORDER = ["home", "search", "salon"];

  function size(k) { var s = SLOTS[k]; return s.w + "×" + s.h + " px · " + s.ratio; }
  function short(k) { return { home: "Нүүр", search: "Хайлт", salon: "Салон" }[k] || k; }
  function src(img) { return /^(data:|blob:|https?:)/.test(img) ? img : (UI.BASE || "") + img; }
  function host(url) {
    if (!url) return "—";
    if (url.charAt(0) === "#") return "Bloom " + url;
    var m = /^https?:\/\/([^\/?#]+)/.exec(url); return m ? m[1] : url;
  }
  /* Admin-only label: the advertiser note, or the link's host */
  function label(a) { return a.client || host(a.url); }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function ratioText(w, h) {
    var g = gcd(w, h), rw = w / g, rh = h / g;
    return rw <= 32 && rh <= 32 ? rw + ":" + rh : (w / h).toFixed(2).replace(/\.?0+$/, "") + ":1";
  }

  function state(a) {
    var t = BIZ.day(0);
    if (!a.active) return ["inactive", "Идэвхгүй", "info"];
    if (a.end < t) return ["ended", "Дууссан", "danger"];
    if (a.start > t) return ["scheduled", "Төлөвлөгдсөн", "warning"];
    return ["live", "Цацагдаж буй", "success"];
  }

  /* The ad as the client sees it: slot-ratio frame, image fitted */
  function frame(a, place, cls) {
    var s = SLOTS[place] || SLOTS.home;
    return '<div class="adm-frame ' + (cls || "") + '" style="aspect-ratio:' + s.w + " / " + s.h + ";--fw:" + s.w + ";--fh:" + s.h + '">' +
      (a.image ? '<img src="' + BZ.esc(src(a.image)) + '" alt="Сурталчилгаа" onerror="this.hidden=true">' : '<span class="adm-frame-empty"><i data-lucide="image"></i>' + s.w + "×" + s.h + "</span>") +
      '<span class="adm-frame-label">Зар</span></div>';
  }

  function render() {
    var el = BZ.el("ads"), ads = ADM.state.ads;
    var n = function (k) { return ads.filter(function (a) { return k === "all" || state(a)[0] === k; }).length; };
    var list = ads.filter(function (a) { return st.filter === "all" || state(a)[0] === st.filter; });
    var imp = ads.reduce(function (s, a) { return s + (a.impressions || 0); }, 0), clicks = ads.reduce(function (s, a) { return s + (a.clicks || 0); }, 0);
    el.innerHTML =
      '<div class="page-head"><div><h2>Сурталчилгаа</h2><p>Зар нь зөвхөн зураг ба холбоосоос бүрдэнэ. Зураг дээр дарахад сурталчлагчийн хуудас нээгдэнэ. Зарыг зөвхөн админ оруулна.</p></div>' +
        '<button type="button" class="btn btn-primary" data-ad-edit=""><i data-lucide="plus"></i>Шинэ зар</button></div>' +
      '<section class="card ad-slots" aria-labelledby="ad-slots-h"><h3 id="ad-slots-h"><i data-lucide="layout-template"></i>Байршлууд</h3>' +
        '<p class="xs muted">Сурталчлагч зургаа яг энэ хэмжээ, харьцаагаар илгээнэ. Харьцаа зөрвөл зураг тайрагдахгүй, бүтнээрээ багтаж харагдана.</p>' +
        '<ul class="ad-slot-list">' + ORDER.map(function (k) {
          var s = SLOTS[k], live = ads.filter(function (a) { return a.placement === k && state(a)[0] === "live"; }).length;
          return '<li><span class="ad-slot-shape" style="aspect-ratio:' + s.w + " / " + s.h + '"></span><div><b>' + BZ.esc(s.name) + "</b>" +
            '<span class="badge badge-pink no-dot">' + s.w + "×" + s.h + " px · " + s.ratio + "</span>" +
            '<span class="xs muted">' + BZ.esc(s.where) + " · " + live + " цацагдаж буй</span></div></li>";
        }).join("") + "</ul></section>" +
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
    var s = state(a), slot = SLOTS[a.placement] || SLOTS.home;
    return '<article class="card ad-card"><div class="ad-thumb">' + frame(a, a.placement) + "</div>" +
      '<div class="ad-card-body"><div class="ad-card-top"><div class="ad-card-name"><b>' + BZ.esc(label(a)) + "</b>" +
          '<span class="badge badge-pink no-dot">' + short(a.placement) + " · " + slot.w + "×" + slot.h + "</span></div>" +
          '<span class="badge badge-' + s[2] + '">' + s[1] + "</span></div>" +
        '<ul class="meta-list"><li><i data-lucide="layout-template"></i>' + BZ.esc(slot.name) + "</li>" +
          '<li><i data-lucide="calendar-range"></i>' + a.start + " – " + a.end + "</li>" +
          '<li><i data-lucide="link"></i><span class="ad-url">' + BZ.esc(a.url) + "</span></li>" +
          '<li><i data-lucide="mouse-pointer-click"></i>' + (a.impressions || 0).toLocaleString("en-US") + " үзэлт · " + (a.clicks || 0) + " даралт" + (a.impressions ? " · CTR " + (a.clicks / a.impressions * 100).toFixed(1) + "%" : "") + "</li></ul>" +
        '<div class="ad-card-foot">' + BZ.sw("ad-on-" + a.id, a.active, "Идэвхтэй").replace("<input", '<input data-ad-toggle="' + a.id + '"') +
          '<button type="button" class="btn btn-secondary btn-sm" data-ad-edit="' + a.id + '"><i data-lucide="pencil"></i>Засах</button></div></div></article>';
  }

  function edit(id) {
    var src0 = id ? ADM.state.ads.filter(function (a) { return a.id === id; })[0] : null;
    var a = src0 ? JSON.parse(JSON.stringify(src0)) : { client: "", image: "", url: "", placement: "home", start: BIZ.day(0), end: BIZ.day(30), active: true, impressions: 0, clicks: 0 };
    var dims = null; /* natural size of the current image */
    var body =
      '<div class="ad-editor"><div class="ad-form">' +
        '<div class="field" data-f="ad-file"><label for="ad-file">Зураг <span class="req">*</span></label><div class="ad-img-pick">' +
          '<label class="btn btn-secondary btn-sm"><i data-lucide="upload"></i><span id="ad-file-btn">' + (a.image ? "Зураг солих" : "Зураг сонгох") + '</span><input type="file" accept="image/*" id="ad-file" class="sr-only"></label>' +
          '<span class="ad-size-pill" id="ad-size-pill"></span></div>' +
          '<span class="hint" id="ad-file-hint"></span><span class="error-text"></span></div>' +
        BZ.field("ad-url", "Холбоос", BZ.input("ad-url", a.url, "url", 'placeholder="https://… эсвэл #/salons"'), "Зураг дээр дарахад нээгдэнэ: гадаад холбоос (https://) эсвэл апп доторх хуудас (#/…)", true) +
        BZ.field("ad-place", "Байршил", BZ.select("ad-place", ORDER.map(function (k) { return [k, SLOTS[k].name + " · " + SLOTS[k].w + "×" + SLOTS[k].h + " (" + SLOTS[k].ratio + ")"]; }), a.placement), "", true) +
        '<p class="ad-place-hint" id="ad-place-hint"></p>' +
        '<div class="form-grid">' +
          BZ.field("ad-start", "Эхлэх огноо", BZ.input("ad-start", a.start, "date"), "", true) +
          BZ.field("ad-end", "Дуусах огноо", BZ.input("ad-end", a.end, "date"), "", true) +
        "</div>" +
        '<div class="field">' + BZ.sw("ad-active", a.active, "Идэвхтэй") + '<span class="hint">Идэвхгүй зар огнооноос үл хамааран харагдахгүй.</span></div>' +
        BZ.field("ad-client", "Захиалагч (дотоод тэмдэглэл)", BZ.input("ad-client", a.client || "", "text", 'maxlength="60" placeholder="Жишээ: Цэлмэг Арьс ХХК"'), "Заавал биш. Зөвхөн админд харагдана, хэрэглэгчдэд харагдахгүй.") +
      "</div>" +
      '<div class="ad-side"><span class="label-like">Урьдчилан харах</span><div id="ad-prev"></div>' +
        '<p class="ad-warn" id="ad-warn" hidden><i data-lucide="triangle-alert"></i><span></span></p>' +
        '<p class="xs muted" id="ad-prev-note"></p></div></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="ad-save"><i data-lucide="check"></i>' + (src0 ? "Хадгалах" : "Нэмэх") + "</button></div>";
    var m = BZ.modal("ad-modal", src0 ? "Зар засах" : "Шинэ зар", body, { size: "modal-xl", sub: src0 ? a.id.toUpperCase() + " · " + BZ.esc(label(a)) : "Зураг + холбоос · тогтсон байршил" });

    function read() {
      a.url = BZ.val("ad-url"); a.placement = BZ.val("ad-place"); a.start = BZ.val("ad-start"); a.end = BZ.val("ad-end");
      a.active = BZ.val("ad-active"); a.client = BZ.val("ad-client");
    }
    function update() {
      read();
      var slot = SLOTS[a.placement], s = state(a);
      m.querySelector("#ad-prev").innerHTML = '<div class="ad-prev-wrap" style="max-width:' + slot.w + 'px">' + frame(a, a.placement, "is-large") + "</div>";
      m.querySelector("#ad-place-hint").innerHTML = '<i data-lucide="ruler"></i><span>Зөвлөмж хэмжээ: <b>' + size(a.placement) + "</b> · " + BZ.esc(slot.where) + "</span>";
      m.querySelector("#ad-size-pill").textContent = "Шаардлагатай: " + size(a.placement);
      m.querySelector("#ad-file-hint").textContent = dims ? "Оруулсан зураг: " + dims.w + "×" + dims.h + " px (" + ratioText(dims.w, dims.h) + ") · JPG, PNG, SVG · 2.5MB хүртэл" : "Сурталчлагчаас " + size(a.placement) + " хэмжээтэй зураг авна. JPG, PNG, SVG · 2.5MB хүртэл";
      var warn = m.querySelector("#ad-warn"), off = dims && Math.abs((dims.w / dims.h) / (slot.w / slot.h) - 1) > 0.03;
      warn.hidden = !off;
      if (off) warn.querySelector("span").textContent = "Зургийн харьцаа (" + ratioText(dims.w, dims.h) + ") байршлын харьцаатай (" + slot.ratio + ") таарахгүй байна. Зураг бүтнээрээ багтаж (fit) харагдана, хоосон зай үүснэ.";
      m.querySelector("#ad-prev-note").textContent = slot.name + " · " + (s[0] === "live" ? "Хадгалмагц харагдана" : s[0] === "scheduled" ? a.start + "-нээс харагдана" : s[0] === "ended" ? "Хугацаа дууссан тул харагдахгүй" : "Идэвхгүй тул харагдахгүй");
      UI.icons();
    }
    function measure() {
      if (!a.image) { dims = null; update(); return; }
      var im = new Image();
      im.onload = function () { dims = im.naturalWidth && im.naturalHeight ? { w: im.naturalWidth, h: im.naturalHeight } : null; update(); };
      im.onerror = function () { dims = null; update(); };
      im.src = src(a.image);
    }
    m.addEventListener("input", function (e) { if (e.target.id !== "ad-file") update(); });
    m.addEventListener("change", function (e) { if (e.target.id !== "ad-file") update(); });
    update(); measure();
    m.querySelector("#ad-file").addEventListener("change", function (e) {
      var f = e.target.files[0];
      BZ.readImage(f, function (raw) { shrink(raw, f.type, SLOTS[BZ.val("ad-place")].w, function (data) {
        a.image = data; m.querySelector("#ad-file-btn").textContent = "Зураг солих"; BZ.setErr("ad-file", ""); measure();
      }); });
    });
    m.querySelector("#ad-save").addEventListener("click", function () {
      read();
      var ok = BZ.setErr("ad-file", a.image ? "" : "Зарын зураг оруулна уу");
      ok = BZ.setErr("ad-url", !a.url ? "Холбоос оруулна уу" : /^https?:\/\/[^\s.\/]+\.[^\s]+$/.test(a.url) || /^#\/[a-z]/.test(a.url) ? "" : "https:// эсвэл #/ -ээр эхэлсэн зөв холбоос оруулна уу") && ok;
      ok = BZ.setErr("ad-start", a.start ? "" : "Огноо сонгоно уу") && ok;
      ok = BZ.setErr("ad-end", !a.end ? "Огноо сонгоно уу" : a.end < a.start ? "Дуусах огноо эхлэхээс хойш байх ёстой" : "") && ok;
      if (!ok) { BZ.firstError(); return; }
      if (src0) { for (var k in a) src0[k] = a[k]; ADM.log("megaphone", "“" + label(a) + "” зарыг шинэчиллээ"); }
      else { a.id = BZ.uid("ad"); ADM.state.ads.unshift(a); ADM.log("megaphone", "“" + label(a) + "” шинэ зар нэмлээ (" + short(a.placement) + ")"); }
      ADM.save(); UI.closeModal("ad-modal"); UI.toast(src0 ? "Зар хадгалагдлаа" : "Зар нэмэгдлээ", "success"); BZ.refresh();
    });
  }

  /* Keep stored banners small (the demo saves them in localStorage):
     scale down to the slot width (max 1200px), keep the original
     ratio, never crop. SVG stays as it is (it scales by itself). */
  function shrink(raw, type, slotW, cb) {
    if (type === "image/svg+xml") { cb(raw); return; }
    var im = new Image();
    im.onload = function () {
      var k = Math.min(1, Math.min(slotW, 1200) / im.width), c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
      var g = c.getContext("2d");
      if (type === "image/png" || type === "image/gif" || type === "image/webp") { g.drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL("image/png")); return; }
      g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.85));
    };
    im.onerror = function () { UI.toast("Зургийг уншиж чадсангүй", "error"); };
    im.src = raw;
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-adf]"))) { st.filter = t.dataset.adf; BZ.refresh(); }
    else if ((t = e.target.closest("[data-ad-edit]"))) edit(t.dataset.adEdit);
  });
  document.addEventListener("change", function (e) {
    var id = e.target.dataset && e.target.dataset.adToggle; if (!id) return;
    var a = ADM.state.ads.filter(function (x) { return x.id === id; })[0];
    a.active = e.target.checked; ADM.log(a.active ? "play" : "pause", "“" + label(a) + "” зарыг " + (a.active ? "идэвхжүүллээ" : "идэвхгүй болголоо"));
    ADM.save(); UI.toast("Зар " + (a.active ? "идэвхжлээ" : "идэвхгүй боллоо"), a.active ? "success" : "info"); BZ.refresh();
  });

  BZ.page("ads", render);
})();
