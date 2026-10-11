/* =========================================================
   Bloom employee: remaining balance payment (9.4, FR-31)
   Open booking → see total, deposit, remaining → generate a
   SIMULATED QR payment request → show it to the customer →
   check status. Not a real QPay invoice.
   ========================================================= */
(function () {
  var E = window.Engine;
  var HOLD = 10 * 60;            // QR valid for 10 minutes
  var st = { ref: null, step: "summary", started: 0, checks: 0, timer: null };

  /* Mock QR pattern (same look as the client deposit QR, clearly marked DEMO) */
  function qr(ref) {
    var N = 25, cells = "", seed = 7;
    for (var i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) & 1; }
    function finder(x, y) { return (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9); }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var on;
      if (finder(x, y)) {
        var fx = x > N - 9 ? x - (N - 7) : x, fy = y > N - 9 ? y - (N - 7) : y;
        on = fx >= 0 && fy >= 0 && fx < 7 && fy < 7 && (fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5));
      } else if (x > 9 && x < 15 && y > 9 && y < 15) on = false;
      else on = rnd();
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg class="qr-svg" viewBox="-1 -1 ' + (N + 2) + " " + (N + 2) + '" role="img" aria-label="Жишээ QR код, уншуулах боломжгүй">' +
      '<rect x="-1" y="-1" width="' + (N + 2) + '" height="' + (N + 2) + '" fill="#fff"/><g fill="#34252F">' + cells + '</g></svg><span class="qr-mark"><img src="' + UI.BASE + UI.LOGO.symbol + '" alt=""></span>';
  }
  function left() { return Math.max(0, HOLD - Math.floor((Date.now() - st.started) / 1000)); }
  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }

  function render(params) {
    params = params || {};
    var el = BZ.el("payment");
    if (!EMP.perm("payments")) {
      el.innerHTML = BZ.empty("lock", "Төлбөр авах эрх алга", "Үлдэгдэл төлбөр бүртгэх эрх танд олгогдоогүй байна. Салоны эзэмшигч \"Ажилтан → Эрх\" хэсгээс олгоно.");
      return;
    }
    if (params.ref && params.ref !== st.ref) { st.ref = params.ref; st.step = "summary"; st.checks = 0; stop(); }
    if (!params.ref) { st.ref = null; st.step = "summary"; stop(); }
    el.innerHTML = st.ref ? flow(BZ.booking(st.ref)) : list();
  }

  /* ---------- List of bookings waiting for their balance ---------- */
  function list() {
    var t = EMP.today();
    var owed = EMP.mine().filter(EMP.owes).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
    var live = EMP.mine().filter(function (b) { return b.status === "in_progress" && !b.balancePaid; });
    var paid = EMP.mine().filter(function (b) { return b.date === t && b.status === "completed" && b.balancePaid; });
    return '<div class="emp-head"><div><h2>Үлдэгдэл төлбөр</h2><p class="muted small" style="margin:0">Үйлчилгээ дууссаны дараа үлдэгдлийг бэлэн, карт эсвэл QR-аар авна</p></div></div>' +
      '<ol class="pay-how"><li><span>1</span>Захиалгаа сонгоно</li><li><span>2</span>Төлбөрийн хэлбэр сонгоно: QR, карт, бэлэн</li><li><span>3</span>Төлбөрөө шалгана</li></ol>' +
      '<div class="emp-sec-head"><h3>Төлбөр хүлээгдэж буй</h3><span class="badge badge-warning no-dot">' + owed.length + "</span></div>" +
      (owed.length ? '<div class="owe-list">' + owed.map(oweCard).join("") + "</div>" : BZ.empty("circle-check-big", "Хүлээгдэж буй төлбөр алга", "Бүх үйлчлүүлэгч үлдэгдлээ төлсөн байна.")) +
      (live.length ? '<div class="emp-sec-head"><h3>Одоо үйлчилж буй</h3></div><div class="owe-list">' + live.map(function (b) {
        return '<div class="card owe-card"><div class="grow"><b>' + BZ.esc(b.customer) + "</b><span class='xs muted'>" + BZ.svcNames(b) + " · " + b.time + "–" + EMP.endTime(b) + "</span></div>" +
          '<button type="button" class="btn btn-secondary btn-sm" data-eb="' + b.ref + '">Дуусгах</button></div>';
      }).join("") + "</div>" : "") +
      (paid.length ? '<div class="emp-sec-head"><h3>Өнөөдөр төлөгдсөн</h3></div><ul class="paid-list">' + paid.map(function (b) {
        return '<li><i data-lucide="circle-check"></i><span class="grow">' + BZ.esc(b.customer) + " · " + b.time + "</span>" + BZ.method(BZ.balanceMethod(b)) + "<b>" + BZ.money(b.total) + "</b></li>";
      }).join("") + "</ul>" : "");
  }
  function oweCard(b) {
    return '<button type="button" class="card owe-card" data-pay="' + b.ref + '"><div class="grow"><b>' + BZ.esc(b.customer) + "</b>" +
      '<span class="xs muted">' + BZ.rel(b.date) + " " + b.time + " · " + BZ.svcNames(b) + "</span></div>" +
      '<span class="owe-amt">' + BZ.money(EMP.balance(b)) + '<small>үлдэгдэл</small></span><i data-lucide="chevron-right"></i></button>';
  }

  /* ---------- Flow for one booking ---------- */
  function flow(b) {
    if (!b) return BZ.empty("search-x", "Захиалга олдсонгүй", "", '<a class="btn btn-secondary btn-sm" href="#/payment">Буцах</a>');
    var bal = EMP.balance(b);
    var back = '<a class="back-btn" href="#/payment"><i data-lucide="arrow-left"></i>Төлбөрийн жагсаалт</a>';
    var sum = '<div class="card pay-sum"><div class="pay-sum-head"><span class="avatar">' + b.customer.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2) + "</span>" +
      '<div class="grow"><b>' + BZ.esc(b.customer) + '</b><span class="xs muted">' + BZ.svcNames(b) + " · " + BZ.rel(b.date) + " " + b.time + "</span></div></div>" +
      '<dl class="sum"><div><dt>Үйлчилгээний нийт үнэ</dt><dd>' + BZ.money(b.total) + "</dd></div>" +
      (b.discountHour || b.promoOff ? '<div><dt class="xs">Үүнд хөнгөлөлт орсон</dt><dd class="minus xs">−' + BZ.money(b.discountHour + b.promoOff) + "</dd></div>" : "") +
      "<div><dt>Төлсөн урьдчилгаа</dt><dd>" + (b.depositPaid ? "−" + BZ.money(b.deposit) : "0₮") + "</dd></div>" +
      "<div class='total'><dt>Үлдэгдэл</dt><dd>" + BZ.money(bal) + "</dd></div></dl></div>";

    if (st.step === "paid" || b.balancePaid) {
      return back + '<div class="card pay-done"><div class="done-icon"><i data-lucide="check"></i></div><h2>Төлбөр амжилттай</h2>' +
        '<p class="muted">' + BZ.money(st.paidAmount || bal) + " · " + BZ.balanceMethod(b) + " · " + BZ.esc(b.customer) + "</p>" +
        '<dl class="sum"><div><dt>Захиалга</dt><dd class="mono">' + b.ref + "</dd></div><div><dt>Нийт төлсөн</dt><dd>" + BZ.money(b.total) + "</dd></div><div><dt>Төлөв</dt><dd>" + BZ.payBadge(b) + "</dd></div></dl>" +
        '<div class="row-wrap" style="justify-content:center"><a class="btn btn-primary" href="#/today"><i data-lucide="house"></i>Өнөөдөр рүү</a><a class="btn btn-secondary" href="#/payment">Бусад төлбөр</a></div></div>';
    }
    if (st.step === "qr") {
      var s = left(), state = st.fail ? "fail" : s === 0 ? "expired" : "wait";
      return back + '<div class="pay-qr-wrap">' +
        '<div class="card pay-qr-card"><div class="qr-amount"><span class="xs muted">Төлөх дүн</span><b>' + BZ.money(bal) + '</b><span class="xs muted">' + BZ.S().salon.name + " · " + b.ref + "</span></div>" +
          '<div class="qr-box big">' + qr(b.ref + "-bal") +
            (state === "expired" ? '<div class="qr-overlay"><i data-lucide="timer-off"></i>QR-ын хугацаа дууссан<button type="button" class="btn btn-primary btn-sm" data-qr-new>Шинэ QR үүсгэх</button></div>' : "") +
            (state === "fail" ? '<div class="qr-overlay"><i data-lucide="circle-x"></i>Гүйлгээ амжилтгүй<button type="button" class="btn btn-primary btn-sm" data-qr-new>Дахин оролдох</button></div>' : "") + "</div>" +
          '<div class="pay-timer' + (s < 120 ? " is-low" : "") + '" id="qr-timer"><i data-lucide="timer"></i><span>' + mmss(s) + "</span><small>QR хүчинтэй</small></div>" +
          '<p class="xs muted center" style="margin:0">Үйлчлүүлэгч банкны аппаараа QR-ыг уншуулж төлнө.</p>' +
          '<div class="pay-qr-actions"><button type="button" class="btn btn-primary btn-lg btn-block" data-qr-check' + (state === "wait" ? "" : " disabled") + '><i data-lucide="refresh-cw"></i>Төлбөр шалгах</button>' +
            '<button type="button" class="btn btn-secondary btn-block" data-qr-full' + (state === "wait" ? "" : " disabled") + '><i data-lucide="maximize"></i>Үйлчлүүлэгчид томоор харуулах</button></div>' +
          '<p class="qr-msg" id="qr-msg" role="status" aria-live="polite"></p>' +
        "</div>" +
        '<div class="pay-side">' + sum +
          '<details class="card demo-sim"' + (st.fail ? " open" : "") + '><summary><i data-lucide="flask-conical"></i>Демо: төлбөрийн төлөв</summary><div class="row-wrap">' +
            '<button type="button" class="btn btn-secondary btn-sm" data-qr-sim="ok">Амжилттай</button><button type="button" class="btn btn-secondary btn-sm" data-qr-sim="fail">Амжилтгүй</button><button type="button" class="btn btn-secondary btn-sm" data-qr-sim="expire">Хугацаа дуусах</button></div></details>' +
          '<button type="button" class="btn btn-ghost btn-block" data-qr-cancel>QR цуцлах</button>' +
        "</div></div>";
    }
    /* summary step */
    return back + '<div class="pay-qr-wrap">' + '<div class="pay-side wide">' + sum +
      (b.status === "in_progress" ? '<p class="note warn-note"><i data-lucide="info"></i>Үйлчилгээ дуусаагүй байна. Эхлээд "Дууссан" гэж тэмдэглэнэ үү.</p><button type="button" class="btn btn-primary btn-lg btn-block" data-eb="' + b.ref + '">Захиалгыг нээх</button>' :
        bal === 0 ? '<p class="note"><i data-lucide="circle-check"></i>Төлөх үлдэгдэл алга.</p>' :
        '<button type="button" class="btn btn-primary btn-lg btn-block" data-qr-make><i data-lucide="qr-code"></i>QR төлбөр үүсгэх</button>' +
        '<p class="xs muted center" style="margin:var(--sp-3) 0 var(--sp-2)">эсвэл</p><div class="row-wrap other-pay">' +
          '<button type="button" class="btn btn-secondary" data-pay-other="Бэлэн"><i data-lucide="banknote"></i>Бэлнээр авсан</button>' +
          '<button type="button" class="btn btn-secondary" data-pay-other="Карт"><i data-lucide="credit-card"></i>Картаар авсан</button></div>') +
      "</div></div>";
  }

  /* ---------- Timer + actions ---------- */
  function start() {
    st.step = "qr"; st.started = Date.now(); st.checks = 0; st.fail = false; stop();
    st.timer = setInterval(function () {
      var t = document.getElementById("qr-timer");
      var s = left();
      if (t) { t.querySelector("span").textContent = mmss(s); t.classList.toggle("is-low", s < 120); }
      var full = document.getElementById("qr-full-time"); if (full) full.textContent = mmss(s);
      if (s === 0) { stop(); UI.closeModal("qr-full"); BZ.refresh(); }
    }, 1000);
  }
  function stop() { if (st.timer) clearInterval(st.timer); st.timer = null; }
  function paid(method) {
    var b = BZ.booking(st.ref);
    st.paidAmount = EMP.balance(b);
    b.balancePaid = true; b.balanceMethod = method; BIZ.save();
    st.step = "paid"; stop(); UI.closeModal("qr-full");
    UI.toast("Үлдэгдэл " + BZ.money(st.paidAmount) + " төлөгдлөө", "success"); BZ.refresh(); window.scrollTo(0, 0);
  }
  function showFull() {
    var b = BZ.booking(st.ref);
    BZ.modal("qr-full", "Төлбөр төлөх", '<div class="qr-full"><p class="muted center" style="margin:0">' + BZ.S().salon.name + '</p><b class="qr-full-amt">' + BZ.money(EMP.balance(b)) + "</b>" +
      '<div class="qr-box huge">' + qr(b.ref + "-bal") + "</div>" +
      '<p class="center small" style="margin:0">Банкны аппаараа QR уншуулна уу</p><p class="xs muted center" style="margin:0">Хүчинтэй: <b id="qr-full-time">' + mmss(left()) + "</b></p></div>" +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary btn-block" data-close-modal>Буцах</button></div>');
  }

  document.addEventListener("click", function (ev) {
    var t;
    if ((t = ev.target.closest("[data-pay]"))) { location.hash = "#/payment?ref=" + t.dataset.pay; return; }
    if (!BZ.el("payment") || (BZ.el("payment").hidden && !ev.target.closest("#qr-full"))) return;
    if (ev.target.closest("[data-qr-make]") || ev.target.closest("[data-qr-new]")) { start(); BZ.refresh(); UI.toast("QR үүслээ. Үйлчлүүлэгчид харуулна уу.", "info"); return; }
    if (ev.target.closest("[data-qr-full]")) { showFull(); return; }
    if (ev.target.closest("[data-qr-check]")) {
      var btn = ev.target.closest("[data-qr-check]"), msg = document.getElementById("qr-msg");
      btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i>Шалгаж байна…'; UI.icons();
      setTimeout(function () {
        st.checks++;
        if (st.checks >= 2) { paid("QR"); return; }
        btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw"></i>Төлбөр шалгах'; UI.icons();
        msg.textContent = "Төлбөр хараахан ороогүй байна. Үйлчлүүлэгч төлсний дараа дахин шалгана уу.";
      }, 700);
      return;
    }
    if ((t = ev.target.closest("[data-qr-sim]"))) {
      var k = t.dataset.qrSim;
      if (k === "ok") paid("QR");
      else if (k === "fail") { st.fail = true; stop(); BZ.refresh(); UI.toast("Гүйлгээ амжилтгүй боллоо (демо)", "error"); }
      else { st.started = Date.now() - HOLD * 1000; stop(); BZ.refresh(); }
      return;
    }
    if (ev.target.closest("[data-qr-cancel]")) { st.step = "summary"; stop(); BZ.refresh(); return; }
    if ((t = ev.target.closest("[data-pay-other]"))) {
      var m = t.dataset.payOther, b = BZ.booking(st.ref), by = m === "Бэлэн" ? "бэлнээр" : "картаар";
      UI.confirm({ title: "Үлдэгдлийг " + by + " авсан уу?", text: BZ.money(EMP.balance(b)) + "-ийг " + by + " хүлээн авснаа баталгаажуулна уу.", confirmLabel: "Тийм, авсан" }, function () { paid(m); });
    }
  });
  document.addEventListener("page:show", function (e) { if (e.detail.id !== "payment" && st.step !== "qr") stop(); });

  BZ.page("payment", render);
})();
