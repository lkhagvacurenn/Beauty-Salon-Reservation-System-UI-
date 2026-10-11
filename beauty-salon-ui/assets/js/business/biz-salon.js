/* =========================================================
   Business owner: salon and branches (8.2, FR-16–FR-18)
   Salon info, multiple branches, address/contacts, images,
   working hours, IBAN account, branch activity.
   ========================================================= */
(function () {
  var E = window.Engine, D = window.BLOOM_DATA;
  var BANKS = ["Жишээ банк", "Тэнгэр банк", "Нармандах банк", "Өргөө банк", "Мөнх банк"];
  var DISTRICTS = ["Сүхбаатар", "Хан-Уул", "Баянзүрх", "Чингэлтэй", "Баянгол", "Сонгинохайрхан"];
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  function S() { return BZ.S(); }

  function render() {
    var s = S().salon, el = BZ.el("salon"), cm = BZ.currentMonth();
    el.innerHTML =
      '<div class="page-head"><div><h2>Салон ба салбар</h2><p>Салоны ерөнхий мэдээлэл, салбар, цагийн хуваарь, дансны мэдээлэл</p></div>' +
        '<button type="button" class="btn btn-primary" data-branch-new><i data-lucide="plus"></i>Салбар нэмэх</button></div>' +

      '<div class="card salon-card">' +
        '<div class="salon-logo">' + BZ.img(s.logo, s.name) + "</div>" +
        '<div class="salon-info"><div class="row-wrap" style="gap:var(--sp-2)"><h3>' + BZ.esc(s.name) + '</h3><span class="badge badge-success">Платформд идэвхтэй</span></div>' +
          '<p class="muted">' + BZ.esc(s.tagline) + "</p>" +
          '<p class="salon-desc">' + BZ.esc(s.description) + "</p>" +
          '<div class="chips static">' + s.cats.map(function (c) { return '<span class="badge badge-pink no-dot">' + BZ.catName(c) + "</span>"; }).join("") + "</div>" +
          '<ul class="meta-list">' +
            '<li><i data-lucide="phone"></i>' + s.phone + "</li>" +
            '<li><i data-lucide="mail"></i>' + s.email + "</li>" +
            '<li><i data-lucide="globe"></i>' + s.web + "</li>" +
            '<li><i data-lucide="file-badge"></i>Улсын бүртгэл ' + s.regNo + "</li>" +
            '<li><i data-lucide="calendar-heart"></i>Bloom-д нэгдсэн ' + s.joined + "</li>" +
          "</ul></div>" +
        '<div class="salon-edit"><button type="button" class="btn btn-secondary" data-salon-edit><i data-lucide="pencil"></i>Засах</button>' +
          '<a class="btn btn-ghost btn-sm" href="../client/index.html#/salon?id=' + s.id + '" target="_blank" rel="noopener"><i data-lucide="external-link"></i>Үйлчлүүлэгчид харагдах байдал</a></div>' +
      "</div>" +

      '<h3 class="section-title">Салбарууд <span class="muted">(' + S().branches.length + ")</span></h3>" +
      '<div class="branch-grid">' + S().branches.map(function (b) { return branchCard(b, cm); }).join("") + "</div>";
  }

  function branchCard(b, cm) {
    var bk = S().bookings.filter(function (x) { return x.branchId === b.id && x.date.slice(0, 7) === cm; });
    var st = BZ.stats(bk), emps = S().employees.filter(function (e) { return e.branch === b.id; }).length;
    var wd = E.today().getDay(), h = b.hours[wd];
    return '<article class="card branch-card' + (b.active ? "" : " is-inactive") + '">' +
      '<div class="branch-imgs">' + BZ.img(b.images[0], b.name, "main") + '<span class="img-count"><i data-lucide="images"></i>' + b.images.length + "</span>" +
        (b.active ? "" : '<span class="badge badge-danger inactive-tag">Идэвхгүй</span>') + "</div>" +
      '<div class="branch-body"><h4>' + BZ.esc(b.name) + "</h4>" +
        '<ul class="meta-list">' +
          '<li><i data-lucide="map-pin"></i>' + BZ.esc(b.address) + "</li>" +
          '<li><i data-lucide="phone"></i>' + b.phone + "</li>" +
          '<li><i data-lucide="clock"></i>Өнөөдөр ' + (h ? h[0] + "–" + h[1] : "амарна") + "</li>" +
          '<li><i data-lucide="landmark"></i>' + b.bank + " · " + maskIban(b.iban) + "</li>" +
        "</ul>" +
        '<div class="mini-stats"><span><b>' + st.total + "</b><small>захиалга энэ сар</small></span><span><b>" + BZ.short(st.revenue) + "₮</b><small>орлого</small></span><span><b>" + emps + "</b><small>ажилтан</small></span></div>" +
        '<div class="row-wrap branch-actions">' +
          '<button type="button" class="btn btn-secondary btn-sm" data-branch-edit="' + b.id + '"><i data-lucide="pencil"></i>Засах</button>' +
          '<a class="btn btn-ghost btn-sm" href="#/bookings?branch=' + b.id + '"><i data-lucide="calendar-days"></i>Захиалга</a>' +
          '<button type="button" class="btn btn-ghost btn-sm" data-branch-toggle="' + b.id + '">' + (b.active ? '<i data-lucide="pause"></i>Идэвхгүй болгох' : '<i data-lucide="play"></i>Идэвхжүүлэх') + "</button>" +
        "</div></div></article>";
  }
  function maskIban(i) { return i.slice(0, 4) + " •••• " + i.slice(-4); }

  /* ---------- Salon info ---------- */
  function editSalon() {
    var s = S().salon;
    var body = '<div class="form-grid">' +
      BZ.field("sl-name", "Салоны нэр", BZ.input("sl-name", s.name), "", true) +
      BZ.field("sl-tag", "Товч уриа", BZ.input("sl-tag", s.tagline, "text", 'maxlength="80"'), "80 тэмдэгт хүртэл") +
      BZ.field("sl-phone", "Утас", BZ.input("sl-phone", s.phone, "tel"), "", true) +
      BZ.field("sl-email", "Имэйл", BZ.input("sl-email", s.email, "email"), "", true) +
      BZ.field("sl-web", "Вэб хуудас", BZ.input("sl-web", s.web)) +
      BZ.field("sl-reg", "Улсын бүртгэлийн дугаар", BZ.input("sl-reg", s.regNo, "text", "readonly"), "Өөрчлөх бол платформын админтай холбогдоно") +
      "</div>" +
      BZ.field("sl-desc", "Тайлбар", '<textarea class="textarea" id="sl-desc" maxlength="400">' + BZ.esc(s.description) + "</textarea>") +
      '<fieldset class="field"><legend>Үйлчилгээний ангилал</legend><div class="chips">' + D.CATEGORIES.map(function (c) {
        return '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="' + (s.cats.indexOf(c.id) > -1) + '">' + c.name + "</button>";
      }).join("") + '</div><span class="error-text" id="sl-cat-err"></span></fieldset>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="sl-save">Хадгалах</button></div>';
    var m = BZ.modal("salon-modal", "Салоны мэдээлэл засах", body, { size: "modal-lg" });
    m.querySelectorAll("[data-cat]").forEach(function (c) { c.addEventListener("click", function () { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") !== "true"); }); });
    m.querySelector("#sl-save").addEventListener("click", function () {
      var cats = [].map.call(m.querySelectorAll('[data-cat][aria-pressed="true"]'), function (c) { return c.dataset.cat; });
      var ok = BZ.setErr("sl-name", BZ.val("sl-name").length < 2 ? "Салоны нэрээ оруулна уу" : "");
      ok = BZ.setErr("sl-phone", BZ.val("sl-phone").replace(/\D/g, "").length !== 8 ? "Утас 8 оронтой байна" : "") && ok;
      ok = BZ.setErr("sl-email", !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(BZ.val("sl-email")) ? "Имэйл хаяг буруу байна" : "") && ok;
      var fs = m.querySelector("#sl-cat-err").closest(".field");
      fs.classList.toggle("has-error", !cats.length); m.querySelector("#sl-cat-err").textContent = cats.length ? "" : "Дор хаяж нэг ангилал сонгоно уу";
      if (!ok || !cats.length) { BZ.firstError(); return; }
      s.name = BZ.val("sl-name"); s.tagline = BZ.val("sl-tag"); s.phone = BZ.val("sl-phone"); s.email = BZ.val("sl-email"); s.web = BZ.val("sl-web");
      s.description = BZ.val("sl-desc"); s.cats = cats;
      BIZ.save(); UI.closeModal("salon-modal"); UI.toast("Салоны мэдээлэл хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  /* ---------- Branch add / edit ---------- */
  function editBranch(id) {
    var isNew = !id;
    var b = isNew ? { id: BZ.uid("br-"), name: "", address: "", district: "Сүхбаатар", phone: "", email: "", hours: { 0: null, 1: ["10:00", "20:00"], 2: ["10:00", "20:00"], 3: ["10:00", "20:00"], 4: ["10:00", "20:00"], 5: ["10:00", "20:00"], 6: ["10:00", "18:00"] },
      active: true, bank: BANKS[0], iban: "", holder: S().salon.name + " ХХК", images: [], map: { x: 50, y: 50 }, priceFactor: 1 } : BZ.branch(id);
    var imgs = b.images.slice();
    var times = []; for (var t = 7 * 60; t <= 23 * 60; t += 30) times.push([E.fmt(t), E.fmt(t)]);

    var hours = ORDER.map(function (d) {
      var h = b.hours[d];
      return '<div class="hours-row" data-day="' + d + '"><span class="hr-day">' + E.WEEKDAYS[d] + "</span>" +
        BZ.sw("hr-on-" + d, !!h, '<span class="sr-only">' + E.WEEKDAYS[d] + " ажиллах</span>") +
        '<div class="hr-times"' + (h ? "" : " hidden") + ">" + BZ.select("hr-from-" + d, times, h ? h[0] : "10:00", 'aria-label="Нээх цаг"') + "<span>–</span>" + BZ.select("hr-to-" + d, times, h ? h[1] : "20:00", 'aria-label="Хаах цаг"') + "</div>" +
        '<span class="hr-closed xs muted"' + (h ? " hidden" : "") + ">Амарна</span></div>";
    }).join("");

    var body =
      '<nav class="form-steps" aria-label="Хэсгүүд"><a href="#br-sec-1">Мэдээлэл</a><a href="#br-sec-2">Цагийн хуваарь</a><a href="#br-sec-3">Зураг</a><a href="#br-sec-4">Данс</a></nav>' +
      '<h4 class="form-sec" id="br-sec-1">Үндсэн мэдээлэл</h4><div class="form-grid">' +
        BZ.field("br-name", "Салбарын нэр", BZ.input("br-name", b.name, "text", 'placeholder="Жишээ: Сансар салбар"'), "", true) +
        BZ.field("br-district", "Дүүрэг", BZ.select("br-district", DISTRICTS.map(function (x) { return [x, x]; }), b.district), "", true) +
        BZ.field("br-phone", "Утас", BZ.input("br-phone", b.phone, "tel", 'placeholder="7711-0000"'), "", true) +
        BZ.field("br-email", "Имэйл", BZ.input("br-email", b.email, "email")) +
      "</div>" +
      BZ.field("br-address", "Хаяг", BZ.input("br-address", b.address, "text", 'placeholder="Дүүрэг, хороо, гудамж, байр"'), "Газрын зураг дээр энэ хаягаар харагдана", true) +
      '<h4 class="form-sec" id="br-sec-2">Цагийн хуваарь</h4><div class="hours" id="br-hours">' + hours + '</div><p class="error-text standalone" id="br-hours-err"></p>' +
      '<h4 class="form-sec" id="br-sec-3">Салбарын зураг</h4>' +
      '<div class="img-grid" id="br-imgs"></div>' +
      '<h4 class="form-sec" id="br-sec-4">Дансны мэдээлэл</h4><p class="xs muted" style="margin-top:-6px">Үйлчлүүлэгчийн урьдчилгаа төлбөр энэ данс руу шууд орно.</p><div class="form-grid">' +
        BZ.field("br-bank", "Банк", BZ.select("br-bank", BANKS.map(function (x) { return [x, x]; }), b.bank), "", true) +
        BZ.field("br-holder", "Данс эзэмшигч", BZ.input("br-holder", b.holder), "", true) +
      "</div>" +
      BZ.field("br-iban", "IBAN дансны дугаар", BZ.input("br-iban", b.iban, "text", 'placeholder="MN00 0000 0000 0000 0000 00" autocomplete="off" spellcheck="false"'), "MN + 18 орон (жишээ мэдээлэл)", true) +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="br-save">' + (isNew ? "Салбар нэмэх" : "Хадгалах") + "</button></div>";

    var m = BZ.modal("branch-modal", isNew ? "Шинэ салбар" : b.name + " · засах", body, { size: "modal-lg" });
    function drawImgs() {
      m.querySelector("#br-imgs").innerHTML = imgs.map(function (src, i) {
        return '<div class="img-tile">' + BZ.img(src, "Салбарын зураг " + (i + 1)) + (i === 0 ? '<span class="badge badge-pink no-dot cover">Нүүр</span>' : "") +
          '<button type="button" class="icon-btn img-del" data-img-del="' + i + '" aria-label="Зураг устгах"><i data-lucide="trash-2"></i></button></div>';
      }).join("") + (imgs.length < 6 ? '<label class="img-add"><input type="file" accept="image/*" multiple class="sr-only" id="br-file"><i data-lucide="image-plus"></i><span>Зураг нэмэх</span><small>JPG, PNG · 2.5MB</small></label>' : "");
      UI.icons();
    }
    drawImgs();
    m.addEventListener("change", function (e) {
      if (e.target.id === "br-file") {
        [].slice.call(e.target.files, 0, 6 - imgs.length).forEach(function (f) { BZ.readImage(f, function (src) { imgs.push(src); drawImgs(); }); });
      }
      var on = e.target.id && e.target.id.match(/^hr-on-(\d)$/);
      if (on) {
        var row = m.querySelector('[data-day="' + on[1] + '"]');
        row.querySelector(".hr-times").hidden = !e.target.checked; row.querySelector(".hr-closed").hidden = e.target.checked;
      }
    });
    m.addEventListener("click", function (e) {
      var d = e.target.closest("[data-img-del]");
      if (d) { imgs.splice(+d.dataset.imgDel, 1); drawImgs(); }
      var a = e.target.closest(".form-steps a");
      if (a) { e.preventDefault(); m.querySelector(a.getAttribute("href")).scrollIntoView({ behavior: "smooth", block: "start" }); }
    });
    m.querySelector("#br-iban").addEventListener("input", function (e) {
      var v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
      e.target.value = v.replace(/(.{4})/g, "$1 ").trim();
    });
    m.querySelector("#br-save").addEventListener("click", function () {
      var ok = BZ.setErr("br-name", BZ.val("br-name").length < 2 ? "Салбарын нэрээ оруулна уу" : "");
      ok = BZ.setErr("br-phone", BZ.val("br-phone").replace(/\D/g, "").length !== 8 ? "Утас 8 оронтой байна" : "") && ok;
      ok = BZ.setErr("br-address", BZ.val("br-address").length < 6 ? "Хаягаа дэлгэрэнгүй оруулна уу" : "") && ok;
      ok = BZ.setErr("br-email", BZ.val("br-email") && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(BZ.val("br-email")) ? "Имэйл хаяг буруу байна" : "") && ok;
      var iban = BZ.val("br-iban").replace(/\s/g, "");
      ok = BZ.setErr("br-iban", !/^MN\d{18}$/.test(iban) ? "IBAN нь MN-ээр эхэлж, араас нь 18 оронтой тоо байна" : "") && ok;
      ok = BZ.setErr("br-holder", BZ.val("br-holder").length < 2 ? "Данс эзэмшигчийн нэрийг оруулна уу" : "") && ok;
      var hours = {}, hErr = "";
      ORDER.forEach(function (d) {
        if (!m.querySelector("#hr-on-" + d).checked) { hours[d] = null; return; }
        var f = BZ.val("hr-from-" + d), t = BZ.val("hr-to-" + d);
        if (f >= t) hErr = E.WEEKDAYS[d] + " гарагийн хаах цаг нээх цагаас хойш байх ёстой";
        hours[d] = [f, t];
      });
      if (!ORDER.some(function (d) { return hours[d]; })) hErr = "Дор хаяж нэг өдөр ажиллах ёстой";
      m.querySelector("#br-hours-err").textContent = hErr; m.querySelector("#br-hours-err").style.display = hErr ? "block" : "none";
      if (!ok || hErr) { if (!ok) BZ.firstError(); else m.querySelector("#br-sec-2").scrollIntoView({ block: "start" }); return; }
      b.name = BZ.val("br-name"); b.district = BZ.val("br-district"); b.phone = BZ.val("br-phone"); b.email = BZ.val("br-email");
      b.address = BZ.val("br-address"); b.hours = hours; b.images = imgs; b.bank = BZ.val("br-bank"); b.holder = BZ.val("br-holder"); b.iban = iban;
      if (isNew) S().branches.push(b);
      BIZ.save(); UI.closeModal("branch-modal");
      UI.toast(isNew ? "Шинэ салбар нэмэгдлээ. Үйлчилгээ, ажилтнаа холбоно уу." : "Салбарын мэдээлэл хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  function toggleBranch(id) {
    var b = BZ.branch(id);
    if (b.active) {
      var up = S().bookings.filter(function (x) { return x.branchId === id && x.date >= BIZ.day(0) && ["confirmed", "pending_payment"].indexOf(x.status) > -1; }).length;
      if (S().branches.filter(function (x) { return x.active; }).length === 1) { UI.toast("Дор хаяж нэг салбар идэвхтэй байх ёстой", "error"); return; }
      UI.confirm({ title: b.name + "-ыг идэвхгүй болгох уу?", text: "Үйлчлүүлэгчид шинээр цаг захиалах боломжгүй болно." + (up ? " Одоо байгаа " + up + " захиалга хэвээр үлдэх тул тэдгээрийг шилжүүлэх эсвэл цуцлахаа мартуузай." : ""), confirmLabel: "Идэвхгүй болгох" }, function () {
        b.active = false; BIZ.save(); UI.toast(b.name + " идэвхгүй боллоо", "info"); BZ.refresh();
      });
    } else { b.active = true; BIZ.save(); UI.toast(b.name + " идэвхжлээ", "success"); BZ.refresh(); }
  }

  document.addEventListener("click", function (e) {
    var t;
    if (e.target.closest("[data-salon-edit]")) editSalon();
    else if (e.target.closest("[data-branch-new]")) editBranch(null);
    else if ((t = e.target.closest("[data-branch-edit]"))) editBranch(t.dataset.branchEdit);
    else if ((t = e.target.closest("[data-branch-toggle]"))) toggleBranch(t.dataset.branchToggle);
  });

  BZ.page("salon", render);
})();
