/* =========================================================
   Bloom client: detail data (branches, specialists, schedules,
   reviews, promo codes, cancellation rules).
   Adds fields to the salons defined in data.js.
   Everything here is FICTIONAL demo data.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA;
  function salon(id) { return D.SALONS.filter(function (s) { return s.id === id; })[0]; }

  /* ---------- Featured salons (home page row) ---------- */
  ["sarnai", "nomin", "tsetseg"].forEach(function (id) { salon(id).featured = true; });

  /* ---------- Gallery: re-uses the demo photo set ---------- */
  var PHOTOS = D.SALONS.map(function (s) { return s.photo; });
  D.SALONS.forEach(function (s, i) {
    s.gallery = [s.photo].concat([1, 2, 3, 4].map(function (k) { return PHOTOS[(i + k * 3) % PHOTOS.length]; }));
  });

  /* ---------- Branch details ----------
     priceFactor: branch price = base price × factor
     excludes:    service ids not offered at this branch
     closed:      weekdays closed (0 = Sunday)
     map:         demo map position (x, y in %)                 */
  var BRANCH = {
    "sarnai-1":  { open: "10:00", close: "21:00", closed: [], priceFactor: 1, excludes: [], map: { x: 52, y: 44 } },
    "sarnai-2":  { open: "10:00", close: "20:00", closed: [1], priceFactor: 1.1, excludes: ["s4"], map: { x: 46, y: 80 } },
    "tsetseg-1": { open: "09:30", close: "20:00", closed: [], priceFactor: 1, excludes: [], map: { x: 44, y: 36 } },
    "misheel-1": { open: "10:00", close: "19:00", closed: [0], priceFactor: 1, excludes: [], map: { x: 30, y: 54 } },
    "nomin-1":   { open: "10:00", close: "21:00", closed: [], priceFactor: 1, excludes: [], map: { x: 48, y: 72 } },
    "erdene-1":  { open: "09:00", close: "21:00", closed: [], priceFactor: 1, excludes: [], map: { x: 70, y: 46 } },
    "erdene-2":  { open: "10:00", close: "20:00", closed: [0], priceFactor: 0.9, excludes: ["e3"], map: { x: 78, y: 58 } },
    "uulen-1":   { open: "09:00", close: "19:00", closed: [0], priceFactor: 1, excludes: [], map: { x: 58, y: 34 } },
    "lotus-1":   { open: "11:00", close: "22:00", closed: [], priceFactor: 1, excludes: [], map: { x: 16, y: 40 } },
    "solongo-1": { open: "10:00", close: "20:00", closed: [], priceFactor: 1, excludes: [], map: { x: 24, y: 64 } }
  };
  D.SALONS.forEach(function (s) {
    s.branches.forEach(function (b) {
      var x = BRANCH[b.id];
      for (var k in x) b[k] = x[k];
    });
  });

  /* ---------- Cancellation rules per service ----------
     Default: free cancellation up to 24 h before. Overrides below. */
  var NO_CANCEL = { u1: true, e3: true, s2: false };
  var DEADLINE = { s2: 48, m1: 24, n1: 12, n3: 12, l1: 24, t2: 24 };
  D.SALONS.forEach(function (s) {
    s.services.forEach(function (x) {
      x.cancellable = !NO_CANCEL[x.id];
      x.cancelHours = DEADLINE[x.id] || 24;
    });
  });

  /* ---------- Specialists ----------
     days: working weekdays (0 = Sunday), start/end: shift,
     break: daily break, off: day offsets from today that are
     schedule exceptions (leave, training).                       */
  function emp(id, name, role, branch, services, days, start, end, brk, off, rating, years) {
    return { id: id, name: name, initials: name.split(" ")[0].slice(0, 1) + (name.split(" ")[1] || "").slice(0, 1),
      role: role, branch: branch, services: services, days: days, start: start, end: end,
      break: brk, off: off || [], rating: rating, years: years };
  }
  var EMP = {
    sarnai: [
      emp("sa-anu", "Анужин Г.", "Ахлах үсчин", "sarnai-1", ["s1", "s2"], [1, 2, 3, 4, 5, 6], "10:00", "19:00", ["13:00", "14:00"], [3], 4.9, 8),
      emp("sa-khu", "Хулан Б.", "Үсчин, будагч", "sarnai-1", ["s1", "s2", "s3"], [2, 3, 4, 5, 6, 0], "11:00", "20:00", ["15:00", "15:30"], [], 4.8, 5),
      emp("sa-oyu", "Оюунаа Д.", "Хумсны мастер", "sarnai-1", ["s4"], [1, 2, 3, 4, 5], "10:00", "18:00", ["13:00", "13:30"], [1], 4.9, 4),
      emp("sa-tem", "Тэмүүлэн С.", "Үсчин", "sarnai-2", ["s1", "s2"], [2, 3, 4, 5, 6, 0], "10:00", "19:00", ["14:00", "15:00"], [], 4.7, 3),
      emp("sa-ari", "Ариунаа Н.", "Визажист", "sarnai-2", ["s3"], [3, 4, 5, 6, 0], "11:00", "20:00", ["15:00", "15:30"], [2], 4.9, 6)
    ],
    tsetseg: [
      emp("ts-mun", "Мөнхзул Б.", "Хумсны мастер", "tsetseg-1", ["t1", "t2", "t3"], [1, 2, 3, 4, 5, 6], "09:30", "18:30", ["13:00", "13:30"], [], 4.9, 6),
      emp("ts-sar", "Сарнай О.", "Хумсны мастер", "tsetseg-1", ["t1", "t3"], [2, 3, 4, 5, 6, 0], "11:00", "20:00", ["15:00", "15:30"], [4], 4.7, 2)
    ],
    misheel: [
      emp("mi-ene", "Энхжин Т.", "Сормуусны мастер", "misheel-1", ["m1", "m2"], [1, 2, 3, 4, 5, 6], "10:00", "19:00", ["13:00", "14:00"], [], 4.8, 5),
      emp("mi-ger", "Гэрэлмаа А.", "Хөмсөгний мастер", "misheel-1", ["m3", "m4", "m2"], [1, 2, 3, 4, 5], "10:00", "18:00", ["13:00", "13:30"], [2], 4.7, 3)
    ],
    nomin: [
      emp("no-tse", "Цэлмэг Ж.", "Косметологич", "nomin-1", ["n1", "n2"], [1, 2, 3, 4, 5, 6], "10:00", "19:00", ["13:00", "14:00"], [], 4.9, 9),
      emp("no-bil", "Билгүүн Э.", "Массажист", "nomin-1", ["n3", "n4"], [2, 3, 4, 5, 6, 0], "12:00", "21:00", ["16:00", "16:30"], [5], 4.8, 7),
      emp("no-nar", "Нарантуяа С.", "Косметологич, массажист", "nomin-1", ["n1", "n2", "n4"], [1, 3, 5, 6], "10:00", "18:00", ["13:00", "13:30"], [], 4.9, 4)
    ],
    erdene: [
      emp("er-tug", "Төгөлдөр М.", "Барбер", "erdene-1", ["e1"], [1, 2, 3, 4, 5, 6], "09:00", "18:00", ["13:00", "13:30"], [], 4.7, 6),
      emp("er-suv", "Сувд Л.", "Үсчин", "erdene-1", ["e1", "e2", "e3"], [2, 3, 4, 5, 6, 0], "11:00", "20:00", ["15:00", "16:00"], [1], 4.6, 4),
      emp("er-uya", "Уянга Б.", "Үсчин", "erdene-2", ["e1", "e2"], [1, 2, 3, 4, 5, 6], "10:00", "19:00", ["13:00", "14:00"], [], 4.6, 3)
    ],
    uulen: [
      emp("uu-sol", "Солонгоо Р.", "Визажист", "uulen-1", ["u1", "u2", "u4"], [1, 2, 3, 4, 5, 6], "09:00", "18:00", ["13:00", "13:30"], [3], 4.9, 7),
      emp("uu-jar", "Жаргал Д.", "Үсчин стилист", "uulen-1", ["u3", "u4"], [2, 3, 4, 5, 6], "10:00", "19:00", ["14:00", "14:30"], [], 4.7, 5)
    ],
    lotus: [
      emp("lo-bat", "Батцэцэг О.", "Массажист", "lotus-1", ["l1", "l2"], [1, 2, 3, 4, 5, 6, 0], "11:00", "20:00", ["15:00", "16:00"], [2], 4.5, 10),
      emp("lo-mis", "Мишээл Х.", "Спа мастер", "lotus-1", ["l2", "l3"], [2, 3, 4, 5, 6, 0], "13:00", "22:00", ["17:00", "17:30"], [], 4.6, 3)
    ],
    solongo: [
      emp("so-nom", "Номин Г.", "Хумсны мастер", "solongo-1", ["so1", "so2", "so3"], [1, 2, 3, 4, 5, 6], "10:00", "19:00", ["13:00", "14:00"], [], 4.4, 2)
    ]
  };
  D.SALONS.forEach(function (s) { s.employees = EMP[s.id] || []; });

  /* ---------- Specialist profile photos ----------
     Online demo portraits. A specialist without a photo (or when the
     photo can't load) shows an initials avatar instead.            */
  function un(id, w) { return "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=" + (w || 300) + "&h=" + (w || 300) + "&q=70"; }
  var FACES = {
    "sa-anu": "photo-1494790108377-be9c29b29330", "sa-khu": "photo-1438761681033-6461ffad8d80", "sa-oyu": "photo-1544005313-94ddf0286df2",
    "sa-tem": "photo-1507003211169-0a1dd7228f2d", "ts-mun": "photo-1534528741775-53994a69daeb", "mi-ene": "photo-1517841905240-472988babdf9",
    "mi-ger": "photo-1531123897727-8f129e1688ce", "no-tse": "photo-1488426862026-3ee34a7d66df", "no-bil": "photo-1500648767791-00dcc994a43e",
    "no-nar": "photo-1529626455594-4ff0802cfb7e", "er-tug": "photo-1506794778202-cad84cf45f1d", "er-suv": "photo-1580489944761-15a19d654956",
    "uu-sol": "photo-1544725176-7c40e5a71c5e", "uu-jar": "photo-1487412720507-e7ab37603c6f", "lo-bat": "photo-1508214751196-bcfd4ca60f91",
    "lo-mis": "photo-1524504388940-b1c1722653e1", "so-nom": "photo-1502823403499-6ccfcf4fb453"
  };
  D.SALONS.forEach(function (s) { s.employees.forEach(function (e) { e.photo = FACES[e.id] ? un(FACES[e.id]) : ""; }); });

  /* ---------- Service photo album (Instagram-style grid) ----------
     Real work photos per service, separate from the salon overview
     gallery at the top of the salon page.                          */
  var WORK = {
    hair: ["photo-1560066984-138dadb4c035", "photo-1562322140-8baeececf3df", "photo-1595476108010-b4d1f102b1b1", "photo-1522337360788-8b13dee7a37e", "photo-1580618672591-eb180b1a973f", "photo-1527799820374-dcf8d9d4a388", "photo-1585747860715-2ba37e788b70", "photo-1503951914875-452162b0f3f1"],
    nails: ["photo-1604654894610-df63bc536371", "photo-1519014816548-bf5fe059798b", "photo-1632345031435-8727f6897d53", "photo-1610992015732-2449b76344bc", "photo-1607779097040-26e80aa78e66"],
    makeup: ["photo-1487412947147-5cebf100ffc2", "photo-1512496015851-a90fb38ba796", "photo-1457972729786-0411a3b2b626", "photo-1596178065887-1198b6148b2b"],
    lashes: ["photo-1583001931096-959e9a1a6223", "photo-1589710751893-f9a6770ad71b"],
    brows: ["photo-1599351431202-1e0f0137899a", "photo-1583001931096-959e9a1a6223"],
    skin: ["photo-1570172619644-dfd03ed5d881", "photo-1616394584738-fc6e612e71b9", "photo-1573461160327-b450ce3d8e7f"],
    massage: ["photo-1544161515-4ab6ce6db874", "photo-1600334089648-b0d9d3028eb2", "photo-1559599101-f09722fb4948"]
  };
  var used = {};
  D.SALONS.forEach(function (s, si) {
    s.servicePhotos = [];
    s.services.forEach(function (x, xi) {
      var pool = WORK[x.cat] || WORK.hair;
      var by = s.employees.filter(function (e) { return e.services.indexOf(x.id) > -1; });
      for (var k = 0; k < 3; k++) {
        var n = (used[x.cat] = (used[x.cat] || 0) + 1);
        s.servicePhotos.push({ id: s.id + "-p" + s.servicePhotos.length, src: un(pool[(n + si) % pool.length], 600), serviceId: x.id, cat: x.cat,
          employeeId: by.length ? by[(xi + k) % by.length].id : null, likes: 12 + ((si * 7 + xi * 5 + k * 11) % 90) });
      }
    });
  });

  /* ---------- Reviews ---------- */
  var REVIEWS = {
    sarnai: [
      ["Болормаа Э.", 5, "2026-10-04", "Эмэгтэй үс засалт", "Анужин маш нямбай засдаг. Хүссэн хэлбэрийг минь яг ойлгосон. Орчин нь цэвэрхэн, тайван.", 18],
      ["Хонгорзул Т.", 5, "2026-09-27", "Үдшийн будалт", "Хуримын үдэшлэгт будуулсан, шөнө болтол будалт хэвээрээ байсан. Баярлалаа!", 11],
      ["Оргил Б.", 4, "2026-09-15", "Үс будалт", "Өнгө гоё гарсан, гэхдээ 15 минут хүлээсэн.", 4],
      ["Ану Ц.", 5, "2026-09-02", "Гель маникюр", "Оюунаа маш хурдан, гоё хийдэг. Дахиад очно.", 7]
    ],
    tsetseg: [
      ["Сэлэнгэ Б.", 5, "2026-10-06", "Гель маникюр", "Гурван долоо хоног болсон ч нэг ч хумс хуулраагүй. Мөнхзул мундаг!", 9],
      ["Мөнх-Оргил Д.", 4, "2026-09-21", "Педикюр", "Үйлчилгээ сайн, үнэ нь арай өндөр санагдсан.", 2]
    ],
    misheel: [
      ["Энэрэл Г.", 5, "2026-10-01", "Сормуус суулгах", "Байгалийн мэт харагддаг, хөнгөн. Энхжин маш болгоомжтой.", 6],
      ["Цэцэгээ Н.", 4, "2026-09-18", "Хөмсөг ламинаци", "Сайхан болсон, дараагийн удаа арай бага будаг хэрэглүүлнэ.", 1]
    ],
    nomin: [
      ["Дөлгөөн С.", 5, "2026-10-07", "Нүүрний гүн цэвэрлэгээ", "Арьс минь гэрэлтээд үлдсэн. Цэлмэг арьсны төрлийг маш сайн тайлбарласан.", 15],
      ["Батжаргал О.", 5, "2026-09-29", "Бүтэн биеийн массаж", "Ажлын стрессээ бүрэн тайлсан. Билгүүн мэргэжлийн хүн.", 8],
      ["Мишээл Ц.", 4, "2026-09-10", "Чийгшүүлэх маск", "Сайхан, гэхдээ орой цаг олдохгүй байсан.", 3]
    ],
    erdene: [
      ["Тэмүүжин А.", 5, "2026-10-05", "Эрэгтэй үс засалт", "Төгөлдөр хурдан, цэвэрхэн засдаг. хямдралтай цагаар хямд засуулсан.", 12],
      ["Ганзул Б.", 4, "2026-09-12", "Эмэгтэй үс засалт", "Үр дүн сайн, захиалсан цагтаа эхэлсэн.", 2]
    ],
    uulen: [["Номуун Э.", 5, "2026-09-30", "Сүйт бүсгүйн будалт", "Хуримын өдөр минь яг төсөөлсөн шигээ болсон. Солонгоо эгчдээ баярлалаа.", 20]],
    lotus: [["Алтанцэцэг Ж.", 4, "2026-10-03", "Халуун чулуун массаж", "Тайвшруулах орчин, гэхдээ халуун ус удаан гарсан.", 3]],
    solongo: [["Уранчимэг П.", 4, "2026-09-25", "Гель маникюр", "Хямд, хурдан. Энгийн өдөр тутмын маникюрт тохиромжтой.", 2]]
  };
  D.SALONS.forEach(function (s) {
    s.reviewList = (REVIEWS[s.id] || []).map(function (r, i) {
      return { id: s.id + "-r" + i, author: r[0], rating: r[1], date: r[2], service: r[3], text: r[4], likes: r[5] };
    });
    // Rating distribution (5★…1★) roughly matching the average
    var five = Math.round((s.rating - 4) * 100);
    s.distribution = [five, Math.max(100 - five - 8, 4), 5, 2, 1];
  });

  /* ---------- Promo codes (each belongs to specific branches) ---------- */
  D.PROMO_CODES = [
    { code: "BLOOM10",    branches: ["sarnai-1", "tsetseg-1", "nomin-1", "erdene-1", "lotus-1"], type: "percent", value: 10, min: 30000, until: "2026-12-31", status: "active" },
    { code: "SARNAI15",   branches: ["sarnai-1"], type: "percent", value: 15, min: 0, until: "2026-11-30", status: "active" },
    { code: "ZAISAN5000", branches: ["sarnai-2"], type: "fixed", value: 5000, min: 40000, until: "2026-11-15", status: "active" },
    { code: "NOMIN20",    branches: ["nomin-1"], type: "percent", value: 20, min: 50000, until: "2026-12-15", status: "active" },
    { code: "NAMAR20",    branches: ["sarnai-1", "nomin-1"], type: "percent", value: 20, min: 0, until: "2026-09-30", status: "expired" },
    { code: "TSETSEG5",   branches: ["tsetseg-1"], type: "fixed", value: 5000, min: 0, until: "2026-12-31", status: "limit" }
  ];

  /* Weekdays used by хямдралтай цаг (0 = Sunday) */
  var DH_DAYS = { sarnai: [1, 2, 3, 4], tsetseg: [0, 1, 2, 3, 4, 5, 6], nomin: [2, 4], erdene: [1, 2, 3, 4, 5], lotus: [1, 2, 3, 4, 5] };
  D.DISCOUNT_HOURS.forEach(function (d) { d.weekdays = DH_DAYS[d.salonId]; });
})();
