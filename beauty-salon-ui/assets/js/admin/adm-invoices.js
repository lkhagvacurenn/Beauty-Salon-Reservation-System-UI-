/* =========================================================
   Bloom platform admin: platform fee and invoices (10.7)
   Salon-wise monthly counts: completed, free, billable,
   fee per booking, invoice total, invoice status and payment
   confirmation. The fee is charged to salons, never to
   customers. The fee rule is a configurable mock.
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
  function confirmState(i) {
    if (i.status === "paid") return '<span class="ok-text"><i data-lucide="badge-check"></i>Баталгаажсан' + (i.paidAt ? " · " + i.paidAt : "") + "</span>";
    if (i.status === "review") return '<span class="warn-text"><i data-lucide="hourglass"></i>Салон мэдэгдсэн · ' + (i.reportedAt || "") + "</span>";
    if (i.status === "free") return '<span class="xs muted">Төлбөргүй</span>';
    if (i.status === "open") return '<span class="xs muted">Сар дуусаагүй</span>';
    return '<span class="xs muted">Төлөлт мэдэгдээгүй</span>';
  }

  function render(params) {
    if (params === applied) params = null; else applied = params;
    if (params && params.filter) { st.filter = params.filter; st.ym = "all-open"; }
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
    var billed = sum(list, "amount"), paid = list.filter(function (r) { return r.inv.status === "paid"; }).reduce(function (s, r) { return s + r.inv.amount; }, 0);
    var cnt = function (k) { return base.filter(function (r) { return k === "all" || r.inv.status === k; }).length; };

    el.innerHTML =
      '<div class="page-head"><div><h2>Шимтгэл ба нэхэмжлэх</h2><p>Платформын шимтгэлийг салон төлнө. Үйлчлүүлэгчийн төлбөрт шимтгэл нэмэгдэхгүй.</p></div>' +
        '<button type="button" class="btn btn-secondary" data-inv-csv><i data-lucide="download"></i>CSV татах</button></div>' +

      '<div class="card fee-card"><div class="card-title"><div><h3>Шимтгэлийн дүрэм</h3><p class="xs muted" style="margin:2px 0 0">Демо тохиргоо. Бүх салонд адил үйлчилнэ.</p></div>' +
          '<button type="button" class="btn btn-secondary btn-sm" data-fee-edit><i data-lucide="settings-2"></i>Өөрчлөх</button></div>' +
        '<div class="fee-facts">' +
          "<div><span class='kpi-label'>Нэг захиалгын шимтгэл</span><b>" + BZ.money(fee.perBooking) + "</b><span class='xs muted'>Дууссан захиалга тутамд</span></div>" +
          "<div><span class='kpi-label'>Үнэгүй захиалга</span><b>" + fee.freeLimit + "</b><span class='xs muted'>" + (fee.freeScope === "monthly" ? "Сар бүрийн эхний захиалгууд" : "Салон бүрийн эхний захиалгууд (нэг удаа)") + "</span></div>" +
          "<div><span class='kpi-label'>Төлөх хугацаа</span><b>Дараа сарын 15</b><span class='xs muted'>Сар дуусахад нэхэмжлэх гарна</span></div>" +
        "</div></div>" +

      '<div class="adm-filters inv-filters">' +
        '<label class="inline-select"><i data-lucide="calendar"></i><span class="sr-only">Сар</span>' + BZ.select("inv-month", [["all-open", "Бүх сар"]].concat(ms.map(function (m) { return [m, m.slice(0, 4) + " · " + BZ.monthLabel(m) + (m === cm ? " (одоогийн)" : "")]; })), st.ym) + "</label>" +
        '<label class="inline-select"><i data-lucide="store"></i><span class="sr-only">Салон</span>' + BZ.select("inv-salon", AD.salonOptions(), st.salon) + "</label>" +
      "</div>" +
      '<div class="chips inv-chips" role="group" aria-label="Нэхэмжлэхийн төлөв">' + [["all", "Бүгд"], ["review", "Баталгаажуулах"], ["unpaid", "Төлөх"], ["overdue", "Хугацаа хэтэрсэн"], ["paid", "Төлөгдсөн"], ["free", "Үнэгүй"], ["open", "Энэ сар"]].map(function (f) {
        return '<button type="button" class="chip" data-invf="' + f[0] + '" aria-pressed="' + (st.filter === f[0]) + '">' + f[1] + ' <span class="chip-count">' + cnt(f[0]) + "</span></button>";
      }).join("") + "</div>" +

      '<div class="kpi-grid">' +
        AD.kpi("Дууссан захиалга", sum(list, "completed").toLocaleString("en-US"), list.length + " нэхэмжлэх") +
        AD.kpi("Үнэгүй", sum(list, "free").toLocaleString("en-US"), "Шимтгэлгүй захиалга") +
        AD.kpi("Төлбөртэй", sum(list, "billable").toLocaleString("en-US"), "× " + BZ.money(fee.perBooking)) +
        AD.kpi("Нэхэмжилсэн", BZ.money(billed), "Нийт дүн") +
        AD.kpi("Төлөгдсөн", BZ.money(paid), billed ? Math.round(paid / billed * 100) + "%" : "—") +
        AD.kpi("Үлдэгдэл", BZ.money(billed - paid), "Төлөгдөөгүй + хүлээгдэж буй") +
      "</div>" +

      BZ.table(["Салон", "Сар", { label: "Дууссан", cls: "t-num" }, { label: "Үнэгүй", cls: "t-num" }, { label: "Төлбөртэй", cls: "t-num" }, { label: "Шимтгэл", cls: "t-num" }, { label: "Нэхэмжлэх", cls: "t-num" }, "Төлөв", "Төлбөрийн баталгаажуулалт", { label: "", cls: "t-act" }],
        list.map(function (r) {
          var i = r.inv, s = BZ.INV_STATUS[i.status];
          return { cells: ["<b>" + BZ.esc(r.salon.name) + '</b><span class="cell-sub mono">' + i.no + "</span>", i.ym.slice(0, 4) + " · " + BZ.monthLabel(i.ym),
            i.completed, i.free, i.billable, BZ.money(fee.perBooking), "<b>" + BZ.money(i.amount) + "</b>", '<span class="badge badge-' + s[1] + '">' + s[0] + "</span>", confirmState(i),
            i.status === "review" ? '<button type="button" class="btn btn-primary btn-sm" data-inv="' + r.salon.id + "|" + i.ym + '">Шалгах</button>' : '<button type="button" class="btn btn-secondary btn-sm" data-inv="' + r.salon.id + "|" + i.ym + '">Харах</button>'] };
        }), { empty: BZ.empty("receipt", "Нэхэмжлэх олдсонгүй", "Сар, салон эсвэл төлвөө өөрчилнө үү."), cls: "inv-table" }) +
      '<p class="note"><i data-lucide="info"></i>Төлбөрийг салон платформын данс руу шилжүүлж, “Төлсөн гэж мэдэгдэх” товч дарна. Админ дансны хуулгаа шалгаад баталгаажуулна. Демо: бодит төлбөр, банкны холболт байхгүй.</p>';
  }

  function open(key) {
    var p = key.split("|"), s = ADM.salon(p[0]), i = ADM.invoicesOf(p[0]).filter(function (x) { return x.ym === p[1]; })[0], fee = BIZ.state.fee, k = BZ.INV_STATUS[i.status];
    var html =
      '<div class="bd-status"><span class="badge badge-' + k[1] + '">' + k[0] + '</span><span class="badge no-dot">Төлөх хугацаа ' + i.due + "</span></div>" +
      '<section class="bd-sec"><h4><i data-lucide="receipt"></i>' + i.ym.slice(0, 4) + " оны " + BZ.monthLabel(i.ym) + '</h4><dl class="sum">' +
        "<div><dt>Дууссан захиалга</dt><dd>" + i.completed + "</dd></div>" +
        "<div><dt>Үнэгүй (" + (fee.freeScope === "monthly" ? "сарын" : "нийт") + " эхний " + fee.freeLimit + ")</dt><dd class='minus'>−" + i.free + "</dd></div>" +
        "<div><dt>Төлбөртэй захиалга</dt><dd>" + i.billable + "</dd></div>" +
        "<div><dt>Нэг захиалгын шимтгэл</dt><dd>" + BZ.money(fee.perBooking) + "</dd></div>" +
        "<div class='total'><dt>Нэхэмжлэх дүн</dt><dd>" + BZ.money(i.amount) + "</dd></div>" +
      "</dl></section>" +
      '<section class="bd-sec"><h4><i data-lucide="badge-check"></i>Төлбөрийн баталгаажуулалт</h4><p>' + confirmState(i) + "</p>" +
        (i.status === "review" ? '<p class="xs muted">Салон ' + (i.reportedAt || "") + "-нд төлсөн гэж мэдэгдсэн. Платформын дансны хуулгаас " + BZ.money(i.amount) + " орсон эсэхийг шалгаад баталгаажуулна уу.</p>" : "") + "</section>" +
      '<div class="modal-foot">' +
        (i.status === "review" ? '<button type="button" class="btn btn-secondary" data-inv-reject="' + key + '">Орлого ороогүй</button><button type="button" class="btn btn-primary" data-inv-ok="' + key + '"><i data-lucide="check"></i>Төлбөр баталгаажуулах</button>' :
          i.status === "unpaid" || i.status === "overdue" ? '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button><button type="button" class="btn btn-primary" data-inv-ok="' + key + '"><i data-lucide="check"></i>Төлсөн гэж тэмдэглэх</button>' :
          '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>') + "</div>";
    BZ.modal("inv-modal", BZ.esc(s.name), html, { sub: i.no });
  }
  function confirmPay(key) {
    var p = key.split("|"), s = ADM.salon(p[0]), i = ADM.invoicesOf(p[0]).filter(function (x) { return x.ym === p[1]; })[0];
    UI.confirm({ title: "Төлбөрийг баталгаажуулах уу?", text: s.name + " · " + i.no + " · " + BZ.money(i.amount) + " төлөгдсөн гэж бүртгэнэ. Салоны нэхэмжлэх “Төлөгдсөн” болно.", confirmLabel: "Баталгаажуулах" }, function () {
      ADM.setInvoice(p[0], p[1], { status: "paid", paidAt: BIZ.day(0), reportedAt: i.reportedAt });
      ADM.log("badge-check", s.name + "-ийн " + BZ.monthLabel(p[1]) + "ын нэхэмжлэхийг баталгаажууллаа");
      UI.closeModal("inv-modal"); UI.toast("Төлбөр баталгаажлаа", "success"); BZ.refresh();
    });
  }
  function rejectPay(key) {
    var p = key.split("|"), s = ADM.salon(p[0]);
    UI.confirm({ title: "Орлого ороогүй гэж тэмдэглэх үү?", text: "Нэхэмжлэх дахин “Төлөх” төлөвт шилжинэ. Салон шалгаад дахин мэдэгдэх боломжтой.", confirmLabel: "Тэмдэглэх" }, function () {
      ADM.setInvoice(p[0], p[1], {});
      ADM.log("circle-x", s.name + "-ийн " + BZ.monthLabel(p[1]) + "ын төлбөр ороогүй гэж тэмдэглэлээ");
      UI.closeModal("inv-modal"); UI.toast("Нэхэмжлэх “Төлөх” төлөвт буцлаа", "info"); BZ.refresh();
    });
  }

  function editFee() {
    var f = BIZ.state.fee;
    var m = BZ.modal("fee-modal", "Шимтгэлийн дүрэм",
      BZ.field("fe-per", "Нэг захиалгын шимтгэл", '<div class="input-suffix">' + BZ.input("fe-per", f.perBooking, "number", 'min="0" max="10000" step="10" inputmode="numeric"') + "<span>₮</span></div>", "Дууссан захиалга тутамд салонд нэхэмжилнэ", true) +
      BZ.field("fe-free", "Үнэгүй захиалгын тоо", BZ.input("fe-free", f.freeLimit, "number", 'min="0" max="1000" step="1" inputmode="numeric"'), "", true) +
      '<fieldset class="field"><legend>Үнэгүй захиалга тоолох</legend><div class="radio-list">' +
        '<label class="check"><input type="radio" name="fe-scope" value="lifetime"' + (f.freeScope !== "monthly" ? " checked" : "") + ">Салон бүрийн эхний N захиалга (нэг удаа)</label>" +
        '<label class="check"><input type="radio" name="fe-scope" value="monthly"' + (f.freeScope === "monthly" ? " checked" : "") + ">Сар бүрийн эхний N захиалга</label></div></fieldset>" +
      '<p class="note warn-note"><i data-lucide="triangle-alert"></i>Демо: дүрэм өөрчлөхөд бүх саруудын нэхэмжлэх, салоны эзэмшигчийн харагдац шинэ дүрмээр дахин бодогдоно.</p>' +
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
    else if ((t = e.target.closest("[data-inv-ok]"))) confirmPay(t.dataset.invOk);
    else if ((t = e.target.closest("[data-inv-reject]"))) rejectPay(t.dataset.invReject);
    else if (e.target.closest("[data-fee-edit]")) editFee();
    else if (e.target.closest("[data-inv-csv]")) {
      var out = [["Нэхэмжлэх", "Салон", "Сар", "Дууссан", "Үнэгүй", "Төлбөртэй", "Шимтгэл", "Дүн", "Төлөв", "Төлсөн огноо"]];
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
