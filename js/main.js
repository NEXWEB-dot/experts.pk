/* ==========================================================================
   Expert Services — Shared site behaviour (nav, scroll reveal, cart badge, theme)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Theme Toggle ---------- */
  var themeToggle = document.getElementById("themeToggle");
  var savedTheme = localStorage.getItem("expertsTheme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);

  function updateThemeIcon(theme) {
    if (!themeToggle) return;
    if (theme === "dark") {
      themeToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>'; // Moon
    } else {
      themeToggle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>'; // Sun
    }
  }

  updateThemeIcon(savedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var currentTheme = document.documentElement.getAttribute("data-theme");
      var newTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("expertsTheme", newTheme);
      updateThemeIcon(newTheme);
    });
  }

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

  /* Migrate: clear stale cart items from pre-Sanity era (numeric ids vs Sanity _id) */
  (function migrateCart() {
    var cart = getCart();
    if (!cart.length) return;
    // Old hardcoded items used numeric ids like 1,2,3... Sanity ids look like "abc123def"
    var hasStale = cart.some(function(item) {
      return typeof item.id === 'number' || (!item.id) || (typeof item.id === 'string' && /^\d+$/.test(item.id));
    });
    if (hasStale) {
      localStorage.removeItem("expertsStoreCart");
    }
  })();

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
        '<p style="color:var(--color-secondary); font-family:var(--font-heading); font-size:0.95rem;">Thank you — your message has been received. We will get back to you shortly.</p>';
    });
  }

  /* ---------- Cart Drawer UI (Globally Available) ---------- */
  function formatPKR(n) {
    return "PKR " + n.toLocaleString("en-PK");
  }

  function saveCart(cart) {
    localStorage.setItem("expertsStoreCart", JSON.stringify(cart));
    if (window.updateNavCartCount) { window.updateNavCartCount(); }
  }

  function updateQty(index, delta) {
    var cart = getCart();
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) {
      cart.splice(index, 1);
    }
    saveCart(cart);
    renderCart();
  }

  function removeFromCart(index) {
    var cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderCart();
  }

  function cartSubtotal() {
    var cart = getCart();
    return cart.reduce(function (sum, item) {
      return sum + (item.price * item.qty);
    }, 0);
  }

  function renderCart() {
    var itemsWrap = document.getElementById("cartItems");
    var subtotalEl = document.getElementById("cartSubtotal");
    if (!itemsWrap || !subtotalEl) { return; }

    var cart = getCart();

    if (!cart.length) {
      itemsWrap.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
      subtotalEl.textContent = formatPKR(0);
      return;
    }

    itemsWrap.innerHTML = cart.map(function (item, index) {
      var colorText = item.color ? <span style="font-size:0.75rem; color:#8a8a8a; display:block; margin-bottom:4px;">Color:  + item.color + </span> : '';
      
      return (
        '<div class="cart-item">' +
          '<img src="' + item.img + '" alt="' + item.name + '">' +
          '<div class="cart-item-info">' +
            "<h4>" + item.name + "</h4>" +
            colorText + 
            '<div class="cart-item-price">' + formatPKR(item.price) + "</div>" +
            '<div class="qty-control">' +
              '<button data-action="dec" data-index="' + index + '">&minus;</button>' +
              "<span>" + item.qty + "</span>" +
              '<button data-action="inc" data-index="' + index + '">&plus;</button>' +
            "</div>" +
            '<button class="cart-item-remove" data-action="remove" data-index="' + index + '">Remove</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    itemsWrap.querySelectorAll("[data-action]").forEach(function (btn) {
      var index = parseInt(btn.getAttribute("data-index"), 10);
      var action = btn.getAttribute("data-action");
      btn.addEventListener("click", function () {
        if (action === "inc")    { updateQty(index, 1); }
        if (action === "dec")    { updateQty(index, -1); }
        if (action === "remove") { removeFromCart(index); }
      });
    });

    subtotalEl.textContent = formatPKR(cartSubtotal());
  }

  var cartDrawer  = document.getElementById("cartDrawer");
  var cartOverlay = document.getElementById("cartOverlay");
  var cartToggle  = document.getElementById("cartToggle");
  var cartClose   = document.getElementById("cartClose");

  function openCart() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.add("active");
      cartOverlay.classList.add("active");
    }
  }
  function closeCart() {
    if (cartDrawer && cartOverlay) {
      cartDrawer.classList.remove("active");
      cartOverlay.classList.remove("active");
    }
  }

  if (cartToggle)  { cartToggle.addEventListener("click",  function (e) { e.preventDefault(); renderCart(); openCart(); }); }
  if (cartClose)   { cartClose.addEventListener("click",   closeCart); }
  if (cartOverlay) { cartOverlay.addEventListener("click", closeCart); }

  var checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function() { window.location.href = "checkout.html"; });
  }

  // Expose methods globally for store.js and product.js to use
  window.expertsCart = {
    renderCart: renderCart,
    openCart: openCart,
    saveCart: saveCart
  };
  
  // Render cart on page load
  renderCart();
})();

