/* ==========================================================================
   Expert Services — Checkout page logic
   Reads cart from localStorage ("expertsStoreCart"), renders summary,
   handles form submission and success state.
   ========================================================================== */
(function () {
  "use strict";

  var CART_KEY = "expertsStoreCart";

  /* ---------- Product catalog (must stay in sync with store.js) ---------- */
  var PRODUCTS = [
    { id: "rfid-silver-1pc",         name: "RFID Silver — 1 PC",          price: 150,  img: "images/1.jpg" },
    { id: "rfid-silver-special-1pc", name: "RFID Silver Special — 1 PC",  price: 190,  img: "" },
    { id: "rfid-white-1pc",          name: "RFID White — 1 PC",           price: 155,  img: "" },
    { id: "rfid-white-special-1pc",  name: "RFID White Special — 1 PC",   price: 195,  img: "" },
    { id: "rfid-silver-5pc",         name: "RFID Silver — 5 PC Pack",     price: 650,  img: "" },
    { id: "rfid-white-5pc",          name: "RFID White — 5 PC Pack",      price: 655,  img: "" }
  ];

  var PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
      '<rect width="80" height="80" rx="8" fill="#111"/>' +
      '<text x="40" y="44" font-family="Michroma,sans-serif" font-size="8" font-weight="400" fill="#fabe1a" text-anchor="middle">PRODUCT</text>' +
    "</svg>"
  );

  function formatPKR(n) { return "PKR " + n.toLocaleString("en-PK"); }
  function getProduct(id) { return PRODUCTS.find(function (p) { return p.id === id; }); }

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (window.updateNavCartCount) { window.updateNavCartCount(); }
  }

  /* ---------- DOM refs ---------- */
  var emptyState      = document.getElementById("checkoutEmptyState");
  var layout          = document.getElementById("checkoutLayout");
  var successState    = document.getElementById("checkoutSuccess");
  var itemsList       = document.getElementById("checkoutItemsList");
  var totalsEl        = document.getElementById("checkoutTotals");
  var form            = document.getElementById("checkoutForm");
  var orderIdDisplay  = document.getElementById("orderIdDisplay");
  var successDetails  = document.getElementById("successDetails");

  /* ---------- Render ---------- */
  function render() {
    var cart = getCart();

    if (!cart.length) {
      emptyState.style.display = "";
      layout.style.display     = "none";
      successState.style.display = "none";
      return;
    }

    emptyState.style.display   = "none";
    layout.style.display       = "";
    successState.style.display = "none";

    /* Items list */
    var subtotal = 0;
    itemsList.innerHTML = cart.map(function (item) {
      var p = getProduct(item.id);
      if (!p) return "";
      var lineTotal = p.price * item.qty;
      subtotal += lineTotal;
      var imgSrc = p.img || PLACEHOLDER;
      return (
        '<div class="checkout-item">' +
          '<img src="' + imgSrc + '" alt="' + p.name + '" class="checkout-item-img">' +
          '<div class="checkout-item-details">' +
            '<h4>' + p.name + '</h4>' +
            '<div class="checkout-item-meta">' +
              '<span class="checkout-item-qty">Qty: ' + item.qty + '</span>' +
              '<span class="checkout-item-line-price">' + formatPKR(lineTotal) + '</span>' +
            '</div>' +
          '</div>' +
          '<button class="checkout-item-remove" data-id="' + p.id + '" aria-label="Remove ' + p.name + '">&times;</button>' +
        '</div>'
      );
    }).join("");

    /* Remove buttons */
    itemsList.querySelectorAll(".checkout-item-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-id");
        var c = getCart().filter(function (i) { return i.id !== id; });
        saveCart(c);
        render();
      });
    });

    /* Totals */
    var shipping = 0; // free shipping
    var total = subtotal + shipping;
    totalsEl.innerHTML =
      '<div class="summary-row"><span>Subtotal</span><span>' + formatPKR(subtotal) + '</span></div>' +
      '<div class="summary-row"><span>Shipping</span><span class="free-tag">FREE</span></div>' +
      '<div class="summary-row summary-total"><span>Total</span><span>' + formatPKR(total) + '</span></div>';
  }

  /* ---------- Form submission ---------- */
  function generateOrderId() {
    return "ES-" + Date.now().toString(36).toUpperCase().slice(-6);
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var btn = document.getElementById("placeOrderBtn");
      btn.querySelector(".submit-text").style.display   = "none";
      btn.querySelector(".submit-spinner").style.display = "";
      btn.disabled = true;

      // Simulate brief processing delay
      setTimeout(function () {
        var orderId = generateOrderId();
        var nameVal = document.getElementById("fullName").value;
        var cityVal = document.getElementById("city").value;

        orderIdDisplay.textContent = "Order ID: " + orderId;
        successDetails.innerHTML =
          '<p>Delivering to <strong>' + nameVal + '</strong> in <strong>' + cityVal + '</strong></p>';

        emptyState.style.display   = "none";
        layout.style.display       = "none";
        successState.style.display = "";

        // Clear cart
        saveCart([]);
      }, 800);
    });
  }

  /* ---------- Init ---------- */
  render();
})();
