/* =========================================================
   Bloom client: deposit payment  (#/pay?ref=BLM-123456)
   QPay-STYLE mock only. The QR is a drawn pattern, not a real
   invoice, and cannot be scanned. No QPay branding is used; the
   bank app buttons use the logos in "banks logo/" and only show a
   demo message. Statuses are simulated with demo buttons:
   pending → checking → paid | failed | expired.
   The platform fee is never shown to the customer.
   ========================================================= */
(function () {
  var B = window.Bloom, E = window.Engine;
  var HOLD_MIN = 15;              // minutes the slot is held while waiting for payment
  var bk = null, state = "pending", timer = null, checks = 0, fresh = false, bank = "";

  /* Bank apps (logos from the "banks logo" folder) */
  var BANKS = [
    { id: "khan", name: "Хаан банк" }, { id: "golomt", name: "Голомт банк" }, { id: "tdb", name: "Худалдаа хөгжлийн банк" },
    { id: "xas", name: "Хас банк" }, { id: "state", name: "Төрийн банк" }, { id: "m", name: "М банк" },
    { id: "bogd", name: "Богд банк" }, { id: "capitron", name: "Капитрон банк" }, { id: "arig", name: "Ариг банк" }
  ];
  function bankLogo(b) { return UI.BASE + "banks%20logo/" + b.id + ".png"; }

  function all() { return E.myBookings(); }
  function find(ref) { return all().filter(function (b) { return b.ref === ref; })[0]; }
  function update(ref, patch) {
    var list = all();
    list.forEach(function (b) { if (b.ref === ref) for (var k in patch) b[k] = patch[k]; });
    try { localStorage.setItem("bloom-bookings", JSON.stringify(list)); } catch (e) {}
    bk = find(ref);
  }
  function deadline() { return new Date(bk.created).getTime() + HOLD_MIN * 60000; }
  function remaining() { return Math.max(0, Math.floor((deadline() - Date.now()) / 1000)); }

  /* ---------- Mock QR: deterministic pattern from the reference ---------- */
  function qr(ref) {
    var N = 25, cells = "", seed = 0;
    for (var i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 16) & 1; }
    function finder(x, y) { return (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9); }
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var on;
      if (finder(x, y)) {
        var fx = x > N - 9 ? x - (N - 7) : x, fy = y > N - 9 ? y - (N - 7) : y;
        on = fx >= 0 && fy >= 0 && fx < 7 && fy < 7 && (fx === 0 || fy === 0 || fx === 6 || fy === 6 || (fx > 1 && fx < 5 && fy > 1 && fy < 5));
      } else if (x > 9 && x < 15 && y > 9 && y < 15) on = false;  // space for the demo label
      else on = rnd();
      if (on) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    return '<svg class="qr-svg" viewBox="-1 -1 ' + (N + 2) + " " + (N + 2) + '" role="img" aria-label="Жишээ QR код, уншуулах боломжгүй">' +
      '<rect x="-1" y="-1" width="' + (N + 2) + '" height="' + (N + 2) + '" fill="#fff"/><g fill="#34252F">' + cells + "</g></svg>" +
      '<span class="qr-mark"><img src="' + UI.BASE + UI.LOGO.symbol + '" alt=""></span>';
  }

  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); }

  /* ---------- Views ---------- */
  function summary() {
    var d = E.fromKey(bk.date);
    return '<aside class="pay-summary card" aria-label="Захиалгын мэдээлэл">' +
      '<h2 class="h-sm">Захиалга ' + bk.ref + "</h2>" +
      '<ul class="sum-list pay-list">' +
        '<li><i data-lucide="store"></i>' + bk.salonName + " · " + bk.branchName + "</li>" +
        '<li><i data-lucide="scissors"></i>' + bk.services.join(", ") + "</li>" +
        '<li><i data-lucide="user-round"></i>' + bk.employeeName + "</li>" +
        '<li><i data-lucide="calendar"></i>' + E.longDate(d) + ", " + bk.time + "</li>" +
      "</ul>" +
      '<div class="totals">' +
        "<div><span>Үйлчилгээний дүн</span><b>" + B.money(bk.subtotal) + "</b></div>" +
        (bk.discountHour ? '<div class="is-discount"><span>Хямдралтай цаг</span><b>−' + B.money(bk.discountHour) + "</b></div>" : "") +
        (bk.promoOff ? '<div class="is-discount"><span>Промо код (' + bk.promo + ")</span><b>−" + B.money(bk.promoOff) + "</b></div>" : "") +
        '<div><span>Нийт</span><b>' + B.money(bk.total) + "</b></div>" +
        '<div class="grand"><span>Одоо төлөх урьдчилгаа</span><b>' + B.money(bk.deposit) + "</b></div>" +
        '<div><span>Салонд төлөх үлдэгдэл</span><b>' + B.money(bk.total - bk.deposit) + "</b></div>" +
      "</div>" +
      '<p class="xs muted pay-rest"><i data-lucide="wallet" class="icon-sm"></i> Үлдэгдлийг салонд бэлэн, карт эсвэл QR-аар төлнө.</p>' +
      '<p class="xs muted">Нэмэлт шимтгэл, үйлчилгээний хураамж байхгүй.</p>' +
    "</aside>";
  }

  function pendingView() {
    var left = remaining();
    return '<div class="pay-main card">' +
      (fresh ? '<p class="alert alert-success pay-created" role="status"><i data-lucide="circle-check"></i><span>Захиалга <b>' + bk.ref + "</b> үүслээ. Урьдчилгаа төлсний дараа баталгаажна.</span></p>" : "") +
      '<div class="pay-head"><div><span class="eyebrow">Урьдчилгаа төлөх</span><h1 class="display">' + B.money(bk.deposit) + "</h1></div>" +
        '<div class="pay-timer' + (left < 180 ? " is-low" : "") + '" role="timer" aria-live="off"><i data-lucide="clock"></i><span id="pay-left">' + mmss(left) + "</span><small>дотор төлнө үү</small></div></div>" +
      '<p class="small muted">Хугацаандаа төлөхгүй бол захиалга цуцлагдаж, цаг бусад хүнд нээгдэнэ.</p>' +
      '<div class="pay-grid">' +
        '<div class="qr-box' + (state === "checking" ? " is-checking" : "") + '">' + qr(bk.ref) +
          (state === "checking" ? '<div class="qr-overlay"><span class="spinner" aria-hidden="true"></span>Төлбөр шалгаж байна…</div>' : "") + "</div>" +
      "</div>" +
      (state === "failed" ? '<p class="alert alert-danger" role="alert"><i data-lucide="circle-x"></i>Төлбөр амжилтгүй боллоо. Банкны үлдэгдлээ шалгаад дахин оролдоно уу. Мөнгө хасагдсан бол салонтой холбогдоно уу.</p>' : "") +
      (state === "notyet" ? '<p class="alert alert-warning" role="status"><i data-lucide="hourglass"></i>Төлбөр хараахан орж ирээгүй байна. Төлсөн бол хэдэн секунд хүлээгээд дахин шалгана уу.</p>' : "") +
      '<div class="row-wrap pay-actions">' +
        '<button class="btn btn-primary btn-lg" type="button" data-pay-check' + (state === "checking" ? " disabled" : "") + '><i data-lucide="refresh-cw"></i>Төлбөр шалгах</button>' +
      "</div>" +
      '<h2 class="h-sm bank-title">Эсвэл банкны апп сонгох</h2>' +
      '<div class="bank-grid">' + BANKS.map(function (b) {
        return '<button type="button" class="bank-btn" data-bank="' + b.name + '"><img class="bank-logo" src="' + bankLogo(b) + '" alt=""><span>' + b.name + '</span></button>';
      }).join("") + "</div>" +
      '<details class="demo-panel"' + (state === "failed" ? " open" : "") + '><summary><i data-lucide="flask-conical"></i>Демо: төлбөрийн төлөв турших</summary>' +
        '<div class="row-wrap"><button class="btn btn-sm btn-secondary" type="button" data-sim="paid">Амжилттай төлөгдсөн</button>' +
        '<button class="btn btn-sm btn-secondary" type="button" data-sim="failed">Амжилтгүй</button>' +
        '<button class="btn btn-sm btn-secondary" type="button" data-sim="expired">Хугацаа дууссан</button></div>' +
        '<p class="xs muted">Бодит системд төлбөрийн төлвийг банкнаас ирэх мэдээллээр шинэчилнэ.</p></details>' +
    "</div>";
  }

  function paidView() {
    var d = E.fromKey(bk.date);
    return '<div class="book-success">' +
      '<div class="success-icon"><i data-lucide="badge-check"></i></div>' +
      '<h1 class="display">Төлбөр амжилттай</h1>' +
      '<p class="muted">Урьдчилгаа төлөгдөж, таны захиалга баталгаажлаа.</p>' +
      '<div class="ref">Захиалгын дугаар <b>' + bk.ref + "</b></div>" +
      '<div class="receipt">' +
        '<div class="receipt-row"><span>Төлсөн дүн</span><b>' + B.money(bk.deposit) + "</b></div>" +
        '<div class="receipt-row"><span>Төлсөн хугацаа</span><b>' + new Date(bk.paidAt).toLocaleString("en-GB", { hour12: false }).replace(",", "") + "</b></div>" +
        '<div class="receipt-row"><span>Төлбөрийн хэлбэр</span><b>' + (bk.depositMethod || "QR") + "</b></div>" +
        '<div class="receipt-row"><span>Гүйлгээний дугаар</span><b>TX-' + bk.ref.slice(4) + "-DEMO</b></div>" +
        '<div class="receipt-row"><span>Салонд төлөх үлдэгдэл</span><b>' + B.money(bk.total - bk.deposit) + "</b></div>" +
        '<div class="receipt-row"><span>Цаг</span><b>' + E.shortDate(d) + " · " + bk.time + "</b></div>" +
        '<div class="receipt-row"><span>Төлөв</span><span class="badge badge-success">Баталгаажсан</span></div>' +
      "</div>" +
      '<div class="row-wrap center">' +
        '<a class="btn btn-primary" href="#/bookings"><i data-lucide="calendar-check"></i>Миний захиалга</a>' +
        '<button class="btn btn-secondary" type="button" data-receipt><i data-lucide="download"></i>Баримт татах</button>' +
        '<a class="btn btn-ghost" href="#/home">Нүүр хуудас</a>' +
      "</div></div>";
  }

  function expiredView() {
    return '<div class="book-success">' +
      '<div class="success-icon is-failed"><i data-lucide="timer-off"></i></div>' +
      '<h1 class="display">Төлбөрийн хугацаа дууссан</h1>' +
      '<p class="muted">' + HOLD_MIN + " минутын дотор урьдчилгаа төлөгдөөгүй тул захиалга " + bk.ref + " цуцлагдаж, цаг бусад хүнд нээгдлээ. Таны данснаас мөнгө хасагдаагүй.</p>" +
      '<div class="row-wrap center">' +
        '<a class="btn btn-primary" href="#/book?id=' + bk.salonId + "&branch=" + bk.branchId + "&services=" + bk.serviceIds.join(",") + '"><i data-lucide="calendar-plus"></i>Дахин цаг захиалах</a>' +
        '<a class="btn btn-ghost" href="#/home">Нүүр хуудас</a>' +
      "</div></div>";
  }

  function render() {
    var el = document.querySelector('[data-page="pay"]');
    clearInterval(timer);
    if (!bk) {
      el.innerHTML = '<div class="empty"><div class="empty-icon"><i data-lucide="receipt"></i></div><h3>Төлөх захиалга олдсонгүй</h3>' +
        "<p>Захиалгын дугаар буруу эсвэл захиалга устсан байна.</p><a class=\"btn btn-primary btn-sm\" href=\"#/salons\">Салон хайх</a></div>";
      UI.icons(); return;
    }
    if (bk.status === "confirmed" && bk.paidAt) state = "paid";
    else if (bk.status === "expired") state = "expired";
    else if (!bk.deposit) { location.replace("#/bookings"); return; }
    else if (remaining() === 0 && state !== "paid") { expire(); return; }

    var crumbs = '<nav class="crumbs" aria-label="Зам"><a href="#/salon?id=' + bk.salonId + '"><i data-lucide="arrow-left"></i>' + B.esc(bk.salonName) + "</a><span>/</span><span>Урьдчилгаа төлөх</span></nav>";
    if (state === "paid") el.innerHTML = crumbs + paidView();
    else if (state === "expired") el.innerHTML = crumbs + expiredView();
    else {
      el.innerHTML = crumbs + '<div class="pay-layout">' + pendingView() + summary() + "</div>";
      timer = setInterval(tick, 1000);
    }
    UI.icons();
  }

  function tick() {
    var s = document.getElementById("pay-left");
    if (!s || document.querySelector('[data-page="pay"]').hidden) { clearInterval(timer); return; }
    var left = remaining();
    s.textContent = mmss(left);
    s.parentNode.classList.toggle("is-low", left < 180);
    if (left === 0) expire();
  }

  function expire() {
    update(bk.ref, { status: "expired" });
    state = "expired"; render();
  }
  function pay() {
    update(bk.ref, { status: "confirmed", paidAt: new Date().toISOString(), depositMethod: "QR" + (bank ? " · " + bank : "") });
    state = "paid"; render(); window.scrollTo(0, 0);
    UI.toast("Урьдчилгаа төлөгдлөө", "success");
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) {
    if (e.detail.id !== "pay") { clearInterval(timer); return; }
    bk = find(e.detail.params.ref || "");
    state = "pending"; checks = 0; fresh = !!e.detail.params.new; bank = "";
    render();
  });

  document.addEventListener("click", function (e) {
    var page = document.querySelector('[data-page="pay"]');
    if (!bk || page.hidden || !page.contains(e.target)) return;
    var t;
    if (e.target.closest("[data-pay-check]")) {
      state = "checking"; render();
      setTimeout(function () {
        checks++;
        // First check: payment not received yet; second check: paid (demo)
        if (checks >= 2) pay(); else { state = "notyet"; render(); }
      }, 1400);
      return;
    }
    if ((t = e.target.closest("[data-sim]"))) {
      var s = t.dataset.sim;
      if (s === "paid") pay();
      else if (s === "expired") expire();
      else { state = "failed"; render(); }
      return;
    }
    if ((t = e.target.closest("[data-bank]"))) {
      bank = t.dataset.bank;
      UI.toast(t.dataset.bank + " апп руу шилжиж байна (демо). Төлсний дараа энд буцаж ирээд \"Төлбөр шалгах\" дарна.", "info");
      return;
    }
    if (e.target.closest("[data-receipt]")) UI.toast("Баримт (PDF) татагдлаа (демо)", "success");
  });
})();
