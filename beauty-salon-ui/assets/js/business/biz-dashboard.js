/* =========================================================
   Business owner: dashboard (8.1)
   Today's bookings, upcoming, completed, revenue, popular
   services, employee activity, quick actions, recent bookings.
   ========================================================= */
(function () {
  var E = window.Engine;

  function render() {
    var S = BZ.S(), el = BZ.el("dashboard"), today = BIZ.day(0);
    var list = S.bookings.filter(BZ.inBranch);
    var todays = list.filter(function (b) { return b.date === today; }).sort(byTime);
    var week = list.filter(function (b) { return b.date > today && b.date <= BIZ.day(7) && b.status !== "cancelled"; });
    var cm = BZ.currentMonth(), pm = BZ.addMonths(cm, -1);
    var dom = E.today().getDate();
    var thisM = BZ.stats(list.filter(function (b) { return b.date.slice(0, 7) === cm && b.date <= today; }));
    var prevM = BZ.stats(list.filter(function (b) { return b.date.slice(0, 7) === pm && +b.date.slice(8) <= dom; }));
    var trend = prevM.revenue ? Math.round((thisM.revenue - prevM.revenue) / prevM.revenue * 100) : 0;
    var pending = list.filter(function (b) { return b.status === "pending_payment"; }).length;
    var inv = BZ.invoices().filter(function (i) { return i.status === "unpaid" || i.status === "overdue"; })[0];
    var hr = new Date().getHours();
    var hello = hr < 12 ? "Өглөөний мэнд" : hr < 18 ? "Өдрийн мэнд" : "Оройн мэнд";

    var html =
      '<div class="page-head"><div><h2>' + hello + ", " + S.owner.name.split(" ")[0] + "</h2>" +
        "<p>" + E.longDate(E.today()) + " · " + S.salon.name + "</p></div>" +
        '<div class="biz-toolbar">' + BZ.branchSelect("dash-branch") + "</div></div>" +

      /* Quick actions */
      '<div class="quick-actions">' +
        '<button type="button" class="qa" data-new-booking><i data-lucide="calendar-plus"></i><span>Захиалга нэмэх</span></button>' +
        '<a class="qa" href="#/bookings?view=day"><i data-lucide="calendar-clock"></i><span>Өнөөдрийн хуваарь</span></a>' +
        '<a class="qa" href="#/services?new=1"><i data-lucide="sparkles"></i><span>Үйлчилгээ нэмэх</span></a>' +
        '<a class="qa" href="#/promotions?new=1"><i data-lucide="ticket-percent"></i><span>Промо код үүсгэх</span></a>' +
        '<a class="qa" href="#/employees"><i data-lucide="user-cog"></i><span>Ажилтны хуваарь</span></a>' +
      "</div>" +

      (inv || pending ? '<div class="alerts">' +
        (inv ? '<a class="alert alert-warning" href="#/invoices?open=' + inv.ym + '"><i data-lucide="receipt"></i><span><b>' + BZ.monthLabel(inv.ym) + "ын платформын нэхэмжлэх " + BZ.money(inv.amount) + "</b> · төлөх хугацаа " + inv.due + '</span><i data-lucide="chevron-right" class="end"></i></a>' : "") +
        (pending ? '<a class="alert alert-info" href="#/bookings?status=pending_payment"><i data-lucide="hourglass"></i><span><b>' + pending + " захиалга</b> урьдчилгаа төлбөр хүлээж байна</span>" + '<i data-lucide="chevron-right" class="end"></i></a>' : "") +
      "</div>" : "") +

      /* Summary cards */
      '<div class="grid grid-4 stat-grid">' +
        stat("calendar-check", todays.filter(notCancelled).length, "Өнөөдрийн захиалга", todays.filter(function (b) { return b.status === "completed"; }).length + " дууссан · " + todays.filter(function (b) { return b.status === "confirmed" || b.status === "in_progress"; }).length + " хүлээгдэж буй", "") +
        stat("calendar-range", week.length, "Ирэх 7 хоногт", "Баталгаажсан ба төлбөр хүлээж буй", "") +
        stat("circle-check-big", thisM.completed, "Энэ сард дууссан", thisM.cancelled + thisM.no_show + " цуцлагдсан / ирээгүй", "") +
        stat("wallet", BZ.short(thisM.revenue) + "₮", "Энэ сарын орлого", (trend >= 0 ? "+" : "") + trend + "% өмнөх сарын мөн үеэс", trend >= 0 ? "up" : "down") +
      "</div>" +

      '<div class="dash-grid">' +
        /* Chart */
        '<div class="card"><div class="card-title"><div><h3>Сүүлийн 14 хоногийн орлого</h3><p class="xs muted" style="margin:2px 0 0">Дууссан захиалгын дүн, өдрөөр</p></div>' +
          '<a class="btn btn-ghost btn-sm" href="#/reports">Тайлан<i data-lucide="arrow-right"></i></a></div>' + chart(list) + "</div>" +
        /* Today timeline */
        '<div class="card"><div class="card-title"><h3>Өнөөдөр</h3><a class="btn btn-ghost btn-sm" href="#/bookings?view=day">Хуваарь<i data-lucide="arrow-right"></i></a></div>' + timeline(todays) + "</div>" +
      "</div>" +

      '<div class="grid grid-2" style="margin-top:var(--sp-4)">' +
        '<div class="card"><div class="card-title"><h3>Эрэлттэй үйлчилгээ</h3><span class="xs muted">Энэ сар</span></div>' + popular(list, cm) + "</div>" +
        '<div class="card"><div class="card-title"><h3>Ажилтны идэвх</h3><a class="btn btn-ghost btn-sm" href="#/employees">Бүгд<i data-lucide="arrow-right"></i></a></div>' + staff(list, cm) + "</div>" +
      "</div>" +

      '<div class="card" style="margin-top:var(--sp-4)"><div class="card-title"><h3>Сүүлд ирсэн захиалга</h3><a class="btn btn-ghost btn-sm" href="#/bookings">Бүх захиалга<i data-lucide="arrow-right"></i></a></div>' + recent(list) + "</div>";

    el.innerHTML = html;
  }

  function byTime(a, b) { return a.time < b.time ? -1 : 1; }
  function notCancelled(b) { return b.status !== "cancelled"; }
  function stat(icon, value, label, sub, trend) {
    return '<div class="card stat-card"><div class="stat-icon"><i data-lucide="' + icon + '"></i></div><div class="stat-value">' + value + '</div><div class="stat-label">' + label + "</div>" +
      '<div class="stat-sub ' + trend + '">' + (trend ? '<i data-lucide="' + (trend === "up" ? "trending-up" : "trending-down") + '"></i>' : "") + sub + "</div></div>";
  }

  function chart(list) {
    var items = [];
    for (var o = -13; o <= 0; o++) {
      var k = BIZ.day(o), d = E.fromKey(k);
      var rev = list.filter(function (b) { return b.date === k && b.status === "completed"; }).reduce(function (s, b) { return s + b.total; }, 0);
      items.push({ label: (d.getMonth() + 1) + "/" + d.getDate(), value: rev, highlight: o === 0,
        tip: (o === 0 ? "Өнөөдөр" : E.WEEKDAYS[d.getDay()] + ", " + (d.getMonth() + 1) + "/" + d.getDate()) + " · " + BZ.money(rev) });
    }
    return BZ.barChart(items, { fmt: BZ.short, title: "Сүүлийн 14 хоногийн орлого", maxLabels: 7 });
  }

  function timeline(todays) {
    if (!todays.length) return BZ.empty("calendar-x", "Өнөөдөр захиалга алга", "Шинэ захиалга нэмэх эсвэл хуваарийг шалгана уу.");
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    return '<ul class="tl">' + todays.slice(0, 8).map(function (b) {
      var e = BZ.employee(b.employeeId), live = b.status === "in_progress" || (E.toMin(b.time) <= nowMin && nowMin < E.toMin(b.time) + b.duration && b.status === "confirmed");
      return '<li class="' + (live ? "is-live" : "") + (b.status === "cancelled" ? " is-off" : "") + '"><button type="button" data-booking="' + b.ref + '">' +
        '<span class="tl-time">' + b.time + "</span>" +
        '<span class="tl-body"><b>' + BZ.esc(b.customer) + "</b><span>" + BZ.svcNames(b) + " · " + (e ? e.name : "") + "</span></span>" +
        BZ.statusBadge(b.status) + "</button></li>";
    }).join("") + "</ul>" + (todays.length > 8 ? '<a class="tl-more" href="#/bookings?view=day">+' + (todays.length - 8) + " захиалга харах</a>" : "");
  }

  function popular(list, cm) {
    var count = {}, rev = {};
    list.forEach(function (b) {
      if (b.date.slice(0, 7) !== cm || b.status === "cancelled") return;
      b.serviceIds.forEach(function (id) { count[id] = (count[id] || 0) + 1; if (b.status === "completed") rev[id] = (rev[id] || 0) + b.total / b.serviceIds.length; });
    });
    var items = Object.keys(count).map(function (id) { return { label: BZ.service(id).name, value: count[id], sub: BZ.money(rev[id] || 0) + " орлого" }; })
      .sort(function (a, b) { return b.value - a.value; }).slice(0, 5);
    return items.length ? BZ.rankBars(items, function (v) { return v + " захиалга"; }) : BZ.empty("sparkles", "Мэдээлэл алга", "Энэ сард захиалга бүртгэгдээгүй байна.");
  }

  function staff(list, cm) {
    var today = BIZ.day(0);
    var emps = BZ.S().employees.filter(BZ.inBranch);
    return '<ul class="staff-list">' + emps.map(function (e) {
      var mine = list.filter(function (b) { return b.employeeId === e.id; });
      var td = mine.filter(function (b) { return b.date === today && b.status !== "cancelled"; }).length;
      var done = mine.filter(function (b) { return b.date.slice(0, 7) === cm && b.status === "completed"; }).length;
      var working = BZ.workDay(e, today);
      return '<li>' + UI.avatar(e) + '<div class="grow"><b>' + e.name + '</b><span class="xs muted">' + e.role + " · " + BZ.branch(e.branch).name + "</span></div>" +
        '<div class="staff-nums"><span><b>' + td + '</b><small>өнөөдөр</small></span><span><b>' + done + '</b><small>энэ сар</small></span><span><b>' + e.rating.toFixed(1) + "</b><small>үнэлгээ</small></span></div>" +
        (working ? '<span class="badge badge-success">Ажиллаж байна</span>' : '<span class="badge">Амралт</span>') + "</li>";
    }).join("") + "</ul>";
  }

  function recent(list) {
    var rows = list.slice().sort(function (a, b) { return a.created < b.created ? 1 : a.created > b.created ? -1 : a.date < b.date ? 1 : -1; }).slice(0, 6);
    return BZ.table(["Код", "Үйлчлүүлэгч", "Үйлчилгээ", "Цаг", "Дүн", "Төлөв", { label: "", cls: "t-act" }], rows.map(function (b) {
      return { cells: [
        '<span class="mono">' + b.ref + "</span>", "<b>" + BZ.esc(b.customer) + "</b>", BZ.svcNames(b),
        BZ.rel(b.date) + " " + b.time, BZ.money(b.total), BZ.statusBadge(b.status),
        '<button type="button" class="btn btn-ghost btn-sm" data-booking="' + b.ref + '">Харах</button>'] };
    }));
  }

  BZ.page("dashboard", render);
})();
