/* =========================================================
   Bloom business: demo store for "Сарнай Бьюти Студио"
   Built from the shared client data (data.js + data-extra.js)
   so both interfaces show the same salon, branches, services
   and specialists. All edits are kept in localStorage
   ("bloom-biz") so they survive a page refresh.
   Everything here is FICTIONAL demo data.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, E = window.Engine;
  var KEY = "bloom-biz", VERSION = 5;
  var SALON_ID = "sarnai";

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function rnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function day(offset) { var d = E.today(); d.setDate(d.getDate() + offset); return E.dateKey(d); }

  var FIRST = ["Болормаа", "Хонгорзул", "Оюунчимэг", "Энхжин", "Нандин-Эрдэнэ", "Ариунзаяа", "Сэлэнгэ", "Мөнхзаяа", "Номуун", "Цэцэгмаа",
    "Ану", "Уянга", "Гэрэлмаа", "Сарангэрэл", "Билгүүн", "Тэмүүлэн", "Оргил", "Дөлгөөн", "Хулан", "Батцэцэг", "Солонго", "Мишээл", "Энэрэл", "Төгсжаргал"];
  var LAST = ["Б.", "Г.", "Д.", "Э.", "Ж.", "Л.", "М.", "Н.", "О.", "П.", "С.", "Т.", "Ц.", "Ч."];

  function seed() {
    var s = E.salon(SALON_ID), r = rnd(20261011);

    var branches = s.branches.map(function (b, i) {
      var hours = {};
      for (var d = 0; d < 7; d++) hours[d] = b.closed.indexOf(d) > -1 ? null : [b.open, b.close];
      return {
        id: b.id, name: b.name, address: b.address, district: b.address.split(" ")[0], phone: b.phone,
        email: (i ? "zaisan" : "tuv") + "@sarnai-beauty.mn", hours: hours, active: true,
        bank: "Жишээ банк", iban: i ? "MN450005005123456780" : "MN120005005987654321", holder: "Сарнай Бьюти Студио ХХК",
        images: s.gallery.slice(i, i + 3), map: b.map, priceFactor: b.priceFactor
      };
    });

    var services = s.services.map(function (x) {
      var prices = {}, br = [];
      s.branches.forEach(function (b) { if (b.excludes.indexOf(x.id) === -1) { br.push(b.id); prices[b.id] = E.price(s, b, x); } });
      return { id: x.id, name: x.name, cat: x.cat, duration: x.duration, deposit: x.deposit, cancellable: x.cancellable, cancelHours: x.cancelHours,
        active: true, branches: br, prices: prices, image: s.gallery[0],
        description: { s1: "Үсний хэлбэр, нүүрний галбирт тохирсон засалт, угаалга, хатаалт орно.", s2: "Мэргэжлийн будгаар дунд урт үсийг будна. Өнгө сонголтын зөвлөгөө орно.",
          s3: "Үдэшлэг, баярт зориулсан бүтэн нүүр будалт. Сормуус наалт орно.", s4: "Гель будгаар хумсны маникюр, 3 долоо хоног хүртэл тогтоно." }[x.id] || "" };
    });
    services.push({ id: "s5", name: "Үс арчилгаа (кератин)", cat: "hair", duration: 120, deposit: 20000, cancellable: true, cancelHours: 24,
      active: false, branches: ["sarnai-1"], prices: { "sarnai-1": 140000 }, image: s.gallery[2], description: "Кератин эмчилгээ. Улирлын чанартай тул түр идэвхгүй." });

    var employees = s.employees.map(function (e, i) {
      var schedule = {};
      for (var d = 0; d < 7; d++) schedule[d] = e.days.indexOf(d) > -1 ? { start: e.start, end: e.end, break: e.break.slice() } : null;
      var off = e.off.map(function (o) { return { from: day(o), to: day(o), reason: "Чөлөө" }; });
      if (i === 2) off.push({ from: day(18), to: day(22), reason: "Сургалт" });
      return { id: e.id, name: e.name, role: e.role, branch: e.branch, services: e.services.slice(), schedule: schedule, off: off,
        phone: ["9911-4521", "8810-3377", "9505-1290", "8899-6612", "9420-7788"][i] || "9900-0000",
        email: e.id.replace("sa-", "") + "@sarnai-beauty.mn", rating: e.rating, years: e.years, initials: e.initials, photo: e.photo || "",
        status: "active", access: i === 0 ? "manager" : "staff",
        perms: { ownBookings: true, allBookings: i === 0, editSchedule: i === 0, payments: true, reports: i === 0 } };
    });

    /* Bookings: 60 days back, 14 days ahead */
    var bookings = [], n = 0;
    for (var off = -60; off <= 14; off++) {
      var date = E.fromKey(day(off)), wd = date.getDay();
      employees.forEach(function (e) {
        var sc = e.schedule[wd];
        if (!sc) return;
        var t = E.toMin(sc.start) + (r() < 0.5 ? 0 : 30), end = E.toMin(sc.end);
        var brk = [E.toMin(sc.break[0]), E.toMin(sc.break[1])];
        var fill = off > 7 ? 0.25 : off > 0 ? 0.5 : 0.62;
        while (t < end) {
          var svc = pick(r, e.services.map(function (id) { return services.filter(function (x) { return x.id === id; })[0]; }).filter(function (x) { return x.branches.indexOf(e.branch) > -1; }));
          if (!svc) break;
          if (t < brk[1] && t + svc.duration > brk[0]) { t = brk[1]; continue; }
          if (t + svc.duration > end) break;
          if (r() < fill) {
            n++;
            var price = svc.prices[e.branch];
            var dh = svc.id === "s1" && [1, 2, 3, 4].indexOf(wd) > -1 && t >= 660 && t < 840 ? Math.round(price * 0.2) : 0;
            var promo = r() < 0.08 ? Math.round((price - dh) * 0.1 / 100) * 100 : 0;
            var total = price - dh - promo;
            var status, now = new Date(), start = new Date(date); start.setMinutes(t);
            var endT = new Date(start.getTime() + svc.duration * 60000);
            if (endT < now) { var x = r(); status = x < 0.84 ? "completed" : x < 0.93 ? "cancelled" : "no_show"; }
            else if (start < now) status = "in_progress";
            else status = r() < 0.08 && off < 3 ? "pending_payment" : "confirmed";
            var dep = Math.min(svc.deposit, total);
            var b = {
              ref: "BLM-" + (300000 + n * 37 % 99991 + n), customer: pick(r, FIRST) + " " + pick(r, LAST),
              phone: (r() < 0.5 ? "99" : "88") + String(100000 + Math.floor(r() * 899999)).replace(/(\d{2})(\d{4})/, "$1-$2"),
              branchId: e.branch, serviceIds: [svc.id], employeeId: e.id, date: day(off), time: E.fmt(t), duration: svc.duration,
              subtotal: price, discountHour: dh, promoOff: promo, promo: promo ? "BLOOM10" : null, total: total, deposit: dep,
              depositPaid: dep > 0 && status !== "pending_payment" && !(status === "cancelled" && r() < 0.5),
              balancePaid: status === "completed", status: status, source: r() < 0.82 ? "online" : "walkin",
              created: day(Math.min(off, 0) - 1 - Math.floor(r() * 5))
            };
            if (b.source === "walkin") { b.deposit = 0; b.depositPaid = false; }
            if (status === "cancelled") b.cancelledBy = r() < 0.7 ? "Үйлчлүүлэгч" : "Салон";
            bookings.push(b);
            t += svc.duration + (r() < 0.4 ? 30 : 0);
          } else t += 30;
        }
      });
    }

    var promos = [
      { id: "p1", code: "SARNAI15", branches: ["sarnai-1"], type: "percent", value: 15, min: 0, start: day(-20), end: "2026-11-30", limit: 100, used: 37, active: true },
      { id: "p2", code: "ZAISAN5000", branches: ["sarnai-2"], type: "fixed", value: 5000, min: 40000, start: day(-10), end: "2026-11-15", limit: 50, used: 12, active: true },
      { id: "p3", code: "BLOOM10", branches: ["sarnai-1"], type: "percent", value: 10, min: 30000, start: "2026-09-01", end: "2026-12-31", limit: 300, used: 141, active: true, platform: true },
      { id: "p4", code: "NAMAR20", branches: ["sarnai-1", "sarnai-2"], type: "percent", value: 20, min: 0, start: "2026-09-01", end: "2026-09-30", limit: 80, used: 64, active: false },
      { id: "p5", code: "SHINE10", branches: ["sarnai-2"], type: "percent", value: 10, min: 0, start: day(5), end: day(40), limit: 60, used: 0, active: true }
    ];
    var discountHours = [
      { id: "dh1", branch: "sarnai-1", service: "s1", weekdays: [1, 2, 3, 4], from: "11:00", to: "14:00", type: "percent", value: 20, start: "2026-09-01", end: "2026-12-31", active: true },
      { id: "dh2", branch: "sarnai-2", service: "s3", weekdays: [2, 3], from: "12:00", to: "15:00", type: "fixed", value: 10000, start: day(-5), end: day(55), active: true },
      { id: "dh3", branch: "sarnai-1", service: null, weekdays: [6], from: "10:00", to: "12:00", type: "percent", value: 10, start: "2026-08-01", end: "2026-09-30", active: false }
    ];

    var reviews = s.reviewList.map(function (rv, i) {
      return { id: rv.id, author: rv.author, rating: rv.rating, date: rv.date, service: rv.service, text: rv.text, likes: rv.likes,
        employeeId: ["sa-anu", "sa-ari", "sa-khu", "sa-oyu"][i], branchId: i === 1 ? "sarnai-2" : "sarnai-1", status: "published" };
    });
    reviews.push(
      { id: "sarnai-r9", author: "Мөнхзаяа Д.", rating: 3, date: day(-3), service: "Эмэгтэй үс засалт", text: "Засалт нь болсон ч 20 минут хүлээлгэсэн. Цагаа баримталбал сайн байна.", likes: 2, employeeId: "sa-tem", branchId: "sarnai-2", status: "published" },
      { id: "sarnai-r10", author: "Номуун Б.", rating: 5, date: day(-6), service: "Үс будалт (дунд урт)", text: "Хулан өнгийг яг хүссэнээр гаргасан. Маш их баярлалаа!", likes: 6, employeeId: "sa-khu", branchId: "sarnai-1", status: "published" },
      { id: "sarnai-r11", author: "Тэмүүлэн С.", rating: 1, date: day(-9), service: "Гель маникюр", text: "Энэ салон бол луйвар!!! Хэзээ ч битгий оч, бүгд худлаа.", likes: 0, employeeId: "sa-oyu", branchId: "sarnai-1", status: "published" }
    );

    return {
      version: VERSION,
      owner: { name: "Ганцэцэг Батсүх", initials: "ГБ", email: "gantsetseg@sarnai-beauty.mn", phone: "9911-0808" },
      salon: { id: s.id, name: s.name, tagline: s.tagline, description: s.description, phone: "7711-2233", email: "info@sarnai-beauty.mn",
        web: "sarnai-beauty.mn", cats: s.cats.slice(), regNo: "6543210", joined: "2026-05-04", logo: s.photo },
      branches: branches, services: services, employees: employees, bookings: bookings,
      promos: promos, discountHours: discountHours, reviews: reviews,
      /* Platform fee rule (set by the platform admin; shown read-only here) */
      fee: { freeLimit: 50, perBooking: 100, freeScope: "lifetime" },
      /* Completed bookings before the demo window (May–Aug) */
      history: [["2026-05", 64, 4710000], ["2026-06", 158, 11620000], ["2026-07", 236, 17380000], ["2026-08", 301, 22270000]],
      invoices: { "2026-05": { status: "paid", paidAt: "2026-06-10" }, "2026-06": { status: "paid", paidAt: "2026-07-08" }, "2026-07": { status: "paid", paidAt: "2026-08-06" }, "2026-08": { status: "paid", paidAt: "2026-09-09" } }
    };
  }

  var state = load();
  if (!state || state.version !== VERSION) { state = seed(); save(); }
  /* Profile photos were added later: fill them in for saved data without a reset */
  (function () {
    var src = D.SALONS.filter(function (x) { return x.id === "sarnai"; })[0], changed = false;
    state.employees.forEach(function (e) {
      if (e.photo !== undefined) return;
      var o = src && src.employees.filter(function (x) { return x.id === e.id; })[0];
      e.photo = o ? o.photo : ""; changed = true;
    });
    if (changed) save();
  })();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  window.BIZ = {
    get state() { return state; },
    save: save,
    reset: function () { state = seed(); save(); },
    day: day
  };
})();
