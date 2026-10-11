/* =========================================================
   Bloom business: shared helpers for all business pages
   lookups, status labels, metrics, simple SVG charts,
   modal + form helpers, free-slot finder.
   ========================================================= */
(function () {
  var E = window.Engine, D = window.BLOOM_DATA;
  function S() { return BIZ.state; }

  /* ---------- Formatting ---------- */
  function money(n) { return Math.round(n).toLocaleString("en-US") + "₮"; }
  function esc(t) { var d = document.createElement("div"); d.textContent = t == null ? "" : String(t); return d.innerHTML; }
  function short(n) { return n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(".0", "") + " сая" : n >= 1e3 ? Math.round(n / 1e3) + " мян" : String(n); }
  var MONTHS = E.MONTHS, WD = E.WEEKDAYS;
  function monthLabel(ym) { var p = ym.split("-"); return MONTHS[+p[1] - 1]; }

  /* ---------- Look-ups ---------- */
  function branch(id) { return S().branches.filter(function (b) { return b.id === id; })[0]; }
  function service(id) { return S().services.filter(function (x) { return x.id === id; })[0]; }
  function employee(id) { return S().employees.filter(function (x) { return x.id === id; })[0]; }
  function booking(ref) { return S().bookings.filter(function (x) { return x.ref === ref; })[0]; }
  function svcNames(b) { return b.serviceIds.map(function (id) { var x = service(id); return x ? x.name : id; }).join(", "); }
  function catName(id) { var c = D.CATEGORIES.filter(function (c) { return c.id === id; })[0]; return c ? c.name : id; }

  var STATUS = {
    pending_payment: ["Төлбөр хүлээж буй", "warning"], confirmed: ["Баталгаажсан", "info"], in_progress: ["Үйлчилгээ хийгдэж буй", "pink"],
    completed: ["Дууссан", "success"], cancelled: ["Цуцлагдсан", "danger"], no_show: ["Ирээгүй", "danger"]
  };
  function statusBadge(st) { var s = STATUS[st] || [st, "info"]; return '<span class="badge badge-' + s[1] + '">' + s[0] + "</span>"; }
  function payState(b) {
    if (b.status === "cancelled") return b.depositPaid ? ["Урьдчилгаа төлсөн · буцаалтыг салон шийднэ", "warning"] : ["Төлбөргүй", "info"];
    if (b.balancePaid) return ["Бүрэн төлсөн", "success"];
    if (b.status === "completed" || b.status === "no_show") return b.status === "no_show" ? (b.depositPaid ? ["Урьдчилгаа төлсөн", "pink"] : ["Төлбөргүй", "info"]) : ["Үлдэгдэл хүлээгдэж буй", "warning"];
    if (b.deposit && !b.depositPaid) return ["Урьдчилгаа төлөөгүй", "warning"];
    if (b.depositPaid) return ["Урьдчилгаа төлсөн", "pink"];
    return ["Салонд төлнө", "info"];
  }
  function payBadge(b) { var p = payState(b); return '<span class="badge badge-' + p[1] + ' no-dot">' + p[0] + "</span>"; }

  /* ---------- Branch filter shared by pages ---------- */
  var branchFilter = "all";
  function inBranch(b) { return branchFilter === "all" || b.branchId === branchFilter || b.branch === branchFilter; }
  function branchSelect(id) {
    return '<label class="inline-select"><i data-lucide="store"></i><span class="sr-only">Салбар</span><select class="select" data-branch-filter id="' + (id || "branch-filter") + '">' +
      '<option value="all">Бүх салбар</option>' + S().branches.map(function (b) { return '<option value="' + b.id + '"' + (branchFilter === b.id ? " selected" : "") + ">" + b.name + "</option>"; }).join("") +
      "</select></label>";
  }

  /* ---------- Metrics ---------- */
  function between(b, from, to) { return b.date >= from && b.date <= to; }
  function stats(list) {
    var o = { total: list.length, completed: 0, cancelled: 0, no_show: 0, upcoming: 0, revenue: 0 };
    list.forEach(function (b) {
      if (b.status === "completed") { o.completed++; o.revenue += b.total; }
      else if (b.status === "cancelled") o.cancelled++;
      else if (b.status === "no_show") o.no_show++;
      else o.upcoming++;
    });
    o.avg = o.completed ? o.revenue / o.completed : 0;
    return o;
  }
  function monthKey(d) { return d.slice(0, 7); }
  function currentMonth() { return E.dateKey(E.today()).slice(0, 7); }
  function addMonths(ym, k) { var p = ym.split("-"), d = new Date(+p[0], +p[1] - 1 + k, 1); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }

  /* Monthly completed counts incl. history before the demo window */
  function monthly() {
    var map = {};
    S().history.forEach(function (h) { map[h[0]] = { ym: h[0], completed: h[1], revenue: h[2], total: Math.round(h[1] * 1.15) }; });
    S().bookings.forEach(function (b) {
      var k = monthKey(b.date);
      if (k <= S().history[S().history.length - 1][0]) return;
      map[k] = map[k] || { ym: k, completed: 0, revenue: 0, total: 0 };
      map[k].total++;
      if (b.status === "completed") { map[k].completed++; map[k].revenue += b.total; }
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }

  /* Platform invoices: first N completed bookings free (lifetime, configurable) */
  function invoices() { return calcInvoices(monthly(), S().fee, S().invoices, "0142"); }
  /* Shared with the admin: months [{ym, completed, revenue}], fee rule, stored statuses.
     freeScope "lifetime": the first N completed bookings ever are free.
     freeScope "monthly":  the first N completed bookings of every month are free. */
  function calcInvoices(months, f, statuses, suffix) {
    var used = 0, out = [], cur = currentMonth(), today = E.dateKey(E.today());
    months.forEach(function (m) {
      if (m.ym > cur) return;
      var free = f.freeScope === "monthly" ? Math.min(m.completed, f.freeLimit) : Math.max(0, Math.min(m.completed, f.freeLimit - used));
      used += free;
      var billable = m.completed - free, amount = billable * f.perBooking;
      var st = (statuses || {})[m.ym] || {};
      var status = m.ym === cur ? "open" : st.status || (amount === 0 ? "free" : "unpaid");
      var due = addMonths(m.ym, 1) + "-15";
      if (status === "unpaid" && due < today) status = "overdue";
      out.push({ ym: m.ym, completed: m.completed, free: free, billable: billable, amount: amount, status: status, due: due, paidAt: st.paidAt, reportedAt: st.reportedAt, revenue: m.revenue, no: "INV-" + m.ym.replace("-", "") + "-" + suffix });
    });
    return out;
  }
  var INV_STATUS = { paid: ["Төлөгдсөн", "success"], unpaid: ["Төлөх", "warning"], overdue: ["Хугацаа хэтэрсэн", "danger"], open: ["Энэ сар · тооцоолж байна", "info"], free: ["Үнэгүй", "pink"], review: ["Баталгаажуулалт хүлээж буй", "info"] };

  /* ---------- Free slots for owner-created bookings ---------- */
  function workDay(e, dateKey) {
    var d = E.fromKey(dateKey), sc = e.schedule[d.getDay()], br = branch(e.branch);
    if (!sc || !br.hours[d.getDay()]) return null;
    if (e.off.some(function (o) { return dateKey >= o.from && dateKey <= o.to; })) return null;
    return sc;
  }
  function freeSlots(empId, dateKey, duration, ignoreRef) {
    var e = employee(empId), sc = workDay(e, dateKey), out = [];
    if (!sc) return out;
    var busy = S().bookings.filter(function (b) { return b.employeeId === empId && b.date === dateKey && b.ref !== ignoreRef && b.status !== "cancelled"; })
      .map(function (b) { return [E.toMin(b.time), E.toMin(b.time) + b.duration]; });
    busy.push([E.toMin(sc.break[0]), E.toMin(sc.break[1])]);
    var now = new Date(), isToday = dateKey === E.dateKey(E.today()), nowMin = now.getHours() * 60 + now.getMinutes();
    for (var t = E.toMin(sc.start); t + duration <= E.toMin(sc.end); t += 30) {
      if (isToday && t < nowMin) continue;
      if (busy.some(function (x) { return t < x[1] && x[0] < t + duration; })) continue;
      out.push(E.fmt(t));
    }
    return out;
  }

  /* ---------- Charts (single series, SVG, hover tooltips) ---------- */
  function barChart(items, opts) {
    opts = opts || {};
    var narrow = window.innerWidth < 600, W = narrow ? 380 : 640, H = (opts.height || 220) * (narrow ? .8 : 1), P = { t: 16, r: 8, b: 30, l: 44 };
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    var step = niceStep(max), top = Math.ceil(max / step) * step;
    var bw = (W - P.l - P.r) / items.length, gap = Math.min(10, bw * 0.3);
    var grid = "", bars = "", labels = "";
    for (var v = 0; v <= top; v += step) {
      var y = P.t + (H - P.t - P.b) * (1 - v / top);
      grid += '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y + '" y2="' + y + '" class="ch-grid"/><text x="' + (P.l - 8) + '" y="' + (y + 4) + '" class="ch-axis" text-anchor="end">' + (opts.fmt ? opts.fmt(v) : v) + "</text>";
    }
    var every = Math.ceil(items.length / Math.min(opts.maxLabels || 14, narrow ? 5 : 14));
    items.forEach(function (it, i) {
      var h = (H - P.t - P.b) * it.value / top, x = P.l + i * bw + gap / 2, y = H - P.b - h, w = bw - gap;
      bars += '<g class="ch-bar' + (it.highlight ? " is-hl" : "") + '" tabindex="0" data-tip="' + esc(it.tip || it.label + ": " + it.value) + '">' +
        '<rect class="ch-hit" x="' + (P.l + i * bw) + '" y="' + P.t + '" width="' + bw + '" height="' + (H - P.t - P.b) + '"/>' +
        '<path d="' + roundTop(x, y, w, h, Math.min(4, w / 2)) + '"/></g>';
      if (i % every === 0 || it.highlight) labels += '<text x="' + (x + w / 2) + '" y="' + (H - 10) + '" class="ch-axis" text-anchor="middle">' + it.label + "</text>";
    });
    return '<div class="chart"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.title || "") + '">' + grid +
      '<line x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + (H - P.b) + '" y2="' + (H - P.b) + '" class="ch-base"/>' + bars + labels + '</svg><div class="ch-tip" hidden></div></div>';
  }
  function roundTop(x, y, w, h, r) {
    if (h <= 0) return "M" + x + " " + y + "h" + w;
    r = Math.min(r, h);
    return "M" + x + " " + (y + h) + "V" + (y + r) + "Q" + x + " " + y + " " + (x + r) + " " + y + "H" + (x + w - r) + "Q" + (x + w) + " " + y + " " + (x + w) + " " + (y + r) + "V" + (y + h) + "Z";
  }
  function niceStep(max) {
    var raw = max / 4, mag = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }
  /* Ranked horizontal bars (popular services, employees) */
  function rankBars(items, fmt) {
    var max = Math.max.apply(null, items.map(function (i) { return i.value; }).concat([1]));
    return '<ul class="rank">' + items.map(function (i) {
      return '<li><div class="rank-top"><span>' + esc(i.label) + "</span><b>" + (fmt ? fmt(i.value) : i.value) + "</b></div>" +
        '<div class="rank-bar"><span style="width:' + Math.max(2, i.value / max * 100) + '%"></span></div>' + (i.sub ? '<span class="xs muted">' + i.sub + "</span>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  document.addEventListener("mouseover", tipOn);
  document.addEventListener("focusin", tipOn);
  function tipOn(e) {
    var g = e.target.closest && e.target.closest(".ch-bar");
    document.querySelectorAll(".ch-tip").forEach(function (t) { if (!g || !t.parentNode.contains(g)) t.hidden = true; });
    if (!g) return;
    var chart = g.closest(".chart"), tip = chart.querySelector(".ch-tip"), r = g.getBoundingClientRect(), c = chart.getBoundingClientRect();
    tip.textContent = g.dataset.tip; tip.hidden = false;
    tip.style.left = Math.max(0, Math.min(c.width - tip.offsetWidth, r.left - c.left + r.width / 2 - tip.offsetWidth / 2)) + "px";
    tip.style.top = Math.max(0, g.querySelector("path").getBoundingClientRect().top - c.top - tip.offsetHeight - 8) + "px";
  }

  /* ---------- Modal helper ---------- */
  function modal(id, title, body, opts) {
    opts = opts || {};
    var ov = document.getElementById(id);
    if (!ov) {
      ov = document.createElement("div");
      ov.className = "overlay sheet-on-mobile"; ov.id = id; ov.setAttribute("aria-hidden", "true");
      ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title"></div>';
      document.body.appendChild(ov);
    }
    /* fresh element each time so listeners from a previous open are dropped */
    var old = ov.querySelector(".modal"), m = document.createElement("div");
    m.setAttribute("role", "dialog"); m.setAttribute("aria-modal", "true"); m.setAttribute("aria-labelledby", id + "-title");
    ov.replaceChild(m, old);
    m.className = "modal " + (opts.size || "");
    m.innerHTML = '<div class="modal-head"><div><h3 id="' + id + '-title">' + title + "</h3>" + (opts.sub ? '<p class="xs muted" style="margin:2px 0 0">' + opts.sub + "</p>" : "") + "</div>" +
      '<button class="icon-btn plain" type="button" data-close-modal aria-label="Хаах"><i data-lucide="x"></i></button></div>' + body;
    UI.icons();
    if (!ov.classList.contains("is-open")) UI.openModal(id);
    return m;
  }

  /* ---------- Form helpers ---------- */
  function field(id, label, input, hint, req) {
    return '<div class="field" data-f="' + id + '"><label for="' + id + '">' + label + (req ? ' <span class="req">*</span>' : "") + "</label>" + input +
      (hint ? '<span class="hint">' + hint + "</span>" : "") + '<span class="error-text"></span></div>';
  }
  function input(id, value, type, attrs) { return '<input class="input" id="' + id + '" type="' + (type || "text") + '" value="' + esc(value == null ? "" : value) + '" ' + (attrs || "") + ">"; }
  function select(id, options, value, attrs) {
    return '<select class="select" id="' + id + '" ' + (attrs || "") + ">" + options.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(value) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("") + "</select>";
  }
  function sw(id, on, label) { return '<label class="switch"><input type="checkbox" id="' + id + '"' + (on ? " checked" : "") + '><span class="track"></span>' + (label || "") + "</label>"; }
  function setErr(id, msg) {
    var el = document.getElementById(id); if (!el) return !msg;
    var f = el.closest(".field");
    if (f) { f.classList.toggle("has-error", !!msg); var t = f.querySelector(".error-text"); if (t) t.textContent = msg || ""; }
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  function val(id) { var el = document.getElementById(id); return el ? (el.type === "checkbox" ? el.checked : el.value.trim()) : ""; }
  function firstError() { var f = document.querySelector(".overlay.is-open .has-error input, .overlay.is-open .has-error select, .overlay.is-open .has-error textarea"); if (f) f.focus(); }
  function uid(p) { return p + Date.now().toString(36).slice(-5); }

  /* Image upload preview (kept as data URL in the demo store) */
  function readImage(file, cb) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { UI.toast("Зөвхөн зураг (JPG, PNG) оруулна уу", "error"); return; }
    if (file.size > 2.5 * 1024 * 1024) { UI.toast("Зургийн хэмжээ 2.5MB-аас бага байх ёстой", "error"); return; }
    var r = new FileReader(); r.onload = function () { cb(r.result); }; r.readAsDataURL(file);
  }
  function img(src, alt, cls) {
    return '<div class="biz-img ' + (cls || "") + '"><i data-lucide="image"></i>' + (src ? '<img src="' + src + '" alt="' + esc(alt || "") + '" onerror="this.remove()">' : "") + "</div>";
  }

  function empty(icon, title, text, action) {
    return '<div class="empty"><div class="empty-icon"><i data-lucide="' + icon + '"></i></div><h3>' + title + "</h3><p>" + text + "</p>" + (action || "") + "</div>";
  }

  /* CSV export (real download) */
  function downloadCSV(name, rows) {
    var csv = "﻿" + rows.map(function (r) { return r.map(function (c) { c = String(c == null ? "" : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(","); }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }

  window.BZ = {
    S: S, money: money, esc: esc, short: short, monthLabel: monthLabel, MONTHS: MONTHS, WD: WD,
    branch: branch, service: service, employee: employee, booking: booking, svcNames: svcNames, catName: catName,
    STATUS: STATUS, statusBadge: statusBadge, payState: payState, payBadge: payBadge,
    get branchFilter() { return branchFilter; }, set branchFilter(v) { branchFilter = v; },
    inBranch: inBranch, branchSelect: branchSelect,
    between: between, stats: stats, monthly: monthly, invoices: invoices, calcInvoices: calcInvoices, INV_STATUS: INV_STATUS, currentMonth: currentMonth, addMonths: addMonths,
    workDay: workDay, freeSlots: freeSlots, barChart: barChart, rankBars: rankBars,
    modal: modal, field: field, input: input, select: select, sw: sw, setErr: setErr, val: val, firstError: firstError, uid: uid,
    readImage: readImage, img: img, empty: empty, downloadCSV: downloadCSV
  };
})();

/* ---------- Page registry: each page script registers a render fn ---------- */
(function () {
  var pages = {}, current = null, currentParams = {};
  BZ.page = function (id, render) { pages[id] = render; };
  BZ.refresh = function () { if (current && pages[current]) { pages[current](currentParams); UI.icons(); } };
  BZ.el = function (id) { return document.querySelector('[data-page="' + id + '"]'); };
  document.addEventListener("page:show", function (e) {
    current = e.detail.id; currentParams = e.detail.params || {};
    if (pages[current]) { pages[current](currentParams); UI.icons(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.matches("[data-branch-filter]")) { BZ.branchFilter = e.target.value; BZ.refresh(); }
  });
})();

/* ---------- Tables (cards on phones), pager, stars, tabs ---------- */
(function () {
  /* cols: [label | {label, cls}], rows: [{cells:[], attrs:""}] */
  BZ.table = function (cols, rows, opts) {
    opts = opts || {};
    cols = cols.map(function (c) { return typeof c === "string" ? { label: c } : c; });
    if (!rows.length) return opts.empty || BZ.empty("search-x", "Илэрц олдсонгүй", "Шүүлтүүрээ өөрчилж дахин оролдоно уу.");
    return '<div class="table-wrap"><table class="table rtable' + (opts.cls ? " " + opts.cls : "") + '"><thead><tr>' +
      cols.map(function (c) { return '<th class="' + (c.cls || "") + '">' + c.label + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) {
        return "<tr " + (r.attrs || "") + ">" + r.cells.map(function (cell, i) {
          return '<td class="' + (cols[i].cls || "") + '" data-label="' + cols[i].label + '">' + cell + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  };
  BZ.pager = function (total, page, per, attr) {
    var pages = Math.ceil(total / per);
    if (pages <= 1) return '<p class="pager-info xs muted">Нийт ' + total + "</p>";
    var from = (page - 1) * per + 1, to = Math.min(total, page * per), html = "";
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - page) <= 1) html += '<button type="button" class="pg' + (i === page ? " is-on" : "") + '" ' + attr + '="' + i + '"' + (i === page ? ' aria-current="page"' : "") + ">" + i + "</button>";
      else if (Math.abs(i - page) === 2) html += '<span class="pg-gap">…</span>';
    }
    return '<div class="pager"><span class="xs muted">' + from + "–" + to + " / " + total + '</span><div class="pager-btns">' +
      '<button type="button" class="pg" ' + attr + '="' + Math.max(1, page - 1) + '" aria-label="Өмнөх"' + (page === 1 ? " disabled" : "") + '><i data-lucide="chevron-left"></i></button>' + html +
      '<button type="button" class="pg" ' + attr + '="' + Math.min(pages, page + 1) + '" aria-label="Дараах"' + (page === pages ? " disabled" : "") + '><i data-lucide="chevron-right"></i></button></div></div>';
  };
  BZ.stars = function (n) {
    var h = '<span class="stars" aria-label="' + n + ' од">';
    for (var i = 1; i <= 5; i++) h += '<i data-lucide="star" class="' + (i <= Math.round(n) ? "on" : "") + '"></i>';
    return h + "</span>";
  };
  BZ.tabs = function (name, items, current) {
    return '<div class="segmented tabs-scroll" role="tablist">' + items.map(function (t) {
      return '<button type="button" role="tab" data-' + name + '="' + t[0] + '" aria-selected="' + (t[0] === current) + '">' + (t[2] ? '<i data-lucide="' + t[2] + '"></i>' : "") + t[1] + "</button>";
    }).join("") + "</div>";
  };
  BZ.dateLabel = function (k) { var d = Engine.fromKey(k); return (d.getMonth() + 1) + "/" + d.getDate() + " " + Engine.WEEKDAYS[d.getDay()].slice(0, 2); };
  BZ.rel = function (k) {
    var o = Math.round((Engine.fromKey(k) - Engine.today()) / 86400000);
    return o === 0 ? "Өнөөдөр" : o === 1 ? "Маргааш" : o === -1 ? "Өчигдөр" : BZ.dateLabel(k);
  };
  BZ.progress = function (pct, cls) { return '<div class="progress ' + (cls || "") + '"><span style="width:' + Math.max(0, Math.min(100, pct)) + '%"></span></div>'; };
})();

/* Clear a field's error as soon as the user edits it */
document.addEventListener("input", function (e) {
  var f = e.target.closest && e.target.closest(".field.has-error");
  if (f) { f.classList.remove("has-error"); e.target.removeAttribute("aria-invalid"); }
});
