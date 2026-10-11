/* =========================================================
   Bloom employee: shared state for the logged-in specialist.
   Uses the same demo store as the business owner ("bloom-biz"),
   so a status the employee changes is visible to the owner.
   FR-28–FR-31. Access follows the permissions the owner set.
   ========================================================= */
(function () {
  var E = window.Engine;
  var KEY = "bloom-emp-id", DEFAULT = "sa-khu";

  function id() { try { return localStorage.getItem(KEY) || DEFAULT; } catch (e) { return DEFAULT; } }
  function me() { return BZ.employee(id()) || BZ.employee(DEFAULT); }
  function setMe(v) { try { localStorage.setItem(KEY, v); } catch (e) {} location.hash = "#/today"; location.reload(); }
  function perm(k) { var e = me(); return e.status === "active" && !!e.perms[k]; }

  /* Bookings this employee may see (own, or whole branch for managers) */
  function mine(scope) {
    var e = me();
    return BZ.S().bookings.filter(function (b) { return scope === "branch" ? b.branchId === e.branch : b.employeeId === e.id; });
  }
  function today() { return BIZ.day(0); }
  function endTime(b) { return E.fmt(E.toMin(b.time) + b.duration); }
  function balance(b) { return b.balancePaid ? 0 : Math.max(0, b.total - (b.depositPaid ? b.deposit : 0)); }
  function owes(b) { return b.status === "completed" && !b.balancePaid && balance(b) > 0; }
  function nowMin() { var n = new Date(); return n.getHours() * 60 + n.getMinutes(); }

  /* Demo: make sure each specialist has a finished booking waiting for
     its remaining balance, so the QR flow can be shown straight away. */
  (function seedDemo() {
    var S = BIZ.state;
    if (S.empDemo === 1) return;
    S.employees.forEach(function (e) {
      var past = S.bookings.filter(function (b) { return b.employeeId === e.id && b.status === "completed" && b.date <= today(); })
        .sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
      var pick = past.filter(function (b) { return b.date === today() && b.total - (b.depositPaid ? b.deposit : 0) > 0; })[0] || past[0];
      if (pick) pick.balancePaid = false;
    });
    S.empDemo = 1; BIZ.save();
  })();

  /* ---------- Booking detail (bottom sheet on phones) ---------- */
  function open(ref) {
    var b = BZ.booking(ref);
    if (!b) { UI.toast("Захиалга олдсонгүй", "error"); return; }
    var e = me(), own = b.employeeId === e.id, isToday = b.date === today();
    var others = S_customer(b);
    var html =
      '<div class="bd-status">' + BZ.statusBadge(b.status) + BZ.payBadge(b) + "</div>" +
      '<div class="eb-time"><span class="eb-clock">' + b.time + "<small>–" + endTime(b) + "</small></span>" +
        "<div><b>" + E.longDate(E.fromKey(b.date)) + "</b><span class='xs muted'>" + b.duration + " мин · " + BZ.branch(b.branchId).name + "</span></div></div>" +
      '<section class="bd-sec"><h4><i data-lucide="user-round"></i>Үйлчлүүлэгч</h4><p><b>' + BZ.esc(b.customer) + "</b></p>" +
        '<p class="bd-line"><a href="tel:' + b.phone.replace(/\D/g, "") + '"><i data-lucide="phone"></i>' + b.phone + "</a></p>" +
        '<p class="xs muted">' + (others ? others + " удаа үйлчлүүлсэн" : "Анх удаа ирж байна") + "</p></section>" +
      '<section class="bd-sec"><h4><i data-lucide="sparkles"></i>Үйлчилгээ</h4>' +
        b.serviceIds.map(function (id) { var x = BZ.service(id); return '<p class="eb-svc"><span>' + (x ? x.name : id) + "</span><span class='xs muted'>" + (x ? x.duration + " мин" : "") + "</span></p>"; }).join("") +
        (own ? "" : '<p class="xs muted">Хариуцах: ' + (BZ.employee(b.employeeId) || {}).name + "</p>") + "</section>" +
      '<section class="bd-sec"><h4><i data-lucide="wallet"></i>Төлбөр</h4><dl class="sum">' +
        "<div><dt>Нийт үнэ</dt><dd>" + BZ.money(b.total) + "</dd></div>" +
        "<div><dt>Урьдчилгаа</dt><dd>" + (b.deposit ? BZ.money(b.deposit) + " · " + (b.depositPaid ? '<span class="ok">төлсөн</span> ' + BZ.method(BZ.depositMethod(b)) : '<span class="warn">төлөөгүй</span>') : "Шаардлагагүй") + "</dd></div>" +
        (b.status !== "cancelled" ? "<div class='total'><dt>Үлдэгдэл</dt><dd>" + (b.balancePaid ? '<span class="ok">Төлөгдсөн</span> ' + BZ.method(BZ.balanceMethod(b)) : BZ.money(balance(b))) + "</dd></div>" : "") +
      "</dl></section>" +
      (b.status === "cancelled" ? '<p class="note"><i data-lucide="circle-x"></i>Цуцалсан: ' + (b.cancelledBy || "Үйлчлүүлэгч") + "</p>" : "") +
      (b.status === "pending_payment" ? '<p class="note warn-note"><i data-lucide="hourglass"></i>Үйлчлүүлэгч урьдчилгаагаа хараахан төлөөгүй байна.</p>' : "") +
      (own && ["confirmed", "pending_payment"].indexOf(b.status) > -1 ? '<p class="xs muted">Цуцлах, цаг шилжүүлэх шаардлагатай бол салоны эзэмшигч эсвэл менежерт хандана уу.</p>' : "") +
      '<div class="modal-foot eb-actions">' + actions(b, own, isToday) + "</div>";
    var m = BZ.modal("eb-modal", "Захиалга", html, { sub: b.ref });
    m.dataset.ref = ref;
  }
  function S_customer(b) { return BZ.S().bookings.filter(function (x) { return x.customer === b.customer && x.status === "completed" && x.ref !== b.ref; }).length; }

  function actions(b, own, isToday) {
    if (!own || !perm("ownBookings")) return '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>';
    var a = [];
    if (b.status === "confirmed") {
      a.push('<button type="button" class="btn btn-secondary" data-eb-act="no_show"' + (isToday && E.toMin(b.time) <= nowMin() ? "" : " disabled") + '><i data-lucide="user-x"></i>Ирээгүй</button>');
      a.push('<button type="button" class="btn btn-primary" data-eb-act="in_progress"' + (isToday ? "" : " disabled") + '><i data-lucide="play"></i>Үйлчилгээ эхлүүлэх</button>');
      if (!isToday) a.push('<p class="xs muted full">Зөвхөн тухайн өдөр нь эхлүүлэх боломжтой.</p>');
    } else if (b.status === "in_progress") {
      a.push('<button type="button" class="btn btn-primary btn-block" data-eb-act="completed"><i data-lucide="check"></i>Үйлчилгээ дууссан</button>');
    } else if (owes(b)) {
      a.push(perm("payments") ? '<a class="btn btn-primary btn-block" href="#/payment?ref=' + b.ref + '"><i data-lucide="qr-code"></i>Үлдэгдэл ' + BZ.money(balance(b)) + " авах</a>"
        : '<p class="xs muted full">Үлдэгдэл төлбөр авах эрх танд олгогдоогүй. Ресепшн эсвэл менежерт хандана уу.</p>');
    } else a.push('<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>');
    return a.join("");
  }

  function setStatus(b, st) {
    if (st === "no_show") {
      UI.confirm({ title: "Ирээгүй гэж тэмдэглэх үү?", text: b.customer + " цагтаа ирээгүй гэж бүртгэнэ.", confirmLabel: "Тэмдэглэх" }, function () { b.status = "no_show"; done("Ирээгүй гэж тэмдэглэлээ"); });
      return;
    }
    if (st === "completed") {
      b.status = "completed";
      if (balance(b) === 0) b.balancePaid = true;
      BIZ.save(); UI.closeModal("eb-modal");
      if (owes(b) && perm("payments")) { UI.toast("Үйлчилгээ дууслаа. Үлдэгдэл төлбөрөө авна уу.", "success"); location.hash = "#/payment?ref=" + b.ref; }
      else { UI.toast("Үйлчилгээ дууслаа", "success"); BZ.refresh(); }
      return;
    }
    b.status = st; done("Үйлчилгээ эхэллээ");
    function done(msg) { BIZ.save(); UI.toast(msg, "success"); BZ.refresh(); open(b.ref); }
  }

  /* Card used on Today and My bookings */
  function card(b, opts) {
    opts = opts || {};
    var e = BZ.employee(b.employeeId);
    return '<button type="button" class="eb-card st-' + b.status + '" data-eb="' + b.ref + '">' +
      '<span class="eb-when"><b>' + b.time + "</b><small>" + endTime(b) + "</small></span>" +
      '<span class="eb-body"><b>' + BZ.esc(b.customer) + "</b><span>" + BZ.svcNames(b) + (opts.showEmp && e ? " · " + e.name : "") + "</span>" +
        '<span class="eb-badges">' + BZ.statusBadge(b.status) + (owes(b) ? '<span class="badge badge-warning no-dot">Үлдэгдэл ' + BZ.money(balance(b)) + "</span>" : "") + "</span></span>" +
      '<i data-lucide="chevron-right" class="eb-chev"></i></button>';
  }

  document.addEventListener("click", function (ev) {
    var t;
    if ((t = ev.target.closest("[data-eb]"))) { open(t.dataset.eb); return; }
    if ((t = ev.target.closest("[data-eb-act]"))) { setStatus(BZ.booking(t.closest(".modal").dataset.ref), t.dataset.ebAct); return; }
  });

  window.EMP = { id: id, me: me, setMe: setMe, perm: perm, mine: mine, today: today, endTime: endTime, balance: balance, owes: owes, nowMin: nowMin, open: open, card: card };
})();
