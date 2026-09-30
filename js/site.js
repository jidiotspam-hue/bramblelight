/* GLIMMERDEEP landing page: small behaviours. No dependencies, no tracking. */
(function () {
  "use strict";

  // 1) Path fix. Deployed, this page sits at the repo root next to game/, press/ and office/.
  //    Previewed from /site/, those folders live one level up, so rewrite the [data-root] links.
  var inSiteDir = /\/site\/(index\.html)?$/.test(location.pathname);
  if (inSiteDir) {
    document.querySelectorAll("a[data-root]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (!/^([a-z]+:|\/|#|\.\.\/)/i.test(h)) a.setAttribute("href", "../" + h);
    });
  }

  // 2) Nav turns solid (and shows the small logo) once you scroll past the top of the hero.
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("solid", window.scrollY > window.innerHeight * 0.55); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // 3) Scale the pixel logos by whole numbers only (brand rule), whatever size Moss's final logo is.
  function intScale(img, maxW, maxScale) {
    function apply() {
      var w = img.naturalWidth; if (!w) return;
      var k = Math.max(1, Math.min(maxScale, Math.floor(maxW() / w)));
      img.style.width = (w * k) + "px";
      img.style.height = "auto";
    }
    if (img.complete) apply(); else img.addEventListener("load", apply);
    window.addEventListener("resize", apply);
  }
  var hero = document.getElementById("heroLogo");
  if (hero) intScale(hero, function () { return Math.min(window.innerWidth - 40, 720); }, 6);
  var navLogo = document.querySelector(".nav-logo");
  if (navLogo) intScale(navLogo, function () { return 140; }, 1);

  // 4) Screenshot lightbox (native <dialog>; falls back to opening the image).
  var dlg = document.getElementById("lightbox"), lbImg = document.getElementById("lbImg"), lbVid = document.getElementById("lbVid");
  document.querySelectorAll(".shot-btn, [data-lightbox]").forEach(function (b) {
    b.addEventListener("click", function (ev) {
      if (dlg && typeof dlg.showModal === "function") ev.preventDefault();
      var src = b.getAttribute("data-full"), media = b.querySelector("img,video");
      var alt = media ? (media.getAttribute("alt") || media.getAttribute("aria-label") || "") : (b.getAttribute("aria-label") || "");
      if (!dlg || typeof dlg.showModal !== "function") { window.open(src, "_blank"); return; }
      var isVid = /\.(mp4|webm)$/i.test(src);
      lbImg.hidden = isVid; lbVid.hidden = !isVid;
      if (isVid) { lbVid.src = src; lbVid.setAttribute("aria-label", alt); var p = lbVid.play(); if (p && p.catch) p.catch(function () {}); }
      else { lbImg.src = src; lbImg.alt = alt; }
      dlg.showModal();
    });
  });
  if (dlg) {
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", function () { lbVid.pause(); lbVid.removeAttribute("src"); lbVid.load(); });
  }

  // 5) Muted looping clips only play while on screen (saves battery on phones).
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) document.querySelectorAll("video[data-autoplay]").forEach(function (v) { v.removeAttribute("data-autoplay"); v.preload = "none"; });
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
    }, { threshold: 0.25 });
    document.querySelectorAll("video[data-autoplay]").forEach(function (v) { v.muted = true; io.observe(v); });
  }
})();
