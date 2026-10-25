/* =========================================================
   Business owner: reports (8.7, FR-27) and monthly platform
   fee (FR-52). On the 1st of the next month the platform sends a
   QPay invoice; the salon pays it by QR in its bank app by the
   10th and QPay payment/check confirms it. Never charged to the
   customer. Rule (set by the platform admin,
   mock): first N completed bookings free, then X₮ per
   completed booking.
   ========================================================= */
(function () {
  var E = window.Engine;
  var rp = { period: "month" };
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
        kpi("Нийт захиалга", st.total, online + " онлайн · " + (st.total - online) + " бусад") +
        kpi("Дууссан", st.completed, st.total ? Math.round(st.completed / st.total * 100) + "% гүйцэтгэл" : "—") +
        kpi("Цуцлагдсан / ирээгүй", lost, st.total ? Math.round(lost / st.total * 100) + "% · " + st.no_show + " ирээгүй" : "—") +
        kpi("Орлого", BZ.money(st.revenue), "Дууссан захиалгаар") +
        kpi("Дундаж төлбөр", BZ.money(st.avg), "Нэг захиалгад") +
        kpi("Платформын шимтгэл", BZ.money(fee), st.completed + " × " + S().fee.perBooking + "₮ (салон төлнө)") +
      "</div>" +

      '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><div><h3>Сарын орлогын хандлага</h3></div></div>' + trend() + "</div>" +

      '<div class="grid grid-2" style="margin-top:var(--sp-4)">' +
        '<div class="card"><div class="card-title"><h3>Үйлчилгээгээр</h3></div>' + bySvc(list, st) + "</div>" +
        '<div class="card"><div class="card-title"><h3>Төлбөрийн задаргаа</h3></div><dl class="sum">' +
          "<div><dt>Үйлчилгээний нийт дүн</dt><dd>" + BZ.money(st.revenue + discounts) + "</dd></div>" +
          "<div><dt>Олгосон хөнгөлөлт (Хямдралтай цаг, промо)</dt><dd class='minus'>−" + BZ.money(discounts) + "</dd></div>" +
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
    var rows = [["Код", "Огноо", "Цаг", "Салбар", "Үйлчилгээ", "Ажилтан", "Үйлчлүүлэгч", "Төлөв", "Үнэ", "Хямдралтай цаг", "Промо", "Нийт", "Урьдчилгаа", "Урьдчилгаа төлсөн", "Суваг"]].concat(list.map(function (b) {
      var e = BZ.employee(b.employeeId);
      return [b.ref, b.date, b.time, BZ.branch(b.branchId).name, BZ.svcNames(b), e ? e.name : "", b.customer, BZ.STATUS[b.status][0], b.subtotal, b.discountHour, b.promoOff, b.total, b.deposit, b.depositPaid ? "Тийм" : "Үгүй", b.source === "online" ? "Онлайн" : "Утсаар/биечлэн"];
    }));
    BZ.downloadCSV("bloom-tailan-" + r[0] + "-" + r[1] + ".csv", rows);
    UI.toast(list.length + " захиалгыг CSV файлаар татлаа", "success");
  }

  /* ================= Platform fee (auto-charged monthly) ================= */
  /* Receipt + clock: the month's QPay invoice is not issued yet */
  var INV_ILLU = '<svg class="inv-illu" viewBox="0 0 120 100" aria-hidden="true">' +
    '<circle class="ii-bg" cx="58" cy="52" r="42"/>' +
    '<path class="ii-paper" d="M36 20h38a4 4 0 0 1 4 4v56l-6-4-6 4-6-4-6 4-6-4-6 4-6-4-4 3V24a4 4 0 0 1 4-4z"/>' +
    '<path class="ii-line" d="M44 34h26M44 44h20M44 54h12"/>' +
    '<circle class="ii-clock" cx="82" cy="68" r="15"/><path class="ii-hand" d="M82 60v8l6 4"/>' +
    '<path class="ii-spark" d="M20 30l4-4M18 44h5M100 24l3-3M104 34h5"/></svg>';
  function renderInvoices() {
    var el = BZ.el("invoices"), f = S().fee, inv = BZ.invoices().slice().reverse();
    var totalDone = BZ.monthly().reduce(function (s, m) { return s + m.completed; }, 0);
    var monthlyScope = f.freeScope === "monthly";
    var curDone = (BZ.monthly().filter(function (m) { return m.ym === BZ.currentMonth(); })[0] || { completed: 0 }).completed;
    var freeUsed = Math.min(f.freeLimit, monthlyScope ? curDone : totalDone);
    var open = inv.filter(function (i) { return i.status === "open"; })[0];
    var due = inv.filter(BZ.unpaid);
    var paid = inv.filter(function (i) { return i.status === "paid"; });
    var paidSum = paid.reduce(function (s, i) { return s + i.amount; }, 0);
    var last = paid[0];

    el.innerHTML =
      '<div class="page-head"><div><h2>Платформын шимтгэл</h2></div></div>' +
      '<div class="inv-top">' +
        '<div class="card fee-card"><div class="card-title"><h3>Шимтгэлийн дүрэм</h3><span class="badge badge-info no-dot">Админ тохируулна</span></div>' +
          '<div class="fee-rule"><div><span class="fee-big">' + f.freeLimit + '</span><span class="xs muted">' + (monthlyScope ? "сар бүрийн эхний захиалга үнэгүй" : "эхний захиалга үнэгүй") + '</span></div>' +
          '<div><span class="fee-big">' + f.perBooking + '₮</span><span class="xs muted">дараагийн захиалга тутамд</span></div></div>' +
          '<div class="free-meter"><div class="row-wrap" style="justify-content:space-between"><span class="xs">Үнэгүй эрх</span><b class="xs">' + freeUsed + " / " + f.freeLimit + "</b></div>" + BZ.progress(freeUsed / f.freeLimit * 100) +
          '<span class="xs muted">' + (monthlyScope ? "Энэ сарын үнэгүй эрх. Сар бүрийн 1-нд шинэчлэгдэнэ." : freeUsed >= f.freeLimit ? "Үнэгүй эрх " + BZ.monthLabel(firstBillable()) + "ын дунд дууссан. Үнэгүй эрх нийт хугацаанд нэг удаа олгогдоно (сар бүр шинэчлэгдэхгүй)." : f.freeLimit - freeUsed + " үнэгүй захиалга үлдсэн.") + "</span></div>" +
          '<p class="xs muted" style="margin:0">Цуцлагдсан болон ирээгүй захиалгад шимтгэл тооцохгүй.</p></div>' +
        '<div class="inv-cards">' +
          due.map(function (i) {
            var late = i.status === "overdue";
            return '<div class="card inv-due ' + (late ? "overdue" : "unpaid") + '"><span class="xs muted">' + BZ.monthLabel(i.ym) + "ын шимтгэл · " + (late ? "төлөх хугацаа хэтэрсэн" : "төлөх") + "</span><span class='kpi-value'>" + BZ.money(i.amount) + "</span>" +
              '<span class="xs">' + i.no + " · " + (late ? "төлөх хугацаа " + i.dueOn + "-нд дууссан" : i.dueOn + "-ны дотор төлнө") + "</span>" +
              '<button type="button" class="btn btn-primary btn-sm" data-inv-pay="' + i.ym + '"><i data-lucide="qr-code"></i>QPay-ээр төлөх</button></div>';
          }).join("") +
          (open ? '<div class="card inv-due inv-pending">' + INV_ILLU +
            '<div><b>Төлбөрийн нэхэмжлэл үүсээгүй байна</b><span class="xs muted">' + BZ.monthLabel(open.ym) + "ын шимтгэл " + BZ.money(open.amount) + " хуримтлагдаж байна. QPay нэхэмжлэл " + open.issueOn + "-нд үүснэ.</span></div></div>" : "") +
          '<div class="card inv-due"><span class="xs muted">Нийт төлсөн</span><span class="kpi-value">' + BZ.money(paidSum) + '</span><span class="xs">' + (last ? "Сүүлд " + last.paidAt + " · " + BZ.money(last.amount) + " · QPay" : "Bloom-д нэгдсэнээс хойш") + "</span></div>" +
        "</div>" +
      "</div>" +
      '<h3 class="section-title">Сарын шимтгэл</h3>' +
      BZ.table(["Нэхэмжлэх", "Сар", { label: "Дууссан", cls: "t-num" }, { label: "Үнэгүй", cls: "t-num" }, { label: "Тооцох", cls: "t-num" }, { label: "Дүн", cls: "t-num" }, "Төлсөн огноо", "Төлөв", { label: "", cls: "t-act" }],
        inv.map(function (i) {
          var s = BZ.INV_STATUS[i.status];
          return { cells: ['<span class="mono">' + i.no + "</span>", i.ym.slice(0, 4) + " " + BZ.monthLabel(i.ym), i.completed, i.free, i.billable, "<b>" + BZ.money(i.amount) + "</b>",
            i.paidAt || '<span class="muted">' + (i.status === "open" ? i.issueOn + "-нд нэхэмжилнэ" : BZ.unpaid(i) ? i.dueOn + " хүртэл" : "—") + "</span>", '<span class="badge badge-' + s[1] + '">' + s[0] + "</span>",
            BZ.unpaid(i) ? '<button type="button" class="btn btn-primary btn-sm" data-inv-pay="' + i.ym + '">Төлөх</button>' : '<button type="button" class="btn btn-secondary btn-sm" data-inv="' + i.ym + '">Харах</button>'] };
        })) +
      '<p class="note"><i data-lucide="info"></i>Энэ нь прототип: шимтгэлийн дүрэм, QPay нэхэмжлэх, QR бүгд жишээ. Бодит төлбөр хийгдэхгүй.</p>';
  }
  function firstBillable() {
    var used = 0, f = S().fee, hit = null;
    BZ.monthly().forEach(function (m) { if (hit) return; used += m.completed; if (used > f.freeLimit) hit = m.ym; });
    return hit || BZ.currentMonth();
  }

  function openInvoice(ym) {
    var i = BZ.invoices().filter(function (x) { return x.ym === ym; })[0];
    if (!i) return;
    var s = BZ.INV_STATUS[i.status], f = S().fee;
    var body =
      '<div class="inv-head"><div><span class="xs muted">Нэхэмжлэгч</span><b>Блүүм Платформ ХХК</b><span class="xs muted">Bloom захиалгын платформ</span></div>' +
        '<div><span class="xs muted">Төлөгч</span><b>' + S().salon.name + '</b><span class="xs muted">РД ' + S().salon.regNo + "</span></div></div>" +
      '<div class="bd-status"><span class="badge badge-' + s[1] + '">' + s[0] + "</span>" + (i.paidAt ? '<span class="xs muted">' + i.paidAt + " · QPay · " + i.bank + "</span>" : "") + "</div>" +
      '<dl class="sum">' +
        "<div><dt>Тайлант сар</dt><dd>" + i.ym.slice(0, 4) + " " + BZ.monthLabel(i.ym) + "</dd></div>" +
        "<div><dt>Дууссан захиалга</dt><dd>" + i.completed + "</dd></div>" +
        "<div><dt>Үнэгүй эрхээр</dt><dd>−" + i.free + "</dd></div>" +
        "<div><dt>Тооцох захиалга</dt><dd>" + i.billable + " × " + f.perBooking + "₮</dd></div>" +
        "<div class='total'><dt>" + (i.status === "open" ? "Одоогийн дүн" : "Шимтгэл") + "</dt><dd>" + BZ.money(i.amount) + "</dd></div>" +
        (i.status === "free" ? "" : "<div><dt>Нэхэмжлэх илгээх</dt><dd>" + i.issueOn + "</dd></div><div><dt>Төлөх хугацаа</dt><dd>" + i.dueOn + "</dd></div>") +
        "<div><dt>Төлбөрийн хэлбэр</dt><dd>" + (i.paidAt ? "QPay · " + i.bank : "QPay QR") + "</dd></div>" +
      "</dl>" +
      (i.status === "open" ? '<p class="note"><i data-lucide="info"></i>Сар дуусаагүй тул дүн өөрчлөгдөж болно. ' + i.issueOn + "-нд QPay нэхэмжлэх илгээнэ.</p>" : "") +
      '<div class="modal-foot"><button type="button" class="btn btn-ghost" data-print><i data-lucide="printer"></i>Хэвлэх</button><span class="spacer"></span>' +
        (BZ.unpaid(i) ? '<button type="button" class="btn btn-primary" data-inv-pay="' + i.ym + '"><i data-lucide="qr-code"></i>QPay-ээр төлөх</button>' : "") +
        '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button></div>';
    BZ.modal("inv-modal", "Нэхэмжлэх " + i.no, body, { sub: "Платформын шимтгэл · " + i.ym });
  }

  /* QPay payment of a platform fee invoice (demo). "Төлбөр шалгах" calls
     payment/check: the first check is not paid yet, the second one is. */
  var pay = { ym: null, checks: 0 };
  function openPay(ym) {
    var i = BZ.invoices().filter(function (x) { return x.ym === ym; })[0];
    if (!i || !BZ.unpaid(i)) return;
    pay = { ym: ym, checks: 0 };
    UI.closeModal("inv-modal");
    BZ.modal("fee-pay", "Шимтгэл төлөх", '<div class="fee-qr">' +
        '<span class="xs muted">Блүүм Платформ ХХК · ' + i.no + '</span><b class="fee-qr-amt">' + BZ.money(i.amount) + "</b>" +
        '<div class="qr-box">' + BZ.qr(i.no) + "</div>" +
        '<p class="small center" style="margin:0">Банкны аппаараа QR уншуулж төлнө үү</p>' +
        '<p class="xs muted center" style="margin:0">Төлөх хугацаа: ' + i.dueOn + "</p>" +
        '<p class="qr-msg" id="fee-msg" role="status" aria-live="polite"></p></div>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Дараа төлөх</button>' +
        '<button type="button" class="btn btn-primary" data-fee-check><i data-lucide="refresh-cw"></i>Төлбөр шалгах</button></div>',
      { sub: BZ.monthLabel(i.ym) + "ын платформын шимтгэл · демо QR" });
  }
  function checkPay(btn) {
    btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i>Шалгаж байна…'; UI.icons();
    setTimeout(function () {
      pay.checks++;
      if (pay.checks < 2) {
        btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw"></i>Төлбөр шалгах'; UI.icons();
        document.getElementById("fee-msg").textContent = "Төлбөр хараахан ороогүй байна. Төлсний дараа дахин шалгана уу.";
        return;
      }
      var i = BZ.invoices().filter(function (x) { return x.ym === pay.ym; })[0];
      S().invoices = S().invoices || {};
      S().invoices[pay.ym] = { status: "paid", paidAt: BIZ.day(0), bank: BZ.DEP_BANKS[0] };
      BIZ.save(); UI.closeModal("fee-pay");
      UI.toast(BZ.monthLabel(pay.ym) + "ын шимтгэл " + BZ.money(i.amount) + " төлөгдлөө", "success"); BZ.refresh();
    }, 700);
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-rp]"))) { rp.period = t.dataset.rp; BZ.refresh(); }
    else if (e.target.closest("[data-csv]")) exportCSV();
    else if ((t = e.target.closest("[data-inv-pay]"))) openPay(t.dataset.invPay);
    else if ((t = e.target.closest("[data-fee-check]"))) checkPay(t);
    else if ((t = e.target.closest("[data-inv]"))) openInvoice(t.dataset.inv);
    else if (e.target.closest("[data-print]")) window.print();
  });

  BZ.page("reports", renderReports);
  BZ.page("invoices", renderInvoices);
})();
