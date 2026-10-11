/* =========================================================
   Bloom client: availability & pricing engine (mock)
   Simulates what the backend will do later:
   - branch-specific prices
   - specialist working hours, breaks, days off (exceptions)
   - existing bookings (generated + the ones made in this demo)
   - service duration must fit into a free gap
   - Хямдралтай цаг and promo code calculation
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA;
  var STEP = 30; // minutes between slot start times

  function toMin(t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; }
  function fmt(m) { return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0"); }
  function dateKey(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function fromKey(k) { var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function dayOffset(d) { return Math.round((fromKey(dateKey(d)) - today()) / 86400000); }

  var WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
  var MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];
  function longDate(d) { return d.getFullYear() + " оны " + MONTHS[d.getMonth()] + "ын " + d.getDate() + ", " + WEEKDAYS[d.getDay()]; }
  function shortDate(d) { return (d.getMonth() + 1) + "/" + d.getDate() + " (" + WEEKDAYS[d.getDay()].slice(0, 2) + ")"; }

  /* ---------- Look-ups ---------- */
  function salon(id) { return D.SALONS.filter(function (s) { return s.id === id; })[0]; }
  function branch(s, id) { return s.branches.filter(function (b) { return b.id === id; })[0] || s.branches[0]; }
  function service(s, id) { return s.services.filter(function (x) { return x.id === id; })[0]; }
  function employee(s, id) { return s.employees.filter(function (e) { return e.id === id; })[0]; }

  function branchServices(s, b) {
    return s.services.filter(function (x) { return b.excludes.indexOf(x.id) === -1; });
  }
  function price(s, b, x) { return Math.round(x.price * (b.priceFactor || 1) / 500) * 500; }

  /* Specialists at this branch who can do ALL selected services */
  function eligible(s, b, serviceIds) {
    return s.employees.filter(function (e) {
      return e.branch === b.id && serviceIds.every(function (id) { return e.services.indexOf(id) > -1; });
    });
  }

  /* ---------- Bookings made in the demo (localStorage) ---------- */
  function myBookings() { try { return JSON.parse(localStorage.getItem("bloom-bookings")) || []; } catch (e) { return []; } }
  function saveBooking(b) {
    var all = myBookings(); all.unshift(b);
    try { localStorage.setItem("bloom-bookings", JSON.stringify(all)); } catch (e) {}
  }

  /* ---------- Schedule ---------- */
  function hash(str) { var h = 7; for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 1000003; return h; }

  function workingDay(e, b, d) {
    if (b.closed.indexOf(d.getDay()) > -1) return { ok: false, reason: "Салбар амарна" };
    if (e.days.indexOf(d.getDay()) === -1) return { ok: false, reason: "Амралтын өдөр" };
    if (e.off.indexOf(dayOffset(d)) > -1) return { ok: false, reason: "Чөлөөтэй (хуваарийн өөрчлөлт)" };
    return { ok: true };
  }

  /* Existing bookings: a few generated blocks + demo bookings */
  function busy(e, d) {
    var key = dateKey(d), blocks = [];
    var h = hash(e.id + key);
    var start = toMin(e.start), end = toMin(e.end);
    var count = 2 + (h % 2);
    for (var i = 0; i < count; i++) {
      var slots = Math.floor((end - start) / STEP);
      var at = start + ((h >> (i * 3)) % slots) * STEP;
      var len = [60, 90, 60][(h + i) % 3];
      blocks.push([at, Math.min(at + len, end)]);
    }
    myBookings().forEach(function (bk) {
      if (bk.employeeId === e.id && bk.date === key && bk.status !== "cancelled" && bk.status !== "expired") blocks.push([toMin(bk.time), toMin(bk.time) + bk.duration]);
    });
    return blocks;
  }

  function overlaps(a0, a1, b0, b1) { return a0 < b1 && b0 < a1; }

  /* Status of one start time for one specialist */
  function slotFor(e, b, d, t, duration) {
    var wd = workingDay(e, b, d);
    if (!wd.ok) return { ok: false, reason: "off" };
    var s0 = Math.max(toMin(e.start), toMin(b.open)), s1 = Math.min(toMin(e.end), toMin(b.close));
    if (t < s0 || t >= s1) return { ok: false, reason: "off" };
    if (dayOffset(d) === 0) {
      var now = new Date(); var nowMin = now.getHours() * 60 + now.getMinutes();
      if (t < nowMin + 30) return { ok: false, reason: "past" };
    }
    var br = [toMin(e.break[0]), toMin(e.break[1])];
    if (overlaps(t, t + STEP, br[0], br[1])) return { ok: false, reason: "break" };
    var bl = busy(e, d);
    for (var i = 0; i < bl.length; i++) if (overlaps(t, t + STEP, bl[i][0], bl[i][1])) return { ok: false, reason: "booked" };
    // Whole duration must fit before the next break / booking / shift end
    if (t + duration > s1) return { ok: false, reason: "short" };
    if (overlaps(t, t + duration, br[0], br[1])) return { ok: false, reason: "short" };
    for (var j = 0; j < bl.length; j++) if (overlaps(t, t + duration, bl[j][0], bl[j][1])) return { ok: false, reason: "short" };
    return { ok: true };
  }

  /* All slots for a day. empId === "any" → first free eligible specialist */
  function slots(s, b, empId, d, duration, serviceIds) {
    var staff = empId === "any" ? eligible(s, b, serviceIds) : [employee(s, empId)];
    var out = [];
    for (var t = toMin(b.open); t <= toMin(b.close) - STEP; t += STEP) {
      var best = null, reasons = [];
      for (var i = 0; i < staff.length; i++) {
        var r = slotFor(staff[i], b, d, t, duration);
        if (r.ok) { best = staff[i]; break; }
        reasons.push(r.reason);
      }
      var reason = best ? null : (reasons.indexOf("booked") > -1 ? "booked" : reasons.indexOf("break") > -1 ? "break" : reasons.indexOf("short") > -1 ? "short" : reasons[0] || "off");
      out.push({ time: fmt(t), min: t, ok: !!best, employee: best, reason: reason });
    }
    return out;
  }

  function dayAvailable(s, b, empId, d, duration, serviceIds) {
    return slots(s, b, empId, d, duration, serviceIds).some(function (x) { return x.ok; });
  }

  /* ---------- Discounts ---------- */
  function discountHour(s, serviceId, d, timeMin) {
    return D.DISCOUNT_HOURS.filter(function (h) {
      return h.salonId === s.id && h.serviceId === serviceId &&
        (!d || h.weekdays.indexOf(d.getDay()) > -1) &&
        (timeMin == null || (timeMin >= toMin(h.from) && timeMin < toMin(h.to)));
    })[0];
  }

  function checkPromo(code, b, subtotal) {
    var p = D.PROMO_CODES.filter(function (x) { return x.code === code.trim().toUpperCase(); })[0];
    if (!p) return { ok: false, msg: "Ийм промо код олдсонгүй." };
    if (p.status === "expired" || p.until < dateKey(today())) return { ok: false, msg: "Энэ промо кодын хугацаа " + p.until + "-нд дууссан." };
    if (p.status === "limit") return { ok: false, msg: "Энэ промо кодын ашиглалтын хязгаар дүүрсэн." };
    if (p.branches.indexOf(b.id) === -1) return { ok: false, msg: "Энэ код сонгосон салбарт хүчингүй." };
    if (subtotal < p.min) return { ok: false, msg: "Энэ кодыг " + p.min.toLocaleString("en-US") + "₮-өөс дээш захиалгад ашиглана." };
    return { ok: true, promo: p };
  }

  /* Totals. Rule (FR-46): Хямдралтай цаг applies per service first,
     then a promo code applies to the amount after Хямдралтай цаг.
     The platform fee is charged to the salon, never added here. */
  function totals(s, b, serviceIds, d, timeMin, promo) {
    var subtotal = 0, dh = 0, duration = 0, deposit = 0, lines = [];
    serviceIds.forEach(function (id) {
      var x = service(s, id), p = price(s, b, x);
      var h = d && timeMin != null ? discountHour(s, id, d, timeMin) : null;
      var off = h ? Math.round(p * h.percent / 100 / 100) * 100 : 0;
      subtotal += p; dh += off; duration += x.duration; deposit += x.deposit;
      lines.push({ service: x, price: p, dh: h, dhOff: off });
    });
    var afterDh = subtotal - dh;
    var promoOff = 0;
    if (promo) promoOff = promo.type === "percent" ? Math.round(afterDh * promo.value / 100 / 100) * 100 : Math.min(promo.value, afterDh);
    var total = afterDh - promoOff;
    deposit = Math.min(deposit, total);
    return { lines: lines, subtotal: subtotal, dh: dh, promoOff: promoOff, total: total, duration: duration, deposit: deposit, balance: total - deposit };
  }

  function nextFree(s, b, serviceIds, duration) {
    for (var i = 0; i < 7; i++) {
      var d = today(); d.setDate(d.getDate() + i);
      var free = slots(s, b, "any", d, duration, serviceIds).filter(function (x) { return x.ok; });
      if (free.length) return { date: d, offset: i, slots: free };
    }
    return null;
  }

  window.Engine = {
    toMin: toMin, fmt: fmt, dateKey: dateKey, fromKey: fromKey, today: today, dayOffset: dayOffset,
    WEEKDAYS: WEEKDAYS, MONTHS: MONTHS, longDate: longDate, shortDate: shortDate,
    salon: salon, branch: branch, service: service, employee: employee,
    branchServices: branchServices, price: price, eligible: eligible,
    workingDay: workingDay, slots: slots, dayAvailable: dayAvailable, nextFree: nextFree,
    discountHour: discountHour, checkPromo: checkPromo, totals: totals,
    myBookings: myBookings, saveBooking: saveBooking
  };
})();
