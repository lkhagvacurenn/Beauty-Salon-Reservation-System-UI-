/* =========================================================
   Bloom business owner: pages added to match the real business app
   - Бүртгэлийн явц (application status, checklist, photos)  #/onboarding
   - Салоны профайл (legal info, public profile, logo/cover) #/settings
   - Салоноо бүртгүүлэх (7-step wizard + email code)         #/register
   - Шинэ салон нэмэх (same wizard, owner step skipped)      #/new-salon
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA;
  function S() { return BIZ.state; }

  /* Extra demo fields kept in the same store ("bloom-biz") */
  function ext() {
    var s = S();
    if (!s.profile) {
      var g = (D.SALONS.filter(function (x) { return x.id === s.salon.id; })[0] || {}).gallery || [];
      s.profile = {
        status: "ACTIVE", submitted: "2026-05-02 14:20", approved: "2026-05-04 10:05",
        legalType: "company", legalName: "Сарнай Бьюти Студио ХХК", ownerReg: "УБ90010112", slug: "sarnai-beauty-studio",
        cover: g[0] || "", media: { INTERIOR: g.slice(0, 3), WORK: g.slice(3, 6), GALLERY: g.slice(1, 4) }
      };
      BIZ.save();
    }
    return s.profile;
  }
  var STATUS = { ACTIVE: ["Идэвхтэй", "success"], PENDING: ["Шалгагдаж байна", "warning"], REJECTED: ["Татгалзсан", "danger"], SUSPENDED: ["Түр түдгэлзсэн", "danger"] };
  function badge(st) { return '<span class="badge badge-' + STATUS[st][1] + '">' + STATUS[st][0] + "</span>"; }

  /* ================= Бүртгэлийн явц ================= */
  function checklist() {
    var p = ext();
    return [
      { key: "interior", label: "Салоны орчны зураг", done: p.media.INTERIOR.length > 0, count: p.media.INTERIOR.length },
      { key: "work", label: "Хийсэн ажлын зураг", done: p.media.WORK.length > 0, count: p.media.WORK.length },
      { key: "payout", label: "Салбар бүрийн орлогын данс", done: S().branches.every(function (b) { return !!b.iban; }) }
    ];
  }
  function renderOnboarding() {
    var el = BZ.el("onboarding"), p = ext(), items = checklist(), done = items.filter(function (i) { return i.done; }).length;
    var noIban = S().branches.filter(function (b) { return !b.iban; });
    el.innerHTML =
      '<div class="page-head"><div><h2>Бүртгэлийн явц</h2><p>' + BZ.esc(S().salon.name) + "</p></div>" +
        '<div class="ob-head-r">' + badge(p.status) + '<label class="inline-select"><span class="sr-only">Демо төлөв</span>' +
        BZ.select("ob-demo", [["ACTIVE", "Демо: батлагдсан"], ["PENDING", "Демо: шалгагдаж байна"], ["REJECTED", "Демо: татгалзсан"]], p.status) + "</label></div></div>" +
      '<div class="narrow-col">' +
      (p.status === "ACTIVE" ?
        '<div class="card ob-hero"><span class="ob-ic ok"><i data-lucide="party-popper"></i></span><h3>Салон батлагдсан!</h3>' +
          "<p>Үйлчлүүлэгчид таны салоныг хайж, онлайнаар захиалах боломжтой боллоо.</p>" +
          '<p class="xs muted">Илгээсэн: ' + p.submitted + " · Баталсан: " + p.approved + "</p>" +
          '<a class="btn btn-primary" href="#/dashboard">Хянах самбар руу<i data-lucide="arrow-right"></i></a></div>'
      :
        '<div class="card ob-pending"><div class="ob-row"><span class="ob-ic warn"><i data-lucide="' + (p.status === "PENDING" ? "hourglass" : "circle-x") + '"></i></span><div>' +
          "<h3>" + (p.status === "PENDING" ? "Хүсэлт шалгагдаж байна" : "Хүсэлт татгалзагдсан") + "</h3>" +
          '<p class="muted">Илгээсэн: ' + p.submitted + ". " + (p.status === "PENDING" ? "Ихэвчлэн 1–2 ажлын өдөрт шалгана. Доорх " + items.length + " шаардлагыг бүрдүүлбэл шалгалт хурдан явна." :
            "Шалтгаан: “Хийсэн ажлын зураг тодорхой бус байна.” Зургаа шинэчлээд дахин илгээнэ үү.") + "</p></div></div>" +
          '<div class="ob-prog"><div><b>Бэлэн байдал</b><span>' + done + "/" + items.length + "</span></div>" + BZ.progress(done / items.length * 100, "is-success") + "</div>" +
          '<ul class="ob-check">' + items.map(function (i) {
            return '<li class="' + (i.done ? "is-done" : "") + '"><i data-lucide="' + (i.done ? "circle-check" : "circle") + '"></i><span>' + i.label + "</span>" + (i.count != null ? '<span class="xs muted">' + i.count + "</span>" : "") + "</li>";
          }).join("") + "</ul>" +
          (p.status === "REJECTED" ? '<div class="modal-foot" style="border:0;padding:0"><button type="button" class="btn btn-primary" data-ob-resubmit><i data-lucide="send"></i>Дахин илгээх</button></div>' : "") +
        "</div>") +
      '<div class="card"><div class="card-title"><div><h3>Зураг оруулах</h3><p class="xs muted" style="margin:2px 0 0">Админ эдгээр зургаар салоныг шалгана</p></div></div>' +
        media("INTERIOR", "Салоны орчин", "Хүлээлгийн хэсэг, ажлын байр, гадна талын зураг. Бүртгэлийн шалгалтад заавал.") +
        media("WORK", "Хийсэн ажил", "Өөрсдийн хийсэн үс, хумс, будалтын зураг. Бүртгэлийн шалгалтад заавал.") +
        media("GALLERY", "Галерей", "Салоны нүүр хуудсанд харагдах нэмэлт зургууд.") +
      "</div>" +
      (noIban.length ? '<div class="card ob-row ob-iban"><i data-lucide="landmark"></i><div class="grow"><b>Орлогын данс оруулаагүй салбар байна</b><p class="xs muted">QPay төлбөр хүлээн авахын тулд салбар бүрт данс хэрэгтэй.</p></div><a class="btn btn-secondary" href="#/salon">Данс оруулах</a></div>' : "") +
      "</div>";
  }
  function media(kind, title, text) {
    var list = ext().media[kind];
    return '<section class="mm"><div class="mm-head"><div><b>' + title + '</b><span class="xs muted">' + text + '</span></div><span class="badge no-dot">' + list.length + "</span></div>" +
      '<div class="mm-grid">' + list.map(function (src, i) {
        return '<div class="mm-item">' + BZ.img(src, title) + '<button type="button" class="icon-btn plain mm-del" data-mm-del="' + kind + ":" + i + '" aria-label="Зургийг устгах"><i data-lucide="trash-2"></i></button></div>';
      }).join("") +
      '<label class="mm-add"><input type="file" accept="image/*" class="sr-only" data-mm-add="' + kind + '"><i data-lucide="image-plus"></i><span>Зураг нэмэх</span><span class="xs muted">JPG, PNG · 5MB хүртэл</span></label></div></section>';
  }

  /* ================= Салоны профайл ================= */
  function renderSettings() {
    var el = BZ.el("settings"), s = S().salon, p = ext();
    el.innerHTML =
      '<div class="page-head"><div><h2>Салоны профайл</h2><p>Үйлчлүүлэгчдэд харагдах мэдээлэл, зураг</p></div>' +
        '<a class="btn btn-secondary" href="#/new-salon"><i data-lucide="plus"></i>Шинэ салон нэмэх</a></div>' +
      '<div class="set-grid">' +
        '<div class="card set-side">' +
          '<div class="set-cover">' + BZ.img(p.cover, "Нүүр зураг") + '<label class="img-change"><input type="file" accept="image/*" class="sr-only" data-set-img="cover"><i data-lucide="camera"></i><span class="sr-only">Нүүр зураг солих</span></label>' +
            '<div class="set-logo">' + BZ.img(s.logo, "Лого") + '<label class="img-change"><input type="file" accept="image/*" class="sr-only" data-set-img="logo"><i data-lucide="camera"></i><span class="sr-only">Лого солих</span></label></div></div>' +
          '<div class="set-name"><b>' + BZ.esc(s.name) + '</b><span class="xs muted">' + BZ.esc(s.tagline || "Уриа оруулаагүй") + "</span></div>" +
          '<dl class="set-dl">' +
            "<div><dt>Төлөв</dt><dd>" + badge(p.status) + "</dd></div>" +
            "<div><dt>Төрөл</dt><dd>" + (p.legalType === "company" ? "Компани" : "Хувь хүн") + "</dd></div>" +
            "<div><dt>Хуулийн нэр</dt><dd>" + BZ.esc(p.legalName) + "</dd></div>" +
            "<div><dt>Регистр</dt><dd>" + s.regNo + "</dd></div>" +
            "<div><dt>Эзэмшигчийн регистр</dt><dd>" + p.ownerReg + "</dd></div>" +
            "<div><dt>Үнэлгээ</dt><dd>" + BZ.stars(4.8) + " 4.8</dd></div>" +
            "<div><dt>Хаяг (slug)</dt><dd><code>bloom.mn/salons/" + p.slug + "</code></dd></div>" +
          "</dl><p class='xs muted'>Хуулийн мэдээллийг өөрчлөх бол платформын админд хандана уу.</p></div>" +
        '<div class="card"><div class="card-title"><h3>Ерөнхий мэдээлэл</h3></div>' +
          BZ.field("st-name", "Салоны нэр", BZ.input("st-name", s.name), "", true) +
          BZ.field("st-tag", "Товч уриа", BZ.input("st-tag", s.tagline, "text", 'maxlength="150" placeholder="Үс, хумс, будалт нэг дор"'), "150 тэмдэгт хүртэл") +
          BZ.field("st-desc", "Танилцуулга", '<textarea class="textarea" id="st-desc" rows="4">' + BZ.esc(s.description) + "</textarea>") +
          '<div class="form-grid">' +
            BZ.field("st-phone", "Утас", BZ.input("st-phone", s.phone, "tel")) +
            BZ.field("st-email", "Имэйл", BZ.input("st-email", s.email, "email")) +
          "</div>" +
          BZ.field("st-web", "Вэбсайт", BZ.input("st-web", s.web ? (/^https?:/.test(s.web) ? s.web : "https://" + s.web) : "", "url", 'placeholder="https://"')) +
          '<div class="modal-foot" style="border:0;padding-inline:0"><button type="button" class="btn btn-primary" id="st-save"><i data-lucide="check"></i>Хадгалах</button></div>' +
        "</div>" +
      "</div>" +
      '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><h3>Зургийн сан</h3></div>' + media("GALLERY", "Галерей", "Салоны нүүр хуудсанд харагдах нэмэлт зургууд.") + "</div>";
  }
  function saveSettings() {
    var s = S().salon, web = BZ.val("st-web");
    var ok = BZ.setErr("st-name", BZ.val("st-name") ? "" : "Салоны нэрийг оруулна уу");
    ok = BZ.setErr("st-web", !web || /^https?:\/\//.test(web) ? "" : "Вэбсайт http:// эсвэл https://-ээр эхэлнэ") && ok;
    if (!ok) return;
    s.name = BZ.val("st-name"); s.tagline = BZ.val("st-tag"); s.description = BZ.val("st-desc"); s.phone = BZ.val("st-phone"); s.email = BZ.val("st-email"); s.web = web;
    BIZ.save(); UI.toast("Профайл хадгалагдлаа", "success"); BZ.refresh();
  }

  /* ================= Салоноо бүртгүүлэх / Шинэ салон ================= */
  var STEPS = [["owner", "Эзэмшигч", "user-round"], ["salon", "Салон", "store"], ["branch", "Салбар", "map-pin"], ["services", "Үйлчилгээ", "sparkles"],
    ["staff", "Ажилтан", "users"], ["bank", "Данс", "landmark"], ["review", "Шалгах", "list-checks"]];
  var wz = { step: 0, mode: "register", sent: false, verified: false, legal: "company" };
  function steps() { return wz.mode === "new" ? STEPS.slice(1) : STEPS; }
  function stepper() {
    var list = steps();
    return '<ol class="wz-steps">' + list.map(function (s, i) {
      var st = i < wz.step ? "done" : i === wz.step ? "on" : "";
      return '<li class="' + st + '"><span class="wz-dot">' + (i < wz.step ? '<i data-lucide="check"></i>' : i + 1) + '</span><span class="wz-name">' + s[1] + "</span></li>";
    }).join("") + "</ol>";
  }
  function stepBody(key) {
    var cats = D.CATEGORIES.map(function (c) { return [c.id, c.name]; });
    switch (key) {
      case "owner": return '<h3>Эзэмшигчийн бүртгэл</h3><div class="form-grid">' +
        BZ.field("wz-oname", "Овог нэр", BZ.input("wz-oname", "", "text", 'placeholder="Батын Сарнай"'), "", true) +
        BZ.field("wz-oemail", "Имэйл", BZ.input("wz-oemail", "", "email", 'placeholder="sarnai@example.mn"'), "Баталгаажуулах код энэ хаягаар очно", true) +
        BZ.field("wz-ophone", "Утас", BZ.input("wz-ophone", "", "tel", 'placeholder="9911-2233"'), "Заавал биш. Оруулбал утасны дугаараараа нэвтэрч болно") +
        "<span></span>" +
        BZ.field("wz-pass", "Нууц үг", BZ.input("wz-pass", "", "password"), "8+ тэмдэгт, үсэг ба тоо", true) +
        BZ.field("wz-pass2", "Нууц үг давтах", BZ.input("wz-pass2", "", "password"), "", true) + "</div>";
      case "salon": return '<h3>Салоны мэдээлэл</h3>' +
        '<div class="field"><span class="label-like">Төрөл</span><div class="segmented" role="radiogroup">' +
          '<button type="button" data-wz-legal="company" aria-pressed="' + (wz.legal === "company") + '">Компани <span class="xs muted">ХХК, регистр 7 орон</span></button>' +
          '<button type="button" data-wz-legal="person" aria-pressed="' + (wz.legal === "person") + '">Хувь хүн <span class="xs muted">Иргэний регистр</span></button></div></div>' +
        '<div class="form-grid">' +
          BZ.field("wz-sname", "Салоны нэр", BZ.input("wz-sname", "", "text", 'placeholder="Сарнай Бьюти"'), "", true) +
          BZ.field("wz-legal", wz.legal === "company" ? "Байгууллагын нэр (гэрчилгээн дээрх)" : "Овог нэр (иргэний үнэмлэх дээрх)", BZ.input("wz-legal", "", "text", 'placeholder="' + (wz.legal === "company" ? "Сарнай Бьюти ХХК" : "Батын Сарнай") + '"'), "", true) +
          BZ.field("wz-reg", wz.legal === "company" ? "Байгууллагын регистр" : "Таны регистрийн дугаар", BZ.input("wz-reg", "", "text", 'placeholder="' + (wz.legal === "company" ? "6543210" : "УБ90010112") + '"'), "", true) +
          (wz.legal === "company" ? BZ.field("wz-oreg", "Эзэмшигчийн регистр", BZ.input("wz-oreg", "", "text", 'placeholder="УБ90010112"'), "", true) : "<span></span>") +
          BZ.field("wz-sphone", "Утас", BZ.input("wz-sphone", "", "tel"), "", true) + BZ.field("wz-semail", "Имэйл", BZ.input("wz-semail", "", "email"), "", true) +
        "</div>" +
        BZ.field("wz-tag", "Товч уриа (заавал биш)", BZ.input("wz-tag", "", "text", 'placeholder="Үс, хумс, будалт хотын төвд"')) +
        '<div class="field"><span class="label-like">Ангилал</span><div class="chips">' + D.CATEGORIES.map(function (c, i) { return '<button type="button" class="chip" aria-pressed="' + (i < 2) + '" data-wz-chip><i data-lucide="' + c.icon + '"></i>' + c.name + "</button>"; }).join("") + "</div></div>";
      case "branch": return '<h3>Эхний салбар</h3><div class="form-grid">' +
        BZ.field("wz-bname", "Салбарын нэр", BZ.input("wz-bname", "Төв салбар"), "", true) +
        BZ.field("wz-bdist", "Дүүрэг", BZ.select("wz-bdist", D.DISTRICTS.map(function (d) { return [d, d]; }), "Сүхбаатар"), "", true) + "</div>" +
        BZ.field("wz-baddr", "Хаяг", BZ.input("wz-baddr", "", "text", 'placeholder="1-р хороо, Энхтайваны өргөн чөлөө 15"'), "Хаягаар Google Maps дээрх байршлыг автоматаар олно", true) +
        '<div class="wz-map"><i data-lucide="map-pin"></i><span>Газрын зураг дээр байршлаа тохируулна (LocationPicker)</span></div>' +
        '<div class="form-grid">' + BZ.field("wz-open", "Нээх цаг", BZ.input("wz-open", "10:00", "time")) + BZ.field("wz-close", "Хаах цаг", BZ.input("wz-close", "20:00", "time")) + "</div>";
      case "services": return '<h3>Үйлчилгээ</h3><p class="xs muted">Үнэ бүх салбарт ижил тохируулагдана; дараа нь салбар тус бүрээр өөрчилж болно. Хоосон мөрийг алгасна.</p>' +
        '<div class="wz-rows"><div class="wz-row wz-row-h"><span>Нэр</span><span>Ангилал</span><span>Хугацаа (мин)</span><span>Үнэ (₮)</span><span>Урьдчилгаа (₮)</span><span></span></div>' +
        [["Эмэгтэй үс засалт", "hair", 60, 35000, 10000], ["Гель маникюр", "nails", 60, 38000, 0], ["", "", 30, "", ""]].map(function (r, i) {
          return '<div class="wz-row"><input class="input" value="' + r[0] + '" placeholder="Эмэгтэй үс засалт">' + BZ.select("wz-c" + i, [["", "Сонгох"]].concat(cats), r[1]) +
            '<input class="input" type="number" value="' + r[2] + '"><input class="input" type="number" value="' + r[3] + '"><input class="input" type="number" value="' + r[4] + '">' +
            '<button type="button" class="icon-btn plain" aria-label="Хасах"><i data-lucide="x"></i></button></div>';
        }).join("") + '</div><button type="button" class="btn btn-ghost btn-sm"><i data-lucide="plus"></i>Мөр нэмэх</button>';
      case "staff": return '<h3>Ажилтан</h3><p class="xs muted">Мэргэжилтнүүдээ одоо эсвэл дараа нэмж болно. Ажлын цаг, нэвтрэх эрхийг бүртгэл батлагдсаны дараа тохируулна.</p>' +
        '<div class="wz-rows">' + [["Анужин", "Ганбаатар", "Ахлах үсчин", "anujin@example.mn"], ["", "", "", ""]].map(function (r) {
          return '<div class="wz-row wz-row-4"><input class="input" placeholder="Нэр" value="' + r[0] + '"><input class="input" placeholder="Овог" value="' + r[1] + '"><input class="input" placeholder="Үсчин" value="' + r[2] + '"><input class="input" type="email" placeholder="Имэйл" value="' + r[3] + '"></div>';
        }).join("") + "</div>" + '<button type="button" class="btn btn-ghost btn-sm"><i data-lucide="user-plus"></i>Ажилтан нэмэх</button>';
      case "bank": return '<h3>Орлогын данс</h3><p class="xs muted">Үйлчлүүлэгчийн QPay төлбөр (урьдчилгаа, үлдэгдэл) энэ дансанд шууд орно. Бүх салбарт ижил данс тохируулагдана.</p><div class="form-grid">' +
        BZ.field("wz-bank", "Банк", BZ.select("wz-bank", BZ.DEP_BANKS.map(function (b) { return [b, b]; }), BZ.DEP_BANKS[0]), "", true) +
        BZ.field("wz-iban", "IBAN дансны дугаар", BZ.input("wz-iban", "", "text", 'placeholder="MN12 0005 0059 8765 4321"'), "", true) +
        BZ.field("wz-holder", "Данс эзэмшигч", BZ.input("wz-holder", "", "text", 'placeholder="Сарнай Бьюти ХХК"'), "", true) + "</div>" +
        '<p class="note"><i data-lucide="info"></i>Дараа оруулах боломжтой. Данс оруулаагүй салбар онлайн урьдчилгаа авахгүй.</p>';
      default: return '<h3>Шалгах</h3><dl class="wz-review">' +
        (wz.mode === "new" ? "" : "<div><dt>Эзэмшигч</dt><dd>Батын Сарнай · sarnai@example.mn</dd></div>") +
        "<div><dt>Салон</dt><dd>Сарнай Бьюти · Компани · 6543210 · эзэмшигч УБ90010112</dd></div>" +
        "<div><dt>Салбар</dt><dd>Төв салбар · Сүхбаатар дүүрэг · 10:00–20:00</dd></div>" +
        "<div><dt>Үйлчилгээ</dt><dd>2 үйлчилгээ</dd></div><div><dt>Ажилтан</dt><dd>1 ажилтан</dd></div>" +
        "<div><dt>Орлогын данс</dt><dd>Дараа оруулна</dd></div></dl>" +
        '<p class="note"><i data-lucide="shield-check"></i>Хүсэлт илгээсний дараа платформын админ шалгаж батална. Батлагдтал салон хэрэглэгчдэд харагдахгүй.</p>';
    }
  }
  function wizard(mode) {
    var list = steps(), key = list[wz.step][0], last = wz.step === list.length - 1;
    return '<div class="card wz">' + stepper() + '<div class="wz-body">' + stepBody(key) + "</div>" +
      '<div class="wz-foot">' + (wz.step ? '<button type="button" class="btn btn-secondary" data-wz-step="-1"><i data-lucide="arrow-left"></i>Буцах</button>' : "<span></span>") +
      '<button type="button" class="btn btn-primary" data-wz-step="1">' + (last ? '<i data-lucide="send"></i>Хүсэлт илгээх' : 'Үргэлжлүүлэх<i data-lucide="arrow-right"></i>') + "</button></div></div>";
  }
  function renderRegister() {
    var el = BZ.el("register");
    wz.mode = "register";
    if (wz.verified) {
      el.innerHTML = '<div class="auth-wrap"><div class="card ob-hero"><span class="ob-ic ok"><i data-lucide="badge-check"></i></span><h3>Бүртгэл баталгаажлаа</h3>' +
        '<p>Салоны хүсэлт админд илгээгдлээ. Шалгалтын явцыг “Бүртгэлийн явц” хуудаснаас харна.</p><a class="btn btn-primary" href="#/onboarding">Бүртгэлийн явц<i data-lucide="arrow-right"></i></a></div></div>';
      return;
    }
    if (wz.sent) {
      el.innerHTML = '<div class="auth-wrap"><div class="card wz-otp"><span class="ob-ic"><i data-lucide="mail-check"></i></span><h3>Имэйлээ баталгаажуулна уу</h3>' +
        '<p class="muted">sarnai@example.mn хаяг руу 6 оронтой код илгээлээ (Resend). Демо код: <b>123456</b></p>' +
        '<div class="otp">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<input class="input" maxlength="1" inputmode="numeric" aria-label="Баталгаажуулах код ' + (i + 1) + '">'; }).join("") + "</div>" +
        '<button type="button" class="btn btn-primary btn-block" data-wz-verify>Баталгаажуулах</button>' +
        '<button type="button" class="btn btn-ghost btn-sm" data-wz-resend>Шинэ код илгээх</button></div></div>';
      return;
    }
    el.innerHTML = '<div class="page-head"><div><h2>Салоноо Bloom-д бүртгүүлэх</h2><p>7 алхам. Эзэмшигч, салон, салбар, үйлчилгээ, ажилтан, данс. Илгээсний дараа имэйлээ баталгаажуулна.</p></div></div>' + wizard();
  }
  function renderNewSalon() {
    var el = BZ.el("new-salon");
    wz.mode = "new";
    el.innerHTML = '<div class="page-head"><div><h2>Шинэ салон нэмэх</h2><p>Салон бүр тусдаа шалгагдаж батлагдана. Батлагдтал хэрэглэгчдэд харагдахгүй.</p></div></div>' + wizard();
  }
  function stepWizard(k) {
    var list = steps();
    if (k > 0 && wz.step === list.length - 1) {
      if (wz.mode === "new") { UI.toast("Салоны хүсэлт илгээгдлээ", "success"); wz.step = 0; location.hash = "#/onboarding"; return; }
      wz.sent = true; BZ.refresh(); return;
    }
    wz.step = Math.max(0, Math.min(list.length - 1, wz.step + k));
    BZ.refresh(); window.scrollTo(0, 0);
  }

  /* ================= Events ================= */
  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-wz-step]"))) stepWizard(+t.dataset.wzStep);
    else if ((t = e.target.closest("[data-wz-legal]"))) { wz.legal = t.dataset.wzLegal; BZ.refresh(); }
    else if ((t = e.target.closest("[data-wz-chip]"))) t.setAttribute("aria-pressed", t.getAttribute("aria-pressed") !== "true");
    else if (e.target.closest("[data-wz-resend]")) UI.toast("Шинэ код илгээлээ", "info");
    else if (e.target.closest("[data-wz-verify]")) {
      var code = Array.prototype.map.call(document.querySelectorAll(".otp input"), function (i) { return i.value; }).join("");
      if (code !== "123456") { UI.toast("Код буруу байна. Демо код: 123456", "error"); return; }
      wz.verified = true; BZ.refresh();
    }
    else if (e.target.closest("#st-save")) saveSettings();
    else if (e.target.closest("[data-ob-resubmit]")) { ext().status = "PENDING"; BIZ.save(); UI.toast("Хүсэлт дахин илгээгдлээ", "success"); BZ.refresh(); }
    else if ((t = e.target.closest("[data-mm-del]"))) {
      var p = t.dataset.mmDel.split(":");
      UI.confirm({ title: "Зургийг устгах уу?", text: "Энэ зураг салоны хуудаснаас хасагдана.", confirmLabel: "Устгах" }, function () {
        ext().media[p[0]].splice(+p[1], 1); BIZ.save(); UI.toast("Зураг устгагдлаа", "success"); BZ.refresh();
      });
    }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "ob-demo") { ext().status = t.value; BIZ.save(); BZ.refresh(); }
    else if (t.dataset && t.dataset.mmAdd) BZ.readImage(t.files[0], function (src) { ext().media[t.dataset.mmAdd].push(src); BIZ.save(); UI.toast("Зураг нэмэгдлээ", "success"); BZ.refresh(); });
    else if (t.dataset && t.dataset.setImg) BZ.readImage(t.files[0], function (src) {
      if (t.dataset.setImg === "cover") ext().cover = src; else S().salon.logo = src;
      BIZ.save(); UI.toast("Зураг шинэчлэгдлээ", "success"); BZ.refresh();
    });
  });
  document.addEventListener("input", function (e) {
    if (!e.target.closest(".otp")) return;
    var n = e.target.nextElementSibling; if (e.target.value && n) n.focus();
  });

  BZ.page("onboarding", renderOnboarding);
  BZ.page("settings", renderSettings);
  BZ.page("register", renderRegister);
  BZ.page("new-salon", renderNewSalon);
})();
