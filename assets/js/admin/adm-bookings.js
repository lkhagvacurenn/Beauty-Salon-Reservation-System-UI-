/* =========================================================
   Bloom platform admin: booking and payment monitoring
   (10.4, FR-35). Read-only: salons change their own bookings.
   ========================================================= */
(function () {
  var E = window.Engine;
  var st = { period: "month", salon: "all", status: "all", pay: "all", q: "", page: 1 }, PER = 15;

  function inPeriod(b) {
    var t = BIZ.day(0);
    if (st.period === "today") return b.date === t;
    if (st.period === "7") return b.date >= BIZ.day(-6) && b.date <= t;
    if (st.period === "upcoming") return b.date > t;
    if (st.period === "month") return b.date.slice(0, 7) === BZ.currentMonth();
    return true;
  }
  function filtered() {
    return ADM.allBookings().filter(function (b) {
      if (!inPeriod(b)) return false;
      if (st.salon !== "all" && b.salonId !== st.salon) return false;
      if (st.status !== "all" && b.status !== st.status) return false;
      if (st.pay !== "all" && BZ.payState(b)[0] !== st.pay) return false;
      if (st.q && (b.ref + " " + b.customer + " " + b.phone).toLowerCase().indexOf(st.q.toLowerCase()) === -1) return false;
      return true;
    }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
  }

  var applied;
  function render(params) {
    if (params === applied) params = null; else applied = params;
    if (params && params.salon) { st.salon = params.salon; st.period = "all"; st.page = 1; }
    if (params && params.status) { st.status = params.status; st.page = 1; }
    if (params && (params.salon || params.status)) history.replaceState(null, "", "#/bookings");
    var el = BZ.el("bookings"), list = filtered(), s = BZ.stats(list);
    var pendingPay = list.filter(function (b) { return b.status === "pending_payment"; }).length;
    var deposits = list.filter(function (b) { return b.depositPaid; }).reduce(function (a, b) { return a + b.deposit; }, 0);
    var owed = list.filter(function (b) { return b.status === "completed" && !b.balancePaid; }).length;
    var pages = Math.max(1, Math.ceil(list.length / PER)); if (st.page > pages) st.page = pages;
    var payOpts = {}; ADM.allBookings().forEach(function (b) { payOpts[BZ.payState(b)[0]] = 1; });

    el.innerHTML =
      '<div class="page-head"><div><h2>Захиалга ба төлбөр</h2><p>Бүх салоны захиалга, урьдчилгаа ба үлдэгдэл төлбөрийн төлөв</p></div>' +
        '<button type="button" class="btn btn-secondary" data-bk-csv><i data-lucide="download"></i>CSV татах</button></div>' +
      '<div class="kpi-grid">' +
        AD.kpi("Захиалга", s.total, s.upcoming + " хүлээгдэж буй") +
        AD.kpi("Дууссан", s.completed, s.total ? Math.round(s.completed / s.total * 100) + "% гүйцэтгэл" : "—") +
        AD.kpi("Цуцлагдсан / ирээгүй", s.cancelled + s.no_show, s.no_show + " ирээгүй") +
        AD.kpi("Урьдчилгаа хүлээж буй", pendingPay, "Төлбөр хийгдээгүй захиалга") +
        AD.kpi("Төлсөн урьдчилгаа", BZ.money(deposits), "Салоны данс руу шууд") +
        AD.kpi("Үлдэгдэл хүлээгдэж буй", owed, "Дууссан ч үлдэгдэл төлөөгүй") +
      "</div>" +
      '<div class="list-filters">' +
        '<div class="chips" role="group" aria-label="Хугацаа">' + [["today", "Өнөөдөр"], ["7", "7 хоног"], ["month", "Энэ сар"], ["upcoming", "Ирэх"], ["all", "Бүгд"]].map(function (p) {
          return '<button type="button" class="chip" data-abp="' + p[0] + '" aria-pressed="' + (st.period === p[0]) + '">' + p[1] + "</button>";
        }).join("") + "</div>" +
        '<div class="list-search">' +
          '<label class="input-icon"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="ab-q" type="search" placeholder="Код, нэр, утас" value="' + BZ.esc(st.q) + '"></label>' +
        "</div></div>" +
      '<div class="adm-filters">' +
        '<label class="inline-select"><i data-lucide="store"></i><span class="sr-only">Салон</span>' + BZ.select("ab-salon", AD.salonOptions(), st.salon) + "</label>" +
        '<label class="inline-select"><i data-lucide="list-checks"></i><span class="sr-only">Захиалгын төлөв</span>' + BZ.select("ab-status", [["all", "Бүх төлөв"]].concat(Object.keys(BZ.STATUS).map(function (k) { return [k, BZ.STATUS[k][0]]; })), st.status) + "</label>" +
        '<label class="inline-select"><i data-lucide="wallet"></i><span class="sr-only">Төлбөрийн төлөв</span>' + BZ.select("ab-pay", [["all", "Бүх төлбөр"]].concat(Object.keys(payOpts).sort().map(function (k) { return [k, k]; })), st.pay) + "</label>" +
        (st.salon !== "all" || st.status !== "all" || st.pay !== "all" || st.q ? '<button type="button" class="btn btn-ghost btn-sm" data-ab-clear><i data-lucide="x"></i>Цэвэрлэх</button>' : "") +
      "</div>" +
      BZ.table(["Код", "Салон", "Үйлчлүүлэгч", "Үйлчилгээ", "Огноо, цаг", { label: "Дүн", cls: "t-num" }, "Төлбөр", "Төлөв", { label: "", cls: "t-act" }],
        list.slice((st.page - 1) * PER, st.page * PER).map(function (b) {
          return { cells: [
            '<span class="mono">' + b.ref + "</span>",
            "<b>" + AD.salonName(b.salonId) + '</b><span class="cell-sub">' + BZ.esc(b.branch) + "</span>",
            BZ.esc(b.customer) + '<span class="cell-sub">' + b.phone + "</span>",
            BZ.esc(b.service) + '<span class="cell-sub">' + BZ.esc(b.employee) + "</span>",
            BZ.rel(b.date) + '<span class="cell-sub">' + b.time + "</span>",
            BZ.money(b.total), BZ.payBadge(b), BZ.statusBadge(b.status),
            '<button type="button" class="btn btn-secondary btn-sm" data-abk="' + b.ref + '">Харах</button>'] };
        }), { empty: BZ.empty("calendar-search", "Захиалга олдсонгүй", "Хугацаа, салон эсвэл төлөвөө өөрчилнө үү.") }) +
      BZ.pager(list.length, st.page, PER, "data-ab-page");
  }

  function open(ref) {
    var b = ADM.allBookings().filter(function (x) { return x.ref === ref; })[0];
    var bal = b.status === "cancelled" ? 0 : b.balancePaid ? 0 : Math.max(0, b.total - (b.depositPaid ? b.deposit : 0));
    var html =
      '<div class="bd-status">' + BZ.statusBadge(b.status) + BZ.payBadge(b) + (b.source === "walkin" ? '<span class="badge no-dot">Утсаар / биечлэн</span>' : '<span class="badge no-dot">Онлайн</span>') + "</div>" +
      '<section class="bd-sec"><h4><i data-lucide="calendar-days"></i>Захиалга</h4><dl class="sum">' +
        "<div><dt>Салон</dt><dd>" + AD.salonName(b.salonId) + "</dd></div><div><dt>Салбар</dt><dd>" + BZ.esc(b.branch) + "</dd></div>" +
        "<div><dt>Үйлчилгээ</dt><dd>" + BZ.esc(b.service) + "</dd></div><div><dt>Ажилтан</dt><dd>" + BZ.esc(b.employee) + "</dd></div>" +
        "<div><dt>Огноо, цаг</dt><dd>" + E.longDate(E.fromKey(b.date)) + ", " + b.time + "</dd></div><div><dt>Үргэлжлэх</dt><dd>" + b.duration + " мин</dd></div>" +
        "<div><dt>Үүсгэсэн</dt><dd>" + b.created + "</dd></div>" +
      "</dl></section>" +
      '<section class="bd-sec"><h4><i data-lucide="user-round"></i>Үйлчлүүлэгч</h4><p><b>' + BZ.esc(b.customer) + '</b> · ' + b.phone + "</p></section>" +
      '<section class="bd-sec"><h4><i data-lucide="wallet"></i>Төлбөр</h4><dl class="sum">' +
        "<div><dt>Нийт үнэ</dt><dd>" + BZ.money(b.total) + "</dd></div>" +
        (b.discount ? "<div><dt>Хөнгөлөлт" + (b.promo ? " (" + b.promo + ")" : "") + "</dt><dd class='minus'>−" + BZ.money(b.discount) + "</dd></div>" : "") +
        "<div><dt>Урьдчилгаа</dt><dd>" + (b.deposit ? BZ.money(b.deposit) + " · " + (b.depositPaid ? '<span class="ok">төлсөн</span> ' + BZ.method(BZ.depositMethod(b)) : '<span class="warn">төлөөгүй</span>') : "Шаардлагагүй") + "</dd></div>" +
        (b.status !== "cancelled" ? "<div class='total'><dt>Үлдэгдэл</dt><dd>" + (bal ? BZ.money(bal) : '<span class="ok">Төлөгдсөн</span> ' + BZ.method(BZ.balanceMethod(b))) + "</dd></div>" : "") +
      "</dl></section>" +
      '<p class="note"><i data-lucide="eye"></i>Админ захиалгыг зөвхөн хянана. Цуцлах, цаг өөрчлөх, буцаалт хийх шийдвэрийг салон гаргана.</p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Хаах</button></div>';
    BZ.modal("abk-modal", "Захиалгын дэлгэрэнгүй", html, { sub: b.ref });
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-abp]"))) { st.period = t.dataset.abp; st.page = 1; BZ.refresh(); }
    else if ((t = e.target.closest("[data-ab-page]"))) { st.page = +t.dataset.abPage; BZ.refresh(); BZ.el("bookings").scrollIntoView({ block: "start" }); }
    else if ((t = e.target.closest("[data-abk]"))) open(t.dataset.abk);
    else if (e.target.closest("[data-ab-clear]")) { st.salon = st.status = st.pay = "all"; st.q = ""; st.page = 1; BZ.refresh(); }
    else if (e.target.closest("[data-bk-csv]")) {
      BZ.downloadCSV("bloom-bookings.csv", [["Код", "Салон", "Салбар", "Үйлчлүүлэгч", "Утас", "Үйлчилгээ", "Огноо", "Цаг", "Дүн", "Урьдчилгаа", "Төлбөр", "Төлөв"]].concat(filtered().map(function (b) {
        return [b.ref, AD.salonName(b.salonId), b.branch, b.customer, b.phone, b.service, b.date, b.time, b.total, b.deposit || 0, BZ.payState(b)[0], BZ.STATUS[b.status][0]];
      })));
      UI.toast("CSV файл татагдлаа", "success");
    }
  });
  document.addEventListener("change", function (e) {
    var k = { "ab-salon": "salon", "ab-status": "status", "ab-pay": "pay" }[e.target.id];
    if (k) { st[k] = e.target.value; st.page = 1; BZ.refresh(); }
  });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "ab-q") return;
    clearTimeout(qt); qt = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; BZ.refresh(); AD.refocus("ab-q"); }, 250);
  });

  BZ.page("bookings", render);
})();
