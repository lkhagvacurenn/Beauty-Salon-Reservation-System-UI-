/* =========================================================
   Bloom platform admin: platform fee and invoices (10.7)
   Read-only report of salon-wise monthly counts: completed,
   free, billable, fee per booking, total and payment status.
   On the 1st of the next month each salon gets a QPay invoice
   (due by the 10th); QPay payment/check marks it paid, so the
   admin only monitors. Never charged to customers. The fee rule is a configurable mock.
   ========================================================= */
(function () {
  var st = { ym: null, filter: "all", salon: "all" };
  var applied;

  function rows(ym) {
    return ADM.state.salons.map(function (s) {
      var i = ADM.invoicesOf(s.id).filter(function (x) { return x.ym === ym; })[0];
      return i ? { salon: s, inv: i } : null;
    }).filter(Boolean);
  }
  function months() {
    var set = {}; ADM.state.salons.forEach(function (s) { ADM.invoicesOf(s.id).forEach(function (i) { set[i.ym] = 1; }); });
    return Object.keys(set).sort().reverse();
  }
  var FILTERS = [["all", "Бүгд"], ["issued", "Төлөгдөөгүй"], ["overdue", "Хугацаа хэтэрсэн"], ["paid", "Төлсөн"], ["free", "Үнэгүй"], ["open", "Энэ сар"]];

  function render(params) {
    if (params === applied) params = null; else applied = params;
    if (params && params.filter) { st.filter = FILTERS.some(function (f) { return f[0] === params.filter; }) ? params.filter : "all"; st.ym = "all-open"; }
    if (params && params.salon) { st.salon = params.salon; st.ym = "all-open"; st.filter = "all"; }
    if (params && (params.filter || params.salon)) history.replaceState(null, "", "#/invoices");
    var ms = months(), cm = BZ.currentMonth();
    if (!st.ym) st.ym = BZ.addMonths(cm, -1);
    var fee = BIZ.state.fee, el = BZ.el("invoices");

    var list;
    if (st.ym === "all-open") {
      list = []; ms.forEach(function (m) { list = list.concat(rows(m)); });
    } else list = rows(st.ym);
    var base = list;
    list = list.filter(function (r) {
      if (st.salon !== "all" && r.salon.id !== st.salon) return false;
      if (st.filter !== "all" && r.inv.status !== st.filter) return false;
      return true;
    });
    var sum = function (arr, k) { return arr.reduce(function (s, r) { return s + r.inv[k]; }, 0); };
    var amountOf = function (k) { return list.filter(function (r) { return r.inv.status === k; }).reduce(function (s, r) { return s + r.inv.amount; }, 0); };
    var cnt = function (k) { return base.filter(function (r) { return k === "all" || r.inv.status === k; }).length; };

    el.innerHTML =
      '<div class="page-head"><div><h2>Платформын шимтгэл</h2></div>' +
        '<button type="button" class="btn btn-secondary" data-inv-csv><i data-lucide="download"></i>CSV татах</button></div>' +

      '<div class="card fee-card"><div class="card-title"><div><h3>Шимтгэлийн дүрэм</h3></div>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-fee-edit><i data-lucide="settings-2"></i>Өөрчлөх</button></div>' +
        '<div class="fee-facts">' +
          "<div><span class='kpi-label'>Нэг захиалгын шимтгэл</span><b>" + BZ.money(fee.perBooking) + "</b><span class='xs muted'>Дууссан захиалга тутамд</span></div>" +
          "<div><span class='kpi-label'>Үнэгүй захиалга</span><b>" + fee.freeLimit + "</b><span class='xs muted'>" + (fee.freeScope === "monthly" ? "Сар бүрийн эхний захиалгууд" : "Салон бүрийн эхний захиалгууд (нэг удаа)") + "</span></div>" +
          "<div><span class='kpi-label'>Нэхэмжлэх</span><b>Сар бүрийн 1-нд</b><span class='xs muted'>QPay QR, 10-ны дотор төлнө</span></div>" +
        "</div></div>" +

      '<div class="adm-filters inv-filters">' +
        '<label class="inline-select"><i data-lucide="calendar"></i><span class="sr-only">Сар</span>' + BZ.select("inv-month", [["all-open", "Бүх сар"]].concat(ms.map(function (m) { return [m, m.slice(0, 4) + " · " + BZ.monthLabel(m) + (m === cm ? " (одоогийн)" : "")]; })), st.ym) + "</label>" +
        '<label class="inline-select"><i data-lucide="store"></i><span class="sr-only">Салон</span>' + BZ.select("inv-salon", AD.salonOptions(), st.salon) + "</label>" +
      "</div>" +
      '<div class="chips inv-chips" role="group" aria-label="Шимтгэлийн төлөв">' + FILTERS.map(function (f) {
        return '<button type="button" class="chip" data-invf="' + f[0] + '" aria-pressed="' + (st.filter === f[0]) + '">' + f[1] + ' <span class="chip-count">' + cnt(f[0]) + "</span></button>";
      }).join("") + "</div>" +

      '<div class="kpi-grid">' +
        AD.kpi("Дууссан захиалга", sum(list, "completed").toLocaleString("en-US"), list.length + " салон-сар") +
        AD.kpi("Үнэгүй", sum(list, "free").toLocaleString("en-US"), "Шимтгэлгүй захиалга") +
        AD.kpi("Төлбөртэй", sum(list, "billable").toLocaleString("en-US"), "× " + BZ.money(fee.perBooking)) +
        AD.kpi("Төлсөн", BZ.money(amountOf("paid")), "QPay-ээр баталгаажсан") +
        AD.kpi("Төлөгдөөгүй", BZ.money(amountOf("issued") + amountOf("overdue")), "Үүнээс хугацаа хэтэрсэн " + BZ.money(amountOf("overdue"))) +
        AD.kpi("Энэ сар хуримтлагдаж буй", BZ.money(amountOf("open")), BZ.addMonths(cm, 1) + "-01-нд нэхэмжилнэ") +
      "</div>" +

      BZ.table(["Салон", "Сар", { label: "Дууссан", cls: "t-num" }, { label: "Үнэгүй", cls: "t-num" }, { label: "Төлбөртэй", cls: "t-num" }, { label: "Шимтгэл", cls: "t-num" }, { label: "Дүн", cls: "t-num" }, "Төлсөн огноо", "Төлөв", { label: "", cls: "t-act" }],
        list.map(function (r) {
          var i = r.inv, s = BZ.INV_STATUS[i.status];
          return { cells: ["<b>" + BZ.esc(r.salon.name) + '</b><span class="cell-sub mono">' + i.no + "</span>", i.ym.slice(0, 4) + " · " + BZ.monthLabel(i.ym),
            i.completed, i.free, i.billable, BZ.money(fee.perBooking), "<b>" + BZ.money(i.amount) + "</b>",
            i.paidAt || '<span class="xs muted">' + (i.status === "open" ? i.issueOn + "-нд нэхэмжилнэ" : BZ.unpaid(i) ? i.dueOn + " хүртэл" : "—") + "</span>",
            '<span class="badge badge-' + s[1] + '">' + s[0] + "</span>",
            '<button type="button" class="btn btn-secondary btn-sm" data-inv="' + r.salon.id + "|" + i.ym + '">Харах</button>'] };
        }), { empty: BZ.empty("receipt", "Мэдээлэл олдсонгүй", "Сар, салон эсвэл төлвөө өөрчилнө үү."), cls: "inv-table" }) +
      '<p class="note"><i data-lucide="info"></i>Шимтгэлийн нэхэмжлэхийг QPay-ээр илгээж, төлбөрийг QPay payment/check-ээр автоматаар баталгаажуулна. Админ төлбөр баталгаажуулах шаардлагагүй. Демо: бодит төлбөр хийгдэхгүй.</p>';
  }

  function open(key) {
    var p = key.split("|"), s = ADM.salon(p[0]), i = ADM.invoicesOf(p[0]).filter(function (x) { return x.ym === p[1]; })[0], fee = BIZ.state.fee, k = BZ.INV_STATUS[i.status];
    var html =
      '<div class="bd-status"><span class="badge badge-' + k[1] + '">' + k[0] + "</span>" + (i.status === "paid" ? '<span class="badge no-dot">Төлсөн ' + i.paidAt + "</span>" : BZ.unpaid(i) ? '<span class="badge no-dot">Төлөх хугацаа ' + i.dueOn + "</span>" : "") + "</div>" +
      '<section class="bd-sec"><h4><i data-lucide="receipt"></i>' + i.ym.slice(0, 4) + " оны " + BZ.monthLabel(i.ym) + '</h4><dl class="sum">' +
        "<div><dt>Дууссан захиалга</dt><dd>" + i.completed + "</dd></div>" +
        "<div><dt>Үнэгүй (" + (fee.freeScope === "monthly" ? "сарын" : "нийт") + " эхний " + fee.freeLimit + ")</dt><dd class='minus'>−" + i.free + "</dd></div>" +
        "<div><dt>Төлбөртэй захиалга</dt><dd>" + i.billable + "</dd></div>" +
        "<div><dt>Нэг захиалгын шимтгэл</dt><dd>" + BZ.money(fee.perBooking) + "</dd></div>" +
        "<div class='total'><dt>" + (i.status === "open" ? "Одоогийн дүн" : "Шимтгэл") + "</dt><dd>" + BZ.money(i.amount) + "</dd></div>" +
      "</dl></section>" +
      '<p class="note"><i data-lucide="info"></i>' + (i.status === "paid" ? i.paidAt + "-нд QPay-ээр төлөгдсөн (" + i.bank + ")." : i.status === "issued" ? i.issueOn + "-нд QPay нэхэмжлэх илгээсэн. " + i.dueOn + "-ны дотор төлнө." : i.status === "overdue" ? "Төлөх хугацаа " + i.dueOn + "-нд дууссан. Салонд сануулга илгээгдэнэ." : i.status === "open" ? "Сар дуусаагүй. " + i.issueOn + "-нд QPay нэхэмжлэх илгээнэ." : "Шимтгэл тооцогдоогүй тул нэхэмжлэх илгээгдээгүй.") + "</p>" +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Хаах</button></div>';
    BZ.modal("inv-modal", BZ.esc(s.name), html, { sub: i.no });
  }

  function editFee() {
    var f = BIZ.state.fee;
    var m = BZ.modal("fee-modal", "Шимтгэлийн дүрэм",
      BZ.field("fe-per", "Нэг захиалгын шимтгэл", '<div class="input-suffix">' + BZ.input("fe-per", f.perBooking, "number", 'min="0" max="10000" step="10" inputmode="numeric"') + "<span>₮</span></div>", "Дууссан захиалга тутамд салонд нэхэмжилнэ", true) +
      BZ.field("fe-free", "Үнэгүй захиалгын тоо", BZ.input("fe-free", f.freeLimit, "number", 'min="0" max="1000" step="1" inputmode="numeric"'), "", true) +
      '<fieldset class="field"><legend>Үнэгүй захиалга тоолох</legend><div class="radio-list">' +
        '<label class="check"><input type="radio" name="fe-scope" value="lifetime"' + (f.freeScope !== "monthly" ? " checked" : "") + ">Салон бүрийн эхний N захиалга (нэг удаа)</label>" +
        '<label class="check"><input type="radio" name="fe-scope" value="monthly"' + (f.freeScope === "monthly" ? " checked" : "") + ">Сар бүрийн эхний N захиалга</label></div></fieldset>" +
      '<p class="note warn-note"><i data-lucide="triangle-alert"></i>Демо: дүрэм өөрчлөхөд бүх саруудын шимтгэл, салоны эзэмшигчийн харагдац шинэ дүрмээр дахин бодогдоно.</p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="fe-save">Хадгалах</button></div>');
    m.querySelector("#fe-save").addEventListener("click", function () {
      var per = +BZ.val("fe-per"), free = +BZ.val("fe-free");
      var ok = BZ.setErr("fe-per", BZ.val("fe-per") !== "" && per >= 0 && per <= 10000 && per % 1 === 0 ? "" : "0–10,000₮ хооронд бүхэл тоо оруулна уу");
      ok = BZ.setErr("fe-free", BZ.val("fe-free") !== "" && free >= 0 && free <= 1000 && free % 1 === 0 ? "" : "0–1000 хооронд бүхэл тоо оруулна уу") && ok;
      if (!ok) { BZ.firstError(); return; }
      f.perBooking = per; f.freeLimit = free; f.freeScope = m.querySelector('[name="fe-scope"]:checked').value;
      BIZ.save(); ADM.log("settings-2", "Шимтгэлийн дүрмийг өөрчиллөө: " + per + "₮, эхний " + free + " үнэгүй (" + (f.freeScope === "monthly" ? "сар бүр" : "нэг удаа") + ")");
      UI.closeModal("fee-modal"); UI.toast("Шимтгэлийн дүрэм хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-invf]"))) { st.filter = t.dataset.invf; BZ.refresh(); }
    else if ((t = e.target.closest("[data-inv]"))) open(t.dataset.inv);
    else if (e.target.closest("[data-fee-edit]")) editFee();
    else if (e.target.closest("[data-inv-csv]")) {
      var out = [["Нэхэмжлэх", "Салон", "Сар", "Дууссан", "Үнэгүй", "Төлбөртэй", "Шимтгэл", "Дүн", "Төлөв", "Суутгасан огноо"]];
      months().forEach(function (m) { if (st.ym !== "all-open" && m !== st.ym) return; rows(m).forEach(function (r) {
        if (st.salon !== "all" && r.salon.id !== st.salon) return;
        var i = r.inv; out.push([i.no, r.salon.name, i.ym, i.completed, i.free, i.billable, BIZ.state.fee.perBooking, i.amount, BZ.INV_STATUS[i.status][0], i.paidAt || ""]);
      }); });
      BZ.downloadCSV("bloom-invoices.csv", out); UI.toast("CSV файл татагдлаа", "success");
    }
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "inv-month") { st.ym = e.target.value; BZ.refresh(); }
    if (e.target.id === "inv-salon") { st.salon = e.target.value; BZ.refresh(); }
  });

  BZ.page("invoices", render);
})();
