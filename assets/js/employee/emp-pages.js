/* =========================================================
   Bloom employee: Today (9.1), My schedule (9.2),
   My bookings (9.3). Mobile-first, minimal navigation.
   ========================================================= */
(function () {
  var E = window.Engine;
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  function S() { return BZ.S(); }
  function addDays(k, n) { var d = E.fromKey(k); d.setDate(d.getDate() + n); return E.dateKey(d); }
  function byTime(a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; }
  function inMin(m) { return m < 60 ? m + " минутын" : Math.floor(m / 60) + " цаг " + (m % 60 ? m % 60 + " минутын" : ""); }

  function blocked() {
    var e = EMP.me();
    if (e.status === "active" && e.perms.ownBookings) return "";
    return BZ.empty("lock", "Нэвтрэх эрх хаагдсан", e.status !== "active" ? "Таны бүртгэл идэвхгүй болсон байна. Салоны эзэмшигчид хандана уу." : "Танд захиалга харах эрх олгогдоогүй байна.") + switcher();
  }

  /* Demo helper: view the interface as another specialist */
  function switcher() {
    return '<div class="card demo-switch-card"><div><b class="small">Демо: өөр ажилтнаар харах</b><p class="xs muted" style="margin:2px 0 0">Эрхийн түвшингээс хамаарч харагдах зүйл өөрчлөгдөнө.</p></div>' +
      '<label class="inline-select"><i data-lucide="user-round"></i><span class="sr-only">Ажилтан сонгох</span>' +
      BZ.select("emp-switch", S().employees.map(function (e) { return [e.id, e.name + " · " + (e.access === "manager" ? "Менежер" : "Ажилтан")]; }), EMP.me().id) + "</label></div>";
  }

  /* ================= Today ================= */
  function renderToday() {
    var el = BZ.el("today"), e = EMP.me(), t = EMP.today();
    var b0 = blocked(); if (b0) { el.innerHTML = b0; return; }
    var list = EMP.mine().filter(function (b) { return b.date === t; }).sort(byTime);
    var active = list.filter(function (b) { return b.status !== "cancelled"; });
    var now = EMP.nowMin();
    var current = list.filter(function (b) { return b.status === "in_progress"; })[0];
    var next = list.filter(function (b) { return b.status === "confirmed" || b.status === "pending_payment"; }).filter(function (b) { return E.toMin(b.time) + b.duration > now; })[0];
    var owed = EMP.mine().filter(EMP.owes).sort(byTime).reverse();
    var sc = BZ.workDay(e, t);
    var hr = new Date().getHours();

    var hero;
    if (current) hero = '<div class="hero-card is-live"><span class="hero-tag"><span class="pulse"></span>Одоо үйлчилж байна</span>' + heroBody(current) +
      '<div class="hero-actions"><button type="button" class="btn btn-primary" data-eb="' + current.ref + '"><i data-lucide="check"></i>Дуусгах</button></div></div>';
    else if (next) {
      var diff = E.toMin(next.time) - now;
      hero = '<div class="hero-card"><span class="hero-tag"><i data-lucide="bell-ring"></i>' + (diff > 0 ? "Дараагийн үйлчлүүлэгч · " + inMin(diff) + " дараа" : "Цаг нь болсон") + "</span>" + heroBody(next) +
        '<div class="hero-actions"><button type="button" class="btn btn-primary" data-eb="' + next.ref + '"><i data-lucide="' + (diff <= 15 ? "play" : "eye") + '"></i>' + (diff <= 15 ? "Эхлүүлэх" : "Дэлгэрэнгүй") + "</button>" +
        '<a class="btn btn-secondary" href="tel:' + next.phone.replace(/\D/g, "") + '"><i data-lucide="phone"></i>Залгах</a></div></div>';
    } else if (!sc) {
      var nd = nextWorkDay(e);
      hero = '<div class="hero-card is-calm"><span class="hero-tag"><i data-lucide="coffee"></i>Өнөөдөр амралтын өдөр</span><h2>Сайхан амраарай!</h2>' +
        (nd ? '<p class="muted">Дараагийн ажлын өдөр: <b>' + E.longDate(E.fromKey(nd)) + "</b></p>" : "") + "</div>";
    } else hero = "";

    el.innerHTML =
      '<div class="emp-head"><div><p class="muted small" style="margin:0">' + E.longDate(E.today()) + "</p><h2>" + (hr < 12 ? "Өглөөний мэнд" : hr < 18 ? "Өдрийн мэнд" : "Оройн мэнд") + ", " + e.name.split(" ")[0] + "</h2>" +
        '<p class="muted small" style="margin:0">' + e.role + " · " + BZ.branch(e.branch).name + (sc ? " · " + sc.start + "–" + sc.end + " (завсарлага " + sc.break[0] + "–" + sc.break[1] + ")" : "") + "</p></div></div>" +
      hero +
      '<div class="emp-stats">' +
        stat(active.length, "Өнөөдөр нийт") +
        stat(list.filter(function (b) { return b.status === "completed"; }).length, "Дууссан") +
        stat(active.filter(function (b) { return ["confirmed", "pending_payment", "in_progress"].indexOf(b.status) > -1; }).length, "Үлдсэн") +
        stat(owed.length, "Үлдэгдэл хүлээгдэж буй", owed.length ? "warn" : "") +
      "</div>" +
      (owed.length && EMP.perm("payments") ? '<a class="alert alert-warning" href="#/payment"><i data-lucide="qr-code"></i><span><b>' + owed.length + " захиалгын</b> үлдэгдэл төлбөр авах шаардлагатай</span><i data-lucide=\"chevron-right\" class=\"end\"></i></a>" : "") +
      '<div class="emp-sec-head"><h3>Өнөөдрийн хуваарь</h3><a class="btn btn-ghost btn-sm" href="#/schedule">Хуваарь<i data-lucide="arrow-right"></i></a></div>' +
      (sc || list.length ? dayTimeline(e, t, list) : BZ.empty("calendar-x", "Өнөөдөр ажиллахгүй", "Таны хуваарьт өнөөдөр ажлын өдөр биш байна.")) +
      switcher();
  }
  function heroBody(b) {
    return '<div class="hero-main"><span class="hero-time">' + b.time + "<small>–" + EMP.endTime(b) + "</small></span><div><h2>" + BZ.esc(b.customer) + "</h2>" +
      '<p class="muted">' + BZ.svcNames(b) + " · " + b.duration + " мин</p>" + '<div class="row-wrap" style="gap:6px">' + BZ.statusBadge(b.status) + BZ.payBadge(b) + "</div></div></div>";
  }
  function stat(v, l, cls) { return '<div class="card emp-stat ' + (cls || "") + '"><b>' + v + "</b><span>" + l + "</span></div>"; }
  function nextWorkDay(e) { for (var i = 1; i < 21; i++) { var k = BIZ.day(i); if (BZ.workDay(e, k)) return k; } return null; }

  /* Timeline for one day: bookings, break and free gaps in order */
  function dayTimeline(e, k, list) {
    var sc = BZ.workDay(e, k), items = [], now = k === EMP.today() ? EMP.nowMin() : -1;
    list.forEach(function (b) { items.push({ t: E.toMin(b.time), end: E.toMin(b.time) + b.duration, b: b }); });
    if (sc) items.push({ t: E.toMin(sc.break[0]), end: E.toMin(sc.break[1]), brk: true });
    items.sort(function (a, b) { return a.t - b.t; });
    var html = "", cur = sc ? E.toMin(sc.start) : (items[0] ? items[0].t : 0);
    if (sc) html += '<li class="tl2-edge"><span class="tl2-t">' + sc.start + "</span><span>Ажил эхэлнэ</span></li>";
    items.forEach(function (it) {
      if (it.b && it.b.status === "cancelled") { html += row(it); return; }
      if (sc && it.t - cur >= 30) html += '<li class="tl2-gap"><span class="tl2-t">' + E.fmt(cur) + '</span><span>Сул цаг · ' + (it.t - cur) + " мин</span></li>";
      html += row(it);
      cur = Math.max(cur, it.end);
    });
    if (sc && E.toMin(sc.end) - cur >= 30) html += '<li class="tl2-gap"><span class="tl2-t">' + E.fmt(cur) + "</span><span>Сул цаг · " + (E.toMin(sc.end) - cur) + " мин</span></li>";
    if (sc) html += '<li class="tl2-edge"><span class="tl2-t">' + sc.end + "</span><span>Ажил дуусна</span></li>";
    return '<ul class="tl2">' + html + "</ul>";
    function row(it) {
      if (it.brk) return '<li class="tl2-break' + (now >= it.t && now < it.end ? " is-now" : "") + '"><span class="tl2-t">' + E.fmt(it.t) + '</span><span><i data-lucide="coffee"></i>Завсарлага · ' + E.fmt(it.end) + " хүртэл</span></li>";
      var past = now >= 0 && it.end <= now;
      return '<li class="tl2-item' + (past ? " is-past" : "") + (now >= it.t && now < it.end ? " is-now" : "") + '">' + EMP.card(it.b) + "</li>";
    }
  }

  /* ================= My schedule ================= */
  var sch = { view: "day", date: null };
  function renderSchedule(params) {
    var el = BZ.el("schedule"), e = EMP.me();
    var b0 = blocked(); if (b0) { el.innerHTML = b0; return; }
    if (params && params.date) sch.date = params.date;
    if (!sch.date) sch.date = EMP.today();
    var strip = "";
    for (var i = -3; i <= 13; i++) {
      var k = BIZ.day(i), d = E.fromKey(k), w = BZ.workDay(e, k);
      var n = EMP.mine().filter(function (b) { return b.date === k && b.status !== "cancelled"; }).length;
      strip += '<button type="button" class="ds-day' + (k === sch.date ? " is-on" : "") + (w ? "" : " is-off") + (i === 0 ? " is-today" : "") + '" data-sd="' + k + '" aria-pressed="' + (k === sch.date) + '">' +
        "<small>" + E.WEEKDAYS[d.getDay()].slice(0, 2) + "</small><b>" + d.getDate() + "</b><span>" + (w ? (n ? n + " захиалга" : "Сул") : "Амралт") + "</span></button>";
    }
    el.innerHTML =
      '<div class="emp-head"><div><h2>Миний хуваарь</h2><p class="muted small" style="margin:0">' + BZ.branch(e.branch).name + " · " + e.role + "</p></div>" +
        BZ.tabs("schv", [["day", "Өдөр", "calendar-clock"], ["week", "7 хоног", "calendar-range"]], sch.view) + "</div>" +
      (sch.view === "day" ? '<div class="day-strip" role="group" aria-label="Өдөр сонгох">' + strip + "</div>" + dayPane(e) : weekPane(e)) +
      '<div class="grid grid-2 emp-info-grid">' + hoursCard(e) + offCard(e) + "</div>";
    var on = el.querySelector(".ds-day.is-on");
    if (on) on.parentNode.scrollLeft = on.offsetLeft - on.parentNode.clientWidth / 2 + on.offsetWidth / 2;
  }
  function dayPane(e) {
    var k = sch.date, sc = BZ.workDay(e, k), list = EMP.mine().filter(function (b) { return b.date === k; }).sort(byTime);
    var head = '<div class="emp-sec-head"><h3>' + E.longDate(E.fromKey(k)) + "</h3>" + (sc ? '<span class="badge badge-info no-dot">' + sc.start + "–" + sc.end + "</span>" : "") + "</div>";
    if (!sc && !list.length) {
      var off = e.off.filter(function (o) { return k >= o.from && k <= o.to; })[0];
      return head + BZ.empty(off ? "plane" : "coffee", off ? off.reason : "Амралтын өдөр", off ? off.from + (off.to !== off.from ? " – " + off.to : "") + " хугацаанд ажиллахгүй." : "Энэ өдөр таны хуваарьт ажлын өдөр биш.");
    }
    return head + dayTimeline(e, k, list);
  }
  function weekPane(e) {
    var start = (function () { var d = E.fromKey(EMP.today()), w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return E.dateKey(d); })();
    var rows = "", total = 0, mins = 0;
    for (var wk = 0; wk < 2; wk++) {
      rows += '<h4 class="wk2-title">' + (wk ? "Дараагийн 7 хоног" : "Энэ 7 хоног") + "</h4>";
      for (var i = 0; i < 7; i++) {
        var k = addDays(start, wk * 7 + i), d = E.fromKey(k), sc = BZ.workDay(e, k);
        var list = EMP.mine().filter(function (b) { return b.date === k && b.status !== "cancelled"; }).sort(byTime);
        if (!wk) { total += list.length; mins += list.reduce(function (s, b) { return s + b.duration; }, 0); }
        var off = e.off.filter(function (o) { return k >= o.from && k <= o.to; })[0];
        rows += '<button type="button" class="wk2-row' + (k === EMP.today() ? " is-today" : "") + (sc ? "" : " is-off") + '" data-sd="' + k + '">' +
          '<span class="wk2-day"><b>' + d.getDate() + "</b><small>" + E.WEEKDAYS[d.getDay()] + "</small></span>" +
          '<span class="wk2-body">' + (sc ? "<b>" + sc.start + "–" + sc.end + '</b><span class="xs muted">Завсарлага ' + sc.break[0] + "–" + sc.break[1] + "</span>" : "<b>" + (off ? off.reason : "Амралт") + "</b>") +
            (list.length ? '<span class="wk2-chips">' + list.slice(0, 5).map(function (b) { return '<span class="wk2-chip st-' + b.status + '">' + b.time + "</span>"; }).join("") + (list.length > 5 ? '<span class="xs muted">+' + (list.length - 5) + "</span>" : "") + "</span>" : "") +
          "</span>" + '<span class="wk2-count">' + (sc ? list.length + "<small>захиалга</small>" : "") + "</span></button>";
      }
    }
    return '<div class="emp-stats two">' + stat(total, "Энэ 7 хоногийн захиалга") + stat(Math.round(mins / 60 * 10) / 10 + " цаг", "Үйлчилгээний нийт хугацаа") + "</div>" + '<div class="wk2">' + rows + "</div>";
  }
  function hoursCard(e) {
    return '<div class="card"><div class="card-title"><h3>Ажлын цаг</h3><span class="xs muted">7 хоног бүр</span></div><ul class="hours-list">' + ORDER.map(function (d) {
      var sc = e.schedule[d];
      return "<li><span>" + E.WEEKDAYS[d] + "</span>" + (sc ? "<b>" + sc.start + "–" + sc.end + '</b><span class="xs muted">завсарлага ' + sc.break[0] + "–" + sc.break[1] + "</span>" : '<span class="muted">Амралт</span>') + "</li>";
    }).join("") + "</ul>" + (EMP.perm("editSchedule") ? "" : '<p class="xs muted" style="margin:var(--sp-3) 0 0">Ажлын цагийг салоны эзэмшигч тохируулна.</p>') + "</div>";
  }
  function offCard(e) {
    var t = EMP.today(), list = e.off.filter(function (o) { return o.to >= t; }).sort(function (a, b) { return a.from < b.from ? -1 : 1; });
    return '<div class="card"><div class="card-title"><h3>Чөлөө, ажиллахгүй хугацаа</h3>' + (EMP.perm("editSchedule") ? '<button type="button" class="btn btn-secondary btn-sm" data-off-new><i data-lucide="plus"></i>Нэмэх</button>' : "") + "</div>" +
      (list.length ? '<ul class="off-list">' + list.map(function (o) {
        return '<li><i data-lucide="calendar-x"></i><div class="grow"><b>' + o.from + (o.to !== o.from ? " – " + o.to : "") + '</b><span class="xs muted">' + o.reason + "</span></div></li>";
      }).join("") + "</ul>" : '<p class="xs muted">Ирэх хугацаанд чөлөө бүртгэгдээгүй.</p>') +
      (EMP.perm("editSchedule") ? "" : '<p class="xs muted" style="margin:var(--sp-3) 0 0">Чөлөө авах бол эзэмшигч эсвэл менежерт хандана уу. Тэд бүртгэсний дараа энд харагдана.</p>') + "</div>";
  }
  function addOff() {
    var e = EMP.me(), t = EMP.today();
    var m = BZ.modal("off-modal", "Чөлөө нэмэх", '<div class="form-grid">' +
      BZ.field("eo-from", "Эхлэх", BZ.input("eo-from", t, "date", 'min="' + t + '"'), "", true) + BZ.field("eo-to", "Дуусах", BZ.input("eo-to", t, "date", 'min="' + t + '"'), "", true) + "</div>" +
      BZ.field("eo-reason", "Шалтгаан", BZ.select("eo-reason", [["Чөлөө", "Чөлөө"], ["Ээлжийн амралт", "Ээлжийн амралт"], ["Өвчтэй", "Өвчтэй"], ["Сургалт", "Сургалт"]], "Чөлөө")) +
      '<p class="xs muted">Энэ хугацаанд үйлчлүүлэгч таныг сонгож цаг захиалах боломжгүй болно.</p>' +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="eo-save">Хадгалах</button></div>');
    m.querySelector("#eo-save").addEventListener("click", function () {
      var f = BZ.val("eo-from"), to = BZ.val("eo-to");
      var ok = BZ.setErr("eo-from", !f ? "Огноо сонгоно уу" : "");
      ok = BZ.setErr("eo-to", !to ? "Огноо сонгоно уу" : to < f ? "Дуусах огноо эхлэхээс хойш байна" : e.off.some(function (o) { return f <= o.to && o.from <= to; }) ? "Энэ хугацаанд чөлөө бүртгэлтэй байна" : "") && ok;
      if (!ok) return;
      var cnt = S().bookings.filter(function (b) { return b.employeeId === e.id && b.date >= f && b.date <= to && ["confirmed", "pending_payment"].indexOf(b.status) > -1; }).length;
      e.off.push({ from: f, to: to, reason: BZ.val("eo-reason") }); BIZ.save(); UI.closeModal("off-modal");
      UI.toast(cnt ? "Чөлөө бүртгэгдлээ. Энэ хугацааны " + cnt + " захиалгыг эзэмшигч шилжүүлэх шаардлагатай." : "Чөлөө бүртгэгдлээ", cnt ? "info" : "success"); BZ.refresh();
    });
  }

  /* ================= My bookings ================= */
  var bst = { tab: "today", scope: "mine", q: "", shown: 20 };
  function renderBookings() {
    var el = BZ.el("bookings"), t = EMP.today();
    var b0 = blocked(); if (b0) { el.innerHTML = b0; return; }
    var canAll = EMP.perm("allBookings");
    if (!canAll) bst.scope = "mine";
    var base = EMP.mine(bst.scope).filter(function (b) { return !bst.q || (b.customer + b.ref + b.phone).toLowerCase().indexOf(bst.q.toLowerCase()) > -1; });
    var tabs = {
      today: function (b) { return b.date === t; },
      upcoming: function (b) { return b.date > t && ["confirmed", "pending_payment"].indexOf(b.status) > -1; },
      done: function (b) { return b.date <= t && ["completed", "no_show", "cancelled"].indexOf(b.status) > -1; },
      all: function () { return true; }
    };
    var list = base.filter(tabs[bst.tab]).sort(byTime);
    if (bst.tab === "done" || bst.tab === "all") list.reverse();
    var counts = {}; Object.keys(tabs).forEach(function (k) { counts[k] = base.filter(tabs[k]).length; });
    var shown = list.slice(0, bst.shown), html = "", lastDate = null;
    shown.forEach(function (b) {
      if (b.date !== lastDate) { html += '<h4 class="eb-date">' + BZ.rel(b.date) + (BZ.rel(b.date).length < 9 ? '<span class="xs muted"> · ' + E.longDate(E.fromKey(b.date)) + "</span>" : "") + "</h4>"; lastDate = b.date; }
      html += EMP.card(b, { showEmp: bst.scope === "branch" });
    });

    el.innerHTML =
      '<div class="emp-head"><div><h2>Миний захиалга</h2><p class="muted small" style="margin:0">Өөрт хуваарилагдсан захиалга, төлөв ба төлбөр</p></div>' +
        (canAll ? BZ.tabs("escope", [["mine", "Минийх"], ["branch", "Салбарын бүх"]], bst.scope) : "") + "</div>" +
      '<div class="eb-tabs chips" role="group" aria-label="Шүүлтүүр">' + [["today", "Өнөөдөр"], ["upcoming", "Ирэх"], ["done", "Өнгөрсөн"], ["all", "Бүгд"]].map(function (x) {
        return '<button type="button" class="chip" data-ebtab="' + x[0] + '" aria-pressed="' + (bst.tab === x[0]) + '">' + x[1] + ' <span class="chip-count">' + counts[x[0]] + "</span></button>";
      }).join("") + "</div>" +
      '<label class="input-icon eb-search"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" type="search" id="eb-q" placeholder="Үйлчлүүлэгч, утас, код" value="' + BZ.esc(bst.q) + '"></label>' +
      (list.length ? '<div class="eb-list">' + html + "</div>" + (list.length > bst.shown ? '<button type="button" class="btn btn-secondary btn-block" data-eb-more>Цааш үзэх (' + (list.length - bst.shown) + ")</button>" : "")
        : BZ.empty("calendar-search", "Захиалга алга", bst.tab === "today" ? "Өнөөдөр танд хуваарилагдсан захиалга алга." : "Энэ шүүлтүүрт тохирох захиалга олдсонгүй."));
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (ev) {
    var t;
    if ((t = ev.target.closest("[data-sd]"))) { sch.date = t.dataset.sd; sch.view = "day"; BZ.refresh(); return; }
    if ((t = ev.target.closest("[data-schv]"))) { sch.view = t.dataset.schv; BZ.refresh(); return; }
    if (ev.target.closest("[data-off-new]")) { addOff(); return; }
    if ((t = ev.target.closest("[data-ebtab]"))) { bst.tab = t.dataset.ebtab; bst.shown = 20; BZ.refresh(); return; }
    if ((t = ev.target.closest("[data-escope]"))) { bst.scope = t.dataset.escope; BZ.refresh(); return; }
    if (ev.target.closest("[data-eb-more]")) { bst.shown += 20; BZ.refresh(); return; }
  });
  document.addEventListener("change", function (ev) { if (ev.target.id === "emp-switch") EMP.setMe(ev.target.value); });
  var qt;
  document.addEventListener("input", function (ev) {
    if (ev.target.id !== "eb-q") return;
    clearTimeout(qt); qt = setTimeout(function () {
      bst.q = ev.target.value.trim(); bst.shown = 20; BZ.refresh();
      var q = document.getElementById("eb-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }, 250);
  });
  /* Keep "Today" fresh (next appointment countdown) */
  setInterval(function () { var p = BZ.el("today"); if (p && !p.hidden && !document.querySelector(".overlay.is-open")) BZ.refresh(); }, 60000);

  BZ.page("today", renderToday);
  BZ.page("schedule", renderSchedule);
  BZ.page("bookings", renderBookings);
})();
