/* =========================================================
   Bloom client: "Цаг захиалах" flow  (#/book?id=…)
   1 Салбар → 2 Үйлчилгээ → 3 Ажилтан → 4 Өдөр, цаг → 5 Шалгах
   → Баталгаажсан (reference number).
   If the booking needs a deposit, the success screen leads to the
   payment screen (step 4 of the client build); otherwise payment
   is skipped.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, B = window.Bloom, E = window.Engine;

  var STEPS = ["Салбар", "Үйлчилгээ", "Ажилтан", "Өдөр, цаг", "Шалгах"];
  var st = null;          // booking state
  var DAYS = 14;          // bookable days shown in the date strip

  function fresh(params) {
    var s = E.salon(params.id) || D.SALONS[0];
    var b = E.branch(s, params.branch);
    var svcs = (params.services ? params.services.split(",") : params.service ? [params.service] : [])
      .filter(function (id) { return E.service(s, id) && b.excludes.indexOf(id) === -1; });
    var emp = params.emp && E.employee(s, params.emp) ? params.emp : "any";
    if (emp !== "any") b = E.branch(s, E.employee(s, emp).branch);
    var step = 0;
    if (params.branch || s.branches.length === 1 || emp !== "any") step = 1;
    if (step === 1 && svcs.length) step = emp !== "any" ? 3 : 2;
    var st0 = { salon: s, branch: b, services: svcs, emp: emp, date: params.date || "", time: params.time || "", promo: null, promoMsg: null, step: step, agree: false, done: null };
    // A slot chosen from the search page jumps straight to step 5 if still free
    if (svcs.length && params.date && params.time) {
      var dur = E.totals(s, b, svcs).duration;
      var slot = E.slots(s, b, "any", E.fromKey(params.date), dur, svcs).filter(function (x) { return x.time === params.time; })[0];
      if (slot && slot.ok) { st0.assigned = slot.employee.id; st0.step = 4; }
      else { st0.time = ""; st0.step = 3; }
    }
    return st0;
  }

  /* ---------- helpers ---------- */
  function totals() {
    var d = st.date ? E.fromKey(st.date) : null, t = st.time ? E.toMin(st.time) : null;
    return E.totals(st.salon, st.branch, st.services, d, t, st.promo);
  }
  function staffAt() { return st.salon.employees.filter(function (e) { return e.branch === st.branch.id; }); }
  function eligible() { return E.eligible(st.salon, st.branch, st.services); }
  function employeeName(id) { var e = E.employee(st.salon, id); return e ? e.name : ""; }
  function canGo(step) {
    if (step >= 1 && !st.branch) return false;
    if (step >= 2 && !st.services.length) return false;
    if (step >= 3 && !eligible().length) return false;
    if (step >= 4 && !(st.date && st.time)) return false;
    return true;
  }
  function blockedReason() {
    if (st.step === 1 && !st.services.length) return "Дор хаяж нэг үйлчилгээ сонгоно уу.";
    if (st.step === 1 && !eligible().length) return "Сонгосон үйлчилгээг нэг ажилтан хамтад нь хийх боломжгүй. Тусад нь захиална уу.";
    if (st.step === 3 && !st.date) return "Өдөр сонгоно уу.";
    if (st.step === 3 && !st.time) return "Сул цаг сонгоно уу.";
    return "";
  }

  /* ---------- Stepper ---------- */
  function stepper() {
    return '<ol class="stepper" aria-label="Захиалгын алхам">' + STEPS.map(function (name, i) {
      var cls = i < st.step ? "is-done" : i === st.step ? "is-current" : "";
      var clickable = i < st.step || canGo(i);
      return '<li class="' + cls + '"' + (i === st.step ? ' aria-current="step"' : "") + ">" +
        (clickable && i !== st.step ? '<button type="button" data-goto="' + i + '">' : "<span>") +
        '<span class="step-dot">' + (i < st.step ? '<i data-lucide="check"></i>' : i + 1) + '</span><span class="step-name">' + name + "</span>" +
        (clickable && i !== st.step ? "</button>" : "</span>") + "</li>";
    }).join("") + "</ol>";
  }

  /* ---------- Step 1: branch ---------- */
  function stepBranch() {
    return '<h2 class="step-title">Салбараа сонгоно уу</h2>' +
      '<div class="option-list">' + st.salon.branches.map(function (b) {
        var on = b.id === st.branch.id;
        return '<button type="button" class="option' + (on ? " is-on" : "") + '" data-set-branch="' + b.id + '" aria-pressed="' + on + '">' +
          '<span class="option-icon"><i data-lucide="map-pin"></i></span>' +
          '<span class="option-body"><b>' + b.name + "</b><span>" + b.address + "</span>" +
          '<span class="xs muted">' + b.open + "–" + b.close + (b.closed.length ? " · " + b.closed.map(function (d) { return E.WEEKDAYS[d]; }).join(", ") + " амарна" : " · Өдөр бүр") +
          (b.priceFactor !== 1 ? " · Үнэ " + (b.priceFactor > 1 ? "+" : "−") + Math.round(Math.abs(b.priceFactor - 1) * 100) + "%" : "") + "</span></span>" +
          '<span class="option-check"><i data-lucide="check"></i></span></button>';
      }).join("") + "</div>";
  }

  /* ---------- Step 2: services ---------- */
  function stepServices() {
    var list = E.branchServices(st.salon, st.branch);
    var el = eligible();
    return '<h2 class="step-title">Үйлчилгээ сонгоно уу</h2>' +
      '<div class="option-list">' + list.map(function (x) {
        var on = st.services.indexOf(x.id) > -1;
        var dh = D.DISCOUNT_HOURS.filter(function (h) { return h.salonId === st.salon.id && h.serviceId === x.id; })[0];
        return '<button type="button" class="option' + (on ? " is-on" : "") + '" data-toggle-svc="' + x.id + '" aria-pressed="' + on + '">' +
          '<span class="option-icon"><i data-lucide="' + B.catIcon(x.cat) + '"></i></span>' +
          '<span class="option-body"><b>' + x.name + '</b><span class="xs muted">' + x.duration + " мин" + (x.deposit ? " · Урьдчилгаа " + B.money(x.deposit) : " · Урьдчилгаагүй") + "</span>" +
          (dh ? '<span class="badge badge-pink no-dot"><i data-lucide="timer"></i>' + dh.days + " " + dh.from + "–" + dh.to + " −" + dh.percent + "%</span>" : "") + "</span>" +
          '<span class="option-price">' + B.money(E.price(st.salon, st.branch, x)) + "</span>" +
          '<span class="option-check"><i data-lucide="check"></i></span></button>';
      }).join("") + "</div>" +
      (st.services.length > 1 && !el.length ? '<p class="alert alert-warning"><i data-lucide="triangle-alert"></i>Сонгосон үйлчилгээг нэг ажилтан хамтад нь хийдэггүй. Аль нэгийг хасах эсвэл тусад нь захиална уу.</p>' : "");
  }

  /* ---------- Step 3: specialist ---------- */
  function stepStaff() {
    var el = eligible(), others = staffAt().filter(function (e) { return el.indexOf(e) === -1; });
    function opt(id, title, sub, avatar, extra) {
      var on = st.emp === id;
      return '<button type="button" class="option' + (on ? " is-on" : "") + '" data-set-emp="' + id + '" aria-pressed="' + on + '">' + avatar +
        '<span class="option-body"><b>' + title + '</b><span class="xs muted">' + sub + "</span>" + (extra || "") + "</span>" +
        '<span class="option-check"><i data-lucide="check"></i></span></button>';
    }
    return '<h2 class="step-title">Ажилтан сонгоно уу</h2>' +
      '<div class="option-list">' +
        opt("any", "Хамаагүй", "Сул цагтай аль ч ажилтан", '<span class="option-icon"><i data-lucide="users"></i></span>', '<span class="badge badge-success no-dot">Илүү олон сул цаг</span>') +
        el.map(function (e) {
          return opt(e.id, e.name, e.role + " · " + e.years + " жил · " + e.start + "–" + e.end, UI.avatar(e),
            '<span class="row small">' + B.stars(e.rating) + '<span class="xs muted">' + e.days.map(function (d) { return E.WEEKDAYS[d].slice(0, 2); }).join(", ") + "</span></span>");
        }).join("") +
      "</div>" +
      (others.length ? '<p class="note"><i data-lucide="info"></i>' + others.map(function (e) { return e.name; }).join(", ") + " сонгосон үйлчилгээг хийдэггүй тул жагсаалтад алга.</p>" : "");
  }

  /* ---------- Step 4: date & time ---------- */
  var REASON = { booked: "Захиалгатай", break: "Завсарлага", short: "Үргэлжлэх хугацаа багтахгүй", past: "Өнгөрсөн", off: "Ажиллахгүй" };
  function stepTime() {
    var dur = totals().duration;
    var days = [];
    for (var i = 0; i < DAYS; i++) {
      var d = E.today(); d.setDate(d.getDate() + i);
      var sl = E.slots(st.salon, st.branch, st.emp, d, dur, st.services);
      var free = sl.filter(function (x) { return x.ok; }).length;
      var closed = st.branch.closed.indexOf(d.getDay()) > -1;
      days.push({ d: d, key: E.dateKey(d), free: free, closed: closed });
    }
    if (!st.date) { var first = days.filter(function (x) { return x.free; })[0]; if (first) st.date = first.key; }
    var strip = '<div class="date-strip" role="listbox" aria-label="Өдөр сонгох">' + days.map(function (x, i) {
      var on = x.key === st.date, label = i === 0 ? "Өнөөдөр" : i === 1 ? "Маргааш" : E.WEEKDAYS[x.d.getDay()].slice(0, 2);
      return '<button type="button" role="option" class="date-btn' + (on ? " is-on" : "") + '" data-date="' + x.key + '" aria-selected="' + on + '"' + (x.free ? "" : " disabled") +
        ' aria-label="' + E.longDate(x.d) + (x.free ? ", " + x.free + " сул цаг" : ", сул цаг алга") + '">' +
        '<span class="xs">' + label + "</span><b>" + x.d.getDate() + '</b><span class="xs">' + (x.d.getMonth() + 1) + "-р сар</span>" +
        '<span class="date-free">' + (x.closed ? "Амарна" : x.free ? x.free + " сул" : "Дүүрсэн") + "</span></button>";
    }).join("") + "</div>";

    var grid = "";
    if (st.date) {
      var d = E.fromKey(st.date);
      var sl = E.slots(st.salon, st.branch, st.emp, d, dur, st.services);
      var groups = [["Өглөө", 0, 12 * 60], ["Өдөр", 12 * 60, 17 * 60], ["Орой", 17 * 60, 24 * 60]];
      grid = groups.map(function (g) {
        var items = sl.filter(function (x) { return x.min >= g[1] && x.min < g[2]; });
        if (!items.length) return "";
        return '<div class="slot-group"><h3>' + g[0] + "</h3><div class=\"slot-grid\">" + items.map(function (x) {
          var dh = st.services.some(function (id) { return E.discountHour(st.salon, id, d, x.min); });
          var on = x.time === st.time;
          return '<button type="button" class="slot' + (on ? " is-on" : "") + (dh && x.ok ? " has-dh" : "") + '" data-time="' + x.time + '"' +
            (x.ok ? ' data-emp="' + x.employee.id + '"' : " disabled") + ' aria-pressed="' + on + '" title="' + (x.ok ? (dh ? "Хямдралтай цаг" : "Сул") : REASON[x.reason]) + '">' +
            x.time + (dh && x.ok ? '<span class="slot-tag">−%</span>' : "") + (x.ok ? "" : '<span class="sr-only">, ' + REASON[x.reason] + "</span>") + "</button>";
        }).join("") + "</div></div>";
      }).join("");
    }
    return '<h2 class="step-title">Өдөр, цагаа сонгоно уу</h2>' +
      '<p class="step-sub">Нийт ' + dur + " минут. Ажилтны ажлын цаг, завсарлага, бусад захиалгыг тооцсон сул цагууд" +
        (st.emp !== "any" ? " (" + employeeName(st.emp) + ")" : "") + ".</p>" +
      strip +
      (st.date ? '<p class="small date-label"><i data-lucide="calendar" class="icon-sm"></i> ' + E.longDate(E.fromKey(st.date)) + "</p>" : "") +
      grid +
      '<div class="slot-legend xs"><span><i class="lg lg-free"></i>Сул</span><span><i class="lg lg-dh"></i>Хямдралтай цаг</span><span><i class="lg lg-off"></i>Захиалгатай / завсарлага / багтахгүй</span></div>';
  }

  /* ---------- Step 5: review ---------- */
  function stepReview() {
    var t = totals(), d = E.fromKey(st.date);
    var empId = st.emp !== "any" ? st.emp : st.assigned;
    var cancellable = st.services.every(function (id) { return E.service(st.salon, id).cancellable; });
    var hours = Math.max.apply(null, st.services.map(function (id) { return E.service(st.salon, id).cancelHours; }));
    var endMin = E.toMin(st.time) + t.duration;
    return '<h2 class="step-title">Захиалгаа шалгана уу</h2>' +
      '<dl class="review-dl">' +
        "<div><dt>Салон</dt><dd>" + st.salon.name + "</dd></div>" +
        "<div><dt>Салбар</dt><dd>" + st.branch.name + '<span class="xs muted">' + st.branch.address + "</span></dd></div>" +
        "<div><dt>Ажилтан</dt><dd>" + employeeName(empId) + (st.emp === "any" ? ' <span class="badge badge-info no-dot">Автоматаар оноосон</span>' : "") + "</dd></div>" +
        "<div><dt>Огноо, цаг</dt><dd>" + E.longDate(d) + '<span class="xs muted">' + st.time + "–" + E.fmt(endMin) + " · " + t.duration + " мин</span></dd></div>" +
      "</dl>" +
      '<h3 class="h-sm">Үнийн задаргаа</h3>' +
      '<ul class="price-lines">' + t.lines.map(function (l) {
        return "<li><span>" + l.service.name + '<small class="xs muted">' + l.service.duration + " мин</small></span><b>" + B.money(l.price) + "</b></li>" +
          (l.dhOff ? '<li class="is-discount"><span><i data-lucide="timer" class="icon-sm"></i> Хямдралтай цаг −' + l.dh.percent + "%</span><b>−" + B.money(l.dhOff) + "</b></li>" : "");
      }).join("") + "</ul>" +
      '<form class="promo-form" id="promo-form"><label for="promo-in" class="small"><b>Промо код</b></label>' +
        '<div class="promo-row"><div class="input-icon"><i data-lucide="ticket-percent"></i><input class="input' + (st.promoMsg && !st.promoMsg.ok ? " is-invalid" : "") + '" id="promo-in" placeholder="Жишээ нь BLOOM10" autocomplete="off" value="' + (st.promo ? st.promo.code : st.promoInput || "") + '"' + (st.promo ? " readonly" : "") + "></div>" +
        (st.promo ? '<button class="btn btn-ghost" type="button" data-promo-remove>Хасах</button>' : '<button class="btn btn-secondary" type="submit">Ашиглах</button>') + "</div>" +
        (st.promoMsg ? '<p class="field-msg ' + (st.promoMsg.ok ? "ok" : "err") + '" role="status"><i data-lucide="' + (st.promoMsg.ok ? "circle-check" : "circle-alert") + '" class="icon-sm"></i> ' + st.promoMsg.text + "</p>" :
          '<p class="xs muted">Демо кодууд: BLOOM10, SARNAI15, ZAISAN5000, NOMIN20. Хүчингүй жишээ: NAMAR20, TSETSEG5.</p>') +
      "</form>" +
      '<div class="totals">' +
        "<div><span>Үйлчилгээний дүн</span><b>" + B.money(t.subtotal) + "</b></div>" +
        (t.dh ? '<div class="is-discount"><span>Хямдралтай цагийн хөнгөлөлт</span><b>−' + B.money(t.dh) + "</b></div>" : "") +
        (t.promoOff ? '<div class="is-discount"><span>Промо код (' + st.promo.code + ")</span><b>−" + B.money(t.promoOff) + "</b></div>" : "") +
        '<div class="grand"><span>Нийт төлөх</span><b>' + B.money(t.total) + "</b></div>" +
        (t.deposit ? '<div class="deposit"><span>Одоо төлөх урьдчилгаа</span><b>' + B.money(t.deposit) + "</b></div><div><span>Салонд төлөх үлдэгдэл</span><b>" + B.money(t.balance) + "</b></div>"
                   : '<div class="deposit"><span>Урьдчилгаа</span><b>Шаардлагагүй</b></div>') +
      "</div>" +
      '<div class="pay-ways"><span class="xs muted">Төлбөрийн хэлбэр</span>' +
        (t.deposit ? '<p class="small"><b>Урьдчилгаа:</b> ' + PM("QR") + " QR код эсвэл банкны апп</p>" : "") +
        '<p class="small"><b>' + (t.deposit ? "Үлдэгдэл" : "Төлбөр") + ":</b> салонд " + PM("Бэлэн") + PM("Карт") + PM("QR") + "</p></div>" +
      '<div class="policy"><i data-lucide="shield-check"></i><div><b>Цуцлах нөхцөл</b><p class="small">' +
        (cancellable ? "Цаг эхлэхээс " + hours + " цагийн өмнө цуцлах боломжтой." : "Энэ захиалгад цуцлах боломжгүй үйлчилгээ орсон байна.") +
        " Урьдчилгаа автоматаар буцаагдахгүй, буцаалтыг салон шийднэ.</p></div></div>" +
      '<label class="check agree"><input type="checkbox" id="agree"' + (st.agree ? " checked" : "") + "> Цуцлах нөхцөл, үйлчилгээний журамтай танилцсан</label>";
  }

  function PM(m) { return '<span class="pay-method"><i data-lucide="' + { "Бэлэн": "banknote", "Карт": "credit-card", "QR": "qr-code" }[m] + '"></i>' + m + "</span> "; }

  /* ---------- Summary panel ---------- */
  function summary() {
    var t = st.services.length ? totals() : null;
    var empId = st.emp !== "any" ? st.emp : st.assigned;
    return '<div class="sum-salon">' + B.cover(st.salon) + "<div><b>" + st.salon.name + '</b><span class="xs muted">' + st.branch.name + "</span></div></div>" +
      '<ul class="sum-list">' +
        "<li><i data-lucide=\"scissors\"></i>" + (st.services.length ? st.services.map(function (id) { return E.service(st.salon, id).name; }).join(", ") : '<span class="muted">Үйлчилгээ сонгоогүй</span>') + "</li>" +
        "<li><i data-lucide=\"user-round\"></i>" + (st.emp === "any" ? (empId && st.time ? employeeName(empId) + ' <span class="xs muted">(автомат)</span>' : "Хамаагүй") : employeeName(st.emp)) + "</li>" +
        "<li><i data-lucide=\"calendar\"></i>" + (st.date && st.time ? E.shortDate(E.fromKey(st.date)) + " · " + st.time : '<span class="muted">Цаг сонгоогүй</span>') + "</li>" +
      "</ul>" +
      (t ? '<div class="sum-total"><span>' + t.duration + " мин</span><b>" + B.money(t.total) + "</b></div>" +
           (t.dh || t.promoOff ? '<p class="xs sum-save">' + B.money(t.dh + t.promoOff) + " хэмнэлээ</p>" : "") +
           (t.deposit ? '<p class="xs muted">Урьдчилгаа ' + B.money(t.deposit) + "</p>" : '<p class="xs muted">Урьдчилгаагүй</p>') : "");
  }

  /* ---------- Success ---------- */
  function success() {
    var bk = st.done, d = E.fromKey(bk.date);
    var needPay = bk.deposit > 0;
    return '<div class="book-success">' +
      '<div class="success-icon ' + (needPay ? "is-pending" : "") + '"><i data-lucide="' + (needPay ? "hourglass" : "party-popper") + '"></i></div>' +
      '<h1 class="display">' + (needPay ? "Захиалга үүслээ" : "Цаг захиалагдлаа!") + "</h1>" +
      '<p class="muted">' + (needPay ? "Урьдчилгаа төлсний дараа захиалга баталгаажна. Цаг танд 15 минут түр хадгалагдана." : "Таны захиалга баталгаажлаа. Цагтаа ирээрэй.") + "</p>" +
      '<div class="ref">Захиалгын дугаар <b>' + bk.ref + "</b></div>" +
      '<dl class="review-dl compact">' +
        "<div><dt>Салон</dt><dd>" + bk.salonName + " · " + bk.branchName + "</dd></div>" +
        "<div><dt>Үйлчилгээ</dt><dd>" + bk.services.join(", ") + "</dd></div>" +
        "<div><dt>Ажилтан</dt><dd>" + bk.employeeName + "</dd></div>" +
        "<div><dt>Огноо, цаг</dt><dd>" + E.longDate(d) + ", " + bk.time + "</dd></div>" +
        "<div><dt>Нийт дүн</dt><dd>" + B.money(bk.total) + (needPay ? '<span class="xs muted">Урьдчилгаа ' + B.money(bk.deposit) + " · Үлдэгдэл " + B.money(bk.total - bk.deposit) + "</span>" : "") + "</dd></div>" +
        "<div><dt>Төлөв</dt><dd>" + (needPay ? '<span class="badge badge-warning">Төлбөр хүлээгдэж байна</span>' : '<span class="badge badge-success">Баталгаажсан</span>') + "</dd></div>" +
      "</dl>" +
      '<div class="row-wrap center">' +
        (needPay ? '<a class="btn btn-primary btn-lg" href="#/pay?ref=' + bk.ref + '"><i data-lucide="qr-code"></i>Урьдчилгаа төлөх · ' + B.money(bk.deposit) + "</a>" : '<a class="btn btn-primary" href="#/bookings"><i data-lucide="calendar-check"></i>Миний захиалга</a>') +
        '<a class="btn btn-ghost" href="#/home">Нүүр хуудас</a>' +
      "</div></div>";
  }

  /* ---------- Render ---------- */
  function render() {
    var el = document.querySelector('[data-page="book"]');
    if (st.done) { el.innerHTML = success(); UI.icons(); return; }
    var body = [stepBranch, stepServices, stepStaff, stepTime, stepReview][st.step]();
    var last = st.step === 4, reason = blockedReason();
    var nextOk = last ? st.agree : !reason;
    el.innerHTML =
      '<nav class="crumbs" aria-label="Зам"><a href="#/salon?id=' + st.salon.id + "&branch=" + st.branch.id + '"><i data-lucide="arrow-left"></i>' + B.esc(st.salon.name) + "</a><span>/</span><span>Цаг захиалах</span></nav>" +
      stepper() +
      '<div class="book-layout">' +
        '<div class="book-main card">' + body +
          '<div class="step-actions">' +
            (st.step > 0 ? '<button class="btn btn-ghost" type="button" data-back><i data-lucide="arrow-left"></i>Буцах</button>' : "<span></span>") +
            '<div class="step-next">' + (reason && !last ? '<span class="xs muted">' + reason + "</span>" : "") +
            '<button class="btn btn-primary" type="button" data-next' + (nextOk ? "" : " disabled") + ">" +
              (last ? '<i data-lucide="calendar-check"></i>Баталгаажуулах' : 'Үргэлжлүүлэх<i data-lucide="arrow-right"></i>') + "</button></div>" +
          "</div>" +
        "</div>" +
        '<aside class="book-summary card" aria-label="Захиалгын хураангуй">' + summary() + "</aside>" +
      "</div>";
    UI.icons();
  }

  function go(step) { st.step = step; render(); window.scrollTo({ top: 0, behavior: "smooth" }); }

  function confirmBooking() {
    var t = totals(), d = E.fromKey(st.date);
    // Re-check the slot right before saving (double-booking prevention)
    var slot = E.slots(st.salon, st.branch, st.emp, d, t.duration, st.services).filter(function (x) { return x.time === st.time; })[0];
    if (!slot || !slot.ok) {
      UI.toast("Уучлаарай, энэ цаг дөнгөж сая захиалагдсан байна. Өөр цаг сонгоно уу.", "error");
      st.time = ""; go(3); return;
    }
    if (!Session.isLoggedIn()) {
      UI.confirm({ title: "Нэвтэрнэ үү", text: "Цаг захиалахын тулд нэвтэрсэн байх шаардлагатай. Демо хэрэглэгчээр нэвтрэх үү?", confirmLabel: "Нэвтрэх" }, function () {
        Session.login(); UI.toast("Демо хэрэглэгчээр нэвтэрлээ"); confirmBooking();
      });
      return;
    }
    var emp = st.emp !== "any" ? E.employee(st.salon, st.emp) : slot.employee;
    var ref = "BLM-" + String(Date.now()).slice(-6);
    var bk = {
      ref: ref, salonId: st.salon.id, salonName: st.salon.name, branchId: st.branch.id, branchName: st.branch.name,
      serviceIds: st.services.slice(), services: st.services.map(function (id) { return E.service(st.salon, id).name; }),
      employeeId: emp.id, employeeName: emp.name, date: st.date, time: st.time, duration: t.duration,
      subtotal: t.subtotal, discountHour: t.dh, promo: st.promo ? st.promo.code : null, promoOff: t.promoOff,
      total: t.total, deposit: t.deposit, status: t.deposit ? "pending_payment" : "confirmed", created: new Date().toISOString()
    };
    E.saveBooking(bk);
    /* A deposit is needed: go straight to the QR and bank apps */
    if (bk.deposit) { st = null; location.replace("#/pay?ref=" + ref + "&new=1"); window.scrollTo(0, 0); return; }
    st.done = bk;
    history.replaceState(null, "", "#/book?id=" + st.salon.id + "&done=" + ref);
    render(); window.scrollTo(0, 0);
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) {
    if (e.detail.id !== "book") return;
    if (e.detail.params.done && st && st.done && st.done.ref === e.detail.params.done) { render(); return; }
    st = fresh(e.detail.params); render();
  });

  document.addEventListener("click", function (e) {
    var page = document.querySelector('[data-page="book"]');
    if (!st || page.hidden || !page.contains(e.target)) return;
    var t;
    if ((t = e.target.closest("[data-goto]"))) return go(+t.dataset.goto);
    if (e.target.closest("[data-back]")) return go(st.step - 1);
    if (e.target.closest("[data-next]")) {
      if (st.step === 4) return confirmBooking();
      if (st.step === 1 && st.emp !== "any" && eligible().map(function (x) { return x.id; }).indexOf(st.emp) === -1) st.emp = "any";
      return go(st.step + 1);
    }
    if ((t = e.target.closest("[data-set-branch]"))) {
      var b = E.branch(st.salon, t.dataset.setBranch);
      if (b.id !== st.branch.id) {
        var before = st.services.length;
        st.branch = b; st.services = st.services.filter(function (id) { return b.excludes.indexOf(id) === -1; });
        st.emp = "any"; st.date = ""; st.time = ""; st.promo = null; st.promoMsg = null;
        if (st.services.length < before) UI.toast("Энэ салбарт байхгүй үйлчилгээг хаслаа", "info");
      }
      render(); return;
    }
    if ((t = e.target.closest("[data-toggle-svc]"))) {
      var id = t.dataset.toggleSvc, i = st.services.indexOf(id);
      if (i > -1) st.services.splice(i, 1); else st.services.push(id);
      st.time = ""; st.promoMsg = null;
      render(); return;
    }
    if ((t = e.target.closest("[data-set-emp]"))) { st.emp = t.dataset.setEmp; st.date = ""; st.time = ""; render(); return; }
    if ((t = e.target.closest("[data-date]"))) { st.date = t.dataset.date; st.time = ""; render(); return; }
    if ((t = e.target.closest("[data-time]"))) { st.time = t.dataset.time; st.assigned = t.dataset.emp; render(); return; }
    if (e.target.closest("[data-promo-remove]")) { st.promo = null; st.promoMsg = null; st.promoInput = ""; render(); return; }
  });

  document.addEventListener("change", function (e) {
    if (e.target.id === "agree" && st) { st.agree = e.target.checked; var n = document.querySelector("[data-next]"); if (n) n.disabled = !st.agree; }
  });

  document.addEventListener("submit", function (e) {
    if (e.target.id !== "promo-form") return;
    e.preventDefault();
    var code = document.getElementById("promo-in").value;
    st.promoInput = code;
    if (!code.trim()) { st.promoMsg = { ok: false, text: "Промо код оруулна уу." }; render(); return; }
    var t = E.totals(st.salon, st.branch, st.services, E.fromKey(st.date), E.toMin(st.time), null);
    var r = E.checkPromo(code, st.branch, t.total);
    if (r.ok) {
      st.promo = r.promo;
      var off = r.promo.type === "percent" ? r.promo.value + "%" : B.money(r.promo.value);
      st.promoMsg = { ok: true, text: r.promo.code + " идэвхжлээ: " + off + " хөнгөлөлт." };
    } else { st.promo = null; st.promoMsg = { ok: false, text: r.msg }; }
    render();
  });
})();
