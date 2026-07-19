/* ==========================================================================
   Expert Services — Store logic (products, cart, checkout)
   Persists cart in localStorage under "expertsStoreCart" (shared w/ main.js)
   ========================================================================== */
(function () {
  "use strict";

  var CART_KEY = "expertsStoreCart";

  /* ---------- Placeholder product photography ----------
     Real product photos aren't ready yet for anything beyond the first
     item. This inline SVG stands in until real photography is uploaded —
     just swap a product's `img` value for a real file when it's ready. */
  var PLACEHOLDER_PHOTO = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#0d0d0d"/>' +
      '<text x="300" y="310" font-family="Michroma, Arial, sans-serif" font-size="26" font-weight="700" fill="#fabe1a" text-anchor="middle" letter-spacing="1">COMING SOON</text>' +
    "</svg>"
  );

  /* ---------- Product catalog ---------- */
  var PRODUCTS = [
    {
      id: "rfid-silver-1pc",
      name: "RFID Silver — 1 PC",
      desc: "RFID-blocking card sleeve in a premium silver finish. Shields your credit, debit and NFC-enabled cards from unauthorized contactless scanning — ultra-slim and lightweight for everyday carry.",
      price: 150,
      oldPrice: null,
      badge: null,
      comingSoon: false,
      img: "images/1.jpg"
    },
    {
      id: "rfid-silver-special-1pc",
      name: "RFID Silver Special — 1 PC",
      desc: "RFID-blocking card sleeve in a premium silver finish. Shields your credit, debit and NFC-enabled cards from unauthorized contactless scanning — ultra-slim and lightweight for everyday carry.",
      price: 190,
      oldPrice: null,
      badge: "SPECIAL",
      comingSoon: false,
      img: PLACEHOLDER_PHOTO
    },
    {
      id: "rfid-white-1pc",
      name: "RFID White — 1 PC",
      desc: "RFID-blocking card sleeve in a clean white finish. Shields your credit, debit and NFC-enabled cards from unauthorized contactless scanning — ultra-slim and lightweight for everyday carry.",
      price: 155,
      oldPrice: null,
      badge: "COMING SOON",
      comingSoon: true,
      img: PLACEHOLDER_PHOTO
    },
    {
      id: "rfid-white-special-1pc",
      name: "RFID White Special — 1 PC",
      desc: "RFID-blocking card sleeve in a clean white finish. Shields your credit, debit and NFC-enabled cards from unauthorized contactless scanning — ultra-slim and lightweight for everyday carry.",
      price: 195,
      oldPrice: null,
      badge: "COMING SOON",
      comingSoon: true,
      img: PLACEHOLDER_PHOTO
    },
    {
      id: "rfid-silver-5pc",
      name: "RFID Silver — 5 PC Pack",
      desc: "Value bundle of 5 RFID-blocking card sleeves in premium silver finish. Perfect for the whole family or a complete wallet refresh — same trusted protection, better value.",
      price: 650,
      oldPrice: null,
      badge: "BUNDLE",
      comingSoon: false,
      img: PLACEHOLDER_PHOTO
    },
    {
      id: "rfid-white-5pc",
      name: "RFID White — 5 PC Pack",
      desc: "Value bundle of 5 RFID-blocking card sleeves in clean white finish. Perfect for the whole family or a complete wallet refresh — same trusted protection, better value.",
      price: 655,
      oldPrice: null,
      badge: "BUNDLE",
      comingSoon: false,
      img: PLACEHOLDER_PHOTO
    }
  ];

  function formatPKR(n) {
    return "PKR " + n.toLocaleString("en-PK");
  }

  /* ---------- Cart storage ---------- */
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (window.updateNavCartCount) { window.updateNavCartCount(); }
  }

  function addToCart(productId) {
    var cart = getCart();
    var existing = cart.find(function (i) { return i.id === productId; });
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: productId, qty: 1 });
    }
    saveCart(cart);
    renderCart();
    openCart();
  }

  function updateQty(productId, delta) {
    var cart = getCart();
    var item = cart.find(function (i) { return i.id === productId; });
    if (!item) { return; }
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(function (i) { return i.id !== productId; });
    }
    saveCart(cart);
    renderCart();
  }

  function removeFromCart(productId) {
    var cart = getCart().filter(function (i) { return i.id !== productId; });
    saveCart(cart);
    renderCart();
  }

  function cartSubtotal() {
    var cart = getCart();
    return cart.reduce(function (sum, item) {
      var product = PRODUCTS.find(function (p) { return p.id === item.id; });
      return sum + (product ? product.price * item.qty : 0);
    }, 0);
  }

  /* ---------- Product grid ---------- */
  function renderProductGrid() {
    var grid = document.getElementById("productGrid");
    if (!grid) { return; }

    grid.innerHTML = PRODUCTS.map(function (p) {
      var badgeHtml = p.badge
        ? '<span class="product-badge' + (p.comingSoon ? " badge-soon" : "") + '">' + p.badge + "</span>"
        : "";
      var oldPriceHtml = p.oldPrice
        ? '<span class="old-price">' + formatPKR(p.oldPrice) + "</span>"
        : "";

      var btnHtml = p.comingSoon
        ? '<button class="add-to-cart-btn soon-btn" disabled>Coming Soon</button>'
        : '<button class="add-to-cart-btn" data-id="' + p.id + '">Add to Cart</button>';

      return (
        '<div class="product-card reveal' + (p.comingSoon ? " product-card--soon" : "") + '">' +
          '<div class="product-media">' +
            badgeHtml +
            '<img src="' + p.img + '" alt="' + p.name + '">' +
            (p.comingSoon ? '<div class="soon-overlay"><span>Coming Soon</span></div>' : "") +
          "</div>" +
          '<div class="product-info">' +
            "<h3>" + p.name + "</h3>" +
            '<p class="product-desc">' + p.desc + "</p>" +
            '<div class="product-price-row">' +
              '<span class="product-price">' + oldPriceHtml + formatPKR(p.price) + "</span>" +
              btnHtml +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    grid.querySelectorAll(".add-to-cart-btn:not([disabled])").forEach(function (btn) {
      btn.addEventListener("click", function () { addToCart(btn.getAttribute("data-id")); });
    });

    /* Re-trigger scroll reveal */
    if (window.IntersectionObserver) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });
      grid.querySelectorAll(".reveal").forEach(function (el) { observer.observe(el); });
    } else {
      grid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in-view"); });
    }
  }

  /* ---------- Cart drawer rendering ---------- */
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

    itemsWrap.innerHTML = cart.map(function (item) {
      var product = PRODUCTS.find(function (p) { return p.id === item.id; });
      if (!product) { return ""; }
      return (
        '<div class="cart-item">' +
          '<img src="' + product.img + '" alt="' + product.name + '">' +
          '<div class="cart-item-info">' +
            "<h4>" + product.name + "</h4>" +
            '<div class="cart-item-price">' + formatPKR(product.price) + "</div>" +
            '<div class="qty-control">' +
              '<button data-action="dec" data-id="' + product.id + '">&minus;</button>' +
              "<span>" + item.qty + "</span>" +
              '<button data-action="inc" data-id="' + product.id + '">&plus;</button>' +
            "</div>" +
            '<button class="cart-item-remove" data-action="remove" data-id="' + product.id + '">Remove</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    itemsWrap.querySelectorAll("[data-action]").forEach(function (btn) {
      var id = btn.getAttribute("data-id");
      var action = btn.getAttribute("data-action");
      btn.addEventListener("click", function () {
        if (action === "inc")    { updateQty(id, 1); }
        if (action === "dec")    { updateQty(id, -1); }
        if (action === "remove") { removeFromCart(id); }
      });
    });

    subtotalEl.textContent = formatPKR(cartSubtotal());
  }

  /* ---------- Cart drawer open/close ---------- */
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

  if (cartToggle)  { cartToggle.addEventListener("click",  function () { renderCart(); openCart(); }); }
  if (cartClose)   { cartClose.addEventListener("click",   closeCart); }
  if (cartOverlay) { cartOverlay.addEventListener("click", closeCart); }

  /* ---------- Checkout modal ---------- */
  var checkoutOverlay     = document.getElementById("checkoutOverlay");
  var checkoutBtn         = document.getElementById("checkoutBtn");
  var checkoutClose       = document.getElementById("checkoutClose");
  var checkoutForm        = document.getElementById("checkoutForm");
  var checkoutFormStep    = document.getElementById("checkoutFormStep");
  var checkoutConfirmStep = document.getElementById("checkoutConfirmStep");
  var orderSummaryBox     = document.getElementById("orderSummaryBox");
  var orderIdDisplay      = document.getElementById("orderIdDisplay");

  function renderOrderSummary() {
    if (!orderSummaryBox) { return; }
    var cart = getCart();
    var lines = cart.map(function (item) {
      var product = PRODUCTS.find(function (p) { return p.id === item.id; });
      if (!product) { return ""; }
      return (
        '<div class="order-line">' +
          "<span>" + product.name + " &times; " + item.qty + "</span>" +
          "<span>" + formatPKR(product.price * item.qty) + "</span>" +
        "</div>"
      );
    }).join("");
    var total = '<div class="order-line total"><span>Total</span><span>' + formatPKR(cartSubtotal()) + "</span></div>";
    orderSummaryBox.innerHTML = lines + total;
  }

  function openCheckout() {
    if (!checkoutOverlay) { return; }
    if (!getCart().length) { return; }
    renderOrderSummary();
    checkoutFormStep.style.display    = "";
    checkoutConfirmStep.style.display = "none";
    checkoutOverlay.classList.add("active");
    closeCart();
  }

  function closeCheckout() {
    if (checkoutOverlay) { checkoutOverlay.classList.remove("active"); }
  }

  if (checkoutBtn)   { checkoutBtn.addEventListener("click",   function() { window.location.href = "checkout.html"; }); }
  if (checkoutClose) { checkoutClose.addEventListener("click", closeCheckout); }
  if (checkoutOverlay) {
    checkoutOverlay.addEventListener("click", function (e) {
      if (e.target === checkoutOverlay) { closeCheckout(); }
    });
  }

  function generateOrderId() {
    var stamp = Date.now().toString(36).toUpperCase();
    return "ES-" + stamp.slice(-6);
  }

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var orderId = generateOrderId();
      if (orderIdDisplay) { orderIdDisplay.textContent = "Order ID: " + orderId; }
      checkoutFormStep.style.display    = "none";
      checkoutConfirmStep.style.display = "";
      saveCart([]);
      renderCart();
    });
  }

  var continueShoppingBtn = document.getElementById("continueShoppingBtn");
  if (continueShoppingBtn) {
    continueShoppingBtn.addEventListener("click", function (e) {
      e.preventDefault();
      closeCheckout();
    });
  }

  /* ---------- Init ---------- */
  renderProductGrid();
  renderCart();
})();
