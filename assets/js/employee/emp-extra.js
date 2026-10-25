/* =========================================================
   Bloom employee: pages added to match the real business app
   - Чөлөө (time-off: full day or hours, conflict warning)  #/time-off
   - Салбарын календарь (manager + allBookings)            #/calendar
   - Тайлан (manager + reports)                            #/reports
   ========================================================= */
(function () {
  var E = window.Engine;
  var HOUR_H = 60, DAY_START = 9 * 60, DAY_END = 21 * 60;
  function S() { return BIZ.state; }
  function isManager() { return EMP.me().access === "manager"; }
  function noAccess() {
    return BZ.empty("shield-off", "Хандах эрхгүй", "Энэ хуудсыг үзэх эрх танд олгогдоогүй байна. Салоны эзэмшигчид хандана уу.");
  }

  /* ================= Чөлөө ================= */
  var tf = { full: true };
  function renderTimeOff() {
    var el = BZ.el("time-off"), e = EMP.me(), t = EMP.today();
    var upcoming = e.off.filter(function (o) { return o.to >= t; }).sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    var weekAgo = BIZ.day(-7), past = e.off.filter(function (o) { return o.to < t && o.to >= weekAgo; });
    var can = EMP.perm("editSchedule");
    var sc = e.schedule[new Date().getDay()] || e.schedule[1] || { start: "10:00", end: "19:00" };
    el.innerHTML =
      '<div class="page-head"><div><h2>Чөлөө</h2></div></div>' +
      '<div class="to-grid">' +
        '<div class="card"><div class="card-title"><h3>Чөлөө бүртгэх</h3></div>' +
          (can ?
            '<div class="form-grid">' +
              BZ.field("to-date", "Огноо", BZ.input("to-date", t, "date", 'min="' + t + '"'), "Ажлын цаг " + sc.start + "–" + sc.end, true) +
              '<div class="field"><span class="label-like">Хугацаа</span>' + BZ.sw("to-full", tf.full, "Бүтэн өдөр") + "</div>" +
            "</div>" +
            (tf.full ? "" : '<div class="form-grid">' +
              BZ.field("to-start", "Эхлэх цаг", BZ.input("to-start", sc.start, "time"), "", true) +
              BZ.field("to-end", "Дуусах цаг", BZ.input("to-end", "13:00", "time"), "", true) + "</div>") +
            BZ.field("to-reason", "Шалтгаан", BZ.input("to-reason", "", "text", 'placeholder="Жишээ нь: Эмчид үзүүлэх, сургалт"')) +
            '<div id="to-conflict"></div>' +
            '<div class="modal-foot" style="border:0;padding-inline:0"><button type="button" class="btn btn-primary" id="to-save"><i data-lucide="calendar-plus"></i>Чөлөө бүртгэх</button></div>'
          : BZ.empty("lock", "Чөлөө бүртгэх эрх алга", "Чөлөө авах бол салоны эзэмшигч эсвэл менежерт хандана уу. Тэд бүртгэсний дараа энд харагдана.")) +
        "</div>" +
        '<div class="card"><div class="card-title"><h3>Товлогдсон чөлөө</h3><span class="xs muted">' + upcoming.length + "</span></div>" +
          (upcoming.length ? '<ul class="off-list">' + upcoming.map(offItem).join("") + "</ul>" : '<p class="xs muted">Товлогдсон чөлөө алга</p>') +
          (past.length ? '<h4 class="form-sec" style="margin-top:var(--sp-4)">Энэ 7 хоногт өнгөрсөн</h4><ul class="off-list is-past">' + past.map(offItem).join("") + "</ul>" : "") +
        "</div>" +
      "</div>";
    if (can) conflictCheck();
  }
  function offItem(o) {
    return '<li><i data-lucide="calendar-x"></i><div class="grow"><b>' + o.from + (o.to !== o.from ? " – " + o.to : "") + (o.start ? " · " + o.start + "–" + o.end : " · Бүтэн өдөр") +
      '</b><span class="xs muted">' + BZ.esc(o.reason || "Шалтгаан бичээгүй") + "</span></div></li>";
  }
  function clashes() {
    var e = EMP.me(), d = BZ.val("to-date"), s = tf.full ? "00:00" : BZ.val("to-start"), en = tf.full ? "23:59" : BZ.val("to-end");
    return S().bookings.filter(function (b) {
      return b.employeeId === e.id && b.date === d && ["confirmed", "pending_payment"].indexOf(b.status) > -1 && b.time < en && EMP.endTime(b) > s;
    });
  }
  function conflictCheck() {
    var box = document.getElementById("to-conflict"); if (!box) return;
    var c = clashes();
    box.innerHTML = c.length ? '<div class="note warn-note"><i data-lucide="triangle-alert"></i><div><b>Энэ хугацаанд захиалга байна</b>' +
      '<ul class="clash">' + c.map(function (b) { return "<li>" + b.time + "–" + EMP.endTime(b) + " · " + BZ.esc(b.customer) + " · " + BZ.svcNames(b) + "</li>"; }).join("") + "</ul>" +
      '<span class="xs">Эдгээр захиалгын цагийг өөрчлөх талаар менежерт мэдэгдэнэ үү.</span></div></div>' : "";
    UI.icons();
  }
  function saveOff() {
    var e = EMP.me(), d = BZ.val("to-date");
    var ok = BZ.setErr("to-date", d ? "" : "Огноо сонгоно уу");
    if (!tf.full) ok = BZ.setErr("to-end", BZ.val("to-end") <= BZ.val("to-start") ? "Эхлэх цагаас хойш байх ёстой" : "") && ok;
    if (!ok) return;
    var c = clashes().length;
    e.off.push(tf.full ? { from: d, to: d, reason: BZ.val("to-reason") } : { from: d, to: d, start: BZ.val("to-start"), end: BZ.val("to-end"), reason: BZ.val("to-reason") });
    BIZ.save();
    UI.toast(c ? "Чөлөө бүртгэгдлээ, гэхдээ давхцах захиалга байна" : "Чөлөө бүртгэгдлээ", c ? "info" : "success");
    BZ.refresh();
  }

  /* ================= Салбарын календарь ================= */
  var cal = { date: null };
  function px(min) { return (min - DAY_START) / 60 * HOUR_H; }
  function renderCalendar() {
    var el = BZ.el("calendar"), me = EMP.me();
    if (!(isManager() && EMP.perm("allBookings"))) { el.innerHTML = noAccess(); return; }
    cal.date = cal.date || EMP.today();
    var emps = S().employees.filter(function (e) { return e.branch === me.branch && e.status === "active"; });
    var list = S().bookings.filter(function (b) { return b.branchId === me.branch && b.date === cal.date; });
    var hours = "";
    for (var m = DAY_START; m < DAY_END; m += 60) hours += '<div class="cal-hour" style="height:' + HOUR_H + 'px"><span>' + E.fmt(m) + "</span></div>";
    var cols = emps.map(function (e) {
      var sc = BZ.workDay(e, cal.date), blocks = "";
      if (!sc) {
        var o = e.off.filter(function (o) { return cal.date >= o.from && cal.date <= o.to; })[0];
        blocks = '<div class="cal-off" style="top:0;bottom:0"><span>' + (o ? o.reason || "Чөлөө" : "Амралт") + "</span></div>";
      } else {
        if (E.toMin(sc.start) > DAY_START) blocks += '<div class="cal-off" style="top:0;height:' + px(E.toMin(sc.start)) + 'px"></div>';
        if (E.toMin(sc.end) < DAY_END) blocks += '<div class="cal-off" style="top:' + px(E.toMin(sc.end)) + 'px;bottom:0"></div>';
        blocks += '<div class="cal-break" style="top:' + px(E.toMin(sc.break[0])) + "px;height:" + (px(E.toMin(sc.break[1])) - px(E.toMin(sc.break[0]))) + 'px"><span>Завсарлага</span></div>';
        e.off.filter(function (o) { return o.start && o.from === cal.date; }).forEach(function (o) {
          blocks += '<div class="cal-off" style="top:' + px(E.toMin(o.start)) + "px;height:" + (px(E.toMin(o.end)) - px(E.toMin(o.start))) + 'px"><span>' + BZ.esc(o.reason || "Чөлөө") + "</span></div>";
        });
      }
      list.filter(function (b) { return b.employeeId === e.id && b.status !== "cancelled"; }).forEach(function (b) {
        var h = Math.max(26, b.duration / 60 * HOUR_H - 3);
        blocks += '<button type="button" class="cal-ev st-' + b.status + (h < 44 ? " is-short" : "") + '" style="top:' + px(E.toMin(b.time)) + "px;height:" + h + 'px" data-emp-open="' + b.ref + '">' +
          "<b>" + b.time + " " + BZ.esc(b.customer) + "</b><span>" + BZ.svcNames(b) + "</span></button>";
      });
      return '<div class="cal-col"><div class="cal-col-head">' + UI.avatar(e) + "<div><b>" + e.name + "</b><span>" + (sc ? sc.start + "–" + sc.end : "· амралт") + "</span></div></div>" +
        '<div class="cal-col-body" style="height:' + (DAY_END - DAY_START) / 60 * HOUR_H + 'px">' + blocks + "</div></div>";
    }).join("");
    var active = list.filter(function (b) { return b.status !== "cancelled"; });
    el.innerHTML =
      '<div class="page-head"><div><h2>Салбарын календарь</h2><p>' + BZ.branch(me.branch).name + "</p></div></div>" +
      '<div class="cal-head"><h3>' + E.longDate(E.fromKey(cal.date)) + "</h3>" +
        '<div class="cal-nav"><button type="button" class="icon-btn" data-cal-step="-1" aria-label="Өмнөх өдөр"><i data-lucide="chevron-left"></i></button>' +
        '<button type="button" class="btn btn-secondary btn-sm" data-cal-step="0">Өнөөдөр</button>' +
        '<button type="button" class="icon-btn" data-cal-step="1" aria-label="Дараах өдөр"><i data-lucide="chevron-right"></i></button></div>' +
        '<label class="inline-select"><i data-lucide="calendar"></i><span class="sr-only">Огноо</span><input class="input" type="date" id="ec-date" value="' + cal.date + '"></label></div>' +
      '<div class="cal-summary"><span><b>' + active.length + "</b> захиалга</span><span><b>" + emps.length + "</b> мэргэжилтэн</span></div>" +
      (emps.length ? '<div class="day-scroll"><div class="day-grid" style="--cols:' + emps.length + '"><div class="cal-hours"><div class="cal-col-head ghost"></div>' + hours + "</div>" + cols + "</div></div>"
        : BZ.empty("users", "Энэ салбарт мэргэжилтэн алга", "")) +
      '<div class="cal-legend">' + [["confirmed", "Баталгаажсан"], ["in_progress", "Үйлчилж байна"], ["completed", "Дууссан"], ["pending_payment", "Төлбөр хүлээж буй"]].map(function (k) {
        return '<span><i class="lg st-' + k[0] + '"></i>' + k[1] + "</span>";
      }).join("") + '<span><i class="lg lg-break"></i>Чөлөө / амралт</span></div>';
  }

  /* ================= Тайлан ================= */
  var rp = { range: "month", by: "day" };
  function renderReports() {
    var el = BZ.el("reports"), me = EMP.me();
    if (!(isManager() && EMP.perm("reports"))) { el.innerHTML = noAccess(); return; }
    var t = EMP.today(), from = rp.range === "week" ? BIZ.day(-6) : rp.range === "month" ? t.slice(0, 8) + "01" : BIZ.day(-29);
    var list = S().bookings.filter(function (b) { return b.branchId === me.branch && b.date >= from && b.date <= t; });
    var done = list.filter(function (b) { return b.status === "completed"; });
    var cancelled = list.filter(function (b) { return b.status === "cancelled"; }).length, noShow = list.filter(function (b) { return b.status === "no_show"; }).length;
    var revenue = done.reduce(function (s, b) { return s + b.total; }, 0), disc = done.reduce(function (s, b) { return s + (b.discountHour || 0) + (b.promoOff || 0); }, 0);
    var groups = {}, keyOf = {
      day: function (b) { return [b.date]; },
      service: function (b) { return b.serviceIds.map(function (id) { var x = BZ.service(id); return x ? x.name : id; }); },
      employee: function (b) { var e = BZ.employee(b.employeeId); return [e ? e.name : "—"]; }
    }[rp.by];
    list.forEach(function (b) {
      keyOf(b).forEach(function (k) {
        var g = groups[k] = groups[k] || { k: k, total: 0, done: 0, cancelled: 0, noShow: 0, revenue: 0, disc: 0 };
        g.total++; if (b.status === "completed") { g.done++; g.revenue += b.total; g.disc += (b.discountHour || 0) + (b.promoOff || 0); }
        if (b.status === "cancelled") g.cancelled++; if (b.status === "no_show") g.noShow++;
      });
    });
    var rows = Object.keys(groups).map(function (k) { return groups[k]; }).sort(function (a, b) { return rp.by === "day" ? (a.k < b.k ? 1 : -1) : b.revenue - a.revenue; });
    var label = { day: "Өдөр", service: "Үйлчилгээ", employee: "Ажилтан" }[rp.by];
    el.innerHTML =
      '<div class="page-head"><div><h2>Тайлан</h2><p>' + BZ.branch(me.branch).name + "</p></div>" +
        '<div class="tab-row">' + BZ.tabs("rprange", [["week", "7 хоног"], ["month", "Энэ сар"], ["30", "30 хоног"]], rp.range) + "</div></div>" +
      '<div class="kpi-grid">' +
        kpi("Захиалга", list.length, "calendar-check") + kpi("Дууссан", done.length, "circle-check") +
        kpi("Цуцалсан / ирээгүй", cancelled + noShow, "circle-x") + kpi("Орлого", BZ.money(revenue), "wallet") +
      "</div>" +
      '<div class="tab-row" style="margin-top:var(--sp-4)">' + BZ.tabs("rpby", [["day", "Өдрөөр", "calendar-days"], ["service", "Үйлчилгээгээр", "sparkles"], ["employee", "Ажилтнаар", "users"]], rp.by) + "</div>" +
      BZ.table([label, { label: "Захиалга", cls: "t-num" }, { label: "Дууссан", cls: "t-num" }, { label: "Цуцалсан", cls: "t-num" }, { label: "Ирээгүй", cls: "t-num" }, { label: "Хөнгөлөлт", cls: "t-num" }, { label: "Орлого", cls: "t-num" }],
        rows.map(function (g) { return { cells: ["<b>" + (rp.by === "day" ? BZ.dateLabel(g.k) : BZ.esc(g.k)) + "</b>", g.total, g.done, g.cancelled, g.noShow, g.disc ? "−" + BZ.money(g.disc) : "—", BZ.money(g.revenue)] }; }),
        { empty: BZ.empty("chart-no-axes-column", "Энэ хугацаанд өгөгдөл алга", "") }) +
      (disc ? '<p class="xs muted" style="margin-top:var(--sp-3)">Нийт хөнгөлөлт: ' + BZ.money(disc) + " (хямдралтай цаг, промо код)</p>" : "");
  }
  function kpi(label, value, icon) {
    return '<div class="card kpi"><span class="kpi-label"><i data-lucide="' + icon + '"></i>' + label + '</span><span class="kpi-value">' + value + "</span></div>";
  }

  /* ================= Events ================= */
  document.addEventListener("click", function (e) {
    var t;
    if (e.target.closest("#to-save")) saveOff();
    else if ((t = e.target.closest("[data-cal-step]"))) {
      var k = +t.dataset.calStep;
      var nd = E.fromKey(cal.date); nd.setDate(nd.getDate() + k); cal.date = k === 0 ? EMP.today() : E.dateKey(nd);
      BZ.refresh();
    }
    else if ((t = e.target.closest("[data-emp-open]"))) EMP.open(t.dataset.empOpen);
    else if ((t = e.target.closest("[data-rprange]"))) { rp.range = t.dataset.rprange; BZ.refresh(); }
    else if ((t = e.target.closest("[data-rpby]"))) { rp.by = t.dataset.rpby; BZ.refresh(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "to-full") { tf.full = e.target.checked; BZ.refresh(); }
    else if (["to-date", "to-start", "to-end"].indexOf(e.target.id) > -1) conflictCheck();
    else if (e.target.id === "ec-date" && e.target.value) { cal.date = e.target.value; BZ.refresh(); }
  });

  BZ.page("time-off", renderTimeOff);
  BZ.page("calendar", renderCalendar);
  BZ.page("reports", renderReports);
})();
