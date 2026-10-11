/* =========================================================
   Bloom platform admin: small shared helpers + dashboard (10.1)
   Users, salons, approvals, bookings, platform fee overview,
   recent system activity. FR-41.
   ========================================================= */
(function () {
  var E = window.Engine;

  var ROLES = { customer: ["Үйлчлүүлэгч", "info"], owner: ["Салоны эзэмшигч", "pink"], employee: ["Ажилтан", "success"], admin: ["Админ", "warning"] };
  function roleBadge(r) { var x = ROLES[r] || [r, "info"]; return '<span class="badge badge-' + x[1] + ' no-dot">' + x[0] + "</span>"; }
  function salonName(id) { var s = ADM.salon(id); return s ? s.name : id; }
  function initials(n) { return n.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }
  function stat(icon, value, label, sub, href) {
    var tag = href ? 'a href="' + href + '"' : "div";
    return "<" + tag + ' class="card stat-card' + (href ? " is-link" : "") + '"><div class="stat-icon"><i data-lucide="' + icon + '"></i></div><div class="stat-value">' + value + "</div>" +
      '<div class="stat-label">' + label + '</div><div class="stat-sub">' + sub + "</div></" + (href ? "a" : "div") + ">";
  }
  function kpi(label, value, sub) { return '<div class="card kpi"><span class="kpi-label">' + label + '</span><span class="kpi-value">' + value + '</span><span class="xs muted">' + (sub || "") + "</span></div>"; }
  function salonOptions(all) {
    return [["all", all || "Бүх салон"]].concat(ADM.state.salons.map(function (s) { return [s.id, s.name]; }));
  }
  /* Platform-wide monthly totals (completed bookings, invoiced fee) */
  function platformMonths() {
    var map = {};
    ADM.state.salons.forEach(function (s) {
      ADM.invoicesOf(s.id).forEach(function (i) {
        var m = map[i.ym] = map[i.ym] || { ym: i.ym, completed: 0, fee: 0, paid: 0, revenue: 0 };
        m.completed += i.completed; m.fee += i.amount; m.revenue += i.revenue || 0;
        if (i.status === "paid") m.paid += i.amount;
      });
    });
    return Object.keys(map).sort().slice(-6).map(function (k) { return map[k]; });
  }
  /* Keep the search box focused after a re-render */
  function refocus(id) { var q = document.getElementById(id); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }

  window.AD = { ROLES: ROLES, roleBadge: roleBadge, salonName: salonName, initials: initials, stat: stat, kpi: kpi, salonOptions: salonOptions, platformMonths: platformMonths, refocus: refocus };

  /* ================= Dashboard ================= */
  function render() {
    var S = ADM.state, el = BZ.el("dashboard"), today = BIZ.day(0), cm = BZ.currentMonth(), pm = BZ.addMonths(cm, -1);
    var users = S.users, customers = users.filter(function (u) { return u.role === "customer"; });
    var newUsers = users.filter(function (u) { return u.joined.slice(0, 7) === cm; }).length;
    var active = S.salons.filter(function (s) { return s.status === "active"; }).length;
    var pending = S.applications.filter(function (a) { return a.status === "pending"; });
    var all = ADM.allBookings(), mBk = all.filter(function (b) { return b.date.slice(0, 7) === cm && b.date <= today; });
    var done = mBk.filter(function (b) { return b.status === "completed"; }).length;
    var todayN = all.filter(function (b) { return b.date === today && b.status !== "cancelled"; }).length;
    var reported = ADM.allReviews().filter(function (r) { return r.status === "reported"; }).length;
    var inv = []; S.salons.forEach(function (s) { ADM.invoicesOf(s.id).forEach(function (i) { i.salonId = s.id; inv.push(i); }); });
    var toConfirm = inv.filter(function (i) { return i.status === "review"; }), overdue = inv.filter(function (i) { return i.status === "overdue"; });
    var unpaid = inv.filter(function (i) { return i.status === "unpaid" || i.status === "overdue"; });
    var pmInv = inv.filter(function (i) { return i.ym === pm; });
    var pmBilled = pmInv.reduce(function (s, i) { return s + i.amount; }, 0), pmPaid = pmInv.filter(function (i) { return i.status === "paid"; }).reduce(function (s, i) { return s + i.amount; }, 0);
    var cmInv = inv.filter(function (i) { return i.ym === cm; }), cmFee = cmInv.reduce(function (s, i) { return s + i.amount; }, 0);
    var outstanding = unpaid.concat(toConfirm).reduce(function (s, i) { return s + i.amount; }, 0);
    var fee = BIZ.state.fee;

    el.innerHTML =
      '<div class="page-head"><div><h2>Платформын хяналтын самбар</h2><p>' + E.longDate(E.today()) + " · Bloom платформын ерөнхий төлөв</p></div></div>" +

      (pending.length || reported || toConfirm.length || overdue.length ? '<div class="alerts">' +
        (pending.length ? alert("warning", "store", "<b>" + pending.length + " салон</b> бүртгэлийн хүсэлт хянуулахаар хүлээж байна", "#/salons") : "") +
        (reported ? alert("warning", "flag", "<b>" + reported + " сэтгэгдэл</b> мэдэгдэгдсэн, шийдвэр хүлээж байна", "#/reviews") : "") +
        (toConfirm.length ? alert("info", "receipt", "<b>" + toConfirm.length + " нэхэмжлэх</b> төлсөн гэж мэдэгдсэн, баталгаажуулах шаардлагатай", "#/invoices?filter=review") : "") +
        (overdue.length ? alert("danger", "triangle-alert", "<b>" + overdue.length + " нэхэмжлэх</b> төлөх хугацаа хэтэрсэн", "#/invoices?filter=overdue") : "") +
      "</div>" : "") +

      '<div class="adm-stats">' +
        AD.stat("users", users.length, "Нийт хэрэглэгч", customers.length + " үйлчлүүлэгч · энэ сард +" + newUsers, "#/users") +
        AD.stat("store", S.salons.length, "Нийт салон", active + " идэвхтэй · " + (S.salons.length - active) + " түр хаасан", "#/salons?tab=salons") +
        AD.stat("badge-check", pending.length, "Батлах хүсэлт", pending.length ? "Хамгийн эртнийх " + pending.map(function (a) { return a.submitted; }).sort()[0] : "Хүлээгдэж буй хүсэлт алга", "#/salons") +
        AD.stat("calendar-days", mBk.length, "Энэ сарын захиалга", "Өнөөдөр " + todayN + " захиалга", "#/bookings") +
        AD.stat("circle-check-big", done, "Энэ сард дууссан", mBk.length ? Math.round(done / mBk.length * 100) + "% гүйцэтгэл" : "—", "#/bookings?status=completed") +
        AD.stat("receipt", BZ.money(cmFee), "Энэ сарын шимтгэл", "Одоогоор хуримтлагдсан · салонууд төлнө", "#/invoices") +
      "</div>" +

      '<div class="dash-grid">' +
        '<div class="card"><div class="card-title"><div><h3>Платформын дууссан захиалга</h3><p class="xs muted" style="margin:2px 0 0">Бүх салон, сүүлийн 6 сар</p></div>' +
          '<a class="btn btn-ghost btn-sm" href="#/bookings">Захиалга<i data-lucide="arrow-right"></i></a></div>' + chart() + "</div>" +
        '<div class="card"><div class="card-title"><h3>Платформын шимтгэл</h3><a class="btn btn-ghost btn-sm" href="#/invoices">Нэхэмжлэх<i data-lucide="arrow-right"></i></a></div>' +
          '<dl class="sum">' +
            "<div><dt>" + BZ.monthLabel(pm) + "ын нэхэмжилсэн</dt><dd>" + BZ.money(pmBilled) + "</dd></div>" +
            "<div><dt>Үүнээс төлөгдсөн</dt><dd>" + BZ.money(pmPaid) + "</dd></div>" +
            "<div><dt>Нийт төлөгдөөгүй / хүлээгдэж буй</dt><dd>" + BZ.money(outstanding) + "</dd></div>" +
            "<div class='total'><dt>" + BZ.monthLabel(cm) + " (одоогоор)</dt><dd>" + BZ.money(cmFee) + "</dd></div>" +
          "</dl>" + BZ.progress(pmBilled ? pmPaid / pmBilled * 100 : 0) +
          '<p class="xs muted" style="margin-top:6px">' + BZ.monthLabel(pm) + "ын шимтгэлийн " + (pmBilled ? Math.round(pmPaid / pmBilled * 100) : 0) + "% төлөгдсөн</p>" +
          '<p class="adm-rule"><i data-lucide="settings-2"></i>Дүрэм: ' + (fee.freeScope === "monthly" ? "сар бүрийн" : "салон бүрийн") + " эхний " + fee.freeLimit + " захиалга үнэгүй, дараа нь " + BZ.money(fee.perBooking) + " / дууссан захиалга</p>" +
        "</div>" +
      "</div>" +

      '<div class="grid grid-2" style="margin-top:var(--sp-4)">' +
        '<div class="card"><div class="card-title"><h3>Батлах хүсэлтүүд</h3><a class="btn btn-ghost btn-sm" href="#/salons">Бүгд<i data-lucide="arrow-right"></i></a></div>' +
          (pending.length ? '<ul class="staff-list">' + pending.map(function (a) {
            var miss = a.docs.filter(function (d) { return d[1] !== "ok"; }).length;
            return '<li><span class="avatar">' + AD.initials(a.name) + '</span><div class="grow"><b>' + BZ.esc(a.name) + '</b><span class="xs muted">' + BZ.esc(a.owner) + " · " + a.submitted + "</span></div>" +
              (miss ? '<span class="badge badge-warning no-dot">Баримт дутуу</span>' : '<span class="badge badge-success no-dot">Баримт бүрэн</span>') +
              '<button type="button" class="btn btn-secondary btn-sm" data-app="' + a.id + '">Хянах</button></li>';
          }).join("") + "</ul>" : BZ.empty("badge-check", "Хүлээгдэж буй хүсэлт алга", "Шинэ салон бүртгүүлэхэд энд харагдана.")) + "</div>" +
        '<div class="card"><div class="card-title"><h3>Сүүлийн үйл ажиллагаа</h3></div>' +
          '<ul class="activity">' + S.log.slice(0, 7).map(function (l) {
            return '<li><span class="act-icon"><i data-lucide="' + l.icon + '"></i></span><div><p>' + BZ.esc(l.text) + '</p><span class="xs muted">' + l.at + "</span></div></li>";
          }).join("") + "</ul></div>" +
      "</div>" +

      '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><div><h3>Энэ сарын идэвхтэй салонууд</h3><p class="xs muted" style="margin:2px 0 0">Дууссан захиалгын тоогоор</p></div></div>' + topSalons(all, cm) + "</div>";
  }
  function alert(kind, icon, html, href) { return '<a class="alert alert-' + kind + '" href="' + href + '"><i data-lucide="' + icon + '"></i><span>' + html + '</span><i data-lucide="chevron-right" class="end"></i></a>'; }
  function chart() {
    var cm = BZ.currentMonth();
    return BZ.barChart(AD.platformMonths().map(function (m) {
      return { label: BZ.monthLabel(m.ym), value: m.completed, highlight: m.ym === cm, tip: BZ.monthLabel(m.ym) + (m.ym === cm ? " (одоогоор)" : "") + " · " + m.completed + " захиалга · шимтгэл " + BZ.money(m.fee) };
    }), { title: "Платформын дууссан захиалга", height: 210 });
  }
  function topSalons(all, cm) {
    var map = {};
    all.forEach(function (b) { if (b.date.slice(0, 7) === cm && b.status === "completed") map[b.salonId] = (map[b.salonId] || 0) + 1; });
    var items = Object.keys(map).map(function (id) { var s = ADM.salon(id); return { label: s.name, value: map[id], sub: s.district + " · " + s.branches.length + " салбар" }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 6);
    return items.length ? BZ.rankBars(items, function (v) { return v + " захиалга"; }) : BZ.empty("store", "Мэдээлэл алга", "Энэ сард дууссан захиалга алга.");
  }

  BZ.page("dashboard", render);
})();
