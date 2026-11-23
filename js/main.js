/* ==========================================================
   Bro's Food Court
   1) Open / closed badge (India time)
   2) Image fallback
   3) Menu viewer: images + PDFs, tabs, zoom, swipe, pinch
   ========================================================== */
(function () {
  "use strict";

  /* ---------- 1) Open / closed badge ---------- */
  var OPEN_HOUR = 13; // 1 PM
  var CLOSE_HOUR = 1; // 1 AM (next day)

  function updateStatus() {
    var el = document.getElementById("status");
    var txt = document.getElementById("status-text");
    if (!el || !txt) return;
    try {
      var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var h = 0;
      parts.forEach(function (p) { if (p.type === "hour") h = parseInt(p.value, 10) % 24; });
      var open = OPEN_HOUR > CLOSE_HOUR ? h >= OPEN_HOUR || h < CLOSE_HOUR : h >= OPEN_HOUR && h < CLOSE_HOUR;
      el.setAttribute("data-open", open ? "true" : "false");
      txt.textContent = open ? "Open now · till 1 AM" : "Closed · opens at 1 PM";
    } catch (e) { /* keep the default text */ }
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- 2) Image fallback ---------- */
  var OFF_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="2" y1="2" x2="22" y2="22"></line><path d="M10.41 10.41a2 2 0 1 1-2.82-2.82"></path><line x1="13.5" y1="13.5" x2="6" y2="21"></line><line x1="18" y1="12" x2="21" y2="15"></line><path d="M3.59 3.59A1.99 1.99 0 0 0 3 5v14a2 2 0 0 0 2 2h14c.55 0 1.052-.22 1.41-.59"></path><path d="M21 15V5a2 2 0 0 0-2-2H9"></path></svg>';

  function showFallback(img) {
    if (img.dataset.failed) return;
    img.dataset.failed = "true";
    var label = img.getAttribute("data-fallback") || "";
    if (!label) { img.style.display = "none"; return; }
    var box = document.createElement("div");
    box.className = "img-fallback " + img.className;
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", img.alt);
    box.innerHTML = OFF_SVG + "<span></span>";
    box.querySelector("span").textContent = label;
    if (img.parentElement && img.parentElement.classList.contains("brand-logo")) {
      box.style.width = "100%";
      box.style.height = "100%";
    }
    img.replaceWith(box);
  }

  document.querySelectorAll("img[data-fallback]").forEach(function (img) {
    img.addEventListener("error", function () { showFallback(img); });
    if (img.complete && img.naturalWidth === 0) showFallback(img);
  });

  /* ---------- 3) Menu viewer ---------- */
  var trigger = document.querySelector("[data-menu-files]");
  var modal = document.getElementById("menu-modal");
  var stage = document.getElementById("menu-stage");
  // Old browsers without <dialog>: the link just opens the first file in a new tab
  if (!trigger || !modal || !stage || typeof modal.showModal !== "function") return;

  var closeBtn = modal.querySelector(".menu-close");
  var prevBtn = modal.querySelector(".menu-prev");
  var nextBtn = modal.querySelector(".menu-next");
  var counter = document.getElementById("menu-counter");
  var tabsBox = document.getElementById("menu-tabs");
  var zoomBox = document.getElementById("menu-zoom");
  var zoomInBtn = document.getElementById("menu-zoom-in");
  var zoomOutBtn = document.getElementById("menu-zoom-out");
  var zoomResetBtn = document.getElementById("menu-zoom-reset");
  var pdfLink = document.getElementById("menu-pdf-link");
  var root = document.documentElement;

  var MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 1.5;

  // "Label|path, Label|path" (label optional). .pdf files open in the built-in PDF viewer.
  var list = (trigger.getAttribute("data-menu-files") || "")
    .split(",")
    .map(function (s, i) {
      s = s.trim();
      var bar = s.indexOf("|");
      var label = bar > -1 ? s.slice(0, bar).trim() : "";
      var src = bar > -1 ? s.slice(bar + 1).trim() : s;
      return { label: label || "Page " + (i + 1), src: src, pdf: /\.pdf([?#].*)?$/i.test(src) };
    })
    .filter(function (it) { return it.src; });

  var index = 0, zoom = 1, img = null, tabs = [];

  function preload(i) {
    if (i < 0 || i >= list.length || list[i].pdf) return;
    new Image().src = list[i].src;
  }

  function layout() {
    if (!img || !img.naturalWidth) return;
    var fit = Math.min(stage.clientWidth / img.naturalWidth, stage.clientHeight / img.naturalHeight);
    img.style.width = img.naturalWidth * fit * zoom + "px";
    img.style.height = img.naturalHeight * fit * zoom + "px";
  }

  function buildTabs() {
    tabsBox.textContent = "";
    tabs = [];
    tabsBox.hidden = list.length < 2;
    list.forEach(function (it, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "menu-tab";
      b.setAttribute("role", "tab");
      b.textContent = it.label;
      b.addEventListener("click", function () { show(i); });
      tabsBox.appendChild(b);
      tabs.push(b);
    });
  }

  function updateUi() {
    var it = list[index];
    var isPdf = !!(it && it.pdf);
    counter.textContent = list.length > 1 ? index + 1 + " / " + list.length : "";
    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= list.length - 1;
    prevBtn.hidden = nextBtn.hidden = list.length < 2;
    zoomBox.hidden = isPdf;
    pdfLink.hidden = !isPdf;
    if (isPdf) pdfLink.href = it.src;
    zoomOutBtn.disabled = zoom <= MIN_ZOOM;
    zoomInBtn.disabled = zoom >= MAX_ZOOM;
    zoomResetBtn.disabled = zoom === MIN_ZOOM;
    tabs.forEach(function (t, i) {
      t.setAttribute("aria-selected", i === index ? "true" : "false");
      if (i === index && modal.open) t.scrollIntoView({ inline: "center", block: "nearest" });
    });
  }

  function setZoom(z, cx, cy) {
    z = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    if (z === zoom) return;
    if (cx === undefined) { cx = stage.clientWidth / 2; cy = stage.clientHeight / 2; }
    var rx = (stage.scrollLeft + cx) / (stage.scrollWidth || 1);
    var ry = (stage.scrollTop + cy) / (stage.scrollHeight || 1);
    zoom = z;
    layout();
    stage.scrollLeft = rx * stage.scrollWidth - cx;
    stage.scrollTop = ry * stage.scrollHeight - cy;
    updateUi();
  }

  function message(text) {
    var p = document.createElement("p");
    p.className = "menu-error";
    p.textContent = text;
    stage.textContent = "";
    stage.appendChild(p);
    img = null;
  }

  function show(i) {
    if (i < 0 || i >= list.length) return;
    index = i;
    zoom = 1;
    img = null;
    stage.textContent = "";
    stage.scrollLeft = 0;
    stage.scrollTop = 0;
    var it = list[i];

    if (it.pdf) {
      var f = document.createElement("iframe");
      f.className = "menu-frame";
      f.title = "Bro's Food Court menu: " + it.label;
      f.src = it.src + "#view=FitH";
      stage.appendChild(f);
    } else {
      img = document.createElement("img");
      img.alt = "Bro's Food Court menu: " + it.label;
      img.draggable = false;
      img.decoding = "async";
      img.addEventListener("load", layout);
      img.addEventListener("error", function () {
        message("This menu page isn't uploaded yet. Please call us to ask about the menu.");
      });
      img.src = it.src;
      stage.appendChild(img);
      if (img.complete && img.naturalWidth) layout();
    }
    updateUi();
    preload(i + 1);
    preload(i - 1);
  }

  function openMenu() {
    buildTabs();
    if (!list.length) {
      message("The menu isn't available right now. Please call us to ask.");
      updateUi();
    } else {
      show(index);
    }
    modal.showModal();
    root.classList.add("menu-open");
    layout();
    updateUi();
  }

  function closeMenu() { if (modal.open) modal.close(); }

  trigger.addEventListener("click", function (e) { e.preventDefault(); openMenu(); });
  closeBtn.addEventListener("click", closeMenu);
  prevBtn.addEventListener("click", function () { show(index - 1); });
  nextBtn.addEventListener("click", function () { show(index + 1); });
  zoomInBtn.addEventListener("click", function () { setZoom(zoom * ZOOM_STEP); });
  zoomOutBtn.addEventListener("click", function () { setZoom(zoom / ZOOM_STEP); });
  zoomResetBtn.addEventListener("click", function () { setZoom(1); });

  modal.addEventListener("click", function (e) { if (e.target === modal) closeMenu(); });
  modal.addEventListener("close", function () {
    root.classList.remove("menu-open");
    trigger.focus();
  });

  // Keyboard: arrows = pages, + / - = zoom, 0 = fit (Esc closes natively)
  modal.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "+" || e.key === "=") setZoom(zoom * ZOOM_STEP);
    else if (e.key === "-") setZoom(zoom / ZOOM_STEP);
    else if (e.key === "0") setZoom(1);
  });

  window.addEventListener("resize", function () { if (modal.open) layout(); });

  stage.addEventListener("dblclick", function (e) {
    var r = stage.getBoundingClientRect();
    setZoom(zoom > 1 ? 1 : 2.5, e.clientX - r.left, e.clientY - r.top);
  });

  /* Touch: pinch, double-tap, swipe (swipe only when not zoomed) */
  var startX = 0, startY = 0, swipeOk = false, pinchDist = 0, pinchZoom = 1, lastTap = 0;

  function dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

  stage.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      pinchDist = dist(e.touches);
      pinchZoom = zoom;
      swipeOk = false;
    } else if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swipeOk = zoom === 1;
    }
  }, { passive: true });

  stage.addEventListener("touchmove", function (e) {
    if (e.touches.length === 2 && pinchDist) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      var cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
      var cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
      setZoom(pinchZoom * (dist(e.touches) / pinchDist), cx, cy);
    }
  }, { passive: false });

  stage.addEventListener("touchend", function (e) {
    if (e.touches.length < 2) pinchDist = 0;
    if (e.changedTouches.length !== 1 || e.touches.length) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - startX, dy = t.clientY - startY;

    if (swipeOk && zoom === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      show(index + (dx < 0 ? 1 : -1));
      lastTap = 0;
      return;
    }
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      var now = Date.now();
      if (now - lastTap < 300) {
        var r = stage.getBoundingClientRect();
        setZoom(zoom > 1 ? 1 : 2.5, t.clientX - r.left, t.clientY - r.top);
        lastTap = 0;
      } else {
        lastTap = now;
      }
    }
  }, { passive: true });
})();
