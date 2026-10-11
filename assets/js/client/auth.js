/* =========================================================
   Bloom client: login / sign-up / forgot password  (#/login)
   UI ONLY. No real authentication: the demo password is
   "Bloom2026" and the demo email code is 123456.
   #/login?mode=register&next=bookings
   ========================================================= */
(function () {
  var D = window.BLOOM_DATA, B = window.Bloom;
  var DEMO_PW = "Bloom2026", DEMO_CODE = "123456";
  var st = null, resendTimer = null;

  function reset(params) {
    st = { mode: params.mode || "login", step: "form", next: params.next || "home", email: "", pending: null, error: "", resendIn: 0, values: {} };
  }

  /* ---------- Pieces ---------- */
  function input(id, label, type, ac, extra) {
    extra = extra || {};
    var v = st.values[id] || "";
    return '<div class="field" data-field="' + id + '"><label for="' + id + '">' + label + "</label>" +
      (type === "password"
        ? '<div class="pw-wrap"><input class="input" id="' + id + '" type="password" autocomplete="' + ac + '" value="' + B.esc(v) + '"' + (extra.ph ? ' placeholder="' + extra.ph + '"' : "") + ">" +
          '<button class="icon-btn plain pw-eye" type="button" data-eye="' + id + '" aria-label="Нууц үг харуулах"><i data-lucide="eye"></i></button></div>'
        : '<input class="input" id="' + id + '" type="' + type + '" autocomplete="' + ac + '" value="' + B.esc(v) + '"' + (extra.ph ? ' placeholder="' + extra.ph + '"' : "") + ">") +
      (extra.hint ? '<span class="hint">' + extra.hint + "</span>" : "") + '<span class="error-text"></span></div>';
  }

  function strength(pw) {
    var s = 0;
    if (pw.length >= 8) s++;
    if (/\d/.test(pw) && /[^\d\s]/.test(pw)) s++;
    if (pw.length >= 12 || /[^a-zA-Z0-9а-яА-ЯөүӨҮёЁ]/.test(pw)) s++;
    return s;
  }

  function loginForm() {
    return '<form id="auth-login" novalidate class="stack">' +
      input("lg-id", "Имэйл эсвэл утасны дугаар", "text", "username", { ph: "name@example.mn" }) +
      input("lg-pw", "Нууц үг", "password", "current-password") +
      '<div class="row-between"><label class="check"><input type="checkbox" checked> Намайг сана</label>' +
        '<button class="link-btn" type="button" data-mode="forgot">Нууц үг мартсан?</button></div>' +
      (st.error ? '<p class="alert alert-danger" role="alert"><i data-lucide="circle-alert"></i>' + st.error + "</p>" : "") +
      '<button class="btn btn-primary btn-block btn-lg" type="submit"><i data-lucide="log-in"></i>Нэвтрэх</button>' +
      '<div class="demo-box"><i data-lucide="flask-conical"></i><div><b>Демо хэрэглэгч</b><span>nomin.demo@bloom.mn · ' + DEMO_PW + '</span></div><button class="btn btn-secondary btn-sm" type="button" data-fill>Бөглөх</button></div>' +
      '<p class="small center">Бүртгэлгүй юу? <button class="link-btn" type="button" data-mode="register">Бүртгүүлэх</button></p>' +
    "</form>";
  }

  function registerForm() {
    var pw = st.values["rg-pw"] || "", sc = strength(pw);
    return '<form id="auth-register" novalidate class="stack">' +
      '<div class="grid grid-2">' + input("rg-first", "Нэр", "text", "given-name") + input("rg-last", "Овог", "text", "family-name") + "</div>" +
      input("rg-phone", "Утасны дугаар", "tel", "tel", { ph: "9911-2233" }) +
      input("rg-email", "Имэйл", "email", "email", { ph: "name@example.mn", hint: "Энэ хаяг руу 6 оронтой баталгаажуулах код илгээнэ." }) +
      input("rg-pw", "Нууц үг", "password", "new-password") +
      '<div class="pw-meter" aria-hidden="true"><span class="' + (sc > 0 ? "on s" + sc : "") + '"></span><span class="' + (sc > 1 ? "on s" + sc : "") + '"></span><span class="' + (sc > 2 ? "on s" + sc : "") + '"></span>' +
        '<small id="pw-label">' + (pw ? ["Сул", "Сул", "Дунд", "Хүчтэй"][sc] : "8+ тэмдэгт, үсэг болон тоо") + "</small></div>" +
      input("rg-pw2", "Нууц үг давтах", "password", "new-password") +
      '<div class="field" data-field="rg-terms"><label class="check"><input type="checkbox" id="rg-terms"' + (st.values["rg-terms"] ? " checked" : "") + '> <span><a href="#/login?mode=register" data-terms>Үйлчилгээний нөхцөл</a>, нууцлалын бодлогыг зөвшөөрч байна</span></label><span class="error-text"></span></div>' +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Бүртгүүлэх</button>' +
      '<p class="small center">Бүртгэлтэй юу? <button class="link-btn" type="button" data-mode="login">Нэвтрэх</button></p>' +
    "</form>";
  }

  function forgotForm() {
    return '<form id="auth-forgot" novalidate class="stack">' +
      '<p class="small muted">Бүртгэлтэй имэйлээ оруулбал нууц үг сэргээх код илгээнэ.</p>' +
      input("fg-email", "Имэйл", "email", "email", { ph: "name@example.mn" }) +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Код илгээх</button>' +
      '<p class="small center"><button class="link-btn" type="button" data-mode="login"><i data-lucide="arrow-left" class="icon-sm"></i> Нэвтрэх рүү буцах</button></p>' +
    "</form>";
  }

  function otpForm() {
    return '<form id="auth-otp" novalidate class="stack">' +
      '<div class="otp-icon"><i data-lucide="mail-check"></i></div>' +
      '<p class="small center"><b>' + B.esc(st.email) + "</b> хаяг руу 6 оронтой код илгээлээ. Код 10 минут хүчинтэй.</p>" +
      '<div class="otp" role="group" aria-label="Баталгаажуулах код">' + [0, 1, 2, 3, 4, 5].map(function (i) {
        return '<input class="input otp-cell' + (st.error ? " is-invalid" : "") + '" inputmode="numeric" maxlength="1" autocomplete="' + (i === 0 ? "one-time-code" : "off") + '" aria-label="' + (i + 1) + '-р орон" data-otp="' + i + '">';
      }).join("") + "</div>" +
      (st.error ? '<p class="field-msg err center" role="alert"><i data-lucide="circle-alert" class="icon-sm"></i> ' + st.error + "</p>" : "") +
      '<p class="demo-note"><i data-lucide="flask-conical"></i><span>Демо код: <b>' + DEMO_CODE + "</b> (имэйл бодитоор илгээгдэхгүй)</span></p>" +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Баталгаажуулах</button>' +
      '<p class="small center">Код ирээгүй юу? ' + (st.resendIn > 0 ? '<span class="muted" id="resend-in">' + st.resendIn + " секундын дараа дахин илгээнэ</span>" : '<button class="link-btn" type="button" data-resend>Дахин илгээх</button>') + "</p>" +
      '<p class="small center"><button class="link-btn" type="button" data-otp-back><i data-lucide="arrow-left" class="icon-sm"></i> Имэйл засах</button></p>' +
    "</form>";
  }

  function newPwForm() {
    return '<form id="auth-newpw" novalidate class="stack">' +
      input("np-pw", "Шинэ нууц үг", "password", "new-password", { hint: "8+ тэмдэгт, үсэг болон тоо агуулсан." }) +
      input("np-pw2", "Шинэ нууц үг давтах", "password", "new-password") +
      '<button class="btn btn-primary btn-block btn-lg" type="submit">Нууц үг шинэчлэх</button></form>';
  }

  function doneView() {
    return '<div class="stack center"><div class="otp-icon ok"><i data-lucide="circle-check"></i></div>' +
      "<p>Нууц үг шинэчлэгдлээ. Шинэ нууц үгээрээ нэвтэрнэ үү.</p>" +
      '<button class="btn btn-primary btn-block" type="button" data-mode="login">Нэвтрэх</button></div>';
  }

  /* ---------- Render ---------- */
  var TITLES = {
    login: ["Тавтай морил", "Захиалгаа удирдах, салоноо хадгалахын тулд нэвтэрнэ үү."],
    register: ["Бүртгүүлэх", "Хэдхэн алхмаар бүртгүүлээд цагаа захиалаарай."],
    forgot: ["Нууц үг сэргээх", ""]
  };
  function render() {
    var el = document.querySelector('[data-page="login"]');
    if (Session.isLoggedIn() && st.step === "form" && st.mode !== "forgot") {
      el.innerHTML = '<div class="empty"><div class="empty-icon"><i data-lucide="user-check"></i></div><h3>Та нэвтэрсэн байна</h3><p>' + B.esc(Session.user().name) + " нэрээр нэвтэрсэн.</p>" +
        '<div class="row-wrap center"><a class="btn btn-primary btn-sm" href="#/' + st.next + '">Үргэлжлүүлэх</a><button class="btn btn-ghost btn-sm" type="button" data-auth-logout>Өөр хэрэглэгчээр нэвтрэх</button></div></div>';
      UI.icons(); return;
    }
    var body, title = TITLES[st.mode][0], sub = TITLES[st.mode][1];
    if (st.step === "otp") { body = otpForm(); title = "Имэйлээ баталгаажуулна уу"; sub = ""; }
    else if (st.step === "newpw") { body = newPwForm(); title = "Шинэ нууц үг"; sub = ""; }
    else if (st.step === "done") { body = doneView(); sub = ""; }
    else body = st.mode === "register" ? registerForm() : st.mode === "forgot" ? forgotForm() : loginForm();

    el.innerHTML =
      '<div class="auth">' +
        '<aside class="auth-art"><div class="auth-art-inner">' + UI.logo({ href: "#/home" }) +
          '<h2 class="display">Гоо сайхны цагаа<br><em>хэдхэн товшилтоор</em></h2>' +
          '<ul><li><i data-lucide="search"></i>Ойролцоох салон, сул цагийг нэг дороос</li><li><i data-lucide="timer"></i>Хямдралтай цаг, промо кодын хөнгөлөлт</li><li><i data-lucide="calendar-check"></i>Захиалгаа хаанаас ч удирдах</li></ul>' +
          '<span class="auth-petal p1"></span><span class="auth-petal p2"></span></div></aside>' +
        '<section class="auth-card card">' +
          (st.mode !== "forgot" && st.step === "form" ? '<div class="segmented auth-tabs" role="tablist"><button type="button" role="tab" aria-selected="' + (st.mode === "login") + '" data-mode="login">Нэвтрэх</button><button type="button" role="tab" aria-selected="' + (st.mode === "register") + '" data-mode="register">Бүртгүүлэх</button></div>' : "") +
          '<h1 class="display auth-title">' + title + "</h1>" + (sub ? '<p class="small muted auth-sub">' + sub + "</p>" : "") +
          body +
        "</section>" +
      "</div>";
    UI.icons();
    var first = el.querySelector(st.step === "otp" ? "[data-otp='0']" : ".auth-card input:not([type=checkbox])");
    if (first && window.innerWidth >= 1024) first.focus();
  }

  function setError(id, msg) {
    var el = document.getElementById(id); if (!el) return !msg;
    var f = el.closest(".field");
    f.classList.toggle("has-error", !!msg);
    var et = f.querySelector(".error-text"); if (et) et.textContent = msg || "";
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    return !msg;
  }
  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function remember() {
    document.querySelectorAll(".auth-card input").forEach(function (i) { if (i.id) st.values[i.id] = i.type === "checkbox" ? i.checked : i.value; });
  }
  function isEmail(v) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v); }
  function startResend() {
    st.resendIn = 60; clearInterval(resendTimer);
    resendTimer = setInterval(function () {
      st.resendIn--;
      var el = document.getElementById("resend-in");
      if (st.resendIn <= 0) { clearInterval(resendTimer); if (el) render(); }
      else if (el) el.textContent = st.resendIn + " секундын дараа дахин илгээнэ";
    }, 1000);
  }
  function finishLogin(msg) {
    Session.login(); UI.toast(msg, "success");
    location.hash = "#/" + st.next;
  }

  /* ---------- Events ---------- */
  document.addEventListener("page:show", function (e) {
    if (e.detail.id !== "login") { clearInterval(resendTimer); return; }
    reset(e.detail.params); render();
  });

  document.addEventListener("click", function (e) {
    var page = document.querySelector('[data-page="login"]');
    if (!st || page.hidden || !page.contains(e.target)) return;
    var t;
    if ((t = e.target.closest("[data-mode]"))) { remember(); st.mode = t.dataset.mode; st.step = "form"; st.error = ""; render(); return; }
    if ((t = e.target.closest("[data-eye]"))) {
      var i = document.getElementById(t.dataset.eye), show = i.type === "password";
      i.type = show ? "text" : "password";
      t.setAttribute("aria-label", show ? "Нууц үг нуух" : "Нууц үг харуулах");
      t.innerHTML = '<i data-lucide="' + (show ? "eye-off" : "eye") + '"></i>'; UI.icons(); return;
    }
    if (e.target.closest("[data-fill]")) { document.getElementById("lg-id").value = D.USER.email; document.getElementById("lg-pw").value = DEMO_PW; return; }
    if (e.target.closest("[data-resend]")) { startResend(); render(); UI.toast("Шинэ код илгээлээ (демо: " + DEMO_CODE + ")", "info"); return; }
    if (e.target.closest("[data-otp-back]")) { st.step = "form"; st.error = ""; render(); return; }
    if (e.target.closest("[data-terms]")) { e.preventDefault(); UI.toast("Үйлчилгээний нөхцөлийн хуудас (демо)", "info"); return; }
    if (e.target.closest("[data-auth-logout]")) { Session.logout(); render(); }
  });

  /* OTP cells: auto-advance, backspace, paste */
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.otp != null) {
      t.value = t.value.replace(/\D/g, "").slice(-1);
      if (t.value && t.nextElementSibling) t.nextElementSibling.focus();
      return;
    }
    if (t.id === "rg-pw") {
      var sc = strength(t.value), spans = document.querySelectorAll(".pw-meter span");
      spans.forEach(function (s, k) { s.className = k < sc ? "on s" + sc : ""; });
      document.getElementById("pw-label").textContent = t.value ? ["Сул", "Сул", "Дунд", "Хүчтэй"][sc] : "8+ тэмдэгт, үсэг болон тоо";
    }
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.otp != null && e.key === "Backspace" && !t.value && t.previousElementSibling) t.previousElementSibling.focus();
  });
  document.addEventListener("paste", function (e) {
    var t = e.target;
    if (!t.dataset || t.dataset.otp == null) return;
    var digits = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    document.querySelectorAll("[data-otp]").forEach(function (c, i) { c.value = digits[i] || ""; });
  });

  document.addEventListener("submit", function (e) {
    var f = e.target, ok = true;
    if (f.id === "auth-login") {
      e.preventDefault(); remember();
      var id = val("lg-id"), pw = document.getElementById("lg-pw").value;
      ok = setError("lg-id", id ? (id.indexOf("@") > -1 && !isEmail(id) ? "Имэйл хаяг буруу байна." : "") : "Имэйл эсвэл утасны дугаараа оруулна уу.") && ok;
      ok = setError("lg-pw", pw ? "" : "Нууц үгээ оруулна уу.") && ok;
      if (!ok) return;
      if (pw !== DEMO_PW) { st.error = "Имэйл/утас эсвэл нууц үг буруу байна. (Демо нууц үг: " + DEMO_PW + ")"; render(); return; }
      finishLogin("Тавтай морил, " + Session.user().name.split(" ")[0] + "!");
    }
    if (f.id === "auth-register") {
      e.preventDefault(); remember();
      ok = setError("rg-first", val("rg-first") ? "" : "Нэрээ оруулна уу.") && ok;
      ok = setError("rg-last", val("rg-last") ? "" : "Овгоо оруулна уу.") && ok;
      ok = setError("rg-phone", val("rg-phone").replace(/\D/g, "").length === 8 ? "" : "Утасны дугаар 8 оронтой байна.") && ok;
      ok = setError("rg-email", isEmail(val("rg-email")) ? "" : "Имэйл хаяг буруу байна.") && ok;
      var p1 = document.getElementById("rg-pw").value;
      ok = setError("rg-pw", p1.length >= 8 && /\d/.test(p1) && /[^\d\s]/.test(p1) ? "" : "8+ тэмдэгт, үсэг болон тоо агуулна.") && ok;
      ok = setError("rg-pw2", p1 && p1 === document.getElementById("rg-pw2").value ? "" : "Нууц үг таарахгүй байна.") && ok;
      ok = setError("rg-terms", document.getElementById("rg-terms").checked ? "" : "Нөхцөлийг зөвшөөрнө үү.") && ok;
      if (!ok) { var bad = document.querySelector(".auth-card .has-error input"); if (bad) bad.focus(); return; }
      var ph = val("rg-phone").replace(/\D/g, ""), first = val("rg-first"), last = val("rg-last");
      st.pending = { name: first + " " + last, initials: (first[0] + last[0]).toUpperCase(), email: val("rg-email"), phone: ph.slice(0, 4) + "-" + ph.slice(4) };
      st.email = st.pending.email; st.step = "otp"; st.error = ""; startResend(); render();
    }
    if (f.id === "auth-forgot") {
      e.preventDefault(); remember();
      if (!setError("fg-email", isEmail(val("fg-email")) ? "" : "Бүртгэлтэй имэйлээ оруулна уу.")) return;
      st.email = val("fg-email"); st.step = "otp"; st.error = ""; startResend(); render();
    }
    if (f.id === "auth-otp") {
      e.preventDefault();
      var code = Array.prototype.map.call(document.querySelectorAll("[data-otp]"), function (c) { return c.value; }).join("");
      if (code.length < 6) { st.error = "6 оронтой кодоо бүрэн оруулна уу."; render(); return; }
      if (code !== DEMO_CODE) { st.error = "Код буруу байна. Дахин оролдоно уу."; render(); return; }
      clearInterval(resendTimer); st.error = "";
      if (st.mode === "register") { B.save("bloom-user", st.pending); finishLogin("Бүртгэл амжилттай! Тавтай морил, " + st.pending.name.split(" ")[0] + "!"); }
      else { st.step = "newpw"; render(); }
    }
    if (f.id === "auth-newpw") {
      e.preventDefault();
      var n1 = document.getElementById("np-pw").value;
      ok = setError("np-pw", n1.length >= 8 && /\d/.test(n1) && /[^\d\s]/.test(n1) ? "" : "8+ тэмдэгт, үсэг болон тоо агуулна.") && ok;
      ok = setError("np-pw2", n1 && n1 === document.getElementById("np-pw2").value ? "" : "Нууц үг таарахгүй байна.") && ok;
      if (ok) { st.step = "done"; render(); }
    }
  });
})();
