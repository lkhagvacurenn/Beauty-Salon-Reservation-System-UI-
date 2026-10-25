/* =========================================================
   Business owner: promotions (8.6, FR-39, FR-40) and
   reviews (FR-25). Promo codes are branch-specific.
   Хямдралтай цаг = weekday + time-range discount.
   Reviews: owner can view and report to the platform admin;
   only the admin can remove a review.
   ========================================================= */
(function () {
  var E = window.Engine;
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  var pst = { tab: "codes" };
  function S() { return BZ.S(); }
  function today() { return BIZ.day(0); }

  function promoState(p) {
    if (!p.active) return ["Идэвхгүй", ""];
    if (p.end < today()) return ["Хугацаа дууссан", "danger"];
    if (p.start > today()) return ["Эхлээгүй", "info"];
    if (p.limit && p.used >= p.limit) return ["Хэрэглээ дууссан", "warning"];
    return ["Идэвхтэй", "success"];
  }
  function badge(s) { return '<span class="badge' + (s[1] ? " badge-" + s[1] : "") + '">' + s[0] + "</span>"; }
  function disc(x) { return x.type === "percent" ? x.value + "%" : BZ.money(x.value); }
  function brNames(ids) { return ids.map(function (id) { var b = BZ.branch(id); return b ? b.name : id; }).join(", "); }

  /* ================= Promotions ================= */
  function renderPromos(params) {
    params = params || {};
    if (params.tab) pst.tab = params.tab;
    var el = BZ.el("promotions");
    var codes = S().promos.filter(function (p) { return BZ.branchFilter === "all" || p.branches.indexOf(BZ.branchFilter) > -1; });
    var dhs = S().discountHours.filter(function (d) { return BZ.inBranch({ branchId: d.branch }); });
    var activeCodes = codes.filter(function (p) { return promoState(p)[0] === "Идэвхтэй"; }).length;
    var activeDh = dhs.filter(function (d) { return d.active && d.end >= today(); }).length;
    var discountGiven = S().bookings.filter(function (b) { return b.date.slice(0, 7) === BZ.currentMonth() && b.status === "completed" && BZ.inBranch(b); })
      .reduce(function (s, b) { return s + b.promoOff + b.discountHour; }, 0);

    el.innerHTML =
      '<div class="page-head"><div><h2>Урамшуулал</h2></div>' +
        '<div class="row-wrap">' + BZ.branchSelect("pr-branch") + '<button type="button" class="btn btn-primary" data-promo-new="' + pst.tab + '"><i data-lucide="plus"></i>' + (pst.tab === "codes" ? "Промо код үүсгэх" : "Хямдралтай цаг нэмэх") + "</button></div></div>" +
      '<div class="grid grid-3 stat-grid">' +
        '<div class="card stat-card"><div class="stat-icon"><i data-lucide="ticket-percent"></i></div><div class="stat-value">' + activeCodes + '</div><div class="stat-label">Идэвхтэй промо код</div></div>' +
        '<div class="card stat-card"><div class="stat-icon"><i data-lucide="clock-3"></i></div><div class="stat-value">' + activeDh + '</div><div class="stat-label">Идэвхтэй Хямдралтай цаг</div></div>' +
        '<div class="card stat-card"><div class="stat-icon"><i data-lucide="hand-coins"></i></div><div class="stat-value">' + BZ.short(discountGiven) + '₮</div><div class="stat-label">Энэ сард олгосон хөнгөлөлт</div></div>' +
      "</div>" +
      '<div class="tab-row">' + BZ.tabs("ptab", [["codes", "Промо код", "ticket-percent"], ["dh", "Хямдралтай цаг", "clock-3"]], pst.tab) + "</div>" +
      (pst.tab === "codes" ? codesTable(codes) : dhList(dhs));

    if (params.new) { history.replaceState(null, "", "#/promotions"); editPromo(null); }
  }

  function codesTable(codes) {
    return BZ.table(["Код", "Салбар", "Хөнгөлөлт", "Хугацаа", "Хэрэглээ", "Төлөв", { label: "", cls: "t-act" }], codes.map(function (p) {
      var pct = p.limit ? p.used / p.limit * 100 : 0;
      return { cells: [
        '<span class="code-tag">' + p.code + "</span>" + (p.platform ? '<span class="cell-sub">Платформын кампанит ажил</span>' : ""),
        brNames(p.branches),
        "<b>" + disc(p) + "</b>" + (p.min ? '<span class="cell-sub">' + BZ.money(p.min) + "-өөс дээш</span>" : ""),
        p.start + '<span class="cell-sub">– ' + p.end + "</span>",
        '<div class="usage"><span>' + p.used + " / " + (p.limit || "∞") + "</span>" + BZ.progress(pct) + "</div>",
        badge(promoState(p)),
        p.platform ? '<span class="xs muted">Админ удирдана</span>' :
          '<div class="row-wrap nowrap"><button type="button" class="btn btn-secondary btn-sm" data-promo-edit="' + p.id + '">Засах</button>' +
          '<label class="switch"><input type="checkbox" data-promo-toggle="' + p.id + '"' + (p.active ? " checked" : "") + '><span class="track"></span><span class="sr-only">' + p.code + " идэвхтэй</span></label></div>"] };
    }), { empty: BZ.empty("ticket-percent", "Промо код алга", "Энэ салбарт промо код үүсгээгүй байна.", '<button type="button" class="btn btn-primary btn-sm" data-promo-new="codes">Промо код үүсгэх</button>') });
  }

  function dhList(dhs) {
    if (!dhs.length) return BZ.empty("clock-3", "Хямдралтай цаг алга", "Ачаалал багатай цагт хямдрал зарлаж захиалгаа нэмэгдүүлээрэй.", '<button type="button" class="btn btn-primary btn-sm" data-promo-new="dh">Хямдралтай цаг нэмэх</button>');
    return '<div class="dh-grid">' + dhs.map(function (d) {
      var x = d.service ? BZ.service(d.service) : null, expired = d.end < today();
      var state = !d.active ? ["Идэвхгүй", ""] : expired ? ["Хугацаа дууссан", "danger"] : d.start > today() ? ["Эхлээгүй", "info"] : ["Идэвхтэй", "success"];
      var used = S().bookings.filter(function (b) { return b.branchId === d.branch && b.discountHour > 0 && (!d.service || b.serviceIds.indexOf(d.service) > -1) && b.date >= d.start && b.date <= d.end; }).length;
      return '<article class="card dh-card' + (state[0] === "Идэвхтэй" ? "" : " is-inactive") + '">' +
        '<div class="dh-top"><span class="dh-value">−' + disc(d) + "</span>" + badge(state) + "</div>" +
        "<h4>" + (x ? BZ.esc(x.name) : "Бүх үйлчилгээ") + '</h4><p class="xs muted">' + BZ.branch(d.branch).name + "</p>" +
        '<div class="wd-row" aria-label="Гарагууд">' + ORDER.map(function (w) { return '<span class="wd' + (d.weekdays.indexOf(w) > -1 ? " on" : "") + '">' + E.WEEKDAYS[w].slice(0, 2) + "</span>"; }).join("") + "</div>" +
        '<ul class="meta-list"><li><i data-lucide="clock"></i>' + d.from + " – " + d.to + '</li><li><i data-lucide="calendar"></i>' + d.start + " – " + d.end + '</li><li><i data-lucide="users"></i>' + used + " захиалгад хэрэглэгдсэн</li></ul>" +
        '<div class="row-wrap"><button type="button" class="btn btn-secondary btn-sm" data-dh-edit="' + d.id + '"><i data-lucide="pencil"></i>Засах</button>' +
          '<label class="switch"><input type="checkbox" data-dh-toggle="' + d.id + '"' + (d.active ? " checked" : "") + '><span class="track"></span>Идэвхтэй</label></div></article>';
    }).join("") + "</div>";
  }

  function typeValueFields(prefix, x) {
    return '<div class="form-grid">' +
      '<div class="field"><span class="label-like">Хөнгөлөлтийн төрөл</span><div class="segmented" role="radiogroup">' +
        '<button type="button" data-ptype="percent" aria-selected="' + (x.type === "percent") + '">Хувиар (%)</button><button type="button" data-ptype="fixed" aria-selected="' + (x.type === "fixed") + '">Тогтмол дүн (₮)</button></div></div>' +
      BZ.field(prefix + "-value", "Хэмжээ", '<div class="input-suffix"><input class="input" type="number" min="1" id="' + prefix + '-value" value="' + (x.value || "") + '"><span id="' + prefix + '-unit">' + (x.type === "percent" ? "%" : "₮") + "</span></div>", "", true) +
    "</div>";
  }
  function bindType(m, x, prefix, after) {
    m.querySelectorAll("[data-ptype]").forEach(function (b) {
      b.addEventListener("click", function () {
        x.type = b.dataset.ptype;
        m.querySelectorAll("[data-ptype]").forEach(function (o) { o.setAttribute("aria-selected", o === b); });
        m.querySelector("#" + prefix + "-unit").textContent = x.type === "percent" ? "%" : "₮";
        if (after) after();
      });
    });
  }
  function checkValue(prefix, type) {
    var v = +BZ.val(prefix + "-value");
    return BZ.setErr(prefix + "-value", !v || v <= 0 ? "Хэмжээг оруулна уу" : type === "percent" && v > 90 ? "Хувь 1–90 хооронд байна" : type === "fixed" && v < 500 ? "500₮-өөс их байна" : "");
  }
  function checkDates(a, b) {
    var ok = BZ.setErr(a, !BZ.val(a) ? "Огноо сонгоно уу" : "");
    return BZ.setErr(b, !BZ.val(b) ? "Огноо сонгоно уу" : BZ.val(b) < BZ.val(a) ? "Дуусах огноо эхлэхээс хойш байна" : "") && ok;
  }

  /* ---------- Promo code form ---------- */
  function editPromo(id) {
    var isNew = !id;
    var x = isNew ? { id: BZ.uid("p"), code: "", branches: BZ.branchFilter !== "all" ? [BZ.branchFilter] : [], type: "percent", value: 10, min: 0, start: today(), end: BIZ.day(30), limit: 50, used: 0, active: true } : JSON.parse(JSON.stringify(S().promos.filter(function (p) { return p.id === id; })[0]));
    var body =
      BZ.field("pc-code", "Промо код", BZ.input("pc-code", x.code, "text", 'placeholder="Жишээ: SARNAI20" maxlength="16" autocomplete="off" spellcheck="false"' + (x.used ? " readonly" : "")), x.used ? "Хэрэглэгдсэн кодыг өөрчлөх боломжгүй" : "4–16 тэмдэгт, латин үсэг ба тоо", true) +
      '<fieldset class="field"><legend>Хамаарах салбар <span class="req">*</span></legend><div class="chips">' + S().branches.map(function (b) {
        return '<label class="check"><input type="checkbox" data-pb="' + b.id + '"' + (x.branches.indexOf(b.id) > -1 ? " checked" : "") + ">" + b.name + "</label>";
      }).join("") + '</div><span class="error-text" id="pc-br-err"></span></fieldset>' +
      typeValueFields("pc", x) +
      '<div class="form-grid">' +
        BZ.field("pc-min", "Хамгийн бага захиалгын дүн", '<div class="input-suffix"><input class="input" type="number" min="0" step="1000" id="pc-min" value="' + x.min + '"><span>₮</span></div>', "0 бол хязгааргүй") +
        BZ.field("pc-limit", "Хэрэглэх дээд тоо", BZ.input("pc-limit", x.limit, "number", 'min="1"'), "Нийт хэдэн удаа ашиглаж болох", true) +
        BZ.field("pc-start", "Эхлэх огноо", BZ.input("pc-start", x.start, "date"), "", true) +
        BZ.field("pc-end", "Дуусах огноо", BZ.input("pc-end", x.end, "date"), "", true) +
      "</div>" + BZ.sw("pc-active", x.active, "Идэвхтэй") +
      '<div class="promo-preview" id="pc-prev"></div>' +
      '<div class="modal-foot">' + (!isNew && !x.used ? '<button type="button" class="btn btn-ghost danger-text" id="pc-del"><i data-lucide="trash-2"></i>Устгах</button><span class="spacer"></span>' : "") +
        '<button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="pc-save">' + (isNew ? "Үүсгэх" : "Хадгалах") + "</button></div>";
    var m = BZ.modal("promo-modal", isNew ? "Шинэ промо код" : x.code, body, { sub: isNew ? "" : "Хэрэглэсэн: " + x.used + " / " + x.limit });

    function preview() {
      var v = +BZ.val("pc-value") || 0, price = 60000, off = x.type === "percent" ? Math.round(price * v / 100) : Math.min(price, v);
      m.querySelector("#pc-prev").innerHTML = '<i data-lucide="calculator"></i><span>Жишээ: ' + BZ.money(price) + " үйлчилгээнд <b>−" + BZ.money(off) + "</b> → " + BZ.money(price - off) + ". Хямдралтай цагийн дараах дүнд тооцогдоно.</span>";
      UI.icons();
    }
    bindType(m, x, "pc", preview); preview();
    m.querySelector("#pc-value").addEventListener("input", preview);
    m.querySelector("#pc-code").addEventListener("input", function (e) { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
    var del = m.querySelector("#pc-del");
    if (del) del.addEventListener("click", function () {
      UI.confirm({ title: x.code + " кодыг устгах уу?", text: "Энэ код хараахан хэрэглэгдээгүй тул бүрмөсөн устгана.", confirmLabel: "Устгах" }, function () {
        S().promos = S().promos.filter(function (p) { return p.id !== x.id; }); BIZ.save(); UI.closeModal("promo-modal"); UI.toast("Промо код устгагдлаа", "info"); BZ.refresh();
      });
    });
    m.querySelector("#pc-save").addEventListener("click", function () {
      var code = BZ.val("pc-code");
      var ok = BZ.setErr("pc-code", !/^[A-Z0-9]{4,16}$/.test(code) ? "4–16 тэмдэгт, зөвхөн латин том үсэг ба тоо" :
        S().promos.some(function (p) { return p.id !== x.id && p.code === code; }) ? "Ийм код бүртгэлтэй байна" : "");
      var brs = [].map.call(m.querySelectorAll("[data-pb]:checked"), function (c) { return c.dataset.pb; });
      var be = m.querySelector("#pc-br-err"); be.textContent = brs.length ? "" : "Дор хаяж нэг салбар сонгоно уу"; be.closest(".field").classList.toggle("has-error", !brs.length);
      ok = checkValue("pc", x.type) && ok;
      ok = BZ.setErr("pc-limit", !(+BZ.val("pc-limit") >= 1) ? "1-ээс их тоо оруулна уу" : +BZ.val("pc-limit") < x.used ? "Хэрэглэсэн тооноос (" + x.used + ") бага байж болохгүй" : "") && ok;
      ok = checkDates("pc-start", "pc-end") && ok;
      if (!ok || !brs.length) { BZ.firstError(); return; }
      x.code = code; x.branches = brs; x.value = +BZ.val("pc-value"); x.min = +BZ.val("pc-min") || 0; x.limit = +BZ.val("pc-limit");
      x.start = BZ.val("pc-start"); x.end = BZ.val("pc-end"); x.active = BZ.val("pc-active");
      if (isNew) S().promos.unshift(x); else Object.assign(S().promos.filter(function (p) { return p.id === x.id; })[0], x);
      BIZ.save(); UI.closeModal("promo-modal"); UI.toast(isNew ? x.code + " код үүслээ" : "Промо код хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  /* ---------- Хямдралтай цаг form ---------- */
  function editDh(id) {
    var isNew = !id;
    var x = isNew ? { id: BZ.uid("dh"), branch: BZ.branchFilter !== "all" ? BZ.branchFilter : S().branches[0].id, service: null, weekdays: [1, 2, 3], from: "11:00", to: "14:00", type: "percent", value: 15, start: today(), end: BIZ.day(30), active: true }
      : JSON.parse(JSON.stringify(S().discountHours.filter(function (d) { return d.id === id; })[0]));
    var times = []; for (var t = 7 * 60; t <= 23 * 60; t += 30) times.push([E.fmt(t), E.fmt(t)]);
    var body =
      '<div class="form-grid">' +
        BZ.field("dh-branch", "Салбар", BZ.select("dh-branch", S().branches.map(function (b) { return [b.id, b.name]; }), x.branch), "", true) +
        BZ.field("dh-svc", "Үйлчилгээ", '<select class="select" id="dh-svc"></select>', "Сонгохгүй бол бүх үйлчилгээнд хамаарна") +
      "</div>" +
      '<fieldset class="field"><legend>Гарагууд <span class="req">*</span></legend><div class="chips">' + ORDER.map(function (w) {
        return '<button type="button" class="chip" data-dw="' + w + '" aria-pressed="' + (x.weekdays.indexOf(w) > -1) + '">' + E.WEEKDAYS[w] + "</button>";
      }).join("") + '</div><span class="error-text" id="dh-wd-err"></span></fieldset>' +
      '<div class="form-grid">' + BZ.field("dh-from", "Эхлэх цаг", BZ.select("dh-from", times, x.from), "", true) + BZ.field("dh-to", "Дуусах цаг", BZ.select("dh-to", times, x.to), "Энэ хугацаанд эхлэх цагуудад хямдрал үйлчилнэ", true) + "</div>" +
      typeValueFields("dh", x) +
      '<div class="form-grid">' + BZ.field("dh-start", "Хүчинтэй эхлэх", BZ.input("dh-start", x.start, "date"), "", true) + BZ.field("dh-end", "Хүчинтэй дуусах", BZ.input("dh-end", x.end, "date"), "", true) + "</div>" +
      BZ.sw("dh-active", x.active, "Идэвхтэй") +
      '<p class="note"><i data-lucide="info"></i>Үйлчлүүлэгч цаг захиалахад Хямдралтай цаг эхэлж тооцогдоод, үлдсэн дүнд промо код үйлчилнэ.</p>' +
      '<div class="modal-foot">' + (isNew ? "" : '<button type="button" class="btn btn-ghost danger-text" id="dh-del"><i data-lucide="trash-2"></i>Устгах</button><span class="spacer"></span>') +
        '<button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="dh-save">' + (isNew ? "Нэмэх" : "Хадгалах") + "</button></div>";
    var m = BZ.modal("dh-modal", isNew ? "Шинэ Хямдралтай цаг" : "Хямдралтай цаг засах", body);
    function svcs() {
      var br = BZ.val("dh-branch");
      m.querySelector("#dh-svc").innerHTML = '<option value="">Бүх үйлчилгээ</option>' + S().services.filter(function (s) { return s.branches.indexOf(br) > -1; }).map(function (s) {
        return '<option value="' + s.id + '"' + (s.id === x.service ? " selected" : "") + ">" + s.name + "</option>";
      }).join("");
    }
    svcs(); bindType(m, x, "dh");
    m.querySelector("#dh-branch").addEventListener("change", svcs);
    m.querySelectorAll("[data-dw]").forEach(function (c) { c.addEventListener("click", function () { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") !== "true"); }); });
    var del = m.querySelector("#dh-del");
    if (del) del.addEventListener("click", function () {
      UI.confirm({ title: "Хямдралтай цаг устгах уу?", text: "Өмнө хийгдсэн захиалгын хөнгөлөлт хэвээр үлдэнэ.", confirmLabel: "Устгах" }, function () {
        S().discountHours = S().discountHours.filter(function (d) { return d.id !== x.id; }); BIZ.save(); UI.closeModal("dh-modal"); UI.toast("Хямдралтай цаг устгагдлаа", "info"); BZ.refresh();
      });
    });
    m.querySelector("#dh-save").addEventListener("click", function () {
      var wds = [].map.call(m.querySelectorAll('[data-dw][aria-pressed="true"]'), function (c) { return +c.dataset.dw; });
      var we = m.querySelector("#dh-wd-err"); we.textContent = wds.length ? "" : "Дор хаяж нэг гараг сонгоно уу"; we.closest(".field").classList.toggle("has-error", !wds.length);
      var br = BZ.branch(BZ.val("dh-branch")), from = BZ.val("dh-from"), to = BZ.val("dh-to");
      var closed = wds.filter(function (w) { return !br.hours[w]; });
      var ok = BZ.setErr("dh-to", to <= from ? "Дуусах цаг эхлэхээс хойш байна" : "");
      if (ok && closed.length) { we.textContent = br.name + " " + closed.map(function (w) { return E.WEEKDAYS[w]; }).join(", ") + " гарагт амардаг"; we.closest(".field").classList.add("has-error"); ok = false; }
      ok = checkValue("dh", x.type) && ok;
      ok = checkDates("dh-start", "dh-end") && ok;
      if (!ok || !wds.length) { BZ.firstError(); return; }
      x.branch = br.id; x.service = BZ.val("dh-svc") || null; x.weekdays = wds; x.from = from; x.to = to; x.value = +BZ.val("dh-value");
      x.start = BZ.val("dh-start"); x.end = BZ.val("dh-end"); x.active = BZ.val("dh-active");
      if (isNew) S().discountHours.unshift(x); else Object.assign(S().discountHours.filter(function (d) { return d.id === x.id; })[0], x);
      BIZ.save(); UI.closeModal("dh-modal"); UI.toast("Хямдралтай цаг хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  /* ================= Reviews ================= */
  var rst = { rating: 0, emp: "all", q: "" };
  function renderReviews() {
    var el = BZ.el("reviews");
    var all = S().reviews.filter(function (r) { return BZ.inBranch(r); });
    var list = all.filter(function (r) {
      if (rst.rating && r.rating !== rst.rating) return false;
      if (rst.emp !== "all" && r.employeeId !== rst.emp) return false;
      if (rst.q && (r.text + r.author + r.service).toLowerCase().indexOf(rst.q.toLowerCase()) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var avg = all.length ? all.reduce(function (s, r) { return s + r.rating; }, 0) / all.length : 0;
    var dist = [5, 4, 3, 2, 1].map(function (n) { return [n, all.filter(function (r) { return r.rating === n; }).length]; });
    var emps = S().employees.filter(BZ.inBranch);

    el.innerHTML =
      '<div class="page-head"><div><h2>Сэтгэгдэл</h2></div>' + BZ.branchSelect("rv-branch") + "</div>" +
      '<div class="rv-summary">' +
        '<div class="card rv-score"><span class="rv-big">' + avg.toFixed(1) + "</span>" + BZ.stars(avg) + '<span class="xs muted">' + all.length + " сэтгэгдэл</span>" +
          '<ul class="rv-dist">' + dist.map(function (d) {
            return '<li><button type="button" data-rv-rating="' + d[0] + '" aria-pressed="' + (rst.rating === d[0]) + '"><span>' + d[0] + '<i data-lucide="star"></i></span>' + BZ.progress(all.length ? d[1] / all.length * 100 : 0) + "<b>" + d[1] + "</b></button></li>";
          }).join("") + "</ul></div>" +
        '<div class="card"><div class="card-title"><h3>Ажилтны үнэлгээ</h3></div><ul class="staff-list compact">' + emps.map(function (e) {
          var mine = all.filter(function (r) { return r.employeeId === e.id; });
          var a = mine.length ? mine.reduce(function (s, r) { return s + r.rating; }, 0) / mine.length : 0;
          return '<li>' + UI.avatar(e) + '<div class="grow"><b>' + e.name + '</b><span class="xs muted">' + e.role + "</span></div>" +
            '<div class="rv-emp">' + (mine.length ? BZ.stars(a) + "<b>" + a.toFixed(1) + '</b><span class="xs muted">(' + mine.length + ")</span>" : '<span class="xs muted">Сэтгэгдэлгүй</span>') + "</div>" +
            '<button type="button" class="btn btn-ghost btn-sm" data-rv-emp="' + e.id + '">Харах</button></li>';
        }).join("") + "</ul></div>" +
      "</div>" +
      '<div class="biz-toolbar wrap">' +
        '<label class="input-icon grow-sm"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="rv-q" type="search" placeholder="Сэтгэгдлээс хайх" value="' + BZ.esc(rst.q) + '"></label>' +
        '<label class="inline-select"><i data-lucide="user-round"></i><span class="sr-only">Ажилтан</span>' + BZ.select("rv-emp", [["all", "Бүх ажилтан"]].concat(emps.map(function (e) { return [e.id, e.name]; })), rst.emp) + "</label>" +
        (rst.rating || rst.emp !== "all" || rst.q ? '<button type="button" class="btn btn-ghost btn-sm" data-rv-clear><i data-lucide="x"></i>Цэвэрлэх</button>' : "") +
      "</div>" +
      (list.length ? '<div class="rv-list">' + list.map(function (r) {
        var e = BZ.employee(r.employeeId);
        return '<article class="card rv-card"><div class="rv-head"><span class="avatar">' + r.author.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2) + '</span>' +
          '<div class="grow"><b>' + BZ.esc(r.author) + '</b><span class="xs muted">' + r.date + " · " + BZ.esc(r.service) + "</span></div>" + BZ.stars(r.rating) + "</div>" +
          "<p>" + BZ.esc(r.text) + "</p>" +
          '<div class="rv-foot"><span class="xs muted"><i data-lucide="user-round"></i>' + (e ? e.name : "—") + " · " + BZ.branch(r.branchId).name + ' · <i data-lucide="thumbs-up"></i>' + r.likes + "</span>" +
            (r.status === "reported" ? '<span class="badge badge-warning">Админд мэдэгдсэн</span>' : r.status === "hidden" ? '<span class="badge badge-info">Админ нуусан</span>' :
              '<button type="button" class="btn btn-ghost btn-sm" data-rv-report="' + r.id + '"><i data-lucide="flag"></i>Админд мэдэгдэх</button>') + "</div></article>";
      }).join("") + "</div>" : BZ.empty("message-square", "Сэтгэгдэл олдсонгүй", "Шүүлтүүрээ өөрчилнө үү.")) +
      '<p class="note"><i data-lucide="shield"></i>Салон сэтгэгдлийг устгах, засах боломжгүй. Зохисгүй агуулгатай бол админд мэдэгдэнэ. Сэтгэгдлийг бичсэн үйлчлүүлэгч өөрөө засаж, устгана. Платформын админ ч устгаж болно.</p>';
  }

  function report(id) {
    var r = S().reviews.filter(function (x) { return x.id === id; })[0];
    var reasons = ["Доромжилсон үг хэллэг", "Худал мэдээлэл", "Спам / зар сурталчилгаа", "Хувийн мэдээлэл агуулсан", "Бусад"];
    var m = BZ.modal("report-modal", "Админд мэдэгдэх", '<blockquote class="rv-quote">' + BZ.esc(r.text) + "<cite>" + BZ.esc(r.author) + " · " + r.rating + " од</cite></blockquote>" +
      '<fieldset class="field"><legend>Шалтгаан</legend><div class="radio-list">' + reasons.map(function (x, i) { return '<label class="check"><input type="radio" name="rp-reason" value="' + x + '"' + (i === 0 ? " checked" : "") + ">" + x + "</label>"; }).join("") + "</div></fieldset>" +
      BZ.field("rp-note", "Нэмэлт тайлбар", '<textarea class="textarea" id="rp-note" maxlength="300" placeholder="Заавал биш"></textarea>') +
      '<p class="xs muted">Мэдэгдсэний дараа админ хянаж шийдвэрлэнэ. Сэтгэгдэл тэр хүртэл харагдсаар байна.</p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="rp-send"><i data-lucide="flag"></i>Илгээх</button></div>');
    m.querySelector("#rp-send").addEventListener("click", function () {
      r.status = "reported"; r.report = { reason: m.querySelector('[name="rp-reason"]:checked').value, note: BZ.val("rp-note"), date: today() };
      BIZ.save(); UI.closeModal("report-modal"); UI.toast("Админд мэдэгдлээ", "success"); BZ.refresh();
    });
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-promo-new]"))) { if (t.dataset.promoNew === "dh") editDh(null); else editPromo(null); }
    else if ((t = e.target.closest("[data-promo-edit]"))) editPromo(t.dataset.promoEdit);
    else if ((t = e.target.closest("[data-dh-edit]"))) editDh(t.dataset.dhEdit);
    else if ((t = e.target.closest("[data-ptab]"))) { pst.tab = t.dataset.ptab; BZ.refresh(); }
    else if ((t = e.target.closest("[data-rv-rating]"))) { rst.rating = rst.rating === +t.dataset.rvRating ? 0 : +t.dataset.rvRating; BZ.refresh(); }
    else if ((t = e.target.closest("[data-rv-emp]"))) { rst.emp = t.dataset.rvEmp; BZ.refresh(); document.querySelector(".rv-list, [data-page=reviews] .empty") && document.getElementById("rv-q").scrollIntoView({ block: "center" }); }
    else if (e.target.closest("[data-rv-clear]")) { rst = { rating: 0, emp: "all", q: "" }; BZ.refresh(); }
    else if ((t = e.target.closest("[data-rv-report]"))) report(t.dataset.rvReport);
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.dataset.promoToggle) {
      var p = S().promos.filter(function (x) { return x.id === t.dataset.promoToggle; })[0]; p.active = t.checked; BIZ.save();
      UI.toast(p.code + (p.active ? " идэвхжлээ" : " идэвхгүй боллоо"), p.active ? "success" : "info"); BZ.refresh();
    }
    if (t.dataset.dhToggle) {
      var d = S().discountHours.filter(function (x) { return x.id === t.dataset.dhToggle; })[0]; d.active = t.checked; BIZ.save();
      UI.toast("Хямдралтай цаг " + (d.active ? "идэвхжлээ" : "идэвхгүй боллоо"), d.active ? "success" : "info"); BZ.refresh();
    }
    if (t.id === "rv-emp") { rst.emp = t.value; BZ.refresh(); }
  });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "rv-q") return;
    clearTimeout(qt); qt = setTimeout(function () {
      rst.q = e.target.value.trim(); BZ.refresh();
      var q = document.getElementById("rv-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }, 250);
  });

  BZ.page("promotions", renderPromos);
  BZ.page("reviews", renderReviews);
})();
