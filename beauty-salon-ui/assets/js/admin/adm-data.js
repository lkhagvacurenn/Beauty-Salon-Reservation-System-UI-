/* =========================================================
   Bloom platform admin: demo store ("bloom-admin").
   Salons come from the shared client data. "Сарнай Бьюти
   Студио" uses the business owner's store (bloom-biz), so
   its bookings, reported reviews, invoices and the fee rule
   are the same in both interfaces. Everything is FICTIONAL.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, E = window.Engine;
  var KEY = "bloom-admin", VERSION = 2;

  function rnd(seed) { var s = seed; return function () { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function day(o) { return BIZ.day(o); }
  function ym(o) { return BZ.addMonths(BZ.currentMonth(), o); }

  var FIRST = ["Болормаа", "Хонгорзул", "Оюунчимэг", "Энхжин", "Нандин-Эрдэнэ", "Ариунзаяа", "Сэлэнгэ", "Мөнхзаяа", "Номуун", "Цэцэгмаа", "Ану", "Уянга",
    "Гэрэлмаа", "Сарангэрэл", "Билгүүн", "Тэмүүлэн", "Оргил", "Дөлгөөн", "Хулан", "Батцэцэг", "Мишээл", "Энэрэл", "Төгсжаргал", "Мөнх-Оргил", "Анударь", "Солонго", "Золзаяа", "Есүй"];
  var LAST = ["Батболд", "Ганбаатар", "Дорж", "Энхбаяр", "Жаргал", "Лхагва", "Мөнхбат", "Нямдорж", "Очир", "Пүрэв", "Сүхбат", "Төмөр", "Цогт", "Чулуун"];
  var OWNERS = { sarnai: "Ганцэцэг Батсүх", tsetseg: "Цэцэгээ Дорж", misheel: "Мишээл Ганбаатар", nomin: "Номин Энхбаяр", erdene: "Эрдэнэбат Сүх", uulen: "Үүрцайх Жаргал", lotus: "Лхамсүрэн Очир", solongo: "Солонго Пүрэв" };
  var JOINED = { sarnai: "2026-05-04", tsetseg: "2026-05-12", misheel: "2026-06-02", nomin: "2026-05-20", erdene: "2026-06-18", uulen: "2026-07-09", lotus: "2026-08-01", solongo: "2026-09-03" };
  var latin = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "j", "з": "z", "и": "i", "й": "i", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "ө": "u", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ү": "u", "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya" };
  function slug(t) { return t.toLowerCase().split("").map(function (c) { return latin[c] != null ? latin[c] : /[a-z0-9]/.test(c) ? c : ""; }).join(""); }

  function seed() {
    var r = rnd(4242);
    var salons = D.SALONS.map(function (s, i) {
      return { id: s.id, name: s.name, owner: OWNERS[s.id], regNo: String(6500000 + i * 13579), phone: s.branches[0].phone, email: "info@" + slug(s.name.split(" ")[0]) + ".mn",
        district: s.district, address: s.address, cats: s.cats.slice(), joined: JOINED[s.id], status: "active", rating: s.rating, reviews: s.reviews,
        branches: s.branches.map(function (b) { return { name: b.name, address: b.address, phone: b.phone, hours: b.hours }; }),
        services: s.services.map(function (x) { return { name: x.name, cat: x.cat, duration: x.duration, price: x.price }; }),
        employees: (s.employees || []).map(function (e) { return { name: e.name, role: e.role }; }), photo: s.photo };
    });
    salons.filter(function (s) { return s.id === "solongo"; })[0].status = "suspended";
    salons.filter(function (s) { return s.id === "solongo"; })[0].suspendReason = "Үйлчлүүлэгчдээс давтан гомдол ирсэн, шалгаж байна";

    /* Monthly completed bookings for salons other than Sarnai (Sarnai comes from bloom-biz) */
    var months = {};
    salons.forEach(function (s, i) {
      if (s.id === "sarnai") return;
      var list = [], base = 40 + Math.round(r() * 120);
      for (var k = -5; k <= 0; k++) {
        var m = ym(k);
        if (m < s.joined.slice(0, 7)) continue;
        var c = Math.round(base * (0.55 + (k + 6) * 0.1) * (m === s.joined.slice(0, 7) ? 0.4 : 1) * (k === 0 ? E.today().getDate() / 31 : 1));
        list.push({ ym: m, completed: c, revenue: c * (45000 + Math.round(r() * 40000)) });
      }
      months[s.id] = list;
    });
    var invStatus = {};
    salons.forEach(function (s) {
      if (s.id === "sarnai") return;
      var st = {};
      months[s.id].forEach(function (m) {
        if (m.ym >= ym(0)) return;
        if (m.ym === ym(-1)) st[m.ym] = s.id === "nomin" ? { status: "review", reportedAt: day(-2) } : s.id === "tsetseg" ? { status: "paid", paidAt: day(-6) } : {};
        else if (s.id === "solongo") st[m.ym] = {};
        else st[m.ym] = { status: "paid", paidAt: BZ.addMonths(m.ym, 1) + "-0" + (3 + Math.floor(r() * 6)) };
      });
      invStatus[s.id] = st;
    });

    var applications = [
      { id: "app1", name: "Гоо Сайхан Ателье", owner: "Оюун-Эрдэнэ Түмэн", regNo: "6789012", phone: "9988-1122", email: "atelier.demo@example.mn", district: "Чингэлтэй",
        address: "Чингэлтэй дүүрэг, 1-р хороо, Жуулчны гудамж 5", cats: ["hair", "makeup"], submitted: day(-1), status: "pending",
        branches: [{ name: "Жуулчны салбар", address: "Чингэлтэй дүүрэг, 1-р хороо, Жуулчны гудамж 5", phone: "9988-1122", hours: "10:00–20:00" }],
        services: [{ name: "Эмэгтэй үс засалт", cat: "hair", duration: 60, price: 42000 }, { name: "Өдрийн будалт", cat: "makeup", duration: 45, price: 50000 }, { name: "Үс будалт", cat: "hair", duration: 120, price: 110000 }],
        employees: [{ name: "Тэгшээ Б.", role: "Үсчин" }, { name: "Сувд Л.", role: "Визажист" }], iban: "MN560005005111222333",
        docs: [["Улсын бүртгэлийн гэрчилгээ", "ok"], ["Тусгай зөвшөөрөл (гоо сайхан)", "ok"], ["Эзэмшигчийн иргэний үнэмлэх", "ok"]] },
      { id: "app2", name: "Сэлэнгэ Барбершоп", owner: "Сэлэнгэ Ганзориг", regNo: "6790123", phone: "8899-3344", email: "barber.demo@example.mn", district: "Баянзүрх",
        address: "Баянзүрх дүүрэг, 14-р хороо, Нарны зам 77", cats: ["hair"], submitted: day(-3), status: "pending",
        branches: [{ name: "Нарны зам салбар", address: "Баянзүрх дүүрэг, 14-р хороо, Нарны зам 77", phone: "8899-3344", hours: "09:00–21:00" }, { name: "Яармаг салбар", address: "Хан-Уул дүүрэг, 18-р хороо", phone: "8899-3355", hours: "10:00–20:00" }],
        services: [{ name: "Эрэгтэй үс засалт", cat: "hair", duration: 40, price: 25000 }, { name: "Сахал засах", cat: "hair", duration: 20, price: 15000 }],
        employees: [{ name: "Ганзориг С.", role: "Барбер" }, { name: "Тэмүүжин Б.", role: "Барбер" }, { name: "Анар Ц.", role: "Барбер" }], iban: "MN780005005444555666",
        docs: [["Улсын бүртгэлийн гэрчилгээ", "ok"], ["Тусгай зөвшөөрөл (гоо сайхан)", "missing"], ["Эзэмшигчийн иргэний үнэмлэх", "ok"]] },
      { id: "app3", name: "Тэнгэр Спа", owner: "Тэнгис Мөнхбат", regNo: "6791234", phone: "7700-5566", email: "tenger.spa.demo@example.mn", district: "Хан-Уул",
        address: "Хан-Уул дүүрэг, 3-р хороо, Чингисийн өргөн чөлөө 24", cats: ["massage", "skin"], submitted: day(-5), status: "pending",
        branches: [{ name: "Төв салбар", address: "Хан-Уул дүүрэг, 3-р хороо, Чингисийн өргөн чөлөө 24", phone: "7700-5566", hours: "11:00–22:00" }],
        services: [{ name: "Бүтэн биеийн массаж", cat: "massage", duration: 60, price: 80000 }, { name: "Нүүрний арчилгаа", cat: "skin", duration: 75, price: 95000 }],
        employees: [{ name: "Мөнхзул Т.", role: "Массажист" }], iban: "MN910005005777888999",
        docs: [["Улсын бүртгэлийн гэрчилгээ", "ok"], ["Тусгай зөвшөөрөл (гоо сайхан)", "ok"], ["Эзэмшигчийн иргэний үнэмлэх", "ok"]] },
      { id: "app4", name: "Хос Бьюти", owner: "Хосбаяр Нямдорж", regNo: "6782345", phone: "9900-7788", email: "khos.demo@example.mn", district: "Баянгол",
        address: "Баянгол дүүрэг, 7-р хороо", cats: ["nails"], submitted: day(-12), status: "rejected", decided: day(-10), reason: "Улсын бүртгэлийн гэрчилгээ уншигдахгүй байна. Дахин илгээнэ үү.",
        branches: [{ name: "7-р хороо салбар", address: "Баянгол дүүрэг, 7-р хороо", phone: "9900-7788", hours: "10:00–19:00" }],
        services: [{ name: "Гель маникюр", cat: "nails", duration: 60, price: 38000 }], employees: [{ name: "Хосоо Н.", role: "Хумсны мастер" }], iban: "MN120005005000111222",
        docs: [["Улсын бүртгэлийн гэрчилгээ", "unreadable"], ["Тусгай зөвшөөрөл (гоо сайхан)", "ok"], ["Эзэмшигчийн иргэний үнэмлэх", "ok"]] }
    ];

    /* Users: customers, salon owners, employees, admins */
    var users = [], n = 0;
    function add(name, role, extra) {
      n++;
      var u = { id: "u" + n, name: name, role: role, email: slug(name.split(" ")[0]) + n + "@example.mn", phone: (r() < 0.5 ? "99" : "88") + String(100000 + Math.floor(r() * 899999)).replace(/(\d{2})(\d{4})/, "$1-$2"),
        status: "active", joined: day(-Math.floor(r() * 150) - 1), lastActive: day(-Math.floor(r() * 20)), bookings: 0 };
      for (var k in extra) u[k] = extra[k];
      users.push(u); return u;
    }
    add("Бат-Очир Сүх", "admin", { email: "batochir@bloom.mn", joined: "2026-04-20", lastActive: day(0) });
    add("Энхтуяа Ганбат", "admin", { email: "enkhtuya@bloom.mn", joined: "2026-04-20", lastActive: day(-1) });
    salons.forEach(function (s) { add(s.owner, "owner", { salon: s.id, joined: s.joined, email: s.id === "sarnai" ? "gantsetseg@sarnai-beauty.mn" : undefined }); });
    D.SALONS.forEach(function (s) { (s.employees || []).forEach(function (e) { add(e.name.replace(/\s+\S\.$/, "") + " " + pick(r, LAST), "employee", { salon: s.id, display: e.name }); }); });
    add("Номин-Эрдэнэ Батболд", "customer", { email: "nomin.demo@bloom.mn", phone: "9911-2233", bookings: 6, joined: "2026-06-14", lastActive: day(0) });
    for (var i = 0; i < 46; i++) add(pick(r, FIRST) + " " + pick(r, LAST), "customer", { bookings: Math.floor(r() * 14) });
    users.forEach(function (u) { if (!u.email) u.email = slug(u.name.split(" ")[0]) + u.id.slice(1) + "@example.mn"; });
    users[users.length - 3].status = "blocked"; users[users.length - 3].blockReason = "Олон удаа ирээгүй (no-show)";
    users[users.length - 9].status = "blocked"; users[users.length - 9].blockReason = "Зохисгүй сэтгэгдэл бичсэн";

    /* Bookings for the other salons (Sarnai's come from bloom-biz) */
    var bookings = [], bn = 0, custs = users.filter(function (u) { return u.role === "customer"; });
    D.SALONS.forEach(function (s) {
      if (s.id === "sarnai") return;
      var per = 3 + Math.floor(r() * 4);
      for (var o = -40; o <= 10; o++) {
        if (s.id === "solongo" && o > -4) break;
        var cnt = Math.round(per * (o > 0 ? 0.5 : 1) * (0.5 + r()));
        for (var j = 0; j < cnt; j++) {
          bn++;
          var x = pick(r, s.services), br = pick(r, s.branches), e = s.employees && s.employees.length ? pick(r, s.employees) : null, c = pick(r, custs);
          var t = 10 * 60 + Math.floor(r() * 18) * 30, past = o < 0 || (o === 0 && t < 11 * 60);
          var st = past ? (r() < 0.85 ? "completed" : r() < 0.6 ? "cancelled" : "no_show") : (r() < 0.08 ? "pending_payment" : "confirmed");
          var dep = x.deposit || 0, total = x.price - (r() < 0.12 ? Math.round(x.price * 0.15 / 100) * 100 : 0);
          bookings.push({ ref: "BLM-" + (500000 + bn * 97 % 99989), salonId: s.id, branch: br.name, customer: c.name, customerId: c.id, phone: c.phone, service: x.name,
            employee: e ? e.name : "—", date: day(o), time: E.fmt(t), duration: x.duration, total: total, deposit: Math.min(dep, total),
            depositPaid: dep > 0 && st !== "pending_payment" && !(st === "cancelled" && r() < 0.5), balancePaid: st === "completed" && r() > 0.03, status: st,
            source: r() < 0.85 ? "online" : "walkin", created: day(Math.min(o, 0) - 1 - Math.floor(r() * 4)) });
        }
      }
    });

    /* Months fully covered by generated bookings use the real counts */
    salons.forEach(function (s) {
      if (s.id === "sarnai") return;
      months[s.id].forEach(function (m) {
        if (m.ym + "-01" < day(-40) && m.ym !== ym(0)) return;
        var done = bookings.filter(function (b) { return b.salonId === s.id && b.status === "completed" && b.date.slice(0, 7) === m.ym; });
        m.completed = done.length; m.revenue = done.reduce(function (a, b) { return a + b.total; }, 0);
      });
    });

    /* Reviews of other salons; Sarnai's come from bloom-biz */
    var reviews = [];
    D.SALONS.forEach(function (s) {
      if (s.id === "sarnai") return;
      (s.reviewList || []).forEach(function (rv) {
        reviews.push({ id: rv.id, salonId: s.id, author: rv.author, rating: rv.rating, date: rv.date, service: rv.service, text: rv.text, likes: rv.likes, status: "published" });
      });
    });
    reviews.push({ id: "x-r1", salonId: "erdene", author: "Анонимус Б.", rating: 1, date: day(-2), service: "Эрэгтэй үс засалт", text: "ХЯМД ҮС ЗАСАЛТ манай салонд!!! 9999-0000 руу залга, 50% хямд.", likes: 0, status: "reported", report: { by: "Систем (автомат шүүлтүүр)", reason: "Спам / зар сурталчилгаа", date: day(-2) } });
    reviews.push({ id: "x-r2", salonId: "lotus", author: "Тэмүүжин Ц.", rating: 2, date: day(-4), service: "Хөлийн массаж", text: "Массажистын утасны дугаар 9911-xxxx, гэрийн хаяг нь ... (хувийн мэдээлэл)", likes: 1, status: "reported", report: { by: "Лотус Велнес Төв", reason: "Хувийн мэдээлэл агуулсан", date: day(-3) } });
    reviews.push({ id: "x-r3", salonId: "misheel", author: "Ану Б.", rating: 3, date: day(-8), service: "Сормуус өргөлт", text: "Үр дүн нь дунд зэрэг, гэхдээ үйлчилгээ найрсаг байсан.", likes: 3, status: "published" });

    /* Advertisements (FR-37, FR-38): shown on the client home page */
    var ads = D.ADS.map(function (a, i) {
      return { id: a.id, title: a.title, text: a.text, cta: a.cta, url: a.url, icon: a.icon, sponsor: a.sponsor, image: "", placement: "home",
        start: day(-20 + i * 3), end: day(30 + i * 10), active: true, impressions: 8400 - i * 2100, clicks: 312 - i * 70 };
    });
    D.SEARCH_ADS.forEach(function (a) {
      ads.push({ id: a.id, title: a.title, text: a.text, cta: a.cta, url: a.url, icon: a.icon, sponsor: a.sponsor, image: "", placement: "search", start: day(-5), end: day(60), active: true, impressions: 2310, clicks: 64 });
    });
    ads.push({ id: "ad6", title: "Шинэ жилийн баярын будалт", text: "Баярын үдэшлэгт зориулсан будалт, үс засалтыг урьдчилан захиалаарай.", cta: "Салон хайх", url: "#/salons?cat=makeup", icon: "gift", sponsor: "Bloom",
      image: "", placement: "home", start: day(25), end: day(80), active: true, impressions: 0, clicks: 0 });
    ads.push({ id: "ad5", title: "Зуны хумсны өнгө", text: "Зуны улиралд зориулсан хумсны шинэ өнгөнүүд.", cta: "Дэлгэрэнгүй", url: "https://example.com/summer-nails", icon: "palette", sponsor: "Түнш брэнд (демо)",
      image: "", placement: "home", start: "2026-06-01", end: "2026-08-31", active: false, impressions: 12650, clicks: 401 });

    var log = [
      { at: day(0) + " 09:12", icon: "user-plus", text: "Шинэ хэрэглэгч бүртгүүллээ: Анударь Ц." },
      { at: day(-1) + " 18:40", icon: "store", text: "Гоо Сайхан Ателье салон бүртгэлийн хүсэлт илгээлээ" },
      { at: day(-2) + " 11:05", icon: "flag", text: "Систем Эрдэнэ Стайл Хаусын нэг сэтгэгдлийг спам гэж тэмдэглэлээ" },
      { at: day(-2) + " 10:20", icon: "receipt", text: "Номин Спа өмнөх сарын нэхэмжлэхээ төлсөн гэж мэдэгдлээ" },
      { at: day(-3) + " 16:02", icon: "store", text: "Сэлэнгэ Барбершоп салон бүртгэлийн хүсэлт илгээлээ" },
      { at: day(-6) + " 12:30", icon: "badge-check", text: "Цэцэгт Нэйл Бар-ын нэхэмжлэхийг баталгаажууллаа" },
      { at: day(-10) + " 15:44", icon: "circle-x", text: "Хос Бьюти-гийн хүсэлтийг татгалзлаа" }
    ];
    return { version: VERSION, salons: salons, months: months, invStatus: invStatus, applications: applications, users: users, bookings: bookings, reviews: reviews, ads: ads, log: log };
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  var state = load();
  if (!state || state.version !== VERSION) { state = seed(); save(); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function addLog(icon, text) {
    var d = new Date();
    state.log.unshift({ at: BIZ.day(0) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"), icon: icon, text: text });
    state.log = state.log.slice(0, 40); save();
  }

  /* ---------- Unified views (Sarnai from bloom-biz) ---------- */
  function salon(id) { return state.salons.filter(function (s) { return s.id === id; })[0]; }
  function allBookings() {
    var S = BIZ.state, sar = S.bookings.map(function (b) {
      var e = BZ.employee(b.employeeId);
      return { ref: b.ref, salonId: "sarnai", branch: BZ.branch(b.branchId).name, customer: b.customer, phone: b.phone, service: BZ.svcNames(b), employee: e ? e.name : "—",
        date: b.date, time: b.time, duration: b.duration, total: b.total, deposit: b.deposit, depositPaid: b.depositPaid, balancePaid: b.balancePaid, status: b.status,
        source: b.source, created: b.created, discount: b.discountHour + b.promoOff, promo: b.promo };
    });
    return sar.concat(state.bookings);
  }
  function allReviews() {
    var sar = BIZ.state.reviews.map(function (r) {
      return { id: r.id, salonId: "sarnai", author: r.author, rating: r.rating, date: r.date, service: r.service, text: r.text, likes: r.likes, status: r.status,
        report: r.report ? { by: "Сарнай Бьюти Студио", reason: r.report.reason, note: r.report.note, date: r.report.date } : null, shared: true };
    });
    return sar.concat(state.reviews);
  }
  function setReview(id, patch) {
    var src = BIZ.state.reviews.filter(function (r) { return r.id === id; })[0];
    if (src) { for (var k in patch) src[k] = patch[k]; BIZ.save(); return; }
    src = state.reviews.filter(function (r) { return r.id === id; })[0];
    for (var k2 in patch) src[k2] = patch[k2]; save();
  }
  function monthsOf(id) { return id === "sarnai" ? BZ.monthly() : state.months[id] || []; }
  function invoicesOf(id) { return BZ.calcInvoices(monthsOf(id), BIZ.state.fee, id === "sarnai" ? BIZ.state.invoices : state.invStatus[id], id === "sarnai" ? "0142" : String(100 + state.salons.indexOf(salon(id))).padStart(4, "0")); }
  function setInvoice(id, m, patch) {
    var map = id === "sarnai" ? BIZ.state.invoices : (state.invStatus[id] = state.invStatus[id] || {});
    map[m] = patch; id === "sarnai" ? BIZ.save() : save();
  }

  window.ADM = { get state() { return state; }, save: save, log: addLog, salon: salon, allBookings: allBookings, allReviews: allReviews, setReview: setReview,
    monthsOf: monthsOf, invoicesOf: invoicesOf, setInvoice: setInvoice, reset: function () { state = seed(); save(); } };
})();
