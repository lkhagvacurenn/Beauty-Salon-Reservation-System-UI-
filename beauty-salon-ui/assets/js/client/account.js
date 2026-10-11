/* =========================================================
   Bloom client: "Миний захиалга" and "Профайл"
   - bookings in tabs: upcoming / completed / cancelled
   - cancel (follows each service's cancellation rule; deposits
     are NOT refunded automatically, the salon decides)
   - pay a pending deposit, rebook, directions, booking details
   - one review per COMPLETED booking; customers can delete their
     own review (not edit it); the platform admin can delete any review
   - profile: personal info, my reviews, settings
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, B = window.Bloom, E = window.Engine;
  var tab = "upcoming", ptab = "info";

  /* ---------- Demo history (added once) ---------- */
  function day(offset) { var d = E.today(); d.setDate(d.getDate() + offset); return E.dateKey(d); }
  function seed() {
    if (B.load("bloom-seeded", false)) return;
    function mk(ref, salonId, branchId, ids, empId, offset, time, status, extra) {
      var s = E.salon(salonId), b = E.branch(s, branchId);
      var t = E.totals(s, b, ids, E.fromKey(day(offset)), E.toMin(time), null);
      var bk = { ref: ref, salonId: salonId, salonName: s.name, branchId: b.id, branchName: b.name, serviceIds: ids,
        services: ids.map(function (id) { return E.service(s, id).name; }), employeeId: empId, employeeName: E.employee(s, empId).name,
        date: day(offset), time: time, duration: t.duration, subtotal: t.subtotal, discountHour: t.dh, promo: null, promoOff: 0,
        total: t.total, deposit: t.deposit, status: status, created: new Date(Date.now() - 86400000 * 3).toISOString() };
      if (t.deposit && status !== "cancelled") bk.paidAt = bk.created;
      for (var k in extra) bk[k] = extra[k];
      return bk;
    }
    var list = E.myBookings().concat([
      mk("BLM-418230", "nomin", "nomin-1", ["n1"], "no-tse", 3, "15:00", "confirmed"),
      mk("BLM-418977", "erdene", "erdene-1", ["e1"], "er-tug", 6, "10:00", "confirmed"),
      mk("BLM-402115", "sarnai", "sarnai-1", ["s1"], "sa-anu", -12, "11:00", "completed"),
      mk("BLM-397460", "tsetseg", "tsetseg-1", ["t1"], "ts-mun", -25, "10:30", "completed"),
      mk("BLM-388301", "nomin", "nomin-1", ["n3"], "no-bil", -40, "14:00", "completed"),
      mk("BLM-409882", "misheel", "misheel-1", ["m1"], "mi-ene", -5, "12:00", "cancelled", { cancelledBy: "Та", cancelReason: "Төлөвлөгөө өөрчлөгдсөн", cancelledAt: day(-7) })
    ]);
    try { localStorage.setItem("bloom-bookings", JSON.stringify(list)); } catch (e) {}
    var rv = B.load("bloom-my-reviews", {});
    rv["BLM-397460"] = { rating: 5, text: "Маникюр маань 3 долоо хоног болсон ч гоё хэвээрээ. Мөнхзул маш нямбай хийдэг.", tags: ["Мэргэжлийн", "Цэвэрхэн"], date: day(-23) };
    B.save("bloom-my-reviews", rv);
    B.save("bloom-seeded", true);
  }

  /* ---------- Status helpers ---------- */
  function startTime(bk) { var d = E.fromKey(bk.date); d.setMinutes(E.toMin(bk.time)); return d; }
  function status(bk) {
    if (bk.status === "pending_payment" && Date.now() > new Date(bk.created).getTime() + 15 * 60000) return "expired";
    if (bk.status === "confirmed" && startTime(bk).getTime() + bk.duration * 60000 < Date.now()) return "completed";
    return bk.status;
  }
  var STATUS = {
    pending_payment: ["Төлбөр хүлээгдэж байна", "warning"], confirmed: ["Баталгаажсан", "success"],
    completed: ["Дууссан", "info"], cancelled: ["Цуцлагдсан", "danger"], expired: ["Хугацаа дууссан", "danger"]
  };
  function group(st) { return st === "completed" ? "past" : st === "cancelled" || st === "expired" ? "cancelled" : "upcoming"; }
  function reviews() { return B.load("bloom-my-reviews", {}); }
  function find(ref) { return E.myBookings().filter(function (b) { return b.ref === ref; })[0]; }
  function patch(ref, p) {
    var list = E.myBookings();
    list.forEach(function (b) { if (b.ref === ref) for (var k in p) b[k] = p[k]; });
    try { localStorage.setItem("bloom-bookings", JSON.stringify(list)); } catch (e) {}
  }
  function cancelRule(bk) {
    var s = E.salon(bk.salonId);
    var svcs = bk.serviceIds.map(function (id) { return E.service(s, id); });
    if (svcs.some(function (x) { return !x.cancellable; })) return { ok: false, why: "Энэ захиалгад цуцлах боломжгүй үйлчилгээ орсон." };
    var h = Math.max.apply(null, svcs.map(function (x) { return x.cancelHours; }));
    var left = (startTime(bk) - Date.now()) / 3600000;
    if (left < h) return { ok: false, why: "Цаг эхлэхээс " + h + " цагийн өмнө л цуцлах боломжтой. Салонтой утсаар холбогдоно уу." , hours: h };
    return { ok: true, hours: h, until: new Date(startTime(bk).getTime() - h * 3600000) };
  }
  function rebookHref(bk) { return "#/book?id=" + bk.salonId + "&branch=" + bk.branchId + "&services=" + bk.serviceIds.join(","); }
  function when(bk) {
    var d = E.fromKey(bk.date), off = E.dayOffset(d);
    var rel = off === 0 ? "Өнөөдөр" : off === 1 ? "Маргааш" : off > 1 && off < 7 ? off + " хоногийн дараа" : "";
    return { long: E.longDate(d), rel: rel, end: E.fmt(E.toMin(bk.time) + bk.duration) };
  }
  function needLogin(el, next, title) {
    el.innerHTML = '<div class="empty"><div class="empty-icon"><i data-lucide="lock-keyhole"></i></div><h3>' + title + "</h3>" +
      "<p>Энэ хэсгийг харахын тулд нэвтэрнэ үү.</p>" +
      '<div class="row-wrap center"><a class="btn btn-primary btn-sm" href="#/login?next=' + next + '">Нэвтрэх</a>' +
      '<a class="btn btn-secondary btn-sm" href="#/login?mode=register&next=' + next + '">Бүртгүүлэх</a></div></div>';
    UI.icons();
  }

  /* =========================================================
     My bookings
     ========================================================= */
  function bookingCard(bk) {
    var st = status(bk), s = E.salon(bk.salonId), w = when(bk), rv = reviews()[bk.ref];
    var actions = "";
    if (st === "pending_payment") {
      var left = Math.max(0, Math.ceil((new Date(bk.created).getTime() + 15 * 60000 - Date.now()) / 60000));
      actions += '<a class="btn btn-primary btn-sm" href="#/pay?ref=' + bk.ref + '"><i data-lucide="qr-code"></i>Урьдчилгаа төлөх · ' + B.money(bk.deposit) + "</a>" +
        '<span class="xs warn-text">' + left + " минутын дотор төлөхгүй бол цуцлагдана</span>";
    }
    if (st === "confirmed" || st === "pending_payment") {
      actions += '<button class="btn btn-ghost btn-sm" type="button" data-cancel="' + bk.ref + '"><i data-lucide="calendar-x"></i>Цуцлах</button>';
      if (st === "confirmed") actions += '<a class="btn btn-ghost btn-sm" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(E.branch(s, bk.branchId).address + ", Улаанбаатар") + '" target="_blank" rel="noopener"><i data-lucide="navigation"></i>Чиглэл</a>';
    }
    if (st === "completed") {
      actions += rv
        ? '<span class="reviewed"><i data-lucide="message-square-heart"></i>Сэтгэгдэл бичсэн · ' + rv.rating + ' <i data-lucide="star" class="star-on"></i></span>'
        : '<button class="btn btn-primary btn-sm" type="button" data-review="' + bk.ref + '"><i data-lucide="star"></i>Сэтгэгдэл бичих</button>';
    }
    if (st !== "confirmed" && st !== "pending_payment") actions += '<a class="btn btn-secondary btn-sm" href="' + rebookHref(bk) + '"><i data-lucide="rotate-ccw"></i>Дахин захиалах</a>';

    return '<article class="bk-card is-' + st + '">' +
      '<div class="bk-date"><b>' + E.fromKey(bk.date).getDate() + "</b><span>" + E.MONTHS[E.fromKey(bk.date).getMonth()] + "</span><span>" + bk.time + "</span></div>" +
      '<div class="bk-body">' +
        '<div class="bk-top"><div><h3><a href="#/salon?id=' + bk.salonId + "&branch=" + bk.branchId + '">' + B.esc(bk.salonName) + '</a></h3><p class="xs muted">' + bk.branchName + " · " + bk.ref + "</p></div>" +
          '<span class="badge badge-' + STATUS[st][1] + '">' + STATUS[st][0] + "</span></div>" +
        '<ul class="bk-meta">' +
          '<li><i data-lucide="scissors"></i>' + bk.services.join(", ") + "</li>" +
          '<li><i data-lucide="clock"></i>' + (w.rel ? "<b>" + w.rel + "</b> · " : "") + w.long + ", " + bk.time + "–" + w.end + "</li>" +
          '<li><i data-lucide="user-round"></i>' + bk.employeeName + "</li>" +
          '<li><i data-lucide="wallet"></i>' + B.money(bk.total) + (bk.deposit ? ' <span class="muted">· урьдчилгаа ' + B.money(bk.deposit) + (bk.paidAt ? " төлсөн" : "") + "</span>" : "") + "</li>" +
          (st === "cancelled" ? '<li class="muted"><i data-lucide="info"></i>' + (bk.cancelledBy || "Та") + " цуцалсан" + (bk.cancelReason ? ": " + bk.cancelReason : "") + "</li>" : "") +
        "</ul>" +
        '<div class="bk-actions">' + actions + '<button class="link-btn" type="button" data-detail="' + bk.ref + '">Дэлгэрэнгүй</button></div>' +
      "</div></article>";
  }

  function renderBookings(params) {
    var el = document.querySelector('[data-page="bookings"]');
    if (!Session.isLoggedIn()) return needLogin(el, "bookings", "Миний захиалга");
    seed();
    if (params && params.tab) tab = params.tab;
    var all = E.myBookings();
    var groups = { upcoming: [], past: [], cancelled: [] };
    all.forEach(function (b) { groups[group(status(b))].push(b); });
    groups.upcoming.sort(function (a, b) { return startTime(a) - startTime(b); });
    groups.past.sort(function (a, b) { return startTime(b) - startTime(a); });
    groups.cancelled.sort(function (a, b) { return startTime(b) - startTime(a); });
    var toReview = groups.past.filter(function (b) { return !reviews()[b.ref]; }).length;
    var TABS = [["upcoming", "Удахгүй"], ["past", "Дууссан"], ["cancelled", "Цуцлагдсан"]];
    var list = groups[tab];
    var EMPTY = {
      upcoming: ["calendar-plus", "Удахгүй болох захиалга алга", "Дуртай салоноо олоод цагаа захиалаарай.", '<a class="btn btn-primary btn-sm" href="#/salons">Салон хайх</a>'],
      past: ["history", "Дууссан захиалга алга", "Үйлчилгээ авсны дараа энд харагдаж, сэтгэгдэл бичих боломжтой болно.", ""],
      cancelled: ["calendar-x", "Цуцлагдсан захиалга алга", "Цуцалсан эсвэл төлбөрийн хугацаа дууссан захиалга энд харагдана.", ""]
    }[tab];
    el.innerHTML =
      '<div class="page-head"><div><h1 class="display">Миний захиалга</h1><p>Захиалгаа харах, цуцлах, төлөх, сэтгэгдэл бичих.</p></div>' +
        '<a class="btn btn-primary btn-sm" href="#/salons"><i data-lucide="plus"></i>Шинэ захиалга</a></div>' +
      '<div class="segmented bk-tabs" role="tablist" aria-label="Захиалгын төрөл">' + TABS.map(function (t) {
        return '<button type="button" role="tab" aria-selected="' + (tab === t[0]) + '" data-bk-tab="' + t[0] + '">' + t[1] + ' <span class="tab-count">' + groups[t[0]].length + "</span></button>";
      }).join("") + "</div>" +
      (tab === "past" && toReview ? '<p class="alert alert-info"><i data-lucide="message-square-heart"></i>' + toReview + " захиалгад сэтгэгдэл бичээгүй байна. Таны сэтгэгдэл бусдад салон сонгоход тусална.</p>" : "") +
      (list.length ? '<div class="bk-list">' + list.map(bookingCard).join("") + "</div>"
        : '<div class="empty"><div class="empty-icon"><i data-lucide="' + EMPTY[0] + '"></i></div><h3>' + EMPTY[1] + "</h3><p>" + EMPTY[2] + "</p>" + EMPTY[3] + "</div>");
    UI.icons();
    if (params && params.review && find(params.review)) openReview(params.review);
  }

  /* ---------- Modals (built once) ---------- */
  function modal(id, cls) {
    var ov = document.getElementById(id);
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "overlay sheet-on-mobile"; ov.id = id; ov.setAttribute("aria-hidden", "true");
      ov.innerHTML = '<div class="modal ' + (cls || "") + '" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(ov);
    }
    return ov.querySelector(".modal");
  }
  function head(title, sub) {
    return '<div class="modal-head"><div><h3>' + title + "</h3>" + (sub ? '<p class="xs muted" style="margin:2px 0 0">' + sub + "</p>" : "") + "</div>" +
      '<button class="icon-btn plain" type="button" data-close-modal aria-label="Хаах"><i data-lucide="x"></i></button></div>';
  }

  function openDetail(ref) {
    var bk = find(ref), st = status(bk), s = E.salon(bk.salonId), br = E.branch(s, bk.branchId), w = when(bk), r = cancelRule(bk);
    var m = modal("bk-detail", "wide-modal");
    m.innerHTML = head("Захиалга " + bk.ref, '<span class="badge badge-' + STATUS[st][1] + '">' + STATUS[st][0] + "</span>") +
      '<dl class="review-dl">' +
        "<div><dt>Салон</dt><dd>" + bk.salonName + '<span class="xs muted">' + br.name + " · " + br.address + "</span></dd></div>" +
        "<div><dt>Огноо, цаг</dt><dd>" + w.long + '<span class="xs muted">' + bk.time + "–" + w.end + " · " + bk.duration + " мин</span></dd></div>" +
        "<div><dt>Мастер</dt><dd>" + bk.employeeName + "</dd></div>" +
        "<div><dt>Холбоо барих</dt><dd>" + br.phone + "</dd></div>" +
      "</dl>" +
      '<div class="totals">' +
        bk.services.map(function (n, i) { return "<div><span>" + n + "</span><b>" + B.money(E.price(s, br, E.service(s, bk.serviceIds[i]))) + "</b></div>"; }).join("") +
        (bk.discountHour ? '<div class="is-discount"><span>Discount Hour</span><b>−' + B.money(bk.discountHour) + "</b></div>" : "") +
        (bk.promoOff ? '<div class="is-discount"><span>Промо код (' + bk.promo + ")</span><b>−" + B.money(bk.promoOff) + "</b></div>" : "") +
        '<div class="grand"><span>Нийт</span><b>' + B.money(bk.total) + "</b></div>" +
        (bk.deposit ? '<div class="deposit"><span>Урьдчилгаа</span><b>' + B.money(bk.deposit) + (bk.paidAt ? " · төлсөн" : " · төлөөгүй") + "</b></div><div><span>Салонд төлөх</span><b>" + B.money(bk.total - bk.deposit) + "</b></div>" : '<div class="deposit"><span>Урьдчилгаа</span><b>Шаардлагагүй</b></div>') +
      "</div>" +
      (st === "confirmed" || st === "pending_payment"
        ? '<div class="policy"><i data-lucide="shield-check"></i><div><b>Цуцлах нөхцөл</b><p class="small">' +
            (r.ok ? r.until.toLocaleDateString("en-GB") + " " + E.fmt(r.until.getHours() * 60 + r.until.getMinutes()) + " хүртэл цуцлах боломжтой." : r.why) +
            " Урьдчилгаа автоматаар буцаагдахгүй, буцаалтыг салон шийднэ.</p></div></div>" : "") +
      '<div class="modal-foot">' +
        (st === "confirmed" || st === "pending_payment" ? '<button class="btn btn-ghost" type="button" data-cancel="' + bk.ref + '">Цуцлах</button>' : "") +
        '<button class="btn btn-primary" type="button" data-close-modal>Хаах</button></div>';
    UI.icons(); UI.openModal("bk-detail");
  }

  function openCancel(ref) {
    var bk = find(ref), r = cancelRule(bk);
    UI.closeModal("bk-detail");
    var m = modal("bk-cancel");
    if (!r.ok) {
      var br = E.branch(E.salon(bk.salonId), bk.branchId);
      m.innerHTML = head("Цуцлах боломжгүй") +
        '<p class="alert alert-warning"><i data-lucide="calendar-x"></i>' + r.why + "</p>" +
        '<p class="small">Салбарын утас: <a href="tel:' + br.phone.replace(/-/g, "") + '"><b>' + br.phone + "</b></a></p>" +
        '<div class="modal-foot"><button class="btn btn-primary" type="button" data-close-modal>Ойлголоо</button></div>';
    } else {
      m.innerHTML = head("Захиалга цуцлах уу?", bk.salonName + " · " + E.shortDate(E.fromKey(bk.date)) + " " + bk.time) +
        '<fieldset class="f-group"><legend>Цуцлах шалтгаан</legend><div class="row-wrap" id="cancel-reasons">' +
          ["Төлөвлөгөө өөрчлөгдсөн", "Өөр цаг сонгоно", "Өөр салон сонгосон", "Бусад"].map(function (x, i) {
            return '<button type="button" class="chip" aria-pressed="' + (i === 0) + '" data-reason="' + x + '">' + x + "</button>";
          }).join("") + "</div></fieldset>" +
        (bk.deposit && bk.paidAt ? '<p class="alert alert-warning"><i data-lucide="info"></i>Төлсөн урьдчилгаа ' + B.money(bk.deposit) + " автоматаар буцаагдахгүй. Буцаалтыг салон өөрийн журмаар шийдэж, тантай холбогдоно.</p>" : "") +
        '<div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Болих</button>' +
        '<button class="btn btn-danger" type="button" data-cancel-yes="' + ref + '"><i data-lucide="calendar-x"></i>Тийм, цуцлах</button></div>';
    }
    UI.icons(); UI.openModal("bk-cancel");
  }

  /* ---------- Review: one per completed booking ---------- */
  var draft = null;
  var TAGS = ["Мэргэжлийн", "Цэвэрхэн", "Цагтаа эхэлсэн", "Найрсаг", "Үнэ тохирсон", "Дахин очно"];
  function openReview(ref) {
    var bk = find(ref);
    if (status(bk) !== "completed") { UI.toast("Зөвхөн дууссан захиалгад сэтгэгдэл бичнэ", "error"); return; }
    if (reviews()[ref]) { UI.toast("Энэ захиалгад сэтгэгдэл бичсэн байна", "info"); return; }
    draft = { ref: ref, rating: 0, text: "", tags: [], error: "" };
    drawReview(); UI.openModal("bk-review");
  }
  function drawReview() {
    var bk = find(draft.ref), m = modal("bk-review");
    var LABEL = ["", "Муу", "Дунд зэрэг", "Хэвийн", "Сайн", "Маш сайн"];
    m.innerHTML = head("Сэтгэгдэл бичих", bk.salonName + " · " + bk.services.join(", ") + " · " + E.shortDate(E.fromKey(bk.date))) +
      '<form id="review-form" novalidate>' +
        '<fieldset class="f-group"><legend>Үнэлгээ <span class="req">*</span></legend>' +
          '<div class="star-input" role="radiogroup" aria-label="Үнэлгээ">' + [1, 2, 3, 4, 5].map(function (n) {
            return '<button type="button" role="radio" aria-checked="' + (draft.rating === n) + '" aria-label="' + n + " од, " + LABEL[n] + '" data-star="' + n + '" class="' + (n <= draft.rating ? "on" : "") + '"><i data-lucide="star"></i></button>';
          }).join("") + '<span class="small muted">' + (draft.rating ? LABEL[draft.rating] : "Од сонгоно уу") + "</span></div></fieldset>" +
        '<fieldset class="f-group"><legend>Юу таалагдсан бэ?</legend><div class="row-wrap">' + TAGS.map(function (t) {
          return '<button type="button" class="chip" aria-pressed="' + (draft.tags.indexOf(t) > -1) + '" data-tag="' + t + '">' + t + "</button>";
        }).join("") + "</div></fieldset>" +
        '<div class="field' + (draft.error ? " has-error" : "") + '"><label for="rv-text">Сэтгэгдэл <span class="req">*</span></label>' +
          '<textarea class="input textarea" id="rv-text" rows="4" maxlength="500" placeholder="Үйлчилгээ, мастер, орчны талаар бусдад хэрэгтэй мэдээлэл бичээрэй.">' + B.esc(draft.text) + "</textarea>" +
          '<div class="field-row"><span class="error-text">' + draft.error + '</span><span class="hint" id="rv-count">' + draft.text.length + " / 500</span></div></div>" +
        '<p class="note"><i data-lucide="info"></i>Нэг захиалгад нэг удаа сэтгэгдэл бичнэ. Илгээсний дараа засах боломжгүй, харин "Профайл → Миний сэтгэгдэл" хэсгээс устгаж болно. Журам зөрчсөн сэтгэгдлийг платформын админ устгана.</p>' +
        '<div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Болих</button><button class="btn btn-primary" type="submit"><i data-lucide="send"></i>Илгээх</button></div>' +
      "</form>";
    UI.icons();
  }

  /* =========================================================
     Profile
     ========================================================= */
  function renderProfile(params) {
    var el = document.querySelector('[data-page="profile"]');
    if (!Session.isLoggedIn()) return needLogin(el, "profile", "Профайл");
    seed();
    if (params && params.tab) ptab = params.tab;
    var u = Session.user(), all = E.myBookings(), rv = reviews();
    var done = all.filter(function (b) { return status(b) === "completed"; }).length;
    var TABS = [["info", "Хувийн мэдээлэл", "user-round"], ["reviews", "Миний сэтгэгдэл", "message-square-heart"], ["settings", "Тохиргоо", "settings"]];
    el.innerHTML =
      '<div class="profile-head card">' +
        '<span class="avatar avatar-xl">' + u.initials + "</span>" +
        '<div class="profile-id"><h1 class="display">' + B.esc(u.name) + '</h1><p class="small muted">' + u.email + " · " + u.phone + "</p>" +
          '<span class="badge badge-pink no-dot"><i data-lucide="badge-check"></i>Имэйл баталгаажсан</span></div>' +
        '<div class="profile-stats">' +
          '<a href="#/bookings"><b>' + all.length + "</b><span>Захиалга</span></a>" +
          '<a href="#/bookings?tab=past"><b>' + done + "</b><span>Үйлчилгээ авсан</span></a>" +
          '<a href="#/profile?tab=reviews"><b>' + Object.keys(rv).length + "</b><span>Сэтгэгдэл</span></a>" +
          '<a href="#/favorites"><b>' + B.Favorites.all().length + "</b><span>Хадгалсан</span></a>" +
        "</div></div>" +
      '<div class="profile-layout">' +
        '<nav class="profile-nav" aria-label="Профайлын хэсэг">' + TABS.map(function (t) {
          return '<button type="button" data-ptab="' + t[0] + '"' + (ptab === t[0] ? ' aria-current="page"' : "") + '><i data-lucide="' + t[2] + '"></i>' + t[1] + "</button>";
        }).join("") + '<button type="button" data-logout-page><i data-lucide="log-out"></i>Гарах</button></nav>' +
        '<section class="profile-panel card">' + (ptab === "reviews" ? myReviews() : ptab === "settings" ? settings() : infoForm(u)) + "</section>" +
      "</div>";
    UI.icons();
  }

  function infoForm(u) {
    var parts = u.name.split(" ");
    return '<h2 class="h-sm">Хувийн мэдээлэл</h2>' +
      '<form id="profile-form" novalidate class="form-grid">' +
        field("pf-first", "Нэр", parts[0] || "", "text", "given-name") +
        field("pf-last", "Овог", parts.slice(1).join(" "), "text", "family-name") +
        field("pf-phone", "Утасны дугаар", u.phone, "tel", "tel", "8 оронтой дугаар, жишээ нь 9911-2233") +
        field("pf-email", "Имэйл", u.email, "email", "email", "Имэйл солиход шинэ хаяг руу баталгаажуулах код илгээнэ.") +
        '<div class="field"><label for="pf-birth">Төрсөн өдөр <span class="muted">(заавал биш)</span></label><input class="input" type="date" id="pf-birth" value="' + (u.birth || "") + '"></div>' +
        '<div class="field"><label for="pf-district">Дүүрэг <span class="muted">(заавал биш)</span></label><select class="select" id="pf-district"><option value="">Сонгох</option>' +
          D.DISTRICTS.map(function (d) { return "<option" + (u.district === d ? " selected" : "") + ">" + d + "</option>"; }).join("") + "</select></div>" +
        '<div class="form-actions span-2"><button class="btn btn-primary" type="submit"><i data-lucide="save"></i>Хадгалах</button></div>' +
      "</form>";
  }
  function field(id, label, value, type, ac, hint) {
    return '<div class="field" data-field="' + id + '"><label for="' + id + '">' + label + ' <span class="req">*</span></label>' +
      '<input class="input" id="' + id + '" type="' + type + '" value="' + B.esc(value || "") + '" autocomplete="' + ac + '" required>' +
      (hint ? '<span class="hint">' + hint + "</span>" : "") + '<span class="error-text"></span></div>';
  }

  function myReviews() {
    var rv = reviews(), refs = Object.keys(rv);
    if (!refs.length) return '<div class="empty"><div class="empty-icon"><i data-lucide="message-square-heart"></i></div><h3>Сэтгэгдэл алга</h3><p>Дууссан захиалга бүрт нэг удаа сэтгэгдэл бичих боломжтой.</p><a class="btn btn-primary btn-sm" href="#/bookings?tab=past">Дууссан захиалга</a></div>';
    return '<h2 class="h-sm">Миний сэтгэгдэл</h2><ul class="review-list">' + refs.map(function (ref) {
      var r = rv[ref], bk = find(ref) || {};
      return '<li class="review"><div class="review-head"><span class="avatar"><i data-lucide="store" class="icon-sm"></i></span>' +
        '<div><b><a href="#/salon?id=' + bk.salonId + '">' + B.esc(bk.salonName || "") + '</a></b><span class="xs muted">' + r.date + " · " + (bk.services || []).join(", ") + "</span></div>" +
        '<span class="stars-row small">' + [1, 2, 3, 4, 5].map(function (n) { return '<i data-lucide="star" class="' + (n <= r.rating ? "on" : "") + '"></i>'; }).join("") + "</span></div>" +
        '<p class="review-text">' + B.esc(r.text) + "</p>" +
        '<div class="row-wrap">' + (r.tags || []).map(function (t) { return '<span class="badge badge-pink no-dot">' + t + "</span>"; }).join("") +
        '<span class="badge badge-success"><i data-lucide="eye"></i>Нийтлэгдсэн</span>' +
        '<button class="btn btn-ghost btn-sm review-del" type="button" data-review-del="' + ref + '"><i data-lucide="trash-2"></i>Устгах</button></div></li>';
    }).join("") + '</ul><p class="note"><i data-lucide="shield"></i>Сэтгэгдлийг засах боломжгүй, зөвхөн устгана. Устгасан сэтгэгдэл салоны хуудаснаас хасагдана.</p>';
  }

  function settings() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    return '<h2 class="h-sm">Тохиргоо</h2>' +
      '<div class="setting-list">' +
        '<div class="setting"><div><b>Харанхуй горим</b><p class="xs muted">Таны сонголт энэ төхөөрөмж дээр хадгалагдана.</p></div>' +
          '<label class="switch"><input type="checkbox" data-set-theme' + (dark ? " checked" : "") + '><span class="track"></span><span class="sr-only">Харанхуй горим</span></label></div>' +
        '<div class="setting"><div><b>Хэл</b><p class="xs muted">Одоогоор зөвхөн монгол хэлээр.</p></div><select class="select" disabled aria-label="Хэл"><option>Монгол</option></select></div>' +
        '<div class="setting"><div><b>Нууц үг</b><p class="xs muted">Сүүлд 2026-08-14-нд сольсон.</p></div><button class="btn btn-secondary btn-sm" type="button" data-pw>Нууц үг солих</button></div>' +
        '<div class="setting"><div><b>Системээс гарах</b><p class="xs muted">Энэ төхөөрөмж дээрх нэвтрэлтийг дуусгана.</p></div><button class="btn btn-ghost btn-sm" type="button" data-logout-page><i data-lucide="log-out"></i>Гарах</button></div>' +
        '<div class="setting danger-zone"><div><b>Бүртгэл устгах</b><p class="xs muted">Удахгүй болох захиалгаа цуцалсны дараа хүсэлт илгээнэ. Платформын админ шийдвэрлэнэ.</p></div><button class="btn btn-danger-ghost btn-sm" type="button" data-delete-account>Хүсэлт илгээх</button></div>' +
      "</div>";
  }

  function openPassword() {
    var m = modal("pw-modal");
    m.innerHTML = head("Нууц үг солих") +
      '<form id="pw-form" novalidate class="stack">' +
        '<div class="field"><label for="pw-old">Одоогийн нууц үг</label><input class="input" type="password" id="pw-old" autocomplete="current-password"><span class="hint">Демо: Bloom2026</span><span class="error-text"></span></div>' +
        '<div class="field"><label for="pw-new">Шинэ нууц үг</label><input class="input" type="password" id="pw-new" autocomplete="new-password"><span class="hint">8+ тэмдэгт, үсэг болон тоо агуулсан.</span><span class="error-text"></span></div>' +
        '<div class="field"><label for="pw-new2">Шинэ нууц үг давтах</label><input class="input" type="password" id="pw-new2" autocomplete="new-password"><span class="error-text"></span></div>' +
        '<div class="modal-foot"><button class="btn btn-ghost" type="button" data-close-modal>Болих</button><button class="btn btn-primary" type="submit">Солих</button></div>' +
      "</form>";
    UI.icons(); UI.openModal("pw-modal");
  }

  function setError(id, msg) {
    var f = document.getElementById(id).closest(".field");
    f.classList.toggle("has-error", !!msg);
    f.querySelector(".error-text").textContent = msg || "";
    document.getElementById(id).setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) {
    if (e.detail.id === "bookings") renderBookings(e.detail.params);
    if (e.detail.id === "profile") renderProfile(e.detail.params);
  });
  document.addEventListener("session:change", function () {
    var b = document.querySelector('[data-page="bookings"]'), p = document.querySelector('[data-page="profile"]');
    if (b && !b.hidden) renderBookings();
    if (p && !p.hidden) renderProfile();
  });

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-bk-tab]"))) { tab = t.dataset.bkTab; history.replaceState(null, "", "#/bookings?tab=" + tab); renderBookings(); return; }
    if ((t = e.target.closest("[data-detail]"))) return openDetail(t.dataset.detail);
    if ((t = e.target.closest("[data-cancel]"))) return openCancel(t.dataset.cancel);
    if ((t = e.target.closest("[data-reason]"))) {
      document.querySelectorAll("[data-reason]").forEach(function (b) { b.setAttribute("aria-pressed", b === t ? "true" : "false"); }); return;
    }
    if ((t = e.target.closest("[data-cancel-yes]"))) {
      var reason = (document.querySelector('[data-reason][aria-pressed="true"]') || {}).dataset;
      patch(t.dataset.cancelYes, { status: "cancelled", cancelledBy: "Та", cancelReason: reason ? reason.reason : "", cancelledAt: E.dateKey(new Date()) });
      UI.closeModal("bk-cancel"); tab = "cancelled"; renderBookings();
      UI.toast("Захиалга цуцлагдлаа. Цаг бусад хүнд нээгдлээ.", "info"); return;
    }
    if ((t = e.target.closest("[data-review]"))) return openReview(t.dataset.review);
    if ((t = e.target.closest("[data-star]")) && draft) { draft.text = document.getElementById("rv-text").value; draft.rating = +t.dataset.star; drawReview(); return; }
    if ((t = e.target.closest("[data-tag]")) && draft) {
      draft.text = document.getElementById("rv-text").value;
      var i = draft.tags.indexOf(t.dataset.tag); if (i > -1) draft.tags.splice(i, 1); else draft.tags.push(t.dataset.tag);
      drawReview(); return;
    }
    if ((t = e.target.closest("[data-ptab]"))) { ptab = t.dataset.ptab; history.replaceState(null, "", "#/profile?tab=" + ptab); renderProfile(); return; }
    if (e.target.closest("[data-logout-page]")) {
      UI.confirm({ title: "Системээс гарах уу?", text: "Дахин нэвтэрч захиалгаа харах боломжтой.", confirmLabel: "Гарах" }, function () {
        Session.logout(); UI.toast("Системээс гарлаа", "info"); location.hash = "#/home";
      }); return;
    }
    if ((t = e.target.closest("[data-review-del]"))) {
      var ref = t.dataset.reviewDel;
      UI.confirm({ title: "Сэтгэгдлээ устгах уу?", text: "Таны сэтгэгдэл салоны хуудаснаас хасагдана. Энэ үйлдлийг буцаах боломжгүй.", confirmLabel: "Устгах" }, function () {
        var rv = reviews(); delete rv[ref]; B.save("bloom-my-reviews", rv);
        UI.toast("Сэтгэгдэл устгагдлаа", "success"); renderProfile();
      }); return;
    }
    if (e.target.closest("[data-pw]")) return openPassword();
    if (e.target.closest("[data-delete-account]")) {
      UI.confirm({ title: "Бүртгэл устгах хүсэлт илгээх үү?", text: "Админ хүсэлтийг шалгаж, имэйлээр хариу өгнө (демо).", confirmLabel: "Илгээх" }, function () {
        UI.toast("Хүсэлт илгээгдлээ (демо)", "success");
      }); return;
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute("data-set-theme")) {
      var want = e.target.checked ? "dark" : "light";
      if ((document.documentElement.getAttribute("data-theme") || "light") !== want) Theme.toggle();
    }
  });
  document.addEventListener("input", function (e) {
    if (e.target.id === "rv-text" && draft) { draft.text = e.target.value; document.getElementById("rv-count").textContent = e.target.value.length + " / 500"; }
  });

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (f.id === "review-form") {
      e.preventDefault();
      draft.text = document.getElementById("rv-text").value.trim();
      if (!draft.rating) { UI.toast("Үнэлгээ (од) сонгоно уу", "error"); return; }
      if (draft.text.length < 10) { draft.error = "Дор хаяж 10 тэмдэгт бичнэ үү."; drawReview(); document.getElementById("rv-text").focus(); return; }
      var rv = reviews(); rv[draft.ref] = { rating: draft.rating, text: draft.text, tags: draft.tags, date: E.dateKey(new Date()) };
      B.save("bloom-my-reviews", rv);
      UI.closeModal("bk-review"); draft = null;
      history.replaceState(null, "", "#/bookings?tab=past");
      renderBookings(); UI.toast("Баярлалаа! Сэтгэгдэл нийтлэгдлээ.", "success");
    }
    if (f.id === "profile-form") {
      e.preventDefault();
      var ok = true;
      ok = setError("pf-first", document.getElementById("pf-first").value.trim() ? "" : "Нэрээ оруулна уу.") && ok;
      ok = setError("pf-last", document.getElementById("pf-last").value.trim() ? "" : "Овгоо оруулна уу.") && ok;
      var ph = document.getElementById("pf-phone").value.replace(/\D/g, "");
      ok = setError("pf-phone", ph.length === 8 ? "" : "Утасны дугаар 8 оронтой байна.") && ok;
      ok = setError("pf-email", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(document.getElementById("pf-email").value.trim()) ? "" : "Имэйл хаяг буруу байна.") && ok;
      if (!ok) { UI.toast("Талбаруудаа шалгана уу", "error"); return; }
      var first = document.getElementById("pf-first").value.trim(), last = document.getElementById("pf-last").value.trim();
      var u = Session.user();
      u.name = first + " " + last; u.initials = (first[0] + (last[0] || "")).toUpperCase();
      u.phone = ph.slice(0, 4) + "-" + ph.slice(4); u.email = document.getElementById("pf-email").value.trim();
      u.birth = document.getElementById("pf-birth").value; u.district = document.getElementById("pf-district").value;
      B.save("bloom-user", u);
      document.dispatchEvent(new Event("session:change"));
      UI.toast("Мэдээлэл хадгалагдлаа", "success");
    }
    if (f.id === "pw-form") {
      e.preventDefault();
      var a = document.getElementById("pw-old").value, n1 = document.getElementById("pw-new").value, n2 = document.getElementById("pw-new2").value;
      var good = setError("pw-old", a === "Bloom2026" ? "" : "Одоогийн нууц үг буруу байна.");
      good = setError("pw-new", n1.length >= 8 && /\d/.test(n1) && /[a-zA-Zа-яА-ЯөүӨҮёЁ]/.test(n1) ? "" : "8+ тэмдэгт, үсэг болон тоо агуулна.") && good;
      good = setError("pw-new2", n1 && n1 === n2 ? "" : "Нууц үг таарахгүй байна.") && good;
      if (good) { UI.closeModal("pw-modal"); UI.toast("Нууц үг солигдлоо (демо)", "success"); }
    }
  });

  seed();
  window.Account = { seed: seed, status: status };
})();
