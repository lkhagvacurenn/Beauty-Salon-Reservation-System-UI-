/* =========================================================
   Bloom platform admin: user management (10.2, FR-32)
   List, search, role/status filters, details, activate or
   deactivate an account.
   ========================================================= */
(function () {
  var st = { role: "all", status: "all", q: "", page: 1 }, PER = 12;

  var applied;
  function render(params) {
    if (params === applied) params = null; else applied = params;
    if (params && params.role) { st.role = params.role; st.page = 1; }
    var el = BZ.el("users"), users = ADM.state.users;
    var count = function (r) { return users.filter(function (u) { return r === "all" || u.role === r; }).length; };
    var list = users.filter(function (u) {
      if (st.role !== "all" && u.role !== st.role) return false;
      if (st.status !== "all" && u.status !== st.status) return false;
      if (st.q && (u.name + " " + u.email + " " + u.phone).toLowerCase().indexOf(st.q.toLowerCase()) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.joined < b.joined ? 1 : -1; });
    var pages = Math.max(1, Math.ceil(list.length / PER)); if (st.page > pages) st.page = pages;
    var blocked = users.filter(function (u) { return u.status === "blocked"; }).length;

    el.innerHTML =
      '<div class="page-head"><div><h2>Хэрэглэгчид</h2></div>' +
        '<button type="button" class="btn btn-secondary" data-users-csv><i data-lucide="download"></i>CSV татах</button></div>' +
      '<div class="kpi-grid">' +
        AD.kpi("Нийт хэрэглэгч", users.length, users.filter(function (u) { return u.joined.slice(0, 7) === BZ.currentMonth(); }).length + " энэ сард бүртгүүлсэн") +
        AD.kpi("Үйлчлүүлэгч", count("customer"), "Цаг захиалах хэрэглэгч") +
        AD.kpi("Салоны эзэмшигч", count("owner"), "Салон бүрт нэг") +
        AD.kpi("Ажилтан", count("employee"), "Салоны эзэмшигч урьсан") +
        AD.kpi("Идэвхгүй болгосон", blocked, "Нэвтрэх боломжгүй") +
      "</div>" +
      '<div class="list-filters">' +
        '<div class="chips" role="group" aria-label="Үүрэг">' + [["all", "Бүгд"], ["customer", "Үйлчлүүлэгч"], ["owner", "Эзэмшигч"], ["employee", "Ажилтан"], ["admin", "Админ"]].map(function (r) {
          return '<button type="button" class="chip" data-urole="' + r[0] + '" aria-pressed="' + (st.role === r[0]) + '">' + r[1] + ' <span class="chip-count">' + count(r[0]) + "</span></button>";
        }).join("") + "</div>" +
        '<div class="list-search">' +
          '<label class="input-icon"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="u-q" type="search" placeholder="Нэр, имэйл, утас" value="' + BZ.esc(st.q) + '"></label>' +
          '<label class="inline-select"><span class="sr-only">Төлөв</span>' + BZ.select("u-status", [["all", "Бүх төлөв"], ["active", "Идэвхтэй"], ["blocked", "Идэвхгүй"]], st.status) + "</label>" +
        "</div></div>" +
      BZ.table(["Хэрэглэгч", "Үүрэг", "Утас", "Бүртгүүлсэн", { label: "Захиалга", cls: "t-num" }, "Төлөв", { label: "", cls: "t-act" }],
        list.slice((st.page - 1) * PER, st.page * PER).map(function (u) {
          return { cells: [
            '<span class="u-cell"><span class="avatar">' + AD.initials(u.name) + "</span><span><b>" + BZ.esc(u.name) + '</b><span class="cell-sub">' + BZ.esc(u.email) + "</span></span></span>",
            AD.roleBadge(u.role) + (u.salon ? '<span class="cell-sub">' + AD.salonName(u.salon) + "</span>" : ""),
            u.phone, u.joined, u.role === "customer" ? u.bookings : "—", statusBadge(u),
            '<button type="button" class="btn btn-secondary btn-sm" data-user="' + u.id + '">Дэлгэрэнгүй</button>'] };
        }), { empty: BZ.empty("user-search", "Хэрэглэгч олдсонгүй", "Хайлт эсвэл шүүлтүүрээ өөрчилнө үү.") }) +
      BZ.pager(list.length, st.page, PER, "data-u-page");
  }
  function statusBadge(u) { return u.status === "active" ? '<span class="badge badge-success">Идэвхтэй</span>' : '<span class="badge badge-danger">Идэвхгүй</span>'; }
  function user(id) { return ADM.state.users.filter(function (u) { return u.id === id; })[0]; }

  function open(id) {
    var u = user(id), self = u.id === "u1";
    var bks = u.role === "customer" ? ADM.allBookings().filter(function (b) { return b.customerId === u.id || b.customer === u.name; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }) : [];
    var html =
      '<div class="u-head"><span class="avatar lg">' + AD.initials(u.name) + '</span><div><b>' + BZ.esc(u.name) + "</b><div>" + AD.roleBadge(u.role) + " " + statusBadge(u) + "</div></div></div>" +
      '<section class="bd-sec"><h4><i data-lucide="contact"></i>Холбоо барих</h4><dl class="sum">' +
        "<div><dt>Имэйл</dt><dd>" + BZ.esc(u.email) + "</dd></div><div><dt>Утас</dt><dd>" + u.phone + "</dd></div>" +
        "<div><dt>Бүртгүүлсэн</dt><dd>" + u.joined + "</dd></div><div><dt>Сүүлд идэвхтэй</dt><dd>" + BZ.rel(u.lastActive) + "</dd></div>" +
        (u.salon ? "<div><dt>Салон</dt><dd>" + AD.salonName(u.salon) + "</dd></div>" : "") +
        (u.display ? "<div><dt>Салон дахь нэр</dt><dd>" + BZ.esc(u.display) + "</dd></div>" : "") +
      "</dl></section>" +
      (u.role === "customer" ? '<section class="bd-sec"><h4><i data-lucide="calendar-days"></i>Захиалга</h4>' +
        '<p class="xs muted">Нийт ' + Math.max(u.bookings, bks.length) + " захиалга" + (bks.length ? " · сүүлийн " + Math.min(4, bks.length) + " нь:" : "") + "</p>" +
        (bks.length ? '<ul class="mini-list">' + bks.slice(0, 4).map(function (b) {
          return "<li><span><b>" + AD.salonName(b.salonId) + '</b><span class="xs muted">' + b.service + " · " + b.date + " " + b.time + "</span></span>" + BZ.statusBadge(b.status) + "</li>";
        }).join("") + "</ul>" : "") + "</section>" : "") +
      (u.role === "owner" ? '<p class="note"><i data-lucide="store"></i>Салоны мэдээллийг <a href="#/salons?salon=' + u.salon + '" data-close-modal>Салон батлах</a> хэсгээс харна.</p>' : "") +
      (u.status === "blocked" ? '<p class="note warn-note"><i data-lucide="ban"></i>Идэвхгүй болгосон шалтгаан: ' + BZ.esc(u.blockReason || "—") + "</p>" : "") +
      '<div class="modal-foot">' + (self ? '<p class="xs muted grow">Өөрийн бүртгэлийг идэвхгүй болгох боломжгүй.</p><button type="button" class="btn btn-secondary" data-close-modal>Хаах</button>' :
        u.status === "active" ? '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button><button type="button" class="btn btn-danger" data-u-block="' + u.id + '"><i data-lucide="ban"></i>Идэвхгүй болгох</button>'
        : '<button type="button" class="btn btn-secondary" data-close-modal>Хаах</button><button type="button" class="btn btn-primary" data-u-activate="' + u.id + '"><i data-lucide="circle-check"></i>Идэвхжүүлэх</button>') + "</div>";
    BZ.modal("user-modal", "Хэрэглэгчийн мэдээлэл", html, { sub: u.id.toUpperCase() });
  }

  function block(id) {
    var u = user(id), reasons = ["Олон удаа ирээгүй (no-show)", "Зохисгүй сэтгэгдэл бичсэн", "Хуурамч бүртгэл", "Хэрэглэгчийн хүсэлтээр", "Бусад"];
    var m = BZ.modal("user-modal", "Идэвхгүй болгох", '<p>' + BZ.esc(u.name) + " энэ бүртгэлээр нэвтэрч чадахгүй болно. Дараа нь дахин идэвхжүүлж болно.</p>" +
      BZ.field("ub-reason", "Шалтгаан", BZ.select("ub-reason", [["", "Сонгоно уу"]].concat(reasons.map(function (r) { return [r, r]; })), ""), "", true) +
      BZ.field("ub-note", "Тайлбар", '<textarea class="textarea" id="ub-note" maxlength="200" placeholder="Заавал биш"></textarea>') +
      '<div class="modal-foot"><button type="button" class="btn btn-secondary" data-user="' + u.id + '">Буцах</button><button type="button" class="btn btn-danger" id="ub-ok"><i data-lucide="ban"></i>Идэвхгүй болгох</button></div>', { sub: u.name });
    m.querySelector("#ub-ok").addEventListener("click", function () {
      if (!BZ.setErr("ub-reason", BZ.val("ub-reason") ? "" : "Шалтгаан сонгоно уу")) { BZ.firstError(); return; }
      u.status = "blocked"; u.blockReason = BZ.val("ub-reason") + (BZ.val("ub-note") ? " · " + BZ.val("ub-note") : "");
      ADM.log("user-x", u.name + "-ийн бүртгэлийг идэвхгүй болголоо"); UI.closeModal("user-modal"); UI.toast("Бүртгэл идэвхгүй боллоо", "success"); BZ.refresh();
    });
  }
  function activate(id) {
    var u = user(id);
    UI.confirm({ title: "Бүртгэлийг идэвхжүүлэх үү?", text: u.name + " дахин нэвтэрч, платформыг ашиглах боломжтой болно.", confirmLabel: "Идэвхжүүлэх" }, function () {
      u.status = "active"; delete u.blockReason; ADM.log("user-check", u.name + "-ийн бүртгэлийг идэвхжүүллээ");
      UI.closeModal("user-modal"); UI.toast("Бүртгэл идэвхжлээ", "success"); BZ.refresh();
    });
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-urole]"))) { st.role = t.dataset.urole; st.page = 1; BZ.refresh(); }
    else if ((t = e.target.closest("[data-u-page]"))) { st.page = +t.dataset.uPage; BZ.refresh(); }
    else if ((t = e.target.closest("[data-user]"))) open(t.dataset.user);
    else if ((t = e.target.closest("[data-u-block]"))) block(t.dataset.uBlock);
    else if ((t = e.target.closest("[data-u-activate]"))) activate(t.dataset.uActivate);
    else if (e.target.closest("[data-users-csv]")) {
      BZ.downloadCSV("bloom-users.csv", [["ID", "Нэр", "Имэйл", "Утас", "Үүрэг", "Салон", "Бүртгүүлсэн", "Төлөв"]].concat(ADM.state.users.map(function (u) {
        return [u.id, u.name, u.email, u.phone, AD.ROLES[u.role][0], u.salon ? AD.salonName(u.salon) : "", u.joined, u.status === "active" ? "Идэвхтэй" : "Идэвхгүй"];
      })));
      UI.toast("CSV файл татагдлаа", "success");
    }
  });
  document.addEventListener("change", function (e) { if (e.target.id === "u-status") { st.status = e.target.value; st.page = 1; BZ.refresh(); } });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "u-q") return;
    clearTimeout(qt); qt = setTimeout(function () { st.q = e.target.value.trim(); st.page = 1; BZ.refresh(); AD.refocus("u-q"); }, 250);
  });

  BZ.page("users", render);
})();
