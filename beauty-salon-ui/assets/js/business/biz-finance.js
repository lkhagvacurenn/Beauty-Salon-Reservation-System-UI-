/* =========================================================
   Business owner: reports (8.7, FR-27) and monthly platform
   invoices (FR-26). Platform fee is charged to the salon,
   never to the customer. Rule (set by the platform admin,
   mock): first N completed bookings free, then X₮ per
   completed booking.
   ========================================================= */
(function () {
  var E = window.Engine;
  var rp = { period: "month" };
  var PLATFORM_BANK = { name: "Блүүм Платформ ХХК", bank: "Жишээ банк", iban: "MN340005005000123456" };
  function S() { return BZ.S(); }

  function range() {
    var t = BIZ.day(0), cm = BZ.currentMonth();
    if (rp.period === "month") return [cm + "-01", t, "Энэ сар (" + BZ.monthLabel(cm) + ")"];
    if (rp.period === "prev") { var pm = BZ.addMonths(cm, -1), last = E.dateKey(new Date(+pm.slice(0, 4), +pm.slice(5), 0)); return [pm + "-01", last, BZ.monthLabel(pm)]; }
    if (rp.period === "30") return [BIZ.day(-29), t, "Сүүлийн 30 хоног"];
    return [BIZ.day(-59), t, "Сүүлийн 60 хоног"];
  }

  /* ================= Reports ================= */
  function renderReports() {
    var el = BZ.el("reports"), r = range();
    var list = S().bookings.filter(function (b) { return BZ.inBranch(b) && BZ.between(b, r[0], r[1]); });
    var st = BZ.stats(list);
    var lost = st.cancelled + st.no_show;
    var deposits = list.filter(function (b) { return b.depositPaid; }).reduce(function (s, b) { return s + b.deposit; }, 0);
    var discounts = list.filter(function (b) { return b.status === "completed"; }).reduce(function (s, b) { return s + b.discountHour + b.promoOff; }, 0);
    var fee = st.completed * S().fee.perBooking;
    var online = list.filter(function (b) { return b.source === "online"; }).length;

    el.innerHTML =
      '<div class="page-head"><div><h2>Тайлан</h2><p>' + r[2] + " · " + r[0] + " – " + r[1] + "</p></div>" +
        '<button type="button" class="btn btn-secondary" data-csv><i data-lucide="download"></i>CSV татах</button></div>' +
      '<div class="biz-toolbar wrap"><div class="chips" role="group" aria-label="Хугацаа">' +
        [["month", "Энэ сар"], ["prev", "Өмнөх сар"], ["30", "30 хоног"], ["60", "60 хоног"]].map(function (p) {
          return '<button type="button" class="chip" data-rp="' + p[0] + '" aria-pressed="' + (rp.period === p[0]) + '">' + p[1] + "</button>";
        }).join("") + '</div><span class="spacer"></span>' + BZ.branchSelect("rp-branch") + "</div>" +

      '<div class="kpi-grid">' +
        kpi("Нийт захиалга", st.total, online + " онлайн · " + (st.total - online) + " утсаар/биечлэн") +
        kpi("Дууссан", st.completed, st.total ? Math.round(st.completed / st.total * 100) + "% гүйцэтгэл" : "—") +
        kpi("Цуцлагдсан / ирээгүй", lost, st.total ? Math.round(lost / st.total * 100) + "% · " + st.no_show + " ирээгүй" : "—") +
        kpi("Орлого", BZ.money(st.revenue), "Дууссан захиалгаар") +
        kpi("Дундаж төлбөр", BZ.money(st.avg), "Нэг захиалгад") +
        kpi("Платформын шимтгэл", BZ.money(fee), st.completed + " × " + S().fee.perBooking + "₮ (салон төлнө)") +
      "</div>" +

      '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><div><h3>Сарын орлогын хандлага</h3><p class="xs muted" style="margin:2px 0 0">Дууссан захиалгын орлого, бүх салбар</p></div></div>' + trend() + "</div>" +

      '<div class="grid grid-2" style="margin-top:var(--sp-4)">' +
        '<div class="card"><div class="card-title"><h3>Үйлчилгээгээр</h3></div>' + bySvc(list, st) + "</div>" +
        '<div class="card"><div class="card-title"><h3>Төлбөрийн задаргаа</h3></div><dl class="sum">' +
          "<div><dt>Үйлчилгээний нийт дүн</dt><dd>" + BZ.money(st.revenue + discounts) + "</dd></div>" +
          "<div><dt>Олгосон хөнгөлөлт (Discount Hour, промо)</dt><dd class='minus'>−" + BZ.money(discounts) + "</dd></div>" +
          "<div class='total'><dt>Цэвэр орлого</dt><dd>" + BZ.money(st.revenue) + "</dd></div>" +
          "<div><dt>Үүнээс урьдчилгаагаар (QR)</dt><dd>" + BZ.money(deposits) + "</dd></div>" +
          "<div><dt>Салонд төлсөн үлдэгдэл</dt><dd>" + BZ.money(Math.max(0, st.revenue - deposits)) + "</dd></div>" +
          "<div><dt>Платформын шимтгэл</dt><dd>" + BZ.money(fee) + "</dd></div>" +
        '</dl><p class="xs muted">Урьдчилгаа салбарын IBAN данс руу шууд орно. Платформ төлбөр дамжуулахгүй.</p></div>' +
      "</div>" +

      '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><h3>Ажилтнаар</h3></div>' + byEmp(list) + "</div>" +
      (BZ.branchFilter === "all" && S().branches.length > 1 ? '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><h3>Салбараар</h3></div>' + byBranch(list) + "</div>" : "");
  }
  function kpi(label, value, sub) { return '<div class="card kpi"><span class="kpi-label">' + label + '</span><span class="kpi-value">' + value + '</span><span class="xs muted">' + sub + "</span></div>"; }
  function trend() {
    var cm = BZ.currentMonth();
    return BZ.barChart(BZ.monthly().map(function (m) {
      return { label: BZ.monthLabel(m.ym), value: m.revenue, highlight: m.ym === cm, tip: BZ.monthLabel(m.ym) + (m.ym === cm ? " (одоогоор)" : "") + " · " + BZ.money(m.revenue) + " · " + m.completed + " захиалга" };
    }), { fmt: BZ.short, title: "Сарын орлогын хандлага", height: 200 });
  }
  function bySvc(list, st) {
    var map = {};
    list.forEach(function (b) {
      b.serviceIds.forEach(function (id) {
        var m = map[id] = map[id] || { n: 0, done: 0, rev: 0 };
        if (b.status !== "cancelled") m.n++;
        if (b.status === "completed") { m.done++; m.rev += b.total / b.serviceIds.length; }
      });
    });
    var rows = Object.keys(map).map(function (id) { return [id, map[id]]; }).sort(function (a, b) { return b[1].rev - a[1].rev; });
    return BZ.table(["Үйлчилгээ", { label: "Захиалга", cls: "t-num" }, { label: "Орлого", cls: "t-num" }, "Хувь"], rows.map(function (r) {
      var pct = st.revenue ? r[1].rev / st.revenue * 100 : 0;
      return { cells: [BZ.service(r[0]) ? BZ.service(r[0]).name : r[0], r[1].n, BZ.money(r[1].rev), '<div class="usage"><span>' + Math.round(pct) + "%</span>" + BZ.progress(pct) + "</div>"] };
    }));
  }
  function byEmp(list) {
    return BZ.table(["Ажилтан", { label: "Захиалга", cls: "t-num" }, { label: "Дууссан", cls: "t-num" }, { label: "Ирээгүй", cls: "t-num" }, { label: "Орлого", cls: "t-num" }, "Үнэлгээ"],
      S().employees.filter(BZ.inBranch).map(function (e) {
        var m = list.filter(function (b) { return b.employeeId === e.id; }), s = BZ.stats(m);
        return { cells: ['<div class="svc-cell">' + UI.avatar(e, "sm") + "<div><b>" + e.name + '</b><span class="cell-sub">' + e.role + "</span></div></div>", s.total, s.completed, s.no_show, BZ.money(s.revenue), "★ " + e.rating.toFixed(1)] };
      }));
  }
  function byBranch(list) {
    return BZ.table(["Салбар", { label: "Захиалга", cls: "t-num" }, { label: "Дууссан", cls: "t-num" }, { label: "Цуцлалт", cls: "t-num" }, { label: "Орлого", cls: "t-num" }],
      S().branches.map(function (br) {
        var s = BZ.stats(list.filter(function (b) { return b.branchId === br.id; }));
        return { cells: ["<b>" + br.name + "</b>", s.total, s.completed, s.cancelled + s.no_show, BZ.money(s.revenue)] };
      }));
  }
  function exportCSV() {
    var r = range();
    var list = S().bookings.filter(function (b) { return BZ.inBranch(b) && BZ.between(b, r[0], r[1]); }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
    var rows = [["Код", "Огноо", "Цаг", "Салбар", "Үйлчилгээ", "Ажилтан", "Үйлчлүүлэгч", "Төлөв", "Үнэ", "Discount Hour", "Промо", "Нийт", "Урьдчилгаа", "Урьдчилгаа төлсөн", "Суваг"]].concat(list.map(function (b) {
      var e = BZ.employee(b.employeeId);
      return [b.ref, b.date, b.time, BZ.branch(b.branchId).name, BZ.svcNames(b), e ? e.name : "", b.customer, BZ.STATUS[b.status][0], b.subtotal, b.discountHour, b.promoOff, b.total, b.deposit, b.depositPaid ? "Тийм" : "Үгүй", b.source === "online" ? "Онлайн" : "Утсаар/биечлэн"];
    }));
    BZ.downloadCSV("bloom-tailan-" + r[0] + "-" + r[1] + ".csv", rows);
    UI.toast(list.length + " захиалгыг CSV файлаар татлаа", "success");
  }

  /* ================= Platform invoices ================= */
  function renderInvoices(params) {
    params = params || {};
    var el = BZ.el("invoices"), f = S().fee, inv = BZ.invoices().slice().reverse();
    var totalDone = BZ.monthly().reduce(function (s, m) { return s + m.completed; }, 0);
    var monthlyScope = f.freeScope === "monthly";
    var curDone = (BZ.monthly().filter(function (m) { return m.ym === BZ.currentMonth(); })[0] || { completed: 0 }).completed;
    var freeUsed = Math.min(f.freeLimit, monthlyScope ? curDone : totalDone);
    var due = inv.filter(function (i) { return ["unpaid", "overdue"].indexOf(i.status) > -1; });
    var open = inv.filter(function (i) { return i.status === "open"; })[0];
    var paidSum = inv.filter(function (i) { return i.status === "paid"; }).reduce(function (s, i) { return s + i.amount; }, 0);

    el.innerHTML =
      '<div class="page-head"><div><h2>Платформын нэхэмжлэх</h2><p>Bloom платформын шимтгэлийг салон сар бүр төлнө. Үйлчлүүлэгчээс авахгүй.</p></div></div>' +
      '<div class="inv-top">' +
        '<div class="card fee-card"><div class="card-title"><h3>Шимтгэлийн дүрэм</h3><span class="badge badge-info no-dot">Админ тохируулна</span></div>' +
          '<div class="fee-rule"><div><span class="fee-big">' + f.freeLimit + '</span><span class="xs muted">' + (monthlyScope ? "сар бүрийн эхний дууссан захиалга үнэгүй" : "эхний дууссан захиалга үнэгүй") + '</span></div>' +
          '<div><span class="fee-big">' + f.perBooking + '₮</span><span class="xs muted">дараагийн дууссан захиалга тутамд</span></div></div>' +
          '<div class="free-meter"><div class="row-wrap" style="justify-content:space-between"><span class="xs">Үнэгүй эрх ашигласан</span><b class="xs">' + freeUsed + " / " + f.freeLimit + "</b></div>" + BZ.progress(freeUsed / f.freeLimit * 100) +
          '<span class="xs muted">' + (monthlyScope ? "Энэ сарын үнэгүй эрх. Сар бүрийн 1-нд шинэчлэгдэнэ." : freeUsed >= f.freeLimit ? "Үнэгүй эрх " + BZ.monthLabel(firstBillable()) + "ын дунд дууссан. Үнэгүй эрх нийт хугацаанд нэг удаа олгогдоно (сар бүр шинэчлэгдэхгүй)." : f.freeLimit - freeUsed + " үнэгүй захиалга үлдсэн.") + "</span></div>" +
          '<p class="xs muted" style="margin:0">Цуцлагдсан болон ирээгүй захиалгад шимтгэл тооцохгүй.</p></div>' +
        '<div class="inv-cards">' +
          (due.length ? due.map(function (i) {
            return '<div class="card inv-due ' + i.status + '"><span class="xs muted">' + BZ.monthLabel(i.ym) + "ын нэхэмжлэх</span><span class='kpi-value'>" + BZ.money(i.amount) + "</span>" +
              '<span class="xs">' + (i.status === "overdue" ? "Хугацаа хэтэрсэн · " : "Төлөх хугацаа ") + i.due + "</span>" +
              '<button type="button" class="btn btn-primary btn-sm" data-inv="' + i.ym + '"><i data-lucide="wallet"></i>Төлөх</button></div>';
          }).join("") : '<div class="card inv-due ok"><i data-lucide="circle-check-big"></i><span><b>Төлөх нэхэмжлэх алга</b></span><span class="xs muted">Бүх нэхэмжлэх төлөгдсөн</span></div>') +
          (open ? '<div class="card inv-due"><span class="xs muted">' + BZ.monthLabel(open.ym) + " · одоогоор</span><span class='kpi-value'>" + BZ.money(open.amount) + "</span>" +
            '<span class="xs">' + open.completed + " дууссан захиалга · сар дуусахад нэхэмжлэгдэнэ</span></div>" : "") +
          '<div class="card inv-due"><span class="xs muted">Нийт төлсөн</span><span class="kpi-value">' + BZ.money(paidSum) + '</span><span class="xs">Bloom-д нэгдсэнээс хойш</span></div>' +
        "</div>" +
      "</div>" +
      '<h3 class="section-title">Сарын нэхэмжлэхүүд</h3>' +
      BZ.table(["Нэхэмжлэх", "Сар", { label: "Дууссан", cls: "t-num" }, { label: "Үнэгүй", cls: "t-num" }, { label: "Тооцох", cls: "t-num" }, { label: "Дүн", cls: "t-num" }, "Төлөх хугацаа", "Төлөв", { label: "", cls: "t-act" }],
        inv.map(function (i) {
          var s = BZ.INV_STATUS[i.status];
          return { cells: ['<span class="mono">' + i.no + "</span>", i.ym.slice(0, 4) + " " + BZ.monthLabel(i.ym), i.completed, i.free, i.billable, "<b>" + BZ.money(i.amount) + "</b>",
            i.status === "open" ? '<span class="muted">' + i.due + "</span>" : i.due, '<span class="badge badge-' + s[1] + '">' + s[0] + "</span>",
            '<button type="button" class="btn btn-' + (["unpaid", "overdue"].indexOf(i.status) > -1 ? "primary" : "secondary") + ' btn-sm" data-inv="' + i.ym + '">' + (["unpaid", "overdue"].indexOf(i.status) > -1 ? "Төлөх" : "Харах") + "</button>"] };
        })) +
      '<p class="note"><i data-lucide="info"></i>Энэ нь прототип: шимтгэлийн дүрэм, нэхэмжлэх, данс бүгд жишээ мэдээлэл. Бодит төлбөр хийгдэхгүй.</p>';

    if (params.open) { history.replaceState(null, "", "#/invoices"); openInvoice(params.open); }
  }
  function firstBillable() {
    var used = 0, f = S().fee, hit = null;
    BZ.monthly().forEach(function (m) { if (hit) return; used += m.completed; if (used > f.freeLimit) hit = m.ym; });
    return hit || BZ.currentMonth();
  }

  function openInvoice(ym) {
    var i = BZ.invoices().filter(function (x) { return x.ym === ym; })[0];
    if (!i) return;
    var s = BZ.INV_STATUS[i.status], payable = ["unpaid", "overdue"].indexOf(i.status) > -1, f = S().fee;
    var body =
      '<div class="inv-head"><div><span class="xs muted">Нэхэмжлэгч</span><b>' + PLATFORM_BANK.name + '</b><span class="xs muted">Bloom захиалгын платформ</span></div>' +
        '<div><span class="xs muted">Төлөгч</span><b>' + S().salon.name + '</b><span class="xs muted">РД ' + S().salon.regNo + "</span></div></div>" +
      '<div class="bd-status"><span class="badge badge-' + s[1] + '">' + s[0] + "</span>" + (i.paidAt ? '<span class="xs muted">Төлсөн ' + i.paidAt + "</span>" : "") + "</div>" +
      '<dl class="sum">' +
        "<div><dt>Тайлант сар</dt><dd>" + i.ym.slice(0, 4) + " " + BZ.monthLabel(i.ym) + "</dd></div>" +
        "<div><dt>Дууссан захиалга</dt><dd>" + i.completed + "</dd></div>" +
        "<div><dt>Үнэгүй эрхээр</dt><dd>−" + i.free + "</dd></div>" +
        "<div><dt>Тооцох захиалга</dt><dd>" + i.billable + " × " + f.perBooking + "₮</dd></div>" +
        "<div class='total'><dt>Төлөх дүн</dt><dd>" + BZ.money(i.amount) + "</dd></div>" +
        "<div><dt>Төлөх хугацаа</dt><dd>" + i.due + "</dd></div>" +
      "</dl>" +
      (payable ? '<div class="bank-box"><h4>Шилжүүлэх данс</h4>' +
        row("Хүлээн авагч", PLATFORM_BANK.name) + row("Банк", PLATFORM_BANK.bank) + row("IBAN", PLATFORM_BANK.iban, true) + row("Гүйлгээний утга", i.no, true) +
        '<p class="xs muted" style="margin:var(--sp-2) 0 0">Жишээ данс. Гүйлгээний утгад нэхэмжлэхийн дугаарыг заавал бичнэ.</p></div>' : "") +
      (i.status === "review" ? '<p class="note"><i data-lucide="hourglass"></i>Та төлсөн гэж мэдэгдсэн. Платформын админ гүйлгээг шалгаад баталгаажуулна.</p>' : "") +
      (i.status === "open" ? '<p class="note"><i data-lucide="info"></i>Сар дуусаагүй тул дүн өөрчлөгдөж болно. ' + BZ.addMonths(i.ym, 1) + "-01-нд нэхэмжлэгдэнэ.</p>" : "") +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-print><i data-lucide="printer"></i>Хэвлэх</button><span class="spacer"></span>' +
        (payable ? '<button type="button" class="btn btn-primary" id="inv-paid"><i data-lucide="check"></i>Төлсөн гэж мэдэгдэх</button>' : '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>') + "</div>";
    var m = BZ.modal("inv-modal", "Нэхэмжлэх " + i.no, body, { sub: "Платформын шимтгэл · " + i.ym });
    var p = m.querySelector("#inv-paid");
    if (p) p.addEventListener("click", function () {
      UI.confirm({ title: "Төлбөр шилжүүлсэн үү?", text: BZ.money(i.amount) + "-ийг " + i.no + " утгаар шилжүүлсэн бол баталгаажуулна уу. Админ шалгасны дараа \"Төлөгдсөн\" болно.", confirmLabel: "Тийм, шилжүүлсэн" }, function () {
        S().invoices[ym] = { status: "review", reportedAt: BIZ.day(0) }; BIZ.save();
        UI.toast("Төлбөрийн мэдэгдэл илгээгдлээ. Админ баталгаажуулна.", "success"); BZ.refresh(); openInvoice(ym);
      });
    });
  }
  function row(k, v, copy) {
    return '<div class="bank-row"><span class="xs muted">' + k + "</span><b" + (copy ? ' class="mono"' : "") + ">" + v + "</b>" +
      (copy ? '<button type="button" class="icon-btn plain" data-copy="' + v + '" aria-label="' + k + ' хуулах"><i data-lucide="copy"></i></button>' : "") + "</div>";
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-rp]"))) { rp.period = t.dataset.rp; BZ.refresh(); }
    else if (e.target.closest("[data-csv]")) exportCSV();
    else if ((t = e.target.closest("[data-inv]"))) openInvoice(t.dataset.inv);
    else if (e.target.closest("[data-print]")) window.print();
    else if ((t = e.target.closest("[data-copy]"))) {
      var v = t.dataset.copy;
      (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { UI.toast("Хуулагдлаа: " + v, "success"); }, function () { UI.toast(v, "info"); });
    }
  });

  BZ.page("reports", renderReports);
  BZ.page("invoices", renderInvoices);
})();
