/* =========================================================
   Bloom platform admin: pages added to match the real admin app
   - Үйл ажиллагааны лог (audit log)     #/activity
   - Үйлчилгээний ангилал                 #/categories
   - Статистик (сараар)                   #/stats
   - Төлбөр (бүх гүйлгээ, зөвхөн харах)  #/payments
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA;

  /* ---------------- Үйл ажиллагааны лог ---------------- */
  var ACT = {
    create: ["Үүсгэсэн", "success"], update: ["Зассан", "info"], approve: ["Баталсан", "success"], reject: ["Татгалзсан", "danger"],
    suspend: ["Түдгэлзүүлсэн", "warning"], delete: ["Устгасан", "danger"], login: ["Нэвтэрсэн", "info"], pay: ["Төлсөн", "success"]
  };
  var OBJ = { salon: "Салон", user: "Хэрэглэгч", booking: "Захиалга", review: "Сэтгэгдэл", payment: "Төлбөр", invoice: "Нэхэмжлэх", ad: "Сурталчилгаа", category: "Ангилал", employee: "Ажилтан" };
  var ICON_MAP = {
    "user-plus": ["create", "user"], store: ["create", "salon"], flag: ["update", "review"], "circle-x": ["reject", "salon"], receipt: ["create", "invoice"],
    check: ["update", "review"], "eye-off": ["update", "review"], eye: ["update", "review"], "trash-2": ["delete", "review"], "badge-check": ["approve", "salon"],
    ban: ["suspend", "salon"], megaphone: ["update", "ad"], "user-x": ["suspend", "user"], "user-check": ["update", "user"]
  };
  var act = { action: "all", obj: "all", q: "", page: 1 };

  function seedLog() {
    var d = function (k) { return BIZ.day(k); };
    return [
      { at: d(0) + " 10:24", who: "Ганцэцэг Батсүх", role: "owner", action: "update", obj: "employee", text: "Хулан Б.-ийн эрхийг өөрчиллөө (Менежер → Ажилтан)" },
      { at: d(0) + " 08:51", who: "Систем", role: "system", action: "pay", obj: "payment", text: "BK-24318 урьдчилгаа QPay-ээр баталгаажлаа (payment/check)" },
      { at: d(-1) + " 21:10", who: "Номин Э.", role: "customer", action: "create", obj: "booking", text: "Сарнай Бьюти Студио · Гель маникюр захиалга үүсгэлээ" },
      { at: d(-1) + " 14:32", who: "Админ Бат-Очир", role: "admin", action: "update", obj: "category", text: "“Арьс арчилгаа” ангиллын эрэмбийг 6 болголоо" },
      { at: d(-2) + " 09:03", who: "Админ Бат-Очир", role: "admin", action: "login", obj: "user", text: "Платформын удирдлагад нэвтэрлээ" },
      { at: d(-4) + " 17:45", who: "Сэлэнгэ Барбершоп", role: "owner", action: "update", obj: "salon", text: "Салбарын орлогын данс шинэчиллээ" },
      { at: d(-6) + " 12:20", who: "Админ Бат-Очир", role: "admin", action: "approve", obj: "salon", text: "Лотус Спа салоныг баталлаа" }
    ];
  }
  function allLog() {
    var mine = ADM.state.log.map(function (l) {
      var m = ICON_MAP[l.icon] || ["update", "salon"];
      var sys = /Систем|нэхэмжлэх .*илгээгдлээ/.test(l.text), cust = /бүртгүүллээ/.test(l.text), own = /хүсэлт илгээлээ/.test(l.text);
      return { at: l.at, who: sys ? "Систем" : cust ? l.text.split(": ")[1] || "Хэрэглэгч" : own ? l.text.split(" салон")[0] : "Админ Бат-Очир",
        role: sys ? "system" : cust ? "customer" : own ? "owner" : "admin", action: m[0], obj: m[1], text: l.text };
    });
    return mine.concat(seedLog()).sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  }
  function renderActivity() {
    var el = BZ.el("activity"), all = allLog(), per = 10;
    var list = all.filter(function (l) {
      return (act.action === "all" || l.action === act.action) && (act.obj === "all" || l.obj === act.obj) &&
        (!act.q || (l.text + " " + l.who).toLowerCase().indexOf(act.q.toLowerCase()) > -1);
    });
    var page = Math.min(act.page, Math.max(1, Math.ceil(list.length / per)));
    el.innerHTML =
      '<div class="page-head"><div><h2>Үйл ажиллагааны лог</h2></div></div>' +
      '<div class="adm-filters">' +
        '<label class="input-icon grow-sm"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="al-q" type="search" placeholder="Тайлбар, хэрэглэгч" value="' + BZ.esc(act.q) + '"></label>' +
        '<label class="inline-select"><i data-lucide="activity"></i><span class="sr-only">Үйлдэл</span>' + BZ.select("al-action", [["all", "Бүх үйлдэл"]].concat(Object.keys(ACT).map(function (k) { return [k, ACT[k][0]]; })), act.action) + "</label>" +
        '<label class="inline-select"><i data-lucide="box"></i><span class="sr-only">Объектын төрөл</span>' + BZ.select("al-obj", [["all", "Бүх объект"]].concat(Object.keys(OBJ).map(function (k) { return [k, OBJ[k]]; })), act.obj) + "</label>" +
      "</div>" +
      '' + BZ.table(["Огноо", "Хэн", "Үйлдэл", "Объект", "Тайлбар"], list.slice((page - 1) * per, page * per).map(function (l) {
        return { cells: [
          '<span class="nowrap">' + l.at + "</span>",
          l.role === "system" ? '<span class="u-cell"><span class="avatar sys"><i data-lucide="cpu"></i></span>Систем</span>' :
            '<span class="u-cell"><span class="avatar">' + AD.initials(l.who) + "</span><span><b>" + BZ.esc(l.who) + "</b>" + (AD.ROLES[l.role] ? '<span class="cell-sub">' + AD.ROLES[l.role][0] + "</span>" : "") + "</span></span>",
          '<span class="badge badge-' + ACT[l.action][1] + ' no-dot">' + ACT[l.action][0] + "</span>",
          OBJ[l.obj], BZ.esc(l.text)
        ] };
      }), { empty: BZ.empty("history", "Бүртгэл олдсонгүй", "Шүүлтүүрээ өөрчилж үзнэ үү.") }) +
      BZ.pager(list.length, page, per, "data-al-page");
  }

  /* ---------------- Үйлчилгээний ангилал ---------------- */
  function catState() {
    var s = ADM.state;
    if (!s.categories) {
      s.categories = D.CATEGORIES.map(function (c, i) {
        return { code: c.id, name: c.name, icon: c.icon, order: i + 1, active: true, desc: "" };
      });
      s.categories.push({ code: "tattoo", name: "Шивээс", icon: "pen-tool", order: 8, active: false, desc: "Туршилтаар нэмсэн, одоогоор идэвхгүй" });
      ADM.save();
    }
    return s.categories;
  }
  function svcCount(code) {
    var n = 0;
    (D.SALONS || []).forEach(function (s) { (s.services || []).forEach(function (x) { if (x.cat === code) n++; }); });
    ADM.state.salons.forEach(function (s) { (s.services || []).forEach(function (x) { if (x.cat === code) n++; }); });
    return n;
  }
  function renderCategories() {
    var el = BZ.el("categories"), cats = catState().slice().sort(function (a, b) { return a.order - b.order; });
    el.innerHTML =
      '<div class="page-head"><div><h2>Үйлчилгээний ангилал</h2></div>' +
        '<button type="button" class="btn btn-primary" data-cat-new><i data-lucide="plus"></i>Шинэ ангилал</button></div>' +
      '' + BZ.table(["Ангилал", "Код", { label: "Үйлчилгээ", cls: "t-num" }, { label: "Эрэмбэ", cls: "t-num" }, "Төлөв", { label: "", cls: "t-act" }], cats.map(function (c) {
        return { cells: [
          '<span class="u-cell"><span class="cat-ic"><i data-lucide="' + c.icon + '"></i></span><span><b>' + BZ.esc(c.name) + "</b>" + (c.desc ? '<span class="cell-sub">' + BZ.esc(c.desc) + "</span>" : "") + "</span></span>",
          "<code>" + c.code + "</code>", String(svcCount(c.code)), String(c.order),
          c.active ? '<span class="badge badge-success">Идэвхтэй</span>' : '<span class="badge badge-neutral">Идэвхгүй</span>',
          '<button type="button" class="btn btn-ghost btn-sm" data-cat-edit="' + c.code + '"><i data-lucide="pencil"></i>Засах</button>'
        ] };
      }), { empty: BZ.empty("tags", "Ангилал алга", "Эхний ангиллаа нэмнэ үү.") });
  }
  function catModal(code) {
    var c = catState().filter(function (x) { return x.code === code; })[0], isNew = !c;
    c = c || { code: "", name: "", icon: "sparkles", order: catState().length + 1, active: true, desc: "" };
    var m = BZ.modal("cat-modal", isNew ? "Шинэ ангилал" : "Ангилал засах",
      '<div class="form-grid">' +
        BZ.field("cf-name", "Нэр", BZ.input("cf-name", c.name, "text", 'placeholder="Жишээ: Арьс арчилгаа"'), "", true) +
        BZ.field("cf-code", "Код", BZ.input("cf-code", c.code, "text", (isNew ? "" : "readonly ") + 'placeholder="skin_care"'), "Латин жижиг үсэг ба _ (2–30 тэмдэгт). Код нь URL болон шүүлтүүрт хэрэглэгдэнэ.", true) +
        BZ.field("cf-icon", "Дүрс (lucide)", BZ.input("cf-icon", c.icon), "lucide.dev дээрх дүрсний нэр (kebab-case).") +
        BZ.field("cf-order", "Эрэмбэ", BZ.input("cf-order", c.order, "number", 'min="0"')) +
      "</div>" + BZ.field("cf-desc", "Тайлбар", '<textarea class="textarea" id="cf-desc" rows="2">' + BZ.esc(c.desc) + "</textarea>") +
      '<div class="field"><span class="label-like">Төлөв</span>' + BZ.sw("cf-active", c.active, "Идэвхтэй (хайлтад харагдана)") + "</div>" +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" data-cat-save="' + (isNew ? "" : c.code) + '">' + (isNew ? "Нэмэх" : "Хадгалах") + "</button></div>");
    return m;
  }
  function catSave(code) {
    var name = BZ.val("cf-name"), cc = BZ.val("cf-code"), icon = BZ.val("cf-icon") || "sparkles", order = BZ.val("cf-order");
    var ok = BZ.setErr("cf-name", name ? "" : "Нэр оруулна уу");
    ok = BZ.setErr("cf-code", /^[a-z_]{2,30}$/.test(cc) ? (!code && catState().some(function (x) { return x.code === cc; }) ? "Энэ код бүртгэлтэй байна" : "") : "Латин жижиг үсэг ба _ (2–30 тэмдэгт)") && ok;
    ok = BZ.setErr("cf-icon", window.lucide && !UI.iconSet()[icon.replace(/(^|-)([a-z])/g, function (m, a, b) { return b.toUpperCase(); })] ? "Lucide дүрсний нэр олдсонгүй (жишээ: scissors)" : "") && ok;
    ok = BZ.setErr("cf-order", order === "" ? "Тоо оруулна уу" : +order < 0 ? "0-ээс бага байж болохгүй" : "") && ok;
    if (!ok) return BZ.firstError();
    var data = { code: cc, name: name, icon: icon, order: +order, active: BZ.val("cf-active"), desc: BZ.val("cf-desc") };
    if (code) { var c = catState().filter(function (x) { return x.code === code; })[0]; for (var k in data) c[k] = data[k]; }
    else catState().push(data);
    ADM.log(code ? "pencil" : "plus", "“" + name + "” ангиллыг " + (code ? "заслаа" : "нэмлээ"));
    ADM.save(); UI.closeModal("cat-modal"); UI.toast(code ? "Ангилал шинэчлэгдлээ" : "Ангилал нэмэгдлээ", "success"); BZ.refresh();
  }

  /* ---------------- Статистик ---------------- */
  var stx = { range: 6 };
  function statMonths(n) {
    var cm = BZ.currentMonth(), real = {};
    AD.platformMonths().forEach(function (m) { real[m.ym] = m; });
    var out = [];
    for (var k = n - 1; k >= 0; k--) {
      var ym = BZ.addMonths(cm, -k), h = 0;
      for (var i = 0; i < ym.length; i++) h = (h * 31 + ym.charCodeAt(i)) >>> 0;
      var r = real[ym], growth = Math.max(0.15, 1 - k * 0.07);
      var completed = r ? r.completed : Math.round(380 * growth + h % 40);
      var total = Math.round(completed * 1.16), cancelled = total - completed;
      out.push({ ym: ym, total: total, completed: completed, cancelled: cancelled,
        revenue: r && r.revenue ? r.revenue : completed * (42000 + h % 9000),
        fee: r ? r.paid : Math.max(0, completed - 50) * 100,
        users: Math.round(60 * growth + h % 25), owners: 1 + h % 3 });
    }
    return out;
  }
  function renderStats() {
    var el = BZ.el("stats"), ms = statMonths(stx.range), cm = BZ.currentMonth();
    var sum = function (k) { return ms.reduce(function (s, m) { return s + m[k]; }, 0); };
    var bks = ADM.allBookings(), online = bks.filter(function (b) { return b.source !== "walkin"; }).length;
    var bar = function (key, title, fmt) {
      return BZ.barChart(ms.map(function (m) {
        return { label: BZ.monthLabel(m.ym).replace(" сар", ""), value: m[key], highlight: m.ym === cm, tip: BZ.monthLabel(m.ym) + " · " + (fmt ? fmt(m[key]) : m[key]) };
      }), { title: title, height: 200, fmt: fmt ? function (v) { return BZ.short(v); } : null });
    };
    el.innerHTML =
      '<div class="page-head"><div><h2>Статистик</h2></div>' +
        '<div class="tab-row">' + BZ.tabs("strange", [["3", "3 сар"], ["6", "6 сар"], ["12", "12 сар"], ["24", "24 сар"]], String(stx.range)) + "</div></div>" +
      '<div class="kpi-grid">' +
        AD.kpi("Захиалга", sum("total").toLocaleString("en-US"), "Нийт, дууссан, цуцалсан") +
        AD.kpi("Орлого", BZ.short(sum("revenue")) + "₮", "Дууссан захиалгын нийт дүн") +
        AD.kpi("Шинэ хэрэглэгч", sum("users") + sum("owners"), "Хэрэглэгч ба салон эзэмшигч") +
        AD.kpi("Төлөгдсөн шимтгэл", BZ.money(sum("fee")), "Нэхэмжлэхийн сараар") +
      "</div>" +
      '<div class="stat-grid">' +
        '<div class="card"><div class="card-title"><div><h3>Захиалга</h3><p class="xs muted" style="margin:2px 0 0">Сараар · дууссан ' + sum("completed") + " · цуцалсан " + sum("cancelled") + "</p></div></div>" + bar("total", "Захиалга") + "</div>" +
        '<div class="card"><div class="card-title"><div><h3>Орлого</h3></div></div>' + bar("revenue", "Орлого", BZ.money) + "</div>" +
        '<div class="card"><div class="card-title"><div><h3>Шинэ бүртгэл</h3></div></div>' + bar("users", "Шинэ хэрэглэгч") + "</div>" +
        '<div class="card"><div class="card-title"><div><h3>Захиалгын суваг</h3></div></div>' +
          BZ.rankBars([{ label: "Онлайн", value: online, sub: Math.round(online / Math.max(1, bks.length) * 100) + "%" },
            { label: "Бусад", value: bks.length - online, sub: Math.round((bks.length - online) / Math.max(1, bks.length) * 100) + "%" }]) +
          '<h3 style="margin:var(--sp-5) 0 var(--sp-2)">Шимтгэл</h3>' + bar("fee", "Төлөгдсөн шимтгэл", BZ.money) + "</div>" +
      "</div>" +
      '<h3 style="margin:var(--sp-5) 0 var(--sp-3)">Сараар</h3>' +
        BZ.table(["Сар", { label: "Захиалга", cls: "t-num" }, { label: "Дууссан", cls: "t-num" }, { label: "Цуцалсан", cls: "t-num" }, { label: "Орлого", cls: "t-num" }, { label: "Шинэ хэрэглэгч", cls: "t-num" }, { label: "Шимтгэл", cls: "t-num" }],
          ms.slice().reverse().map(function (m) {
            return { cells: [BZ.monthLabel(m.ym) + " " + m.ym.slice(0, 4), m.total, m.completed, m.cancelled, BZ.money(m.revenue), m.users + m.owners, BZ.money(m.fee)] };
          }));
  }

  /* ---------------- Төлбөр ---------------- */
  var px = { method: "all", kind: "all", status: "all", q: "", page: 1 };
  var METHOD = { qpay: "QPay", cash: "Бэлэн", card: "Карт" };
  var KIND = { deposit: "Урьдчилгаа", balance: "Үлдэгдэл", fee: "Платформын шимтгэл", refund: "Буцаалт" };
  var PST = { PAID: ["Төлөгдсөн", "success"], PENDING: ["Хүлээгдэж буй", "warning"], EXPIRED: ["Хугацаа дууссан", "neutral"], REFUNDED: ["Буцаасан", "info"] };
  function transactions() {
    var out = [];
    ADM.allBookings().forEach(function (b) {
      if (b.deposit > 0) {
        var st = b.depositPaid ? (b.status === "cancelled" && b.created < BIZ.day(-3) ? "REFUNDED" : "PAID") : b.status === "pending" ? "PENDING" : "EXPIRED";
        out.push({ id: "tx-d-" + b.ref, at: b.created || b.date, ref: b.ref, salonId: b.salonId, method: "qpay", kind: st === "REFUNDED" ? "refund" : "deposit", amount: b.deposit, status: st, invoice: "INV-" + b.ref.replace(/\D/g, "") });
      }
      if (b.balancePaid) {
        var m = BZ.balanceMethod(b), method = /Бэлэн/.test(m) ? "cash" : /Карт/.test(m) ? "card" : "qpay";
        out.push({ id: "tx-b-" + b.ref, at: b.date + " " + (b.time || ""), ref: b.ref, salonId: b.salonId, method: method, kind: "balance", amount: Math.max(0, b.total - (b.depositPaid ? b.deposit : 0) - (b.discount || 0)), status: "PAID", invoice: method === "qpay" ? "INV-" + b.ref.replace(/\D/g, "") + "B" : "" });
      }
    });
    ADM.state.salons.forEach(function (s) {
      ADM.invoicesOf(s.id).forEach(function (i) {
        if (i.amount > 0) out.push({ id: "tx-f-" + s.id + i.ym, at: i.paidAt || i.ym + "-01", ref: i.no || "—", salonId: s.id, method: "qpay", kind: "fee", amount: i.amount, status: i.status === "paid" ? "PAID" : i.status === "overdue" ? "EXPIRED" : "PENDING", invoice: i.no || "" });
      });
    });
    return out.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
  }
  function renderPayments() {
    var el = BZ.el("payments"), all = transactions(), per = 12;
    var list = all.filter(function (t) {
      return (px.method === "all" || t.method === px.method) && (px.kind === "all" || t.kind === px.kind) && (px.status === "all" || t.status === px.status) &&
        (!px.q || (t.ref + " " + AD.salonName(t.salonId) + " " + t.invoice).toLowerCase().indexOf(px.q.toLowerCase()) > -1);
    });
    var paid = list.filter(function (t) { return t.status === "PAID"; }), page = Math.min(px.page, Math.max(1, Math.ceil(list.length / per)));
    el.innerHTML =
      '<div class="page-head"><div><h2>Төлбөр</h2></div></div>' +
      '<div class="kpi-grid">' +
        AD.kpi("Төлөгдсөн дүн", BZ.short(paid.reduce(function (s, t) { return s + (t.kind === "refund" ? 0 : t.amount); }, 0)) + "₮", "Шүүлтүүрт таарсан PAID гүйлгээ") +
        AD.kpi("Гүйлгээ", list.length, "Шүүлтүүрт таарсан") +
        AD.kpi("QPay", list.filter(function (t) { return t.method === "qpay"; }).length, "Урьдчилгаа, үлдэгдэл, шимтгэл") +
        AD.kpi("Хүлээгдэж буй", list.filter(function (t) { return t.status === "PENDING"; }).length, "15 минутын QR хүчинтэй") +
      "</div>" +
      '<div class="adm-filters">' +
        '<label class="input-icon grow-sm"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="pt-q" type="search" placeholder="Захиалга, салон, нэхэмжлэх" value="' + BZ.esc(px.q) + '"></label>' +
        '<label class="inline-select"><i data-lucide="wallet"></i><span class="sr-only">Төлбөрийн арга</span>' + BZ.select("pt-method", [["all", "Бүх арга"]].concat(Object.keys(METHOD).map(function (k) { return [k, METHOD[k]]; })), px.method) + "</label>" +
        '<label class="inline-select"><i data-lucide="layers"></i><span class="sr-only">Гүйлгээний төрөл</span>' + BZ.select("pt-kind", [["all", "Бүх төрөл"]].concat(Object.keys(KIND).map(function (k) { return [k, KIND[k]]; })), px.kind) + "</label>" +
        '<label class="inline-select"><i data-lucide="circle-dot"></i><span class="sr-only">Төлөв</span>' + BZ.select("pt-status", [["all", "Бүх төлөв"]].concat(Object.keys(PST).map(function (k) { return [k, PST[k][0]]; })), px.status) + "</label>" +
      "</div>" +
      '' + BZ.table(["Огноо", "Захиалга", "Салон", "Арга", "Төрөл", { label: "Дүн", cls: "t-num" }, "Төлөв", "QPay нэхэмжлэх"], list.slice((page - 1) * per, page * per).map(function (t) {
        return { cells: [
          '<span class="nowrap">' + t.at + "</span>", "<b>" + t.ref + "</b>", AD.salonName(t.salonId),
          '<span class="method-chip m-' + t.method + '">' + METHOD[t.method] + "</span>", KIND[t.kind],
          (t.kind === "refund" ? "−" : "") + BZ.money(t.amount),
          '<span class="badge badge-' + PST[t.status][1] + '">' + PST[t.status][0] + "</span>",
          t.invoice ? '<code class="xs">' + t.invoice + "</code>" : '<span class="muted">—</span>'
        ] };
      }), { empty: BZ.empty("receipt", "Гүйлгээ олдсонгүй", "Шүүлтүүрээ өөрчилж үзнэ үү.") }) +
      BZ.pager(list.length, page, per, "data-pt-page");
  }

  /* ---------------- Events ---------------- */
  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-al-page]"))) { act.page = +t.dataset.alPage; BZ.refresh(); }
    else if ((t = e.target.closest("[data-pt-page]"))) { px.page = +t.dataset.ptPage; BZ.refresh(); }
    else if ((t = e.target.closest("[data-strange]"))) { stx.range = +t.dataset.strange; BZ.refresh(); }
    else if (e.target.closest("[data-cat-new]")) catModal(null);
    else if ((t = e.target.closest("[data-cat-edit]"))) catModal(t.dataset.catEdit);
    else if ((t = e.target.closest("[data-cat-save]"))) catSave(t.dataset.catSave);
  });
  document.addEventListener("change", function (e) {
    var id = e.target.id;
    if (id === "al-action") { act.action = e.target.value; act.page = 1; BZ.refresh(); }
    if (id === "al-obj") { act.obj = e.target.value; act.page = 1; BZ.refresh(); }
    if (id === "pt-method") { px.method = e.target.value; px.page = 1; BZ.refresh(); }
    if (id === "pt-kind") { px.kind = e.target.value; px.page = 1; BZ.refresh(); }
    if (id === "pt-status") { px.status = e.target.value; px.page = 1; BZ.refresh(); }
  });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "al-q" && e.target.id !== "pt-q") return;
    var id = e.target.id, v = e.target.value.trim();
    clearTimeout(qt); qt = setTimeout(function () { if (id === "al-q") { act.q = v; act.page = 1; } else { px.q = v; px.page = 1; } BZ.refresh(); AD.refocus(id); }, 250);
  });

  BZ.page("activity", renderActivity);
  BZ.page("categories", renderCategories);
  BZ.page("stats", renderStats);
  BZ.page("payments", renderPayments);
})();
