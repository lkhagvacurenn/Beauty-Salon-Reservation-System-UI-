/* =========================================================
   Business owner: bookings (8.5, FR-23, FR-24)
   List with filters + pagination, day / week / month
   calendars, booking detail with status updates, employee
   re-assignment and payment status, new (walk-in) booking.
   ========================================================= */
(function () {
  var E = window.Engine;
  var st = { view: "list", date: null, emp: "all", status: "all", period: "upcoming", q: "", page: 1 };
  var PER = 12;
  var HOUR_H = 60, DAY_START = 9 * 60, DAY_END = 21 * 60;

  function S() { return BZ.S(); }
  function today() { return BIZ.day(0); }
  function addDays(k, n) { var d = E.fromKey(k); d.setDate(d.getDate() + n); return E.dateKey(d); }
  function monday(k) { var d = E.fromKey(k), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return E.dateKey(d); }

  function filtered(ignorePeriod) {
    var q = st.q.toLowerCase(), t = today();
    return S().bookings.filter(function (b) {
      if (!BZ.inBranch(b)) return false;
      if (st.emp !== "all" && b.employeeId !== st.emp) return false;
      if (st.status !== "all" && b.status !== st.status) return false;
      if (q && (b.customer + " " + b.ref + " " + b.phone).toLowerCase().indexOf(q) === -1) return false;
      if (ignorePeriod) return true;
      if (st.period === "today") return b.date === t;
      if (st.period === "upcoming") return b.date >= t && ["confirmed", "pending_payment", "in_progress"].indexOf(b.status) > -1;
      if (st.period === "past") return b.date < t || ["completed", "no_show"].indexOf(b.status) > -1;
      return true;
    });
  }

  /* ---------- Page ---------- */
  function render(params) {
    params = params || {};
    if (params.view) st.view = params.view;
    if (params.status) { st.status = params.status; st.period = "all"; st.view = "list"; }
    if (params.branch) BZ.branchFilter = params.branch;
    if (params.date) st.date = params.date;
    if (!st.date) st.date = today();
    if (params.view || params.status || params.branch || params.date) history.replaceState(null, "", "#/bookings");

    var el = BZ.el("bookings");
    var emps = S().employees.filter(BZ.inBranch);
    if (st.emp !== "all" && !emps.some(function (e) { return e.id === st.emp; })) st.emp = "all";

    el.innerHTML =
      '<div class="page-head"><div><h2>Захиалга</h2><p>Захиалгын жагсаалт, хуанли, төлөв ба төлбөрийн мэдээлэл</p></div>' +
        '<button type="button" class="btn btn-primary" data-new-booking><i data-lucide="plus"></i>Захиалга нэмэх</button></div>' +
      '<div class="biz-toolbar wrap">' +
        BZ.tabs("bview", [["list", "Жагсаалт", "list"], ["day", "Өдөр", "calendar-clock"], ["week", "7 хоног", "calendar-range"], ["month", "Сар", "calendar-days"]], st.view) +
        '<span class="spacer"></span>' + BZ.branchSelect("bk-branch") +
        '<label class="inline-select"><i data-lucide="user-round"></i><span class="sr-only">Ажилтан</span>' +
          BZ.select("bk-emp", [["all", "Бүх ажилтан"]].concat(emps.map(function (e) { return [e.id, e.name]; })), st.emp) + "</label>" +
      "</div>" +
      '<div id="bk-body"></div>';
    body();
  }

  function body() {
    var box = document.getElementById("bk-body");
    if (!box) return;
    box.innerHTML = st.view === "list" ? listView() : st.view === "day" ? dayView() : st.view === "week" ? weekView() : monthView();
    UI.icons();
    if (st.view === "day") {
      var now = document.querySelector(".cal-now");
      var sc = document.querySelector(".day-scroll");
      if (now && sc) sc.scrollTop = Math.max(0, now.offsetTop - 120);
    }
  }

  /* ---------- List ---------- */
  function listView() {
    var all = filtered(true), list = filtered();
    list.sort(function (a, b) {
      var k1 = a.date + a.time, k2 = b.date + b.time;
      return st.period === "upcoming" || st.period === "today" ? (k1 < k2 ? -1 : 1) : (k1 < k2 ? 1 : -1);
    });
    var pages = Math.max(1, Math.ceil(list.length / PER));
    if (st.page > pages) st.page = pages;
    var rows = list.slice((st.page - 1) * PER, st.page * PER);
    var t = today();
    var counts = {
      today: all.filter(function (b) { return b.date === t; }).length,
      upcoming: all.filter(function (b) { return b.date >= t && ["confirmed", "pending_payment", "in_progress"].indexOf(b.status) > -1; }).length
    };

    return '<div class="list-filters">' +
        '<div class="chips" role="group" aria-label="Хугацаа">' +
          [["today", "Өнөөдөр", counts.today], ["upcoming", "Ирэх", counts.upcoming], ["past", "Өнгөрсөн"], ["all", "Бүгд"]].map(function (p) {
            return '<button type="button" class="chip" data-period="' + p[0] + '" aria-pressed="' + (st.period === p[0]) + '">' + p[1] + (p[2] != null ? ' <span class="chip-count">' + p[2] + "</span>" : "") + "</button>";
          }).join("") + "</div>" +
        '<div class="list-search">' +
          '<label class="input-icon"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="bk-q" type="search" placeholder="Нэр, утас, код" value="' + BZ.esc(st.q) + '"></label>' +
          '<label class="inline-select"><span class="sr-only">Төлөв</span>' +
            BZ.select("bk-status", [["all", "Бүх төлөв"]].concat(Object.keys(BZ.STATUS).map(function (k) { return [k, BZ.STATUS[k][0]]; })), st.status) + "</label>" +
        "</div></div>" +
      BZ.table(["Код", "Үйлчлүүлэгч", "Үйлчилгээ", "Ажилтан", "Огноо, цаг", { label: "Дүн", cls: "t-num" }, "Төлбөр", "Төлөв", { label: "", cls: "t-act" }],
        rows.map(function (b) {
          var e = BZ.employee(b.employeeId);
          return { attrs: 'data-row="' + b.ref + '"', cells: [
            '<span class="mono">' + b.ref + "</span>" + (b.source === "walkin" ? ' <span class="badge no-dot xs-badge">Утсаар / биечлэн</span>' : ""),
            "<b>" + BZ.esc(b.customer) + '</b><span class="cell-sub">' + b.phone + "</span>",
            BZ.svcNames(b) + '<span class="cell-sub">' + BZ.branch(b.branchId).name + "</span>",
            e ? e.name : "—",
            BZ.rel(b.date) + '<span class="cell-sub">' + b.time + "–" + E.fmt(E.toMin(b.time) + b.duration) + "</span>",
            BZ.money(b.total), BZ.payBadge(b), BZ.statusBadge(b.status),
            '<button type="button" class="btn btn-secondary btn-sm" data-booking="' + b.ref + '">Дэлгэрэнгүй</button>'] };
        }), { empty: BZ.empty("calendar-search", "Захиалга олдсонгүй", "Хугацаа, төлөв эсвэл хайлтаа өөрчилнө үү.") }) +
      BZ.pager(list.length, st.page, PER, "data-bk-page");
  }

  /* ---------- Calendar header ---------- */
  function calHead(label, unit) {
    return '<div class="cal-head">' +
      '<div class="cal-nav"><button type="button" class="icon-btn" data-cal-move="-1" aria-label="Өмнөх ' + unit + '"><i data-lucide="chevron-left"></i></button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-cal-today>Өнөөдөр</button>' +
      '<button type="button" class="icon-btn" data-cal-move="1" aria-label="Дараах ' + unit + '"><i data-lucide="chevron-right"></i></button></div>' +
      "<h3>" + label + "</h3>" +
      '<label class="inline-select"><i data-lucide="calendar"></i><span class="sr-only">Огноо сонгох</span><input class="input" type="date" id="cal-date" value="' + st.date + '"></label>' +
      "</div>";
  }
  function legend() {
    return '<div class="cal-legend">' + ["confirmed", "pending_payment", "in_progress", "completed", "cancelled"].map(function (k) {
      return '<span><i class="lg st-' + k + '"></i>' + BZ.STATUS[k][0] + "</span>";
    }).join("") + '<span><i class="lg lg-break"></i>Завсарлага / амралт</span></div>';
  }

  /* ---------- Day ---------- */
  function dayView() {
    var d = E.fromKey(st.date), emps = S().employees.filter(BZ.inBranch).filter(function (e) { return st.emp === "all" || e.id === st.emp; });
    var dayList = filtered(true).filter(function (b) { return b.date === st.date; });
    var hours = "";
    for (var m = DAY_START; m < DAY_END; m += 60) hours += '<div class="cal-hour" style="height:' + HOUR_H + 'px"><span>' + E.fmt(m) + "</span></div>";
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var nowLine = st.date === today() && nowMin > DAY_START && nowMin < DAY_END ? '<div class="cal-now" style="top:calc(var(--cal-head) + ' + px(nowMin) + 'px)"><span>' + E.fmt(nowMin) + "</span></div>" : "";

    var cols = emps.map(function (e) {
      var sc = BZ.workDay(e, st.date), blocks = "";
      if (!sc) blocks = '<div class="cal-off" style="top:0;bottom:0"><span>' + offReason(e, st.date) + "</span></div>";
      else {
        if (E.toMin(sc.start) > DAY_START) blocks += '<div class="cal-off" style="top:0;height:' + px(E.toMin(sc.start)) + 'px"></div>';
        if (E.toMin(sc.end) < DAY_END) blocks += '<div class="cal-off" style="top:' + px(E.toMin(sc.end)) + 'px;bottom:0"></div>';
        blocks += '<div class="cal-break" style="top:' + px(E.toMin(sc.break[0])) + "px;height:" + (px(E.toMin(sc.break[1])) - px(E.toMin(sc.break[0]))) + 'px"><span>Завсарлага</span></div>';
      }
      dayList.filter(function (b) { return b.employeeId === e.id; }).forEach(function (b) {
        var top = px(E.toMin(b.time)), h = Math.max(26, b.duration / 60 * HOUR_H - 3);
        blocks += '<button type="button" class="cal-ev st-' + b.status + (h < 44 ? " is-short" : "") + '" style="top:' + top + "px;height:" + h + 'px" data-booking="' + b.ref + '">' +
          "<b>" + b.time + " " + BZ.esc(b.customer) + "</b><span>" + BZ.svcNames(b) + "</span></button>";
      });
      return '<div class="cal-col"><div class="cal-col-head">' + UI.avatar(e) + "<div><b>" + e.name + "</b><span>" +
        (sc ? sc.start + "–" + sc.end : "Ажиллахгүй") + "</span></div></div>" +
        '<div class="cal-col-body" style="height:' + (DAY_END - DAY_START) / 60 * HOUR_H + 'px">' + blocks + "</div></div>";
    }).join("");

    var active = dayList.filter(function (b) { return b.status !== "cancelled"; });
    return calHead(E.longDate(d), "өдөр") +
      '<div class="cal-summary"><span><b>' + active.length + "</b> захиалга</span><span><b>" + BZ.money(active.reduce(function (s, b) { return s + b.total; }, 0)) + "</b> нийт дүн</span>" +
        '<button type="button" class="btn btn-ghost btn-sm" data-new-booking data-date="' + st.date + '"><i data-lucide="plus"></i>Энэ өдөрт нэмэх</button></div>' +
      (emps.length ? '<div class="day-scroll"><div class="day-grid" style="--cols:' + emps.length + '"><div class="cal-hours"><div class="cal-col-head ghost"></div>' + hours + "</div>" + cols + nowLine + "</div></div>"
        : BZ.empty("users", "Ажилтан алга", "Энэ салбарт ажилтан бүртгэгдээгүй байна.")) + legend();
  }
  function px(min) { return (min - DAY_START) / 60 * HOUR_H; }
  function offReason(e, k) {
    var o = e.off.filter(function (o) { return k >= o.from && k <= o.to; })[0];
    if (o) return o.reason;
    if (!BZ.branch(e.branch).hours[E.fromKey(k).getDay()]) return "Салбар амарна";
    return "Амралтын өдөр";
  }

  /* ---------- Week ---------- */
  function weekView() {
    var start = monday(st.date), list = filtered(true), days = "";
    for (var i = 0; i < 7; i++) {
      var k = addDays(start, i), d = E.fromKey(k);
      var items = list.filter(function (b) { return b.date === k; }).sort(function (a, b) { return a.time < b.time ? -1 : 1; });
      var act = items.filter(function (b) { return b.status !== "cancelled"; });
      days += '<div class="wk-day' + (k === today() ? " is-today" : "") + '">' +
        '<button type="button" class="wk-head" data-goto-day="' + k + '"><span>' + E.WEEKDAYS[d.getDay()] + "</span><b>" + d.getDate() + "</b><small>" + act.length + " захиалга</small></button>" +
        '<div class="wk-list">' + (items.length ? items.map(function (b) {
          return '<button type="button" class="wk-ev st-' + b.status + '" data-booking="' + b.ref + '"><b>' + b.time + "</b> " + BZ.esc(b.customer) + "<span>" + BZ.svcNames(b) + "</span></button>";
        }).join("") : '<p class="xs muted wk-empty">Захиалгагүй</p>') + "</div></div>";
    }
    var end = E.fromKey(addDays(start, 6)), s0 = E.fromKey(start);
    return calHead((s0.getMonth() + 1) + "/" + s0.getDate() + " – " + (end.getMonth() + 1) + "/" + end.getDate(), "7 хоног") + '<div class="wk-grid">' + days + "</div>" + legend();
  }

  /* ---------- Month ---------- */
  function monthView() {
    var d = E.fromKey(st.date), first = new Date(d.getFullYear(), d.getMonth(), 1);
    var start = monday(E.dateKey(first)), list = filtered(true), cells = "";
    for (var i = 0; i < 42; i++) {
      var k = addDays(start, i), cd = E.fromKey(k);
      if (i >= 35 && cd.getMonth() !== d.getMonth()) break;
      var items = list.filter(function (b) { return b.date === k && b.status !== "cancelled"; });
      var rev = items.filter(function (b) { return b.status === "completed"; }).reduce(function (s, b) { return s + b.total; }, 0);
      var load = Math.min(4, Math.ceil(items.length / 4));
      cells += '<button type="button" class="mo-cell' + (cd.getMonth() !== d.getMonth() ? " is-out" : "") + (k === today() ? " is-today" : "") + '" data-goto-day="' + k + '" aria-label="' + E.longDate(cd) + ", " + items.length + ' захиалга">' +
        '<span class="mo-num">' + cd.getDate() + "</span>" +
        (items.length ? '<span class="mo-count load-' + load + '">' + items.length + "<small> захиалга</small></span>" + (rev ? '<span class="mo-rev">' + BZ.short(rev) + "₮</span>" : "") : "") + "</button>";
    }
    var heads = [1, 2, 3, 4, 5, 6, 0].map(function (w) { return "<span>" + E.WEEKDAYS[w].slice(0, 2) + "</span>"; }).join("");
    return calHead(d.getFullYear() + " оны " + E.MONTHS[d.getMonth()], "сар") +
      '<div class="mo-grid"><div class="mo-heads">' + heads + "</div>" + '<div class="mo-cells">' + cells + "</div></div>" +
      '<p class="xs muted" style="margin-top:var(--sp-3)">Өдөр дээр дарж тухайн өдрийн хуваарийг харна. Өнгө нь ачааллыг илтгэнэ.</p>';
  }

  /* ---------- Booking detail (status, employee, payment) ---------- */
  function open(ref) {
    var b = BZ.booking(ref);
    if (!b) { UI.toast("Захиалга олдсонгүй", "error"); return; }
    var e = BZ.employee(b.employeeId), br = BZ.branch(b.branchId);
    var depositDue = b.deposit && !b.depositPaid, paidSoFar = (b.depositPaid ? b.deposit : 0);
    var balance = b.balancePaid ? 0 : b.total - paidSoFar;
    var editable = ["confirmed", "pending_payment"].indexOf(b.status) > -1;

    var empOpts = S().employees.filter(function (x) {
      return x.branch === b.branchId && x.status === "active" && b.serviceIds.every(function (id) { return x.services.indexOf(id) > -1; });
    }).map(function (x) {
      var free = x.id === b.employeeId || BZ.freeSlots(x.id, b.date, b.duration, b.ref).indexOf(b.time) > -1;
      return [x.id, x.name + (x.id === b.employeeId ? " (одоогийн)" : free ? "" : " · завгүй"), free];
    });

    var html =
      '<div class="bd-status">' + BZ.statusBadge(b.status) + BZ.payBadge(b) + (b.source === "walkin" ? '<span class="badge no-dot">Утсаар / биечлэн</span>' : '<span class="badge no-dot">Онлайн</span>') + "</div>" +
      '<div class="bd-grid">' +
        '<section class="bd-sec"><h4><i data-lucide="user-round"></i>Үйлчлүүлэгч</h4><p><b>' + BZ.esc(b.customer) + "</b></p>" +
          '<p class="bd-line"><a href="tel:' + b.phone.replace(/\D/g, "") + '"><i data-lucide="phone"></i>' + b.phone + "</a></p>" +
          '<p class="xs muted">' + S().bookings.filter(function (x) { return x.customer === b.customer && x.status === "completed"; }).length + " удаа үйлчлүүлсэн</p></section>" +
        '<section class="bd-sec"><h4><i data-lucide="calendar-clock"></i>Цаг</h4><p><b>' + E.longDate(E.fromKey(b.date)) + "</b></p>" +
          '<p class="bd-line">' + b.time + "–" + E.fmt(E.toMin(b.time) + b.duration) + " · " + b.duration + " мин</p>" +
          '<p class="xs muted">' + br.name + " · " + br.address + "</p></section>" +
      "</div>" +
      '<section class="bd-sec"><h4><i data-lucide="sparkles"></i>Үйлчилгээ ба ажилтан</h4>' +
        "<p><b>" + BZ.svcNames(b) + "</b></p>" +
        (editable
          ? BZ.field("bd-emp", "Хариуцах ажилтан", BZ.select("bd-emp", empOpts.map(function (o) { return [o[0], o[1]]; }), b.employeeId), "Зөвхөн энэ үйлчилгээг хийдэг, тухайн цагт сул ажилтан руу шилжүүлнэ.")
          : '<p class="bd-line">' + UI.avatar(e || { initials: "?" }, "sm") + (e ? e.name + " · " + e.role : "—") + "</p>") +
      "</section>" +
      '<section class="bd-sec"><h4><i data-lucide="wallet"></i>Төлбөр</h4><dl class="sum">' +
        "<div><dt>Үйлчилгээний үнэ</dt><dd>" + BZ.money(b.subtotal) + "</dd></div>" +
        (b.discountHour ? "<div><dt>Discount Hour</dt><dd class='minus'>−" + BZ.money(b.discountHour) + "</dd></div>" : "") +
        (b.promoOff ? "<div><dt>Промо код (" + b.promo + ")</dt><dd class='minus'>−" + BZ.money(b.promoOff) + "</dd></div>" : "") +
        "<div class='total'><dt>Нийт</dt><dd>" + BZ.money(b.total) + "</dd></div>" +
        (b.deposit ? "<div><dt>Урьдчилгаа</dt><dd>" + BZ.money(b.deposit) + " · " + (b.depositPaid ? '<span class="ok">төлсөн</span>' : '<span class="warn">төлөөгүй</span>') + "</dd></div>" : "<div><dt>Урьдчилгаа</dt><dd>Шаардлагагүй</dd></div>") +
        (b.status !== "cancelled" ? "<div><dt>Үлдэгдэл</dt><dd>" + (b.balancePaid ? '<span class="ok">төлсөн</span>' : BZ.money(balance) + " · салонд төлнө") + "</dd></div>" : "") +
      "</dl>" +
      (b.status === "cancelled" && b.depositPaid ? '<p class="note warn-note"><i data-lucide="info"></i>Урьдчилгааг систем автоматаар буцаахгүй. Буцаах эсэхийг салон өөрөө шийдэж, үйлчлүүлэгчтэй холбогдоно.</p>' : "") +
      (["confirmed", "in_progress", "completed"].indexOf(b.status) > -1 && !b.balancePaid && !depositDue ?
        '<div class="pay-inline"><span class="xs muted">Үлдэгдэл хүлээн авсан:</span>' +
          ["Бэлэн", "Карт", "QR"].map(function (m) { return '<button type="button" class="chip" data-bal-paid="' + m + '">' + m + "</button>"; }).join("") + "</div>" : "") +
      "</section>" +
      (b.status === "cancelled" ? '<p class="note"><i data-lucide="circle-x"></i>Цуцалсан: ' + (b.cancelledBy || "Үйлчлүүлэгч") + (b.cancelReason ? " · " + BZ.esc(b.cancelReason) : "") + "</p>" : "") +
      '<p class="xs muted bd-meta">Захиалгын код <span class="mono">' + b.ref + "</span> · Үүсгэсэн " + b.created + "</p>" +
      '<div class="modal-foot bd-actions">' + actions(b) + "</div>";

    var m = BZ.modal("booking-modal", "Захиалгын дэлгэрэнгүй", html, { size: "modal-lg", sub: b.ref });
    m.dataset.ref = ref;
    var sel = m.querySelector("#bd-emp");
    if (sel) sel.addEventListener("change", function () {
      var opt = empOpts.filter(function (o) { return o[0] === sel.value; })[0];
      if (!opt[2]) { UI.toast("Энэ ажилтан тухайн цагт завгүй байна", "error"); sel.value = b.employeeId; return; }
      b.employeeId = sel.value; BIZ.save();
      UI.toast("Ажилтныг " + BZ.employee(sel.value).name + " болгож солилоо", "success");
      BZ.refresh(); open(ref);
    });
  }

  function actions(b) {
    var a = [];
    if (b.status === "pending_payment") {
      a.push('<button type="button" class="btn btn-ghost" data-bd="cancel"><i data-lucide="x"></i>Цуцлах</button>');
      a.push('<button type="button" class="btn btn-secondary" data-bd="deposit"><i data-lucide="badge-check"></i>Урьдчилгаа орсныг баталгаажуулах</button>');
    } else if (b.status === "confirmed") {
      a.push('<button type="button" class="btn btn-ghost" data-bd="cancel"><i data-lucide="x"></i>Цуцлах</button>');
      a.push('<button type="button" class="btn btn-secondary" data-bd="no_show"><i data-lucide="user-x"></i>Ирээгүй</button>');
      a.push('<button type="button" class="btn btn-primary" data-bd="in_progress"><i data-lucide="play"></i>Үйлчилгээ эхлүүлэх</button>');
    } else if (b.status === "in_progress") {
      a.push('<button type="button" class="btn btn-primary" data-bd="completed"><i data-lucide="check"></i>Дууссан гэж тэмдэглэх</button>');
    } else {
      a.push('<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>');
    }
    return a.join("");
  }

  function setStatus(b, status) {
    var labels = { in_progress: "Үйлчилгээ эхэллээ", completed: "Захиалга дууслаа", no_show: "Ирээгүй гэж тэмдэглэлээ", confirmed: "Урьдчилгааг баталгаажууллаа" };
    if (status === "completed" && !b.balancePaid) {
      UI.confirm({ title: "Үлдэгдэл төлбөр", text: "Үлдэгдэл " + BZ.money(b.total - (b.depositPaid ? b.deposit : 0)) + "-ийг хүлээн авсан уу? Баталгаажуулбал захиалга \"Дууссан\" болно.", confirmLabel: "Тийм, төлсөн" }, function () {
        b.balancePaid = true; b.status = "completed"; done();
      });
      return;
    }
    if (status === "no_show") {
      UI.confirm({ title: "Ирээгүй гэж тэмдэглэх үү?", text: b.customer + " цагтаа ирээгүй гэж бүртгэнэ. Урьдчилгааг буцаахгүй.", confirmLabel: "Тэмдэглэх" }, function () { b.status = "no_show"; done(); });
      return;
    }
    if (status === "confirmed") b.depositPaid = true;
    b.status = status; done();
    function done() { BIZ.save(); UI.toast(labels[b.status] || "Төлөв шинэчлэгдлээ", "success"); BZ.refresh(); open(b.ref); }
  }

  function cancel(b) {
    var reasons = ["Үйлчлүүлэгч хүсэлт гаргасан", "Ажилтан өвчтэй", "Салон хаалттай", "Давхар захиалга"];
    var m = BZ.modal("cancel-modal", "Захиалга цуцлах", '<p class="muted" style="margin-top:0">' + BZ.esc(b.customer) + " · " + b.time + " · " + BZ.svcNames(b) + "</p>" +
      '<div class="chips" role="radiogroup" aria-label="Шалтгаан">' + reasons.map(function (r, i) { return '<button type="button" class="chip" data-reason aria-pressed="' + (i === 0) + '">' + r + "</button>"; }).join("") + "</div>" +
      (b.depositPaid ? '<p class="note warn-note"><i data-lucide="info"></i>Урьдчилгаа ' + BZ.money(b.deposit) + " автоматаар буцаагдахгүй. Буцаах эсэхийг салон шийднэ.</p>" : "") +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-danger" id="cancel-yes">Цуцлах</button></div>');
    m.querySelectorAll("[data-reason]").forEach(function (c) {
      c.addEventListener("click", function () { m.querySelectorAll("[data-reason]").forEach(function (x) { x.setAttribute("aria-pressed", x === c); }); });
    });
    m.querySelector("#cancel-yes").addEventListener("click", function () {
      b.status = "cancelled"; b.cancelledBy = "Салон"; b.cancelReason = m.querySelector('[data-reason][aria-pressed="true"]').textContent;
      BIZ.save(); UI.closeModal("cancel-modal"); UI.toast("Захиалга цуцлагдлаа", "info"); BZ.refresh(); open(b.ref);
    });
  }

  /* ---------- New booking (phone / walk-in) ---------- */
  function dhFor(branchId, svcId, k, time) {
    var wd = E.fromKey(k).getDay();
    return S().discountHours.filter(function (d) {
      return d.active && d.branch === branchId && (!d.service || d.service === svcId) && d.weekdays.indexOf(wd) > -1 &&
        time >= d.from && time < d.to && k >= d.start && k <= d.end;
    })[0];
  }

  function newBooking(pre) {
    pre = pre || {};
    var f = { branch: pre.branch || (BZ.branchFilter !== "all" ? BZ.branchFilter : S().branches[0].id), svc: null, emp: null, date: pre.date && pre.date >= today() ? pre.date : today(), time: null };
    var body =
      '<div class="form-grid">' +
        BZ.field("nb-name", "Үйлчлүүлэгчийн нэр", BZ.input("nb-name", "", "text", 'autocomplete="off" placeholder="Жишээ: Сараа Б."'), "", true) +
        BZ.field("nb-phone", "Утас", BZ.input("nb-phone", "", "tel", 'inputmode="numeric" placeholder="9911-2233"'), "8 оронтой дугаар", true) +
        BZ.field("nb-branch", "Салбар", BZ.select("nb-branch", S().branches.filter(function (b) { return b.active; }).map(function (b) { return [b.id, b.name]; }), f.branch), "", true) +
        BZ.field("nb-svc", "Үйлчилгээ", '<select class="select" id="nb-svc"></select>', "", true) +
        BZ.field("nb-emp", "Ажилтан", '<select class="select" id="nb-emp"></select>', "", true) +
        BZ.field("nb-date", "Огноо", BZ.input("nb-date", f.date, "date", 'min="' + today() + '"'), "", true) +
      "</div>" +
      '<div class="field" data-f="nb-time"><label>Сул цаг <span class="req">*</span></label><div id="nb-slots" class="slot-row"></div><span class="error-text"></span></div>' +
      '<fieldset class="field nb-source"><legend>Захиалгын суваг</legend><div class="chips">' +
        '<label class="check"><input type="radio" name="nb-src" value="walkin" checked>Биечлэн ирсэн</label>' +
        '<label class="check"><input type="radio" name="nb-src" value="phone">Утсаар</label></div></fieldset>' +
      '<div id="nb-total" class="nb-total"></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="nb-save"><i data-lucide="check"></i>Захиалга үүсгэх</button></div>';
    var m = BZ.modal("new-booking", "Шинэ захиалга", body, { size: "modal-lg", sub: "Утсаар болон биечлэн ирсэн үйлчлүүлэгчийн захиалгыг бүртгэнэ" });

    function svcs() { return S().services.filter(function (x) { return x.active && x.branches.indexOf(f.branch) > -1; }); }
    function emps() { return S().employees.filter(function (e) { return e.branch === f.branch && e.status === "active" && f.svc && e.services.indexOf(f.svc) > -1; }); }
    function fill() {
      var sv = svcs(); if (!sv.some(function (x) { return x.id === f.svc; })) f.svc = sv[0] && sv[0].id;
      m.querySelector("#nb-svc").innerHTML = sv.map(function (x) { return '<option value="' + x.id + '"' + (x.id === f.svc ? " selected" : "") + ">" + x.name + " · " + BZ.money(x.prices[f.branch]) + " · " + x.duration + " мин</option>"; }).join("");
      var em = emps(); if (!em.some(function (e) { return e.id === f.emp; })) f.emp = em[0] && em[0].id;
      m.querySelector("#nb-emp").innerHTML = em.length ? em.map(function (e) { return '<option value="' + e.id + '"' + (e.id === f.emp ? " selected" : "") + ">" + e.name + "</option>"; }).join("") : '<option value="">Тохирох ажилтан алга</option>';
      slots();
    }
    function slots() {
      var box = m.querySelector("#nb-slots"), x = BZ.service(f.svc);
      var list = f.emp && x ? BZ.freeSlots(f.emp, f.date, x.duration) : [];
      if (list.indexOf(f.time) === -1) f.time = null;
      var e = f.emp && BZ.employee(f.emp);
      box.innerHTML = list.length ? list.map(function (t) {
        var dh = dhFor(f.branch, f.svc, f.date, t);
        return '<button type="button" class="slot' + (dh ? " has-dh" : "") + '" data-slot="' + t + '" aria-pressed="' + (t === f.time) + '">' + t + (dh ? "<small>−" + (dh.type === "percent" ? dh.value + "%" : BZ.short(dh.value) + "₮") + "</small>" : "") + "</button>";
      }).join("") : '<p class="xs muted">' + (e && !BZ.workDay(e, f.date) ? e.name + " энэ өдөр ажиллахгүй (" + offReason(e, f.date) + ")." : "Энэ өдөр сул цаг алга. Өөр өдөр эсвэл ажилтан сонгоно уу.") + "</p>";
      total();
    }
    function total() {
      var x = BZ.service(f.svc), box = m.querySelector("#nb-total");
      if (!x) { box.innerHTML = ""; return; }
      var price = x.prices[f.branch], dh = f.time && dhFor(f.branch, f.svc, f.date, f.time);
      var off = dh ? (dh.type === "percent" ? Math.round(price * dh.value / 100) : Math.min(price, dh.value)) : 0;
      box.innerHTML = "<span>Нийт дүн" + (off ? ' <span class="badge badge-pink no-dot">Discount Hour −' + BZ.money(off) + "</span>" : "") + "</span><b>" + BZ.money(price - off) + "</b>" +
        '<span class="xs muted full">Утсаар/биечлэн бүртгэсэн захиалгад урьдчилгаа шаардахгүй. Төлбөрийг салонд хүлээн авна.</span>';
      return { price: price, off: off };
    }
    m.querySelector("#nb-branch").addEventListener("change", function (e) { f.branch = e.target.value; fill(); });
    m.querySelector("#nb-svc").addEventListener("change", function (e) { f.svc = e.target.value; fill(); });
    m.querySelector("#nb-emp").addEventListener("change", function (e) { f.emp = e.target.value; slots(); });
    m.querySelector("#nb-date").addEventListener("change", function (e) { if (e.target.value) { f.date = e.target.value < today() ? today() : e.target.value; e.target.value = f.date; slots(); } });
    m.querySelector("#nb-slots").addEventListener("click", function (e) {
      var s = e.target.closest("[data-slot]"); if (!s) return;
      f.time = s.dataset.slot; BZ.setErr("nb-slots", "");
      m.querySelectorAll("[data-slot]").forEach(function (x) { x.setAttribute("aria-pressed", x === s); });
      var fl = m.querySelector('[data-f="nb-time"]'); fl.classList.remove("has-error");
      total();
    });
    m.querySelector("#nb-save").addEventListener("click", function () {
      var name = BZ.val("nb-name"), phone = BZ.val("nb-phone").replace(/\D/g, "");
      var ok = BZ.setErr("nb-name", name.length < 2 ? "Нэрээ оруулна уу" : "");
      ok = BZ.setErr("nb-phone", phone.length !== 8 ? "Утасны дугаар 8 оронтой байна" : "") && ok;
      ok = BZ.setErr("nb-emp", !f.emp ? "Ажилтан сонгоно уу" : "") && ok;
      var tf = m.querySelector('[data-f="nb-time"]');
      tf.classList.toggle("has-error", !f.time); tf.querySelector(".error-text").textContent = f.time ? "" : "Сул цаг сонгоно уу";
      if (!ok || !f.time) { BZ.firstError(); return; }
      if (BZ.freeSlots(f.emp, f.date, BZ.service(f.svc).duration).indexOf(f.time) === -1) { UI.toast("Энэ цаг дөнгөж сая захиалагдсан байна. Өөр цаг сонгоно уу.", "error"); slots(); return; }
      var t = total(), x = BZ.service(f.svc);
      var b = { ref: "BLM-" + String(Date.now()).slice(-6), customer: name, phone: phone.replace(/(\d{4})(\d{4})/, "$1-$2"), branchId: f.branch, serviceIds: [f.svc], employeeId: f.emp,
        date: f.date, time: f.time, duration: x.duration, subtotal: t.price, discountHour: t.off, promoOff: 0, promo: null, total: t.price - t.off,
        deposit: 0, depositPaid: false, balancePaid: false, status: "confirmed", source: "walkin", created: today() };
      S().bookings.unshift(b); BIZ.save();
      UI.closeModal("new-booking"); UI.toast("Захиалга үүслээ · " + b.ref, "success");
      BZ.refresh(); setTimeout(function () { open(b.ref); }, 260);
    });
    fill();
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-booking]"))) { open(t.dataset.booking); return; }
    if ((t = e.target.closest("[data-new-booking]"))) { newBooking({ date: t.dataset.date }); return; }
    if ((t = e.target.closest("[data-bd]"))) {
      var b = BZ.booking(t.closest(".modal").dataset.ref), a = t.dataset.bd;
      if (a === "cancel") cancel(b);
      else if (a === "deposit") setStatus(b, "confirmed");
      else setStatus(b, a);
      return;
    }
    if ((t = e.target.closest("[data-bal-paid]"))) {
      var bb = BZ.booking(t.closest(".modal").dataset.ref);
      bb.balancePaid = true; bb.balanceMethod = t.dataset.balPaid; BIZ.save();
      UI.toast("Үлдэгдэл төлбөр (" + t.dataset.balPaid + ") бүртгэгдлээ", "success"); BZ.refresh(); open(bb.ref); return;
    }
    if (!BZ.el("bookings") || BZ.el("bookings").hidden) return;
    if ((t = e.target.closest("[data-bview]"))) { st.view = t.dataset.bview; render(); UI.icons(); return; }
    if ((t = e.target.closest("[data-period]"))) { st.period = t.dataset.period; st.page = 1; body(); return; }
    if ((t = e.target.closest("[data-bk-page]"))) { st.page = +t.dataset.bkPage; body(); document.getElementById("bk-body").scrollIntoView({ block: "start" }); return; }
    if ((t = e.target.closest("[data-cal-move]"))) {
      var n = +t.dataset.calMove, d = E.fromKey(st.date);
      if (st.view === "day") d.setDate(d.getDate() + n);
      else if (st.view === "week") d.setDate(d.getDate() + 7 * n);
      else d = new Date(d.getFullYear(), d.getMonth() + n, 1);
      st.date = E.dateKey(d); body(); return;
    }
    if (e.target.closest("[data-cal-today]")) { st.date = today(); body(); return; }
    if ((t = e.target.closest("[data-goto-day]"))) { st.date = t.dataset.gotoDay; st.view = "day"; render(); UI.icons(); return; }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "bk-emp") { st.emp = e.target.value; st.page = 1; body(); }
    if (e.target.id === "bk-status") { st.status = e.target.value; st.page = 1; body(); }
    if (e.target.id === "cal-date" && e.target.value) { st.date = e.target.value; body(); }
  });
  var qTimer;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "bk-q") return;
    clearTimeout(qTimer);
    qTimer = setTimeout(function () {
      st.q = e.target.value.trim(); st.page = 1; body();
      var q = document.getElementById("bk-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }, 250);
  });

  BZ.openBooking = open;
  BZ.newBooking = newBooking;
  BZ.page("bookings", render);
})();
