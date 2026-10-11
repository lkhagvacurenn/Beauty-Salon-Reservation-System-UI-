/* =========================================================
   Bloom platform admin: review moderation (10.5, FR-36)
   Reports come from salons (owner "Админд мэдэгдэх") or the
   automatic filter. Only the platform admin can delete.
   ========================================================= */
(function () {
  var st = { tab: "reported", salon: "all", rating: "all", q: "" };
  var STATUS = { published: ["Нийтлэгдсэн", "success"], reported: ["Мэдэгдсэн", "warning"], hidden: ["Нуусан", "info"] };

  function render() {
    var el = BZ.el("reviews"), all = ADM.allReviews();
    var n = function (s) { return all.filter(function (r) { return s === "all" || r.status === s; }).length; };
    var list = all.filter(function (r) {
      if (st.tab !== "all" && r.status !== st.tab) return false;
      if (st.salon !== "all" && r.salonId !== st.salon) return false;
      if (st.rating !== "all" && r.rating !== +st.rating) return false;
      if (st.q && (r.text + " " + r.author + " " + r.service).toLowerCase().indexOf(st.q.toLowerCase()) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
    var avg = all.length ? all.reduce(function (s, r) { return s + r.rating; }, 0) / all.length : 0;

    el.innerHTML =
      '<div class="page-head"><div><h2>Сэтгэгдэл хянах</h2><p>Зөвхөн дууссан захиалгад үлдээсэн сэтгэгдэл. Үйлчлүүлэгч зөвхөн өөрийн сэтгэгдлийг устгана, салон устгах эрхгүй. Админ аль ч сэтгэгдлийг устгана.</p></div></div>' +
      '<div class="kpi-grid">' +
        AD.kpi("Нийт сэтгэгдэл", all.length, "Бүх салон") + AD.kpi("Дундаж үнэлгээ", avg.toFixed(1) + " / 5", "Платформын дундаж") +
        AD.kpi("Шийдвэр хүлээж буй", n("reported"), "Мэдэгдсэн сэтгэгдэл") + AD.kpi("Нуусан", n("hidden"), "Үйлчлүүлэгчдэд харагдахгүй") +
      "</div>" +
      '<div class="tab-row">' + BZ.tabs("rvtab", [["reported", "Мэдэгдсэн (" + n("reported") + ")", "flag"], ["published", "Нийтлэгдсэн", "message-square"], ["hidden", "Нуусан", "eye-off"], ["all", "Бүгд"]], st.tab) + "</div>" +
      '<div class="adm-filters">' +
        '<label class="input-icon grow-sm"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="ar-q" type="search" placeholder="Сэтгэгдэл, нэр, үйлчилгээ" value="' + BZ.esc(st.q) + '"></label>' +
        '<label class="inline-select"><i data-lucide="store"></i><span class="sr-only">Салон</span>' + BZ.select("ar-salon", AD.salonOptions(), st.salon) + "</label>" +
        '<label class="inline-select"><i data-lucide="star"></i><span class="sr-only">Үнэлгээ</span>' + BZ.select("ar-rating", [["all", "Бүх үнэлгээ"], ["5", "5 од"], ["4", "4 од"], ["3", "3 од"], ["2", "2 од"], ["1", "1 од"]], st.rating) + "</label>" +
      "</div>" +
      (list.length ? '<div class="rv-list">' + list.map(card).join("") + "</div>" :
        BZ.empty(st.tab === "reported" ? "shield-check" : "message-square", st.tab === "reported" ? "Шийдвэр хүлээж буй сэтгэгдэл алга" : "Сэтгэгдэл олдсонгүй", st.tab === "reported" ? "Салон эсвэл автомат шүүлтүүр мэдэгдэхэд энд харагдана." : "Шүүлтүүрээ өөрчилнө үү."));
  }

  function card(r) {
    var s = STATUS[r.status];
    return '<article class="card rv-card' + (r.status === "reported" ? " is-flagged" : "") + '"><div class="rv-head"><span class="avatar">' + AD.initials(r.author) + "</span>" +
        '<div class="grow"><b>' + BZ.esc(r.author) + '</b><span class="xs muted">' + AD.salonName(r.salonId) + " · " + r.date + " · " + BZ.esc(r.service) + "</span></div>" + BZ.stars(r.rating) + "</div>" +
      "<p>" + BZ.esc(r.text) + "</p>" +
      (r.report ? '<div class="report-box"><i data-lucide="flag"></i><div><b>' + BZ.esc(r.report.reason) + '</b><span class="xs muted">Мэдэгдсэн: ' + BZ.esc(r.report.by) + " · " + r.report.date + "</span>" +
        (r.report.note ? '<span class="xs">“' + BZ.esc(r.report.note) + "”</span>" : "") + "</div></div>" : "") +
      '<div class="rv-foot"><span class="badge badge-' + s[1] + '">' + s[0] + "</span><span class='rv-acts'>" +
        (r.status === "reported" ? btn("keep", r.id, "check", "Хэвээр үлдээх") + btn("hide", r.id, "eye-off", "Нуух") :
          r.status === "hidden" ? btn("restore", r.id, "eye", "Сэргээх") : btn("hide", r.id, "eye-off", "Нуух")) +
        '<button type="button" class="btn btn-ghost btn-sm danger-text" data-rv-act="delete" data-id="' + r.id + '"><i data-lucide="trash-2"></i>Устгах</button></span></div></article>';
  }
  function btn(act, id, icon, label) { return '<button type="button" class="btn btn-secondary btn-sm" data-rv-act="' + act + '" data-id="' + id + '"><i data-lucide="' + icon + '"></i>' + label + "</button>"; }
  function find(id) { return ADM.allReviews().filter(function (r) { return r.id === id; })[0]; }

  function act(a, id) {
    var r = find(id), who = r.author + " (" + AD.salonName(r.salonId) + ")";
    if (a === "keep") { ADM.setReview(id, { status: "published", report: null }); done("Сэтгэгдлийг хэвээр үлдээлээ", "check", who + "-ийн сэтгэгдлийн мэдэгдлийг хааж, хэвээр үлдээлээ"); }
    else if (a === "hide") { ADM.setReview(id, { status: "hidden" }); done("Сэтгэгдлийг нууллаа", "eye-off", who + "-ийн сэтгэгдлийг нууллаа"); }
    else if (a === "restore") { ADM.setReview(id, { status: "published", report: null }); done("Сэтгэгдэл дахин нийтлэгдлээ", "eye", who + "-ийн сэтгэгдлийг сэргээлээ"); }
    else if (a === "delete") {
      UI.confirm({ title: "Сэтгэгдлийг устгах уу?", text: "“" + r.text.slice(0, 80) + (r.text.length > 80 ? "…" : "") + "” устгагдана. Энэ үйлдлийг буцаах боломжгүй.", confirmLabel: "Устгах" }, function () {
        var biz = BIZ.state.reviews, i = biz.map(function (x) { return x.id; }).indexOf(id);
        if (i > -1) { biz.splice(i, 1); BIZ.save(); }
        else ADM.state.reviews = ADM.state.reviews.filter(function (x) { return x.id !== id; });
        done("Сэтгэгдэл устгагдлаа", "trash-2", who + "-ийн сэтгэгдлийг устгалаа");
      });
    }
    function done(msg, icon, log) { ADM.log(icon, log); UI.toast(msg, "success"); BZ.refresh(); }
  }

  document.addEventListener("click", function (e) {
    var t;
    if ((t = e.target.closest("[data-rvtab]"))) { st.tab = t.dataset.rvtab; BZ.refresh(); }
    else if ((t = e.target.closest("[data-rv-act]"))) act(t.dataset.rvAct, t.dataset.id);
  });
  document.addEventListener("change", function (e) {
    if (e.target.id === "ar-salon") { st.salon = e.target.value; BZ.refresh(); }
    if (e.target.id === "ar-rating") { st.rating = e.target.value; BZ.refresh(); }
  });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "ar-q") return;
    clearTimeout(qt); qt = setTimeout(function () { st.q = e.target.value.trim(); BZ.refresh(); AD.refocus("ar-q"); }, 250);
  });

  BZ.page("reviews", render);
})();
