/* =========================================================
   Bloom platform admin: salon approval and monitoring
   (10.3, FR-33, FR-34). Pending applications with documents,
   approve / reject with a reason, salon status, branches,
   services and employees overview.
   ========================================================= */
(function () {
  var st = { tab: "pending", q: "", status: "all" };
  var DOC = { ok: ["Хавсаргасан", "success", "file-check"], missing: ["Хавсаргаагүй", "danger", "file-x"], unreadable: ["Уншигдахгүй", "warning", "file-warning"] };

  var applied;
  function render(params) {
    if (params === applied) params = null; else applied = params;
    if (params && params.tab) st.tab = params.tab;
    var el = BZ.el("salons"), S = ADM.state;
    var apps = S.applications, pending = apps.filter(function (a) { return a.status === "pending"; }), rejected = apps.filter(function (a) { return a.status === "rejected"; });
    el.innerHTML =
      '<div class="page-head"><div><h2>Салон батлах ба хяналт</h2><p>Шинэ бүртгэлийн хүсэлт, бүртгэлтэй салонуудын төлөв</p></div></div>' +
      '<div class="tab-row">' + BZ.tabs("stab", [["pending", "Хүлээгдэж буй (" + pending.length + ")", "hourglass"], ["salons", "Бүртгэлтэй салон (" + S.salons.length + ")", "store"], ["rejected", "Татгалзсан (" + rejected.length + ")", "circle-x"]], st.tab) + "</div>" +
      (st.tab === "pending" ? appList(pending, "Хүлээгдэж буй хүсэлт алга", "Шинэ салон бүртгүүлэхэд энд харагдана.") :
        st.tab === "rejected" ? appList(rejected, "Татгалзсан хүсэлт алга", "Татгалзсан хүсэлтүүд энд хадгалагдана.") : salonTable());
    if (params && params.salon) { var id = params.salon; history.replaceState(null, "", "#/salons?tab=salons"); st.tab = "salons"; setTimeout(function () { openSalon(id); }, 0); }
  }

  /* ---------- Applications ---------- */
  function appList(list, t1, t2) {
    if (!list.length) return BZ.empty("badge-check", t1, t2);
    return '<div class="app-grid">' + list.map(function (a) {
      var miss = a.docs.filter(function (d) { return d[1] !== "ok"; }).length;
      return '<article class="card app-card"><div class="app-top"><span class="avatar">' + AD.initials(a.name) + '</span><div class="grow"><b>' + BZ.esc(a.name) + '</b><span class="xs muted">' + BZ.esc(a.owner) + " · " + a.district + "</span></div>" +
          (a.status === "rejected" ? '<span class="badge badge-danger">Татгалзсан</span>' : miss ? '<span class="badge badge-warning no-dot">Баримт дутуу</span>' : '<span class="badge badge-success no-dot">Баримт бүрэн</span>') + "</div>" +
        '<ul class="meta-list"><li><i data-lucide="calendar"></i>Илгээсэн ' + a.submitted + (a.status === "rejected" ? " · татгалзсан " + a.decided : "") + "</li>" +
          '<li><i data-lucide="tags"></i>' + a.cats.map(BZ.catName).join(", ") + "</li>" +
          '<li><i data-lucide="git-branch"></i>' + a.branches.length + " салбар · " + a.services.length + " үйлчилгээ · " + a.employees.length + " ажилтан</li></ul>" +
        (a.status === "rejected" ? '<p class="note warn-note"><i data-lucide="message-square-warning"></i>' + BZ.esc(a.reason) + "</p>" : "") +
        '<div class="app-actions"><button type="button" class="btn btn-secondary btn-sm" data-app="' + a.id + '">Дэлгэрэнгүй</button>' +
          (a.status === "pending" ? '<button type="button" class="btn btn-ghost btn-sm danger-text" data-app-reject="' + a.id + '">Татгалзах</button><button type="button" class="btn btn-primary btn-sm" data-app-approve="' + a.id + '"><i data-lucide="check"></i>Батлах</button>' : "") +
        "</div></article>";
    }).join("") + "</div>";
  }
  function app(id) { return ADM.state.applications.filter(function (a) { return a.id === id; })[0]; }

  function overview(x) {
    return '<section class="bd-sec"><h4><i data-lucide="git-branch"></i>Салбар (' + x.branches.length + ")</h4>" +
        '<ul class="mini-list">' + x.branches.map(function (b) { return "<li><span><b>" + BZ.esc(b.name) + '</b><span class="xs muted">' + BZ.esc(b.address) + " · " + b.phone + "</span></span></li>"; }).join("") + "</ul></section>" +
      '<section class="bd-sec"><h4><i data-lucide="sparkles"></i>Үйлчилгээ (' + x.services.length + ")</h4>" +
        '<ul class="mini-list">' + x.services.slice(0, 8).map(function (s) { return "<li><span><b>" + BZ.esc(s.name) + '</b><span class="xs muted">' + BZ.catName(s.cat) + " · " + s.duration + " мин</span></span><b>" + BZ.money(s.price) + "</b></li>"; }).join("") + "</ul>" +
        (x.services.length > 8 ? '<p class="xs muted">+ ' + (x.services.length - 8) + " үйлчилгээ</p>" : "") + "</section>" +
      '<section class="bd-sec"><h4><i data-lucide="users"></i>Ажилтан (' + x.employees.length + ")</h4>" +
        (x.employees.length ? '<div class="chip-list">' + x.employees.map(function (e) { return '<span class="badge no-dot">' + BZ.esc(e.name) + " · " + e.role + "</span>"; }).join("") + "</div>" : '<p class="xs muted">Ажилтан бүртгээгүй</p>') + "</section>";
  }

  function openApp(id) {
    var a = app(id);
    var html =
      '<div class="bd-status">' + (a.status === "pending" ? '<span class="badge badge-warning">Хянагдаж буй</span>' : '<span class="badge badge-danger">Татгалзсан</span>') + '<span class="badge no-dot">Илгээсэн ' + a.submitted + "</span></div>" +
      '<section class="bd-sec"><h4><i data-lucide="building-2"></i>Байгууллага</h4><dl class="sum">' +
        "<div><dt>Эзэмшигч</dt><dd>" + BZ.esc(a.owner) + "</dd></div><div><dt>Регистр</dt><dd>" + a.regNo + "</dd></div>" +
        "<div><dt>Утас</dt><dd>" + a.phone + "</dd></div><div><dt>Имэйл</dt><dd>" + BZ.esc(a.email) + "</dd></div>" +
        "<div><dt>Хаяг</dt><dd>" + BZ.esc(a.address) + "</dd></div><div><dt>Ангилал</dt><dd>" + a.cats.map(BZ.catName).join(", ") + "</dd></div>" +
        "<div><dt>Урьдчилгаа хүлээн авах данс</dt><dd class='mono'>" + a.iban + "</dd></div>" +
      "</dl></section>" +
      '<section class="bd-sec"><h4><i data-lucide="folder-check"></i>Баримт бичиг</h4><ul class="doc-list">' + a.docs.map(function (d) {
        var k = DOC[d[1]]; return '<li><i data-lucide="' + k[2] + '" class="doc-' + k[1] + '"></i><span>' + d[0] + '</span><span class="badge badge-' + k[1] + ' no-dot">' + k[0] + "</span></li>";
      }).join("") + '</ul><p class="xs muted">Демо: баримтын файлыг хадгалдаггүй, зөвхөн төлөвийг харуулна.</p></section>' +
      overview(a) +
      (a.status === "rejected" ? '<p class="note warn-note"><i data-lucide="message-square-warning"></i>Татгалзсан шалтгаан: ' + BZ.esc(a.reason) + "</p>" : "") +
      '<div class="modal-foot">' + (a.status === "pending" ? '<button type="button" class="btn btn-secondary" data-app-reject="' + a.id + '"><i data-lucide="x"></i>Татгалзах</button><button type="button" class="btn btn-primary" data-app-approve="' + a.id + '"><i data-lucide="check"></i>Батлах</button>'
        : '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>') + "</div>";
    BZ.modal("app-modal", BZ.esc(a.name), html, { sub: "Бүртгэлийн хүсэлт · " + a.id.toUpperCase(), size: "modal-lg" });
  }

  function approve(id) {
    var a = app(id), miss = a.docs.filter(function (d) { return d[1] !== "ok"; }).length;
    UI.confirm({ title: a.name + "-г батлах уу?", text: (miss ? "Анхаар: " + miss + " баримт дутуу байна. " : "") + "Батлагдсаны дараа салон платформд нэвтэрч, захиалга авч эхэлнэ.", confirmLabel: "Батлах" }, function () {
      var S = ADM.state;
      a.status = "approved"; a.decided = BIZ.day(0);
      var id2 = "new-" + a.id;
      S.salons.push({ id: id2, name: a.name, owner: a.owner, regNo: a.regNo, phone: a.phone, email: a.email, district: a.district, address: a.address, cats: a.cats.slice(), joined: BIZ.day(0),
        status: "active", rating: 0, reviews: 0, branches: a.branches, services: a.services, employees: a.employees, photo: "" });
      S.months[id2] = [{ ym: BZ.currentMonth(), completed: 0, revenue: 0 }]; S.invStatus[id2] = {};
      S.users.push({ id: "u" + (S.users.length + 1), name: a.owner, role: "owner", email: a.email, phone: a.phone, status: "active", joined: BIZ.day(0), lastActive: BIZ.day(0), bookings: 0, salon: id2 });
      S.applications = S.applications.filter(function (x) { return x.id !== a.id; });
      ADM.log("badge-check", a.name + " салоны бүртгэлийг баталлаа");
      UI.closeModal("app-modal"); UI.toast(a.name + " батлагдлаа", "success"); BZ.refresh();
    });
  }
  function reject(id) {
    var a = app(id), reasons = ["Баримт бичиг дутуу", "Баримт уншигдахгүй", "Мэдээлэл зөрүүтэй", "Тусгай зөвшөөрөлгүй", "Бусад"];
    var m = BZ.modal("app-modal", "Хүсэлтийг татгалзах", "<p>" + BZ.esc(a.name) + "-ийн хүсэлт дээр татгалзсан шалтгаан харагдана. Салон засаад дахин илгээх боломжтой.</p>" +
      BZ.field("rj-type", "Шалтгаан", BZ.select("rj-type", [["", "Сонгоно уу"]].concat(reasons.map(function (r) { return [r, r]; })), ""), "", true) +
      BZ.field("rj-note", "Дэлгэрэнгүй тайлбар", '<textarea class="textarea" id="rj-note" maxlength="300" placeholder="Юуг засах шаардлагатайг тодорхой бичнэ үү"></textarea>', "Хамгийн багадаа 10 тэмдэгт", true) +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-app="' + a.id + '">Буцах</button><button type="button" class="btn btn-danger" id="rj-ok">Татгалзах</button></div>', { sub: a.name });
    m.querySelector("#rj-ok").addEventListener("click", function () {
      var ok = BZ.setErr("rj-type", BZ.val("rj-type") ? "" : "Шалтгаан сонгоно уу");
      ok = BZ.setErr("rj-note", BZ.val("rj-note").length >= 10 ? "" : "Тайлбарыг 10-аас доошгүй тэмдэгтээр бичнэ үү") && ok;
      if (!ok) { BZ.firstError(); return; }
      a.status = "rejected"; a.decided = BIZ.day(0); a.reason = BZ.val("rj-type") + ": " + BZ.val("rj-note");
      ADM.log("circle-x", a.name + "-ийн хүсэлтийг татгалзлаа"); UI.closeModal("app-modal"); UI.toast("Хүсэлтийг татгалзлаа", "info"); BZ.refresh();
    });
  }

  /* ---------- Registered salons ---------- */
  function salonTable() {
    var cm = BZ.currentMonth(), all = ADM.allBookings();
    var list = ADM.state.salons.filter(function (s) {
      if (st.status !== "all" && s.status !== st.status) return false;
      if (st.q && (s.name + " " + s.owner + " " + s.district).toLowerCase().indexOf(st.q.toLowerCase()) === -1) return false;
      return true;
    });
    return '<div class="list-filters"><span class="xs muted">' + list.length + " салон</span>" +
        '<div class="list-search"><label class="input-icon"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="sl-q" type="search" placeholder="Салон, эзэмшигч, дүүрэг" value="' + BZ.esc(st.q) + '"></label>' +
        '<label class="inline-select"><span class="sr-only">Төлөв</span>' + BZ.select("sl-status", [["all", "Бүх төлөв"], ["active", "Идэвхтэй"], ["suspended", "Түр хаасан"]], st.status) + "</label></div></div>" +
      BZ.table(["Салон", "Эзэмшигч", { label: "Салбар", cls: "t-num" }, { label: "Үйлчилгээ", cls: "t-num" }, { label: "Ажилтан", cls: "t-num" }, "Үнэлгээ", { label: "Энэ сар", cls: "t-num" }, "Төлөв", { label: "", cls: "t-act" }],
        list.map(function (s) {
          var n = all.filter(function (b) { return b.salonId === s.id && b.date.slice(0, 7) === cm && b.status === "completed"; }).length;
          return { cells: ["<b>" + BZ.esc(s.name) + '</b><span class="cell-sub">' + s.district + " · " + s.joined + "-нд нэгдсэн</span>", BZ.esc(s.owner), s.branches.length, s.services.length, s.employees.length,
            s.rating ? '<span class="nowrap"><i data-lucide="star" class="star-ico"></i>' + s.rating.toFixed(1) + ' <span class="xs muted">(' + s.reviews + ")</span></span>" : '<span class="xs muted">Шинэ</span>',
            n + '<span class="cell-sub">дууссан</span>', salonStatus(s), '<button type="button" class="btn btn-secondary btn-sm" data-salon="' + s.id + '">Дэлгэрэнгүй</button>'] };
        }));
  }
  function salonStatus(s) { return s.status === "active" ? '<span class="badge badge-success">Идэвхтэй</span>' : '<span class="badge badge-danger">Түр хаасан</span>'; }

  function openSalon(id) {
    var s = ADM.salon(id); if (!s) return;
    var cm = BZ.currentMonth(), bks = ADM.allBookings().filter(function (b) { return b.salonId === id; });
    var m = BZ.stats(bks.filter(function (b) { return b.date.slice(0, 7) === cm && b.date <= BIZ.day(0); }));
    var owed = ADM.invoicesOf(id).filter(function (i) { return ["unpaid", "overdue", "review"].indexOf(i.status) > -1; });
    var html =
      '<div class="bd-status">' + salonStatus(s) + (s.rating ? '<span class="badge no-dot"><i data-lucide="star" class="star-ico"></i>' + s.rating.toFixed(1) + " · " + s.reviews + " сэтгэгдэл</span>" : "") + "</div>" +
      '<div class="adm-mini">' +
        "<div><b>" + m.total + "</b><span>Энэ сарын захиалга</span></div><div><b>" + m.completed + "</b><span>Дууссан</span></div>" +
        "<div><b>" + (m.cancelled + m.no_show) + "</b><span>Цуцлагдсан / ирээгүй</span></div><div><b>" + BZ.short(m.revenue) + "₮</b><span>Орлого</span></div></div>" +
      '<section class="bd-sec"><h4><i data-lucide="building-2"></i>Байгууллага</h4><dl class="sum">' +
        "<div><dt>Эзэмшигч</dt><dd>" + BZ.esc(s.owner) + "</dd></div><div><dt>Регистр</dt><dd>" + s.regNo + "</dd></div>" +
        "<div><dt>Утас</dt><dd>" + s.phone + "</dd></div><div><dt>Имэйл</dt><dd>" + BZ.esc(s.email) + "</dd></div>" +
        "<div><dt>Нэгдсэн</dt><dd>" + s.joined + "</dd></div><div><dt>Ангилал</dt><dd>" + s.cats.map(BZ.catName).join(", ") + "</dd></div>" +
        "<div><dt>Төлөгдөөгүй нэхэмжлэх</dt><dd>" + (owed.length ? owed.length + " · " + BZ.money(owed.reduce(function (a, i) { return a + i.amount; }, 0)) : "Байхгүй") + "</dd></div>" +
      "</dl></section>" + overview(s) +
      (s.status === "suspended" ? '<p class="note warn-note"><i data-lucide="pause-circle"></i>Түр хаасан шалтгаан: ' + BZ.esc(s.suspendReason || "—") + "</p>" : "") +
      '<div class="modal-foot wrap-foot"><a class="btn btn-ghost" href="#/bookings?salon=' + s.id + '" data-close-modal><i data-lucide="calendar-search"></i>Захиалга харах</a>' +
        '<a class="btn btn-ghost" href="#/invoices?salon=' + s.id + '" data-close-modal><i data-lucide="receipt"></i>Нэхэмжлэх</a><span class="spacer"></span>' +
        (s.status === "active" ? '<button type="button" class="btn btn-danger" data-salon-suspend="' + s.id + '"><i data-lucide="pause"></i>Түр хаах</button>' :
          '<button type="button" class="btn btn-primary" data-salon-activate="' + s.id + '"><i data-lucide="play"></i>Дахин идэвхжүүлэх</button>') + "</div>";
    BZ.modal("salon-modal", BZ.esc(s.name), html, { sub: s.district + " · " + s.address, size: "modal-lg" });
  }
  function suspend(id) {
    var s = ADM.salon(id);
    var m = BZ.modal("salon-modal", "Салоныг түр хаах", "<p>" + BZ.esc(s.name) + " түр хаагдсан төлөвт шилжинэ. Энэ нь хяналтын тэмдэглэл бөгөөд дахин идэвхжүүлж болно.</p>" +
      BZ.field("ss-reason", "Шалтгаан", '<textarea class="textarea" id="ss-reason" maxlength="200" placeholder="Жишээ: үйлчлүүлэгчдээс давтан гомдол ирсэн"></textarea>', "", true) +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-salon="' + s.id + '">Буцах</button><button type="button" class="btn btn-danger" id="ss-ok">Түр хаах</button></div>', { sub: s.name });
    m.querySelector("#ss-ok").addEventListener("click", function () {
      if (!BZ.setErr("ss-reason", BZ.val("ss-reason").length >= 5 ? "" : "Шалтгаанаа бичнэ үү")) { BZ.firstError(); return; }
      s.status = "suspended"; s.suspendReason = BZ.val("ss-reason"); ADM.log("pause", s.name + " салоныг түр хаалаа");
      UI.closeModal("salon-modal"); UI.toast(s.name + " түр хаагдлаа", "info"); BZ.refresh();
    });
  }
  function activate(id) {
    var s = ADM.salon(id);
    UI.confirm({ title: "Дахин идэвхжүүлэх үү?", text: s.name + " идэвхтэй төлөвт шилжинэ.", confirmLabel: "Идэвхжүүлэх" }, function () {
      s.status = "active"; delete s.suspendReason; ADM.log("play", s.name + " салоныг дахин идэвхжүүллээ");
      UI.closeModal("salon-modal"); UI.toast(s.name + " идэвхжлээ", "success"); BZ.refresh();
    });
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-stab]"))) { st.tab = t.dataset.stab; BZ.refresh(); }
    else if ((t = e.target.closest("[data-app]"))) openApp(t.dataset.app);
    else if ((t = e.target.closest("[data-app-approve]"))) approve(t.dataset.appApprove);
    else if ((t = e.target.closest("[data-app-reject]"))) reject(t.dataset.appReject);
    else if ((t = e.target.closest("[data-salon]"))) openSalon(t.dataset.salon);
    else if ((t = e.target.closest("[data-salon-suspend]"))) suspend(t.dataset.salonSuspend);
    else if ((t = e.target.closest("[data-salon-activate]"))) activate(t.dataset.salonActivate);
  });
  document.addEventListener("change", function (e) { if (e.target.id === "sl-status") { st.status = e.target.value; BZ.refresh(); } });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "sl-q") return;
    clearTimeout(qt); qt = setTimeout(function () { st.q = e.target.value.trim(); BZ.refresh(); AD.refocus("sl-q"); }, 250);
  });

  BZ.page("salons", render);
})();
