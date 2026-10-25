/* =========================================================
   Business owner: employees (8.4, FR-20, FR-21, FR-22)
   List, add / edit, contacts, assigned services, weekly
   schedule with breaks, days off / unavailable periods,
   system-access permissions.
   ========================================================= */
(function () {
  var E = window.Engine;
  var ORDER = [1, 2, 3, 4, 5, 6, 0];
  var PERMS = [
    ["ownBookings", "Өөрийн захиалгыг харах, төлөв өөрчлөх", "Ажилтны интерфейсийн үндсэн эрх"],
    ["allBookings", "Салбарын бүх захиалгыг харах", "Хамт ажиллагсдын хуваарийг харна"],
    ["editSchedule", "Хуваарь, чөлөө засах", "Өөрийн болон бусдын ажлын цагийг өөрчилнө"],
    ["payments", "Үлдэгдэл төлбөр бүртгэх, QR харуулах", "Үйлчилгээ дууссаны дараа"],
    ["reports", "Тайлан харах", "Салбарын орлого, статистик"]
  ];
  var st = { q: "" };
  function S() { return BZ.S(); }

  function render() {
    var el = BZ.el("employees"), today = BIZ.day(0), cm = BZ.currentMonth();
    var list = S().employees.filter(BZ.inBranch).filter(function (e) { return !st.q || e.name.toLowerCase().indexOf(st.q.toLowerCase()) > -1; });
    el.innerHTML =
      '<div class="page-head"><div><h2>Ажилтан</h2></div>' +
        '<button type="button" class="btn btn-primary" data-emp-new><i data-lucide="user-plus"></i>Ажилтан нэмэх</button></div>' +
      '<div class="biz-toolbar wrap"><label class="input-icon grow-sm"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="emp-q" type="search" placeholder="Нэрээр хайх" value="' + BZ.esc(st.q) + '"></label>' + BZ.branchSelect("emp-branch") + "</div>" +
      (list.length ? '<div class="emp-grid">' + list.map(function (e) {
        var sc = BZ.workDay(e, today), mine = S().bookings.filter(function (b) { return b.employeeId === e.id; });
        var td = mine.filter(function (b) { return b.date === today && b.status !== "cancelled"; }).length;
        var done = mine.filter(function (b) { return b.date.slice(0, 7) === cm && b.status === "completed"; }).length;
        var nextOff = e.off.filter(function (o) { return o.to >= today; }).sort(function (a, b) { return a.from < b.from ? -1 : 1; })[0];
        var days = ORDER.filter(function (d) { return e.schedule[d]; }).map(function (d) { return E.WEEKDAYS[d].slice(0, 2); }).join(", ");
        return '<article class="card emp-card' + (e.status === "active" ? "" : " is-inactive") + '">' +
          '<div class="emp-top">' + UI.avatar(e, "lg") + '<div class="grow"><h4>' + BZ.esc(e.name) + '</h4><span class="xs muted">' + BZ.esc(e.role) + " · " + BZ.branch(e.branch).name + "</span></div>" +
            (e.status !== "active" ? '<span class="badge">Идэвхгүй</span>' : sc ? '<span class="badge badge-success">Ажиллаж байна</span>' : '<span class="badge">' + (e.off.some(function (o) { return today >= o.from && today <= o.to; }) ? "Чөлөөтэй" : "Амралт") + "</span>") + "</div>" +
          '<div class="mini-stats"><span><b>' + td + "</b><small>өнөөдөр</small></span><span><b>" + done + "</b><small>энэ сар</small></span><span><b>" + e.rating.toFixed(1) + '</b><small>үнэлгээ</small></span></div>' +
          '<ul class="meta-list">' +
            '<li><i data-lucide="clock"></i>' + (days || "Хуваарьгүй") + (sc ? " · " + sc.start + "–" + sc.end : "") + "</li>" +
            (nextOff ? '<li><i data-lucide="plane"></i>Чөлөө: ' + nextOff.from + (nextOff.to !== nextOff.from ? " – " + nextOff.to : "") + " (" + nextOff.reason + ")</li>" : "") +
            '<li><i data-lucide="shield-check"></i>' + (e.access === "manager" ? "Менежер эрх" : "Ажилтны эрх") + "</li>" +
          "</ul>" +
          '<div class="chips static">' + e.services.map(function (id) { var x = BZ.service(id); return x ? '<span class="badge no-dot">' + x.name + "</span>" : ""; }).join("") + "</div>" +
          '<div class="row-wrap emp-actions"><button type="button" class="btn btn-secondary btn-sm" data-emp-edit="' + e.id + '" data-tab="info"><i data-lucide="pencil"></i>Засах</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-emp-edit="' + e.id + '" data-tab="schedule"><i data-lucide="calendar-clock"></i>Хуваарь</button>' +
            '<button type="button" class="btn btn-ghost btn-sm" data-emp-edit="' + e.id + '" data-tab="off"><i data-lucide="calendar-x"></i>Чөлөө</button></div>' +
        "</article>";
      }).join("") + "</div>" : BZ.empty("users", "Ажилтан олдсонгүй", "Шүүлтүүрээ өөрчлөх эсвэл шинэ ажилтан нэмнэ үү."));
  }

  function edit(id, tab) {
    var isNew = !id, src = isNew ? null : BZ.employee(id);
    var e = isNew ? { id: BZ.uid("emp-"), name: "", role: "", branch: BZ.branchFilter !== "all" ? BZ.branchFilter : S().branches[0].id, services: [], schedule: {}, off: [], phone: "", email: "", rating: 0, years: 0, initials: "", photo: "", status: "active", access: "staff", perms: { ownBookings: true, allBookings: false, editSchedule: false, payments: true, reports: false } }
      : JSON.parse(JSON.stringify(src));
    if (isNew) ORDER.forEach(function (d) { e.schedule[d] = d === 0 ? null : { start: "10:00", end: "19:00", break: ["13:00", "14:00"] }; });
    tab = tab || "info";
    var times = []; for (var t = 7 * 60; t <= 23 * 60; t += 30) times.push([E.fmt(t), E.fmt(t)]);

    var body = BZ.tabs("etab", [["info", "Мэдээлэл", "user-round"], ["schedule", "Хуваарь", "calendar-clock"], ["off", "Чөлөө", "calendar-x"], ["perms", "Эрх", "shield-check"]], tab) +
      '<div class="etab" data-pane="info"></div><div class="etab" data-pane="schedule"></div><div class="etab" data-pane="off"></div><div class="etab" data-pane="perms"></div>' +
      '<div class="modal-foot">' + (isNew ? "" : '<button type="button" class="btn btn-ghost danger-text" id="em-status">' + (e.status === "active" ? '<i data-lucide="user-x"></i>Идэвхгүй болгох' : '<i data-lucide="user-check"></i>Идэвхжүүлэх') + '</button><span class="spacer"></span>') +
        '<button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="em-save">' + (isNew ? "Нэмэх" : "Хадгалах") + "</button></div>";
    var m = BZ.modal("emp-modal", isNew ? "Шинэ ажилтан" : e.name, body, { size: "modal-lg", sub: isNew ? "" : e.role + " · " + BZ.branch(e.branch).name });

    function svcChecks() {
      return S().services.filter(function (x) { return x.branches.indexOf(e.branch) > -1; }).map(function (x) {
        return '<label class="check"><input type="checkbox" data-es="' + x.id + '"' + (e.services.indexOf(x.id) > -1 ? " checked" : "") + ">" + x.name + (x.active ? "" : ' <span class="xs muted">(идэвхгүй)</span>') + "</label>";
      }).join("") || '<p class="xs muted">Энэ салбарт үйлчилгээ алга.</p>';
    }
    m.querySelector('[data-pane="info"]').innerHTML = '<div class="emp-photo" id="em-photo"></div><div class="form-grid">' +
      BZ.field("em-name", "Овог нэр", BZ.input("em-name", e.name, "text", 'placeholder="Жишээ: Сараа Б."'), "", true) +
      BZ.field("em-role", "Албан тушаал", BZ.input("em-role", e.role, "text", 'placeholder="Үсчин, Хумсны мастер…"'), "", true) +
      BZ.field("em-phone", "Утас", BZ.input("em-phone", e.phone, "tel"), "", true) +
      BZ.field("em-email", "Имэйл", BZ.input("em-email", e.email, "email"), "Ажилтны интерфейст нэвтрэх нэр", true) +
      BZ.field("em-branch", "Салбар", BZ.select("em-branch", S().branches.map(function (b) { return [b.id, b.name]; }), e.branch), "", true) +
      BZ.field("em-years", "Туршлага (жил)", BZ.input("em-years", e.years, "number", 'min="0" max="50"')) +
      '</div><fieldset class="field" style="margin-top:var(--sp-4)"><legend>Хийх үйлчилгээ <span class="req">*</span></legend><div class="check-grid" id="em-svcs">' + svcChecks() + '</div><span class="error-text" id="em-svc-err"></span></fieldset>';

    /* Profile photo: optional. Without one, customers see the initials avatar. */
    function drawPhoto() {
      m.querySelector("#em-photo").innerHTML = UI.avatar({ name: BZ.val("em-name") || e.name || "?", photo: e.photo }, "xl") +
        '<div class="grow"><b>Профайл зураг</b><span class="xs muted">' + (e.photo ? "Үйлчлүүлэгч ажилтан сонгохдоо энэ зургийг харна." : "Зураггүй бол нэрийн эхний үсгээр avatar харагдана.") + "</span>" +
        '<span class="row"><label class="btn btn-secondary btn-sm"><input type="file" accept="image/*" class="sr-only" id="em-file"><i data-lucide="camera"></i>' + (e.photo ? "Солих" : "Зураг оруулах") + "</label>" +
        (e.photo ? '<button type="button" class="btn btn-ghost btn-sm danger-text" id="em-photo-del"><i data-lucide="trash-2"></i>Устгах</button>' : "") + "</span></div>";
      UI.icons();
    }
    function shrink(src, cb) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement("canvas"), k = Math.min(im.width, im.height);
        c.width = c.height = 240;
        c.getContext("2d").drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, 0, 0, 240, 240);
        cb(c.toDataURL("image/jpeg", 0.82));
      };
      im.src = src;
    }
    m.addEventListener("change", function (ev) {
      if (ev.target.id === "em-file") BZ.readImage(ev.target.files[0], function (src) { shrink(src, function (s) { e.photo = s; drawPhoto(); }); });
    });
    m.addEventListener("click", function (ev) { if (ev.target.closest("#em-photo-del")) { e.photo = ""; drawPhoto(); } });
    drawPhoto();

    m.querySelector('[data-pane="schedule"]').innerHTML = '<p class="xs muted" style="margin-top:0">Салбарын ажлын цагаас гадуур хуваарь тавих боломжгүй. Завсарлагын үед цаг захиалах боломжгүй.</p>' +
      '<div class="sched">' + ORDER.map(function (d) {
        var sc = e.schedule[d], bh = BZ.branch(e.branch).hours[d];
        return '<div class="sched-row" data-sd="' + d + '"><span class="hr-day">' + E.WEEKDAYS[d] + "</span>" + BZ.sw("sd-on-" + d, !!sc, '<span class="sr-only">' + E.WEEKDAYS[d] + " ажиллах</span>") +
          '<div class="sched-times"' + (sc ? "" : " hidden") + ">" +
            '<span class="st-grp"><small>Ажил</small>' + BZ.select("sd-s-" + d, times, sc ? sc.start : "10:00", 'aria-label="Эхлэх"') + "–" + BZ.select("sd-e-" + d, times, sc ? sc.end : "19:00", 'aria-label="Дуусах"') + "</span>" +
            '<span class="st-grp"><small>Завсарлага</small>' + BZ.select("sd-bs-" + d, times, sc ? sc.break[0] : "13:00", 'aria-label="Завсарлага эхлэх"') + "–" + BZ.select("sd-be-" + d, times, sc ? sc.break[1] : "14:00", 'aria-label="Завсарлага дуусах"') + "</span></div>" +
          '<span class="hr-closed xs muted"' + (sc ? " hidden" : "") + ">" + (bh ? "Амарна" : "Салбар амарна") + "</span></div>";
      }).join("") + '</div><p class="error-text standalone" id="sd-err"></p>';

    function drawOff() {
      var today = BIZ.day(0);
      var list = e.off.slice().sort(function (a, b) { return a.from < b.from ? -1 : 1; });
      m.querySelector('[data-pane="off"]').innerHTML =
        '<div class="off-form"><div class="form-grid three">' +
          BZ.field("of-from", "Эхлэх", BZ.input("of-from", today, "date", 'min="' + today + '"'), "", true) +
          BZ.field("of-to", "Дуусах", BZ.input("of-to", today, "date", 'min="' + today + '"'), "", true) +
          BZ.field("of-reason", "Шалтгаан", BZ.select("of-reason", [["Чөлөө", "Чөлөө"], ["Ээлжийн амралт", "Ээлжийн амралт"], ["Өвчтэй", "Өвчтэй"], ["Сургалт", "Сургалт"], ["Бусад", "Бусад"]], "Чөлөө")) +
        '</div><button type="button" class="btn btn-secondary btn-sm" id="of-add"><i data-lucide="plus"></i>Чөлөө нэмэх</button></div>' +
        '<h4 class="form-sec">Бүртгэлтэй чөлөө</h4>' +
        (list.length ? '<ul class="off-list">' + list.map(function (o) {
          var past = o.to < today, cnt = S().bookings.filter(function (b) { return b.employeeId === e.id && b.date >= o.from && b.date <= o.to && ["confirmed", "pending_payment"].indexOf(b.status) > -1; }).length;
          return '<li class="' + (past ? "is-past" : "") + '"><i data-lucide="calendar-x"></i><div class="grow"><b>' + o.from + (o.to !== o.from ? " – " + o.to : "") + "</b><span class='xs muted'>" + o.reason + (past ? " · өнгөрсөн" : "") + "</span>" +
            (cnt ? '<span class="xs warn-text">Энэ хугацаанд ' + cnt + " захиалга байна. Өөр ажилтан руу шилжүүлнэ үү.</span>" : "") + "</div>" +
            (past ? "" : '<button type="button" class="icon-btn plain" data-off-del="' + e.off.indexOf(o) + '" aria-label="Чөлөө устгах"><i data-lucide="trash-2"></i></button>') + "</li>";
        }).join("") + "</ul>" : '<p class="xs muted">Чөлөө бүртгэгдээгүй.</p>');
      UI.icons();
    }
    drawOff();

    m.querySelector('[data-pane="perms"]').innerHTML =
      '<fieldset class="field"><legend>Эрхийн түвшин</legend><div class="radio-cards">' +
        '<label class="radio-card"><input type="radio" name="em-access" value="staff"' + (e.access === "staff" ? " checked" : "") + '><span><b>Ажилтан</b><small>Зөвхөн өөрийн хуваарь, захиалга</small></span></label>' +
        '<label class="radio-card"><input type="radio" name="em-access" value="manager"' + (e.access === "manager" ? " checked" : "") + '><span><b>Менежер</b><small>Салбарын захиалга, хуваарь, тайлан</small></span></label>' +
      "</div></fieldset>" +
      '<h4 class="form-sec">Нарийвчилсан эрх</h4><ul class="perm-list">' + PERMS.map(function (p) {
        return '<li><div class="grow"><b>' + p[1] + '</b><span class="xs muted">' + p[2] + "</span></div>" + BZ.sw("pm-" + p[0], e.perms[p[0]], '<span class="sr-only">' + p[1] + "</span>") + "</li>";
      }).join("") + "</ul>" +
      '<p class="note"><i data-lucide="key-round"></i>Ажилтан ' + (e.email || "имэйл хаягаараа") + " Ажилтны интерфейст нэвтэрнэ. Салоны тохиргоо, үнэ, нэхэмжлэхийг зөвхөн эзэмшигч өөрчилнө.</p>";

    function show(t) {
      m.querySelectorAll("[data-etab]").forEach(function (b) { b.setAttribute("aria-selected", b.dataset.etab === t); });
      m.querySelectorAll(".etab").forEach(function (p) { p.hidden = p.dataset.pane !== t; });
    }
    show(tab); UI.icons();

    m.addEventListener("click", function (ev) {
      var t;
      if ((t = ev.target.closest("[data-etab]"))) show(t.dataset.etab);
      if ((t = ev.target.closest("[data-off-del]"))) { e.off.splice(+t.dataset.offDel, 1); drawOff(); UI.toast("Чөлөө хасагдлаа. Хадгалахаа мартуузай.", "info"); }
      if (ev.target.closest("#of-add")) {
        var f = BZ.val("of-from"), to = BZ.val("of-to");
        var ok = BZ.setErr("of-from", !f ? "Огноо сонгоно уу" : "");
        ok = BZ.setErr("of-to", !to ? "Огноо сонгоно уу" : to < f ? "Дуусах огноо эхлэхээс хойш байх ёстой" : "") && ok;
        if (ok && e.off.some(function (o) { return f <= o.to && o.from <= to; })) ok = BZ.setErr("of-to", "Энэ хугацаанд чөлөө бүртгэлтэй байна");
        if (!ok) return;
        e.off.push({ from: f, to: to, reason: BZ.val("of-reason") }); drawOff();
        UI.toast("Чөлөө нэмэгдлээ. Хадгалах товчийг дарна уу.", "info");
      }
    });
    m.addEventListener("change", function (ev) {
      var on = ev.target.id && ev.target.id.match(/^sd-on-(\d)$/);
      if (on) { var row = m.querySelector('[data-sd="' + on[1] + '"]'); row.querySelector(".sched-times").hidden = !ev.target.checked; row.querySelector(".hr-closed").hidden = ev.target.checked; }
      if (ev.target.id === "em-branch") { e.branch = ev.target.value; e.services = []; m.querySelector("#em-svcs").innerHTML = svcChecks(); }
      if (ev.target.name === "em-access") {
        var mgr = ev.target.value === "manager";
        ["allBookings", "editSchedule", "reports"].forEach(function (k) { m.querySelector("#pm-" + k).checked = mgr; });
      }
    });
    var stBtn = m.querySelector("#em-status");
    if (stBtn) stBtn.addEventListener("click", function () {
      if (src.status === "active") {
        var up = S().bookings.filter(function (b) { return b.employeeId === src.id && b.date >= BIZ.day(0) && ["confirmed", "pending_payment"].indexOf(b.status) > -1; }).length;
        UI.confirm({ title: src.name + "-г идэвхгүй болгох уу?", text: "Үйлчлүүлэгчид энэ ажилтныг сонгох боломжгүй болж, ажилтны интерфейст нэвтрэх эрх хаагдана." + (up ? " Ирэх " + up + " захиалгыг өөр ажилтан руу шилжүүлэх шаардлагатай." : ""), confirmLabel: "Идэвхгүй болгох" }, function () {
          src.status = "inactive"; BIZ.save(); UI.closeModal("emp-modal"); UI.toast(src.name + " идэвхгүй боллоо", "info"); BZ.refresh();
        });
      } else { src.status = "active"; BIZ.save(); UI.closeModal("emp-modal"); UI.toast(src.name + " идэвхжлээ", "success"); BZ.refresh(); }
    });

    m.querySelector("#em-save").addEventListener("click", function () {
      /* info */
      var ok = BZ.setErr("em-name", BZ.val("em-name").length < 2 ? "Нэрээ оруулна уу" : "");
      ok = BZ.setErr("em-role", !BZ.val("em-role") ? "Албан тушаал оруулна уу" : "") && ok;
      ok = BZ.setErr("em-phone", BZ.val("em-phone").replace(/\D/g, "").length !== 8 ? "Утас 8 оронтой байна" : "") && ok;
      ok = BZ.setErr("em-email", !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(BZ.val("em-email")) ? "Имэйл хаяг буруу байна" : "") && ok;
      var svcs = [].map.call(m.querySelectorAll("[data-es]:checked"), function (c) { return c.dataset.es; });
      var se = m.querySelector("#em-svc-err"); se.textContent = svcs.length ? "" : "Дор хаяж нэг үйлчилгээ сонгоно уу"; se.closest(".field").classList.toggle("has-error", !svcs.length);
      if (!ok || !svcs.length) { show("info"); BZ.firstError(); return; }
      /* schedule */
      var sched = {}, err = "", br = BZ.branch(BZ.val("em-branch"));
      ORDER.forEach(function (d) {
        if (!m.querySelector("#sd-on-" + d).checked) { sched[d] = null; return; }
        var s = BZ.val("sd-s-" + d), en = BZ.val("sd-e-" + d), bs = BZ.val("sd-bs-" + d), be = BZ.val("sd-be-" + d), bh = br.hours[d], n = E.WEEKDAYS[d];
        if (!bh) err = err || n + ": салбар амардаг өдөр хуваарь тавих боломжгүй";
        else if (s >= en) err = err || n + ": дуусах цаг эхлэх цагаас хойш байх ёстой";
        else if (s < bh[0] || en > bh[1]) err = err || n + ": салбарын цаг " + bh[0] + "–" + bh[1] + " дотор байх ёстой";
        else if (bs >= be || bs < s || be > en) err = err || n + ": завсарлага ажлын цаг дотор, эхлэхээс дуусах нь хойш байх ёстой";
        sched[d] = { start: s, end: en, break: [bs, be] };
      });
      var sErr = m.querySelector("#sd-err"); sErr.textContent = err; sErr.style.display = err ? "block" : "none";
      if (err) { show("schedule"); return; }
      /* save */
      var name = BZ.val("em-name");
      e.name = name; e.role = BZ.val("em-role"); e.phone = BZ.val("em-phone"); e.email = BZ.val("em-email"); e.branch = br.id; e.years = +BZ.val("em-years") || 0;
      e.services = svcs; e.schedule = sched; e.initials = name.split(/\s+/).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase();
      e.access = m.querySelector('[name="em-access"]:checked').value;
      PERMS.forEach(function (p) { e.perms[p[0]] = BZ.val("pm-" + p[0]); });
      if (isNew) S().employees.push(e); else Object.assign(src, e);
      BIZ.save(); UI.closeModal("emp-modal");
      UI.toast(isNew ? name + " нэмэгдлээ. " + e.email + " хаягаар ажилтны интерфейст нэвтэрнэ." : "Ажилтны мэдээлэл хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  document.addEventListener("click", function (ev) {
    var t;
    if (ev.target.closest("[data-emp-new]")) edit(null);
    else if ((t = ev.target.closest("[data-emp-edit]"))) edit(t.dataset.empEdit, t.dataset.tab);
  });
  var qt;
  document.addEventListener("input", function (ev) {
    if (ev.target.id !== "emp-q") return;
    clearTimeout(qt); qt = setTimeout(function () {
      st.q = ev.target.value.trim(); BZ.refresh();
      var q = document.getElementById("emp-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }, 250);
  });

  BZ.page("employees", render);
})();
