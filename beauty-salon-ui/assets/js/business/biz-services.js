/* =========================================================
   Business owner: services (8.3, FR-19)
   List, add / edit, category, description, image, per-branch
   price, duration, deposit, cancellation rule, active toggle.
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA;
  var st = { q: "", cat: "all", status: "all" };
  var DURS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];
  function S() { return BZ.S(); }

  function render(params) {
    params = params || {};
    var el = BZ.el("services");
    var cm = BZ.currentMonth();
    var list = S().services.filter(function (x) {
      if (BZ.branchFilter !== "all" && x.branches.indexOf(BZ.branchFilter) === -1) return false;
      if (st.cat !== "all" && x.cat !== st.cat) return false;
      if (st.status !== "all" && (st.status === "active") !== x.active) return false;
      if (st.q && x.name.toLowerCase().indexOf(st.q.toLowerCase()) === -1) return false;
      return true;
    });
    var cats = S().salon.cats;

    el.innerHTML =
      '<div class="page-head"><div><h2>Үйлчилгээ</h2><p>Үнэ салбар бүрээр, хугацаа, урьдчилгаа, цуцлалтын нөхцөл</p></div>' +
        '<button type="button" class="btn btn-primary" data-svc-new><i data-lucide="plus"></i>Үйлчилгээ нэмэх</button></div>' +
      '<div class="biz-toolbar wrap">' +
        '<label class="input-icon grow-sm"><i data-lucide="search"></i><span class="sr-only">Хайх</span><input class="input" id="svc-q" type="search" placeholder="Үйлчилгээ хайх" value="' + BZ.esc(st.q) + '"></label>' +
        '<label class="inline-select"><i data-lucide="tag"></i><span class="sr-only">Ангилал</span>' + BZ.select("svc-cat", [["all", "Бүх ангилал"]].concat(cats.map(function (c) { return [c, BZ.catName(c)]; })), st.cat) + "</label>" +
        BZ.branchSelect("svc-branch") +
        '<div class="chips" role="group" aria-label="Төлөв">' + [["all", "Бүгд"], ["active", "Идэвхтэй"], ["inactive", "Идэвхгүй"]].map(function (x) {
          return '<button type="button" class="chip" data-svc-status="' + x[0] + '" aria-pressed="' + (st.status === x[0]) + '">' + x[1] + "</button>";
        }).join("") + "</div>" +
      "</div>" +
      BZ.table([{ label: "Үйлчилгээ", cls: "t-main" }, "Хугацаа", "Үнэ (салбараар)", "Урьдчилгаа", "Цуцлалт", "Энэ сар", "Идэвхтэй", { label: "", cls: "t-act" }], list.map(function (x) {
        var n = S().bookings.filter(function (b) { return b.date.slice(0, 7) === cm && b.serviceIds.indexOf(x.id) > -1 && b.status !== "cancelled"; }).length;
        return { attrs: x.active ? "" : 'class="row-muted"', cells: [
          '<div class="svc-cell">' + BZ.img(x.image, x.name, "thumb") + "<div><b>" + BZ.esc(x.name) + '</b><span class="cell-sub">' + BZ.catName(x.cat) + "</span></div></div>",
          x.duration + " мин",
          '<div class="price-list">' + x.branches.map(function (id) { var br = BZ.branch(id); return "<span>" + (br ? br.name.replace(" салбар", "") : id) + " <b>" + BZ.money(x.prices[id]) + "</b></span>"; }).join("") + "</div>",
          x.deposit ? BZ.money(x.deposit) : '<span class="muted">Үгүй</span>',
          x.cancellable ? x.cancelHours + " цагийн өмнө" : '<span class="muted">Цуцлах боломжгүй</span>',
          n + " захиалга",
          '<label class="switch"><input type="checkbox" data-svc-active="' + x.id + '"' + (x.active ? " checked" : "") + '><span class="track"></span><span class="sr-only">' + x.name + " идэвхтэй</span></label>",
          '<button type="button" class="btn btn-secondary btn-sm" data-svc-edit="' + x.id + '"><i data-lucide="pencil"></i>Засах</button>'] };
      }), { empty: BZ.empty("sparkles", "Үйлчилгээ олдсонгүй", "Шүүлтүүрээ өөрчлөх эсвэл шинэ үйлчилгээ нэмнэ үү.", '<button type="button" class="btn btn-primary btn-sm" data-svc-new>Үйлчилгээ нэмэх</button>') });

    if (params.new) { history.replaceState(null, "", "#/services"); edit(null); }
  }

  function edit(id) {
    var isNew = !id;
    var x = isNew ? { id: BZ.uid("s"), name: "", cat: S().salon.cats[0], duration: 60, deposit: 0, cancellable: true, cancelHours: 24, active: true, branches: [], prices: {}, image: "", description: "" } : BZ.service(id);
    var image = x.image;
    var branches = S().branches.map(function (b) {
      var on = x.branches.indexOf(b.id) > -1;
      return '<div class="bp-row"><label class="check"><input type="checkbox" data-bp="' + b.id + '"' + (on ? " checked" : "") + ">" + b.name + (b.active ? "" : ' <span class="badge no-dot">Идэвхгүй</span>') + "</label>" +
        '<div class="input-suffix"><input class="input" type="number" min="0" step="500" inputmode="numeric" id="bp-' + b.id + '" value="' + (x.prices[b.id] || "") + '" placeholder="Үнэ"' + (on ? "" : " disabled") + ' aria-label="' + b.name + ' үнэ"><span>₮</span></div></div>';
    }).join("");
    var body =
      '<div class="svc-form-top"><div class="svc-img-pick" id="sv-img"></div><div class="grow">' +
        BZ.field("sv-name", "Үйлчилгээний нэр", BZ.input("sv-name", x.name, "text", 'placeholder="Жишээ: Эрэгтэй үс засалт"'), "", true) +
        '<div class="form-grid" style="margin-top:var(--sp-3)">' +
          BZ.field("sv-cat", "Ангилал", BZ.select("sv-cat", D.CATEGORIES.map(function (c) { return [c.id, c.name]; }), x.cat), "", true) +
          BZ.field("sv-dur", "Үргэлжлэх хугацаа", BZ.select("sv-dur", DURS.map(function (d) { return [d, d + " мин"]; }), x.duration), "Цаг захиалах нүдэнд ашиглагдана", true) +
        "</div></div></div>" +
      BZ.field("sv-desc", "Тайлбар", '<textarea class="textarea" id="sv-desc" maxlength="300" placeholder="Юу багтдаг, хэнд тохиромжтой гэх мэт">' + BZ.esc(x.description) + "</textarea>", "300 тэмдэгт хүртэл") +
      '<h4 class="form-sec">Салбар ба үнэ</h4><p class="xs muted" style="margin-top:-6px">Салбар бүр өөр үнэтэй байж болно.</p><div class="bp-list" id="sv-bp">' + branches + '</div><p class="error-text standalone" id="sv-bp-err"></p>' +
      '<h4 class="form-sec">Урьдчилгаа ба цуцлалт</h4><div class="form-grid">' +
        BZ.field("sv-dep", "Урьдчилгаа төлбөр", '<div class="input-suffix"><input class="input" type="number" min="0" step="1000" id="sv-dep" value="' + x.deposit + '"><span>₮</span></div>', "0 бол урьдчилгаагүй, үйлчлүүлэгч салонд төлнө") +
        '<div class="field"><span class="label-like">Цуцлах боломж</span>' + BZ.sw("sv-cancel", x.cancellable, "Үйлчлүүлэгч цуцалж болно") + "</div>" +
        BZ.field("sv-ch", "Цуцлах хугацаа", BZ.select("sv-ch", [[2, "2 цагийн өмнө"], [6, "6 цагийн өмнө"], [12, "12 цагийн өмнө"], [24, "24 цагийн өмнө"], [48, "48 цагийн өмнө"]], x.cancelHours, x.cancellable ? "" : "disabled"), "Үүнээс хойш цуцлах боломжгүй") +
        '<div class="field"><span class="label-like">Төлөв</span>' + BZ.sw("sv-active", x.active, "Идэвхтэй (захиалга авна)") + "</div>" +
      "</div>" +
      '<p class="note"><i data-lucide="info"></i>Урьдчилгаа цуцлагдсан тохиолдолд автоматаар буцаагдахгүй. Буцаах эсэхийг салон шийднэ.</p>' +
      '<div class="modal-foot">' + (isNew ? "" : '<button type="button" class="btn btn-ghost danger-text" id="sv-del"><i data-lucide="trash-2"></i>Устгах</button><span class="spacer"></span>') +
        '<button type="button" class="btn btn-secondary" data-close-modal>Болих</button><button type="button" class="btn btn-primary" id="sv-save">' + (isNew ? "Нэмэх" : "Хадгалах") + "</button></div>";
    var m = BZ.modal("svc-modal", isNew ? "Шинэ үйлчилгээ" : "Үйлчилгээ засах", body, { size: "modal-lg" });

    function drawImg() {
      m.querySelector("#sv-img").innerHTML = BZ.img(image, "Үйлчилгээний зураг") +
        '<label class="img-change"><input type="file" accept="image/*" class="sr-only" id="sv-file"><i data-lucide="camera"></i><span class="sr-only">Зураг солих</span></label>';
      UI.icons();
    }
    drawImg();
    m.addEventListener("change", function (e) {
      if (e.target.id === "sv-file") BZ.readImage(e.target.files[0], function (src) { image = src; drawImg(); });
      if (e.target.dataset.bp) { var inp = m.querySelector("#bp-" + e.target.dataset.bp); inp.disabled = !e.target.checked; if (e.target.checked) inp.focus(); }
      if (e.target.id === "sv-cancel") m.querySelector("#sv-ch").disabled = !e.target.checked;
    });
    var del = m.querySelector("#sv-del");
    if (del) del.addEventListener("click", function () {
      var used = S().bookings.some(function (b) { return b.serviceIds.indexOf(x.id) > -1 && b.date >= BIZ.day(0) && ["confirmed", "pending_payment"].indexOf(b.status) > -1; });
      if (used) { UI.toast("Ирэх захиалгатай тул устгах боломжгүй. Идэвхгүй болгоно уу.", "error"); return; }
      UI.confirm({ title: x.name + "-ийг устгах уу?", text: "Өмнөх захиалгын түүх хадгалагдана. Энэ үйлдлийг буцаах боломжгүй.", confirmLabel: "Устгах" }, function () {
        S().services.splice(S().services.indexOf(x), 1); S().employees.forEach(function (e) { e.services = e.services.filter(function (s) { return s !== x.id; }); });
        BIZ.save(); UI.closeModal("svc-modal"); UI.toast("Үйлчилгээ устгагдлаа", "info"); BZ.refresh();
      });
    });
    m.querySelector("#sv-save").addEventListener("click", function () {
      var ok = BZ.setErr("sv-name", BZ.val("sv-name").length < 2 ? "Нэрээ оруулна уу" : "");
      var dup = S().services.some(function (y) { return y !== x && y.name.toLowerCase() === BZ.val("sv-name").toLowerCase(); });
      if (ok && dup) ok = BZ.setErr("sv-name", "Ийм нэртэй үйлчилгээ бүртгэлтэй байна");
      var br = [], prices = {}, bpErr = "";
      m.querySelectorAll("[data-bp]").forEach(function (c) {
        if (!c.checked) return;
        var p = +m.querySelector("#bp-" + c.dataset.bp).value;
        if (!p || p < 1000) bpErr = BZ.branch(c.dataset.bp).name + "-ын үнийг оруулна уу (1,000₮-өөс их)";
        br.push(c.dataset.bp); prices[c.dataset.bp] = p;
      });
      if (!br.length) bpErr = "Дор хаяж нэг салбар сонгоно уу";
      var bpEl = m.querySelector("#sv-bp-err"); bpEl.textContent = bpErr; bpEl.style.display = bpErr ? "block" : "none";
      var dep = +BZ.val("sv-dep") || 0, minP = Math.min.apply(null, br.map(function (b) { return prices[b] || Infinity; }));
      ok = BZ.setErr("sv-dep", dep < 0 ? "Сөрөг байж болохгүй" : dep && dep >= minP ? "Урьдчилгаа үйлчилгээний үнээс бага байх ёстой" : "") && ok;
      if (!ok || bpErr) { if (!ok) BZ.firstError(); return; }
      x.name = BZ.val("sv-name"); x.cat = BZ.val("sv-cat"); x.duration = +BZ.val("sv-dur"); x.description = BZ.val("sv-desc");
      x.branches = br; x.prices = prices; x.deposit = dep; x.cancellable = BZ.val("sv-cancel"); x.cancelHours = +BZ.val("sv-ch"); x.active = BZ.val("sv-active"); x.image = image;
      if (isNew) S().services.push(x);
      BIZ.save(); UI.closeModal("svc-modal");
      UI.toast(isNew ? "Үйлчилгээ нэмэгдлээ. Ажилтанд оноохоо мартуузай." : "Үйлчилгээ хадгалагдлаа", "success"); BZ.refresh();
    });
  }

  document.addEventListener("click", function (e) {
    var t;
    if (e.target.closest("[data-svc-new]")) edit(null);
    else if ((t = e.target.closest("[data-svc-edit]"))) edit(t.dataset.svcEdit);
    else if ((t = e.target.closest("[data-svc-status]"))) { st.status = t.dataset.svcStatus; BZ.refresh(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.dataset.svcActive) {
      var x = BZ.service(e.target.dataset.svcActive); x.active = e.target.checked; BIZ.save();
      UI.toast(x.name + (x.active ? " идэвхжлээ" : " идэвхгүй боллоо. Үйлчлүүлэгчид харагдахгүй."), x.active ? "success" : "info");
      BZ.refresh();
    }
    if (e.target.id === "svc-cat") { st.cat = e.target.value; BZ.refresh(); }
  });
  var qt;
  document.addEventListener("input", function (e) {
    if (e.target.id !== "svc-q") return;
    clearTimeout(qt); qt = setTimeout(function () {
      st.q = e.target.value.trim(); BZ.refresh();
      var q = document.getElementById("svc-q"); q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }, 250);
  });

  BZ.page("services", render);
})();
