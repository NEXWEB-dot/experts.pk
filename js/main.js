/* ==========================================================================
   Expert Services — Shared site behaviour (nav, scroll reveal, cart badge)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Mobile nav toggle ---------- */
  var navToggle = document.getElementById("navToggle");
  var navMenu = document.getElementById("navMenu");

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var isOpen = navMenu.classList.toggle("open");
      navToggle.classList.toggle("open", isOpen);
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    // Close mobile menu when a link is tapped
    navMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navMenu.classList.remove("open");
        navToggle.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- Services accordion (Home page) ---------- */
  var serviceRows = document.querySelectorAll(".service-row[data-service]");

  serviceRows.forEach(function (row) {
    var item  = row.closest(".service-item");
    var panel = item ? item.querySelector(".service-panel") : null;
    if (!item || !panel) { return; }

    function toggle() {
      var isOpen = item.classList.toggle("open");
      row.setAttribute("aria-expanded", isOpen ? "true" : "false");
      panel.style.maxHeight = isOpen ? panel.scrollHeight + "px" : null;
    }

    row.addEventListener("click", toggle);
    row.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        toggle();
      }
    });
  });

  /* ---------- Cart badge sync (shown on every page, incl. Home) ---------- */
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("expertsStoreCart") || "[]");
    } catch (e) {
      return [];
    }
  }

  function updateNavCartCount() {
    var cart = getCart();
    var count = cart.reduce(function (sum, item) { return sum + item.qty; }, 0);
    var badge = document.getElementById("navCartCount");
    if (badge) { badge.textContent = count; }
  }

  updateNavCartCount();
  window.addEventListener("storage", updateNavCartCount);
  window.updateNavCartCount = updateNavCartCount;

  /* ---------- Contact form (Home page) — static confirmation, no backend ---------- */
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      contactForm.innerHTML =
        '<p style="color:#fabe1a; font-family:var(--font-heading); font-size:0.95rem;">Thank you — your message has been received. We will get back to you shortly.</p>';
    });
  }
})();
