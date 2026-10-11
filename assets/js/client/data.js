/* =========================================================
   Bloom client: mock data
   All salons, people, addresses and prices are FICTIONAL demo
   data. Map positions are approximate demo coordinates, not
   verified business locations.

   Photos: hot-linked from Unsplash (free licence) and only load
   when online. If a photo can't load, a soft gradient cover with
   an icon is shown instead. Replace `photo` with a local file
   (e.g. "../assets/img/salon-1.jpg") at any time.
   ========================================================= */
(function () {
  function u(id) { return "https://images.unsplash.com/" + id + "?auto=format&fit=crop&w=900&q=70"; }

  var CATEGORIES = [
    { id: "hair",    name: "Үс засалт",     icon: "scissors" },
    { id: "nails",   name: "Хумс",          icon: "hand" },
    { id: "makeup",  name: "Нүүр будалт",   icon: "brush" },
    { id: "lashes",  name: "Сормуус",       icon: "eye" },
    { id: "brows",   name: "Хөмсөг",        icon: "sparkle" },
    { id: "skin",    name: "Арьс арчилгаа", icon: "droplets" },
    { id: "massage", name: "Массаж",        icon: "hand-heart" }
  ];

  var DISTRICTS = ["Сүхбаатар", "Чингэлтэй", "Баянгол", "Баянзүрх", "Хан-Уул", "Сонгинохайрхан"];

  /* Services: price in ₮, duration in minutes, deposit in ₮ (0 = none) */
  function svc(id, cat, name, duration, price, deposit) {
    return { id: id, cat: cat, name: name, duration: duration, price: price, deposit: deposit || 0 };
  }

  var SALONS = [
    {
      id: "sarnai", name: "Сарнай Бьюти Студио", featured: true,
      tagline: "Үс засалт, будалтын мэргэжлийн баг · 2016 оноос",
      description: "Сарнай Бьюти Студио нь үс засалт, будалт, хумсны иж бүрэн үйлчилгээг тайван, цэвэрхэн орчинд үзүүлдэг.",
      district: "Сүхбаатар", address: "Сүхбаатар дүүрэг, 1-р хороо, Сөүлийн гудамж 14",
      rating: 4.9, reviews: 312, cats: ["hair", "makeup", "nails"],
      photo: u("photo-1560066984-138dadb4c035"), tone: 0,
      availableToday: true, nextSlot: "14:30", map: { x: 52, y: 44 },
      branches: [
        { id: "sarnai-1", name: "Төв салбар", address: "Сүхбаатар дүүрэг, 1-р хороо, Сөүлийн гудамж 14", phone: "7711-2233", hours: "10:00–21:00" },
        { id: "sarnai-2", name: "Зайсан салбар", address: "Хан-Уул дүүрэг, 11-р хороо, Зайсангийн гудамж 3", phone: "7711-2244", hours: "10:00–20:00" }
      ],
      services: [
        svc("s1", "hair", "Эмэгтэй үс засалт", 60, 45000, 10000),
        svc("s2", "hair", "Үс будалт (дунд урт)", 150, 120000, 30000),
        svc("s3", "makeup", "Үдшийн будалт", 75, 85000, 20000),
        svc("s4", "nails", "Гель маникюр", 60, 45000)
      ]
    },
    {
      id: "tsetseg", name: "Цэцэгт Нэйл Бар", featured: false,
      tagline: "Гель, акрил, хумсны урлаг",
      description: "Хумсны арчилгаа, гель болон акрил хумсны чиглэлээр төрөлжсөн жижиг, тухтай студи.",
      district: "Чингэлтэй", address: "Чингэлтэй дүүрэг, 4-р хороо, Их тойруу 28",
      rating: 4.8, reviews: 204, cats: ["nails"],
      photo: u("photo-1604654894610-df63bc536371"), tone: 1,
      availableToday: true, nextSlot: "12:00", map: { x: 44, y: 36 },
      branches: [{ id: "tsetseg-1", name: "Их тойруу салбар", address: "Чингэлтэй дүүрэг, 4-р хороо, Их тойруу 28", phone: "8800-4411", hours: "09:30–20:00" }],
      services: [
        svc("t1", "nails", "Гель маникюр", 60, 40000),
        svc("t2", "nails", "Акрил хумс суулгах", 120, 80000, 15000),
        svc("t3", "nails", "Педикюр", 60, 50000)
      ]
    },
    {
      id: "misheel", name: "Мишээл Лаш & Браун", featured: false,
      tagline: "Сормуус, хөмсөгний мастерууд",
      description: "Сормуус суулгах, хөмсөг ламинаци, хөмсөг засах үйлчилгээ.",
      district: "Баянгол", address: "Баянгол дүүрэг, 3-р хороо, Энхтайваны өргөн чөлөө 61",
      rating: 4.7, reviews: 158, cats: ["lashes", "brows"],
      photo: u("photo-1583001931096-959e9a1a6223"), tone: 2,
      availableToday: false, nextSlot: "Маргааш 11:00", map: { x: 30, y: 54 },
      branches: [{ id: "misheel-1", name: "Энхтайван салбар", address: "Баянгол дүүрэг, 3-р хороо, Энхтайваны өргөн чөлөө 61", phone: "9911-5566", hours: "10:00–19:00" }],
      services: [
        svc("m1", "lashes", "Сормуус суулгах (классик)", 120, 70000, 20000),
        svc("m2", "lashes", "Сормуус лифтинг", 60, 55000),
        svc("m3", "brows", "Хөмсөг ламинаци", 45, 35000),
        svc("m4", "brows", "Хөмсөг засах, будах", 30, 20000)
      ]
    },
    {
      id: "nomin", name: "Номин Спа & Арьс Арчилгаа", featured: false,
      tagline: "Нүүрний арчилгаа, массаж, спа",
      description: "Арьсны төрөлд тохирсон нүүрний арчилгаа, тайвшруулах массажийн үйлчилгээ.",
      district: "Хан-Уул", address: "Хан-Уул дүүрэг, 15-р хороо, Махатма Гандигийн гудамж 22",
      rating: 4.9, reviews: 276, cats: ["skin", "massage"],
      photo: u("photo-1570172619644-dfd03ed5d881"), tone: 3,
      availableToday: true, nextSlot: "16:00", map: { x: 48, y: 72 },
      branches: [{ id: "nomin-1", name: "Гандан салбар", address: "Хан-Уул дүүрэг, 15-р хороо, Махатма Гандигийн гудамж 22", phone: "7000-8899", hours: "10:00–21:00" }],
      services: [
        svc("n1", "skin", "Нүүрний гүн цэвэрлэгээ", 75, 90000, 20000),
        svc("n2", "skin", "Чийгшүүлэх маск арчилгаа", 45, 55000),
        svc("n3", "massage", "Бүтэн биеийн массаж (60 мин)", 60, 80000, 20000),
        svc("n4", "massage", "Нуруу, мөрний массаж", 30, 45000)
      ]
    },
    {
      id: "erdene", name: "Эрдэнэ Стайл Хаус", featured: false,
      tagline: "Эрэгтэй, эмэгтэй үс засалт",
      description: "Орчин үеийн засалт, үс будалт, эрэгтэй засалтын мэргэжлийн салон.",
      district: "Баянзүрх", address: "Баянзүрх дүүрэг, 26-р хороо, Токиогийн гудамж 9",
      rating: 4.6, reviews: 189, cats: ["hair"],
      photo: u("photo-1522337360788-8b13dee7a37e"), tone: 4,
      availableToday: true, nextSlot: "13:15", map: { x: 70, y: 46 },
      branches: [
        { id: "erdene-1", name: "Токио салбар", address: "Баянзүрх дүүрэг, 26-р хороо, Токиогийн гудамж 9", phone: "9900-1212", hours: "09:00–21:00" },
        { id: "erdene-2", name: "13-р хороолол салбар", address: "Баянзүрх дүүрэг, 4-р хороо, Энхтайваны өргөн чөлөө 112", phone: "9900-1313", hours: "10:00–20:00" }
      ],
      services: [
        svc("e1", "hair", "Эрэгтэй үс засалт", 40, 25000),
        svc("e2", "hair", "Эмэгтэй үс засалт", 60, 40000),
        svc("e3", "hair", "Кератин эмчилгээ", 150, 150000, 40000)
      ]
    },
    {
      id: "uulen", name: "Үүлэн Бьюти Лаунж", featured: false,
      tagline: "Сүйт бүсгүйн болон үдшийн будалт",
      description: "Үйл явдалд зориулсан будалт, үс янзлалт, сормуусны үйлчилгээ.",
      district: "Сүхбаатар", address: "Сүхбаатар дүүрэг, 8-р хороо, Бага тойруу 37",
      rating: 4.8, reviews: 97, cats: ["makeup", "lashes", "hair"],
      photo: u("photo-1487412947147-5cebf100ffc2"), tone: 5,
      availableToday: false, nextSlot: "Маргааш 10:00", map: { x: 58, y: 34 },
      branches: [{ id: "uulen-1", name: "Бага тойруу салбар", address: "Сүхбаатар дүүрэг, 8-р хороо, Бага тойруу 37", phone: "8811-7788", hours: "09:00–19:00" }],
      services: [
        svc("u1", "makeup", "Сүйт бүсгүйн будалт", 120, 180000, 50000),
        svc("u2", "makeup", "Өдрийн будалт", 45, 55000),
        svc("u3", "hair", "Үс янзлах (үдэш)", 60, 60000),
        svc("u4", "lashes", "Хуурамч сормуус наах", 20, 15000)
      ]
    },
    {
      id: "lotus", name: "Лотус Велнес Төв", featured: false,
      tagline: "Массаж, спа, тайвшрал",
      description: "Уламжлалт болон орчин үеийн массаж, халуун чулуун эмчилгээ.",
      district: "Сонгинохайрхан", address: "Сонгинохайрхан дүүрэг, 20-р хороо, Улиастайн гудамж 5",
      rating: 4.5, reviews: 121, cats: ["massage", "skin"],
      photo: u("photo-1544161515-4ab6ce6db874"), tone: 6,
      availableToday: true, nextSlot: "15:00", map: { x: 16, y: 40 },
      branches: [{ id: "lotus-1", name: "Улиастай салбар", address: "Сонгинохайрхан дүүрэг, 20-р хороо, Улиастайн гудамж 5", phone: "7272-3030", hours: "11:00–22:00" }],
      services: [
        svc("l1", "massage", "Халуун чулуун массаж", 90, 110000, 30000),
        svc("l2", "massage", "Хөлийн массаж", 45, 40000),
        svc("l3", "skin", "Биеийн скраб", 60, 70000)
      ]
    },
    {
      id: "solongo", name: "Солонго Хумс & Хөмсөг", featured: false,
      tagline: "Хурдан, цэвэрхэн, хямд",
      description: "Хумс, хөмсөгний өдөр тутмын үйлчилгээг боломжийн үнээр.",
      district: "Баянгол", address: "Баянгол дүүрэг, 16-р хороо, Хүнсний 4-р дэлгүүрийн хойно",
      rating: 4.4, reviews: 83, cats: ["nails", "brows"],
      photo: u("photo-1610992015732-2449b76344bc"), tone: 1,
      availableToday: true, nextSlot: "11:30", map: { x: 24, y: 64 },
      branches: [{ id: "solongo-1", name: "16-р хороо салбар", address: "Баянгол дүүрэг, 16-р хороо", phone: "9595-4040", hours: "10:00–20:00" }],
      services: [
        svc("so1", "nails", "Энгийн маникюр", 40, 25000),
        svc("so2", "nails", "Гель маникюр", 60, 35000),
        svc("so3", "brows", "Хөмсөг засах", 20, 15000)
      ]
    }
  ];

  /* Хямдралтай цаг offers (set by branches). Times are for "today". */
  var DISCOUNT_HOURS = [
    { salonId: "sarnai",  serviceId: "s1", days: "Даваа–Пүрэв", from: "11:00", to: "14:00", percent: 20 },
    { salonId: "tsetseg", serviceId: "t1", days: "Өдөр бүр",     from: "10:00", to: "13:00", percent: 25 },
    { salonId: "nomin",   serviceId: "n3", days: "Мягмар, Пүрэв", from: "14:00", to: "17:00", percent: 15 },
    { salonId: "erdene",  serviceId: "e1", days: "Даваа–Баасан", from: "09:00", to: "12:00", percent: 30 },
    { salonId: "lotus",   serviceId: "l2", days: "Ажлын өдрүүд", from: "11:00", to: "15:00", percent: 20 }
  ];

  /* Platform-managed advertisements: image + link only (admins create them;
     advertisers have no accounts and send a ready-made banner image in the
     slot's exact size). Three fixed placements, shared with admin/. */
  var AD_SLOTS = {
    home:   { name: "Нүүр хуудас · хөндлөн урт баннер", w: 1200, h: 200, ratio: "6:1", where: "Нүүр хуудсанд, «Танд санал болгох салонууд»-ын дээр. Олон зар 6 секунд тутам солигдоно." },
    search: { name: "Үйлчилгээ хайлт · жагсаалтын дээрх баннер", w: 960, h: 120, ratio: "8:1", where: "Үйлчилгээ / салон хайлтын үр дүнгийн жагсаалтын дээр." },
    salon:  { name: "Салоны хуудас · баруун талын блок", w: 300, h: 250, ratio: "6:5", where: "Салоны дэлгэрэнгүй хуудсанд захиалгын хайрцгийн доор (утсанд хуудасны төгсгөлд)." }
  };

  function adDay(o) {
    var d = new Date(); d.setDate(d.getDate() + o);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  /* Seed creatives live in assets/ads/ (paths relative to the site root;
     uploaded images are data: URLs). `client` is an admin-only label. */
  var AD_SEED = [
    { id: "ad1", client: "Цэлмэг Арьс (зохиомол)", image: "assets/ads/home-1.svg", url: "https://example.com/tselmeg-autumn", placement: "home", start: adDay(-20), end: adDay(30), active: true, impressions: 8400, clicks: 312 },
    { id: "ad2", client: "Bloom (дотоод)", image: "assets/ads/home-2.svg", url: "#/salons", placement: "home", start: adDay(-17), end: adDay(60), active: true, impressions: 6300, clicks: 242 },
    { id: "ad3", client: "Сувдан Хумс (зохиомол)", image: "assets/ads/home-3.svg", url: "https://example.com/suvdan-winter", placement: "home", start: adDay(25), end: adDay(80), active: true, impressions: 0, clicks: 0 },
    { id: "ad4", client: "Хаваргүй Үс (зохиомол)", image: "assets/ads/search-1.svg", url: "https://example.com/khavargui-hair", placement: "search", start: adDay(-5), end: adDay(60), active: true, impressions: 2310, clicks: 64 },
    { id: "ad5", client: "Наран Гоо (зохиомол)", image: "assets/ads/salon-1.svg", url: "https://example.com/naran-mask", placement: "salon", start: adDay(-10), end: adDay(45), active: true, impressions: 3120, clicks: 97 },
    { id: "ad6", client: "Тогоруу Академи (зохиомол)", image: "assets/ads/salon-2.svg", url: "https://example.com/togoruu-academy", placement: "salon", start: adDay(-3), end: adDay(40), active: true, impressions: 1180, clicks: 41 },
    { id: "ad7", client: "Сувдан Хумс (зохиомол)", image: "assets/ads/salon-3.svg", url: "https://example.com/suvdan-summer", placement: "salon", start: "2026-06-01", end: "2026-08-31", active: false, impressions: 12650, clicks: 401 }
  ];

  /* Ads the platform admin manages (admin/ saves them in "bloom-admin").
     Stored ads are used only from the current store format
     (ADS_VERSION = VERSION in assets/js/admin/adm-data.js).
     The client shows only active ads inside their start–end dates. */
  var ADS_VERSION = 3;
  var ADS = AD_SEED;
  (function () {
    var saved; try { saved = JSON.parse(localStorage.getItem("bloom-admin")); } catch (e) { saved = null; }
    if (!saved || !saved.ads || !(saved.version >= ADS_VERSION)) return;
    ADS = saved.ads;
  })();

  var USER = { name: "Номин-Эрдэнэ Батболд", initials: "НБ", email: "nomin.demo@bloom.mn", phone: "9911-2233" };

  window.BLOOM_DATA = {
    CATEGORIES: CATEGORIES,
    DISTRICTS: DISTRICTS,
    SALONS: SALONS,
    DISCOUNT_HOURS: DISCOUNT_HOURS,
    AD_SLOTS: AD_SLOTS,
    AD_SEED: AD_SEED,
    ADS: ADS,
    USER: USER
  };
})();
