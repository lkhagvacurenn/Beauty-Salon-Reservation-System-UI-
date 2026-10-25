/* =========================================================
   Bloom client: "Мэдэгдэл"
   - booking / payment updates, unread first look (bold + dot)
   - open one: marks it read, goes to "Миний захиалга"
   - "Бүгдийг уншсан болгох", empty state with "Салон хайх"
   ========================================================= */
(function () {
  var B = window.Bloom;
  var KEY = "bloom-notifications";
  var TYPES = {
    booking_confirmed:   ["calendar-check", "ok"],
    payment_paid:        ["credit-card", "ok"],
    booking_cancelled:   ["calendar-x", "bad"],
    booking_expired:     ["hourglass", "warn"],
    booking_status:      ["info", "info"],
    booking_rescheduled: ["calendar-check", "info"]
  };

  function ago(min) { return new Date(Date.now() - min * 60000).toISOString(); }
  function seedList() {
    return [
      { id: "n1", type: "booking_confirmed", title: "Захиалга баталгаажлаа", body: "Номин Гоо сайхан · Гель маникюр, 3 хоногийн дараа 15:00.", booking: "BLM-418230", at: ago(12), read: false },
      { id: "n2", type: "payment_paid", title: "Урьдчилгаа төлөгдлөө", body: "QPay-ээр 10,000₮ урьдчилгаа амжилттай төлөгдлөө.", booking: "BLM-418977", at: ago(95), read: false },
      { id: "n3", type: "booking_rescheduled", title: "Захиалгын цаг өөрчлөгдлөө", body: "Эрдэнэ салон таны цагийг 10:00 болгож өөрчиллөө.", booking: "BLM-418977", at: ago(60 * 20), read: false },
      { id: "n4", type: "booking_status", title: "Үйлчилгээ дууслаа", body: "Сарнай Бьюти Студио дахь үйлчилгээ дууслаа. Сэтгэгдлээ үлдээгээрэй!", booking: "BLM-402115", at: ago(60 * 24 * 12), read: true },
      { id: "n5", type: "booking_cancelled", title: "Захиалга цуцлагдлаа", body: "Мишээл салоны 12:00 цагийн захиалгыг та цуцаллаа.", booking: "BLM-409882", at: ago(60 * 24 * 7), read: true },
      { id: "n6", type: "booking_expired", title: "Төлбөрийн хугацаа дууслаа", body: "15 минутын дотор урьдчилгаа төлөгдөөгүй тул захиалга автоматаар цуцлагдлаа.", booking: null, at: ago(60 * 24 * 30), read: true }
    ];
  }
  function list() {
    try { var v = JSON.parse(localStorage.getItem(KEY)); if (v) return v; } catch (e) {}
    return seedList();
  }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} badge(); }
  function unread() { return list().filter(function (n) { return !n.read; }).length; }

  function rel(iso) {
    var m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return "Дөнгөж сая";
    if (m < 60) return m + " минутын өмнө";
    if (m < 1440) return Math.round(m / 60) + " цагийн өмнө";
    if (m < 1440 * 30) return Math.round(m / 1440) + " өдрийн өмнө";
    return Math.round(m / 43200) + " сарын өмнө";
  }

  /* unread count next to the "Мэдэгдэл" nav item */
  function badge() {
    var n = unread();
    document.querySelectorAll('a[href="#/notifications"]').forEach(function (a) {
      var b = a.querySelector(".nt-badge");
      if (!n) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement("span"); b.className = "nt-badge"; a.appendChild(b); }
      b.textContent = n > 9 ? "9+" : n;
      a.setAttribute("aria-label", "Мэдэгдэл, " + n + " уншаагүй");
    });
  }

  function render() {
    var el = document.querySelector('[data-page="notifications"]');
    var all = list(), n = unread();
    el.innerHTML =
      '<div class="page-head"><div><h1 class="display">Мэдэгдэл</h1><p>' +
        (n ? n + " уншаагүй мэдэгдэл байна." : "Захиалга, төлбөрийн шинэчлэлүүд энд харагдана.") + "</p></div>" +
        (n ? '<button class="btn btn-secondary btn-sm" type="button" data-nt-all><i data-lucide="check-check"></i>Бүгдийг уншсан болгох</button>' : "") +
      "</div>" +
      (all.length ? '<ul class="nt-list">' + all.map(function (x) {
        var t = TYPES[x.type] || ["bell", "info"];
        return '<li><button type="button" class="nt-item' + (x.read ? "" : " is-unread") + '" data-nt="' + x.id + '">' +
          '<span class="nt-ic nt-' + t[1] + '"><i data-lucide="' + t[0] + '"></i></span>' +
          '<span class="nt-body"><span class="nt-top"><b>' + x.title + '</b><time>' + rel(x.at) + "</time></span>" +
            "<span class=\"nt-text\">" + x.body + "</span>" +
            (x.booking ? '<span class="nt-link">Захиалга харах<i data-lucide="chevron-right"></i></span>' : "") +
          "</span>" +
          (x.read ? "" : '<span class="nt-dot" aria-label="Уншаагүй"></span>') +
        "</button></li>";
      }).join("") + "</ul>" +
      '<p class="nt-demo"><button class="link-btn" type="button" data-nt-clear>Демо: бүгдийг устгаж хоосон төлөв харах</button></p>'
      : '<div class="empty"><div class="empty-icon"><i data-lucide="bell"></i></div><h3>Мэдэгдэл алга</h3>' +
        "<p>Захиалга хийхэд баталгаажуулалт, сануулга энд ирнэ.</p>" +
        '<a class="btn btn-primary btn-sm" href="#/salons">Салон хайх</a>' +
        '<button class="link-btn" type="button" data-nt-reset>Демо өгөгдөл сэргээх</button></div>');
    UI.icons();
    badge();
  }

  document.addEventListener("page:show", function (e) {
    if (e.detail.id === "notifications") render();
    setTimeout(badge, 0);
  });
  document.addEventListener("click", function (e) {
    var it = e.target.closest("[data-nt]");
    if (it) {
      var all = list(), x = all.filter(function (n) { return n.id === it.getAttribute("data-nt"); })[0];
      x.read = true; save(all);
      if (x.booking) location.hash = "#/bookings";
      else render();
      return;
    }
    if (e.target.closest("[data-nt-all]")) {
      save(list().map(function (n) { n.read = true; return n; }));
      UI.toast("Бүх мэдэгдлийг уншсан болголоо", "success");
      render();
    }
    if (e.target.closest("[data-nt-clear]")) { save([]); render(); }
    if (e.target.closest("[data-nt-reset]")) { save(seedList()); render(); }
  });
  window.Notifications = { unread: unread, badge: badge };
})();
