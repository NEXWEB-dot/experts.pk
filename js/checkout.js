/* ==========================================================================
   Expert Services — Checkout page logic (Multi-step, v2)
   Payments: COD · Easypaisa · JazzCash · Bank Transfer → all via WhatsApp
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Config ---- */
  var CART_KEY        = "expertsStoreCart";
  var WHATSAPP_NUMBER = "923332240559"; // WhatsApp business number
  var EMAIL_API_URL   = "/api/send-order-email"; // ← Change to your API endpoint

  var currentStep     = 1;
  var selectedPayment = "cod";

  /* ---- Helpers ---- */
  function formatPKR(n) { return "PKR " + n.toLocaleString("en-PK"); }

  function getCart() {
    try {
      var val = localStorage.getItem(CART_KEY);
      if (!val) return [];
      var parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    if (window.updateNavCartCount) { window.updateNavCartCount(); }
  }

  function updateQty(index, delta) {
    var cart = getCart();
    if (!cart[index]) return;
    cart[index].qty += delta;
    if (cart[index].qty <= 0) { cart.splice(index, 1); }
    saveCart(cart);
    renderAll();
  }

  function removeFromCart(index) {
    var cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    renderAll();
  }

  function generateOrderId() {
    return "ES-" + Date.now().toString(36).toUpperCase().slice(-6);
  }

  /* ---- DOM refs ---- */
  var emptyState     = document.getElementById("checkoutEmptyState");
  var layout         = document.getElementById("checkoutLayout");
  var successState   = document.getElementById("checkoutSuccess");
  var itemsList      = document.getElementById("checkoutItemsList");
  var cartItemsStep1 = document.getElementById("checkoutCartItems");
  var totalsEl       = document.getElementById("checkoutTotals");
  var orderIdDisplay = document.getElementById("orderIdDisplay");
  var successDetails = document.getElementById("successDetails");
  var progressBar    = document.getElementById("progressBar");
  var progressSteps  = document.querySelectorAll(".progress-step");
  var stepContents   = document.querySelectorAll(".checkout-step-content");

  /* ========================================================
     SHIPPING CALCULATOR
     ======================================================== */
  function calculateShipping(cityVal, subtotal, timeVal) {
    if (!cityVal) return { text: "Enter city for shipping", cost: 0, free: false };
    var cityLower = cityVal.toLowerCase().trim();

    if (cityLower.includes("karachi")) {
      var cost = 350, text = "PKR 350 (12pm – 8pm)";
      if (timeVal === "high")  { cost = 500; text = "PKR 500 (8am – 12pm)"; }
      if (timeVal === "low")   { cost = 200; text = "PKR 200 (8pm – 12am)"; }
      return { text: text, cost: cost, free: false };
    }
    /* All other cities — standard courier */
    return { text: "PKR 500 (Standard Courier)", cost: 500, free: false };
  }

  function updateShippingDisplay() {
    if (!totalsEl) return;
    var cityInput = document.getElementById("city");
    var cityVal   = cityInput ? cityInput.value : "";
    var subtotal  = window.currentSubtotal || 0;

    /* Show/hide Karachi time slot field */
    var deliveryTimeField = document.getElementById("deliveryTimeField");
    var deliveryTimeInput = document.getElementById("deliveryTime");
    var timeVal = "medium";
    if (deliveryTimeField && deliveryTimeInput) {
      var isKarachi = cityVal.toLowerCase().trim().includes("karachi");
      deliveryTimeField.style.display = isKarachi ? "block" : "none";
      if (isKarachi) { timeVal = deliveryTimeInput.value; }
    }

    var shipping  = calculateShipping(cityVal, subtotal, timeVal);
    var total     = subtotal + shipping.cost;

    var shippingHtml = '<span style="font-size:0.85rem;text-align:right;">' + shipping.text + '</span>';
    var totalText    = formatPKR(total);
    if (shipping.cost === 0 && shipping.text !== "FREE" && shipping.text !== "Enter city for shipping") {
      totalText += " + Shipping";
    }

    totalsEl.innerHTML =
      '<div class="summary-row"><span>Subtotal</span><span>' + formatPKR(subtotal) + '</span></div>' +
      '<div class="summary-row"><span>Shipping</span>' + shippingHtml + '</div>' +
      '<div class="summary-row summary-total"><span>Total</span><span>' + totalText + '</span></div>';
  }

  /* ========================================================
     RENDER
     ======================================================== */
  function renderAll() {
    var cart = getCart();

    if (!cart.length) {
      emptyState.style.display   = "";
      layout.style.display       = "none";
      successState.style.display = "none";
      return;
    }

    emptyState.style.display   = "none";
    layout.style.display       = "";
    successState.style.display = "none";

    var subtotal = 0;

    /* --- Step 1: Editable cart --- */
    cartItemsStep1.innerHTML = cart.map(function (item, index) {
      var lineTotal = item.price * item.qty;
      subtotal += lineTotal;
      var colorText = item.color
        ? '<span style="font-size:0.78rem;color:var(--color-text-muted);display:block;margin-bottom:4px;">Color: ' + item.color + '</span>'
        : '';
      return (
        '<div class="checkout-item">' +
          '<img src="' + item.img + '" alt="' + item.name + '" class="checkout-item-img">' +
          '<div class="checkout-item-details">' +
            '<h4>' + item.name + '</h4>' +
            colorText +
            '<div class="checkout-item-meta" style="margin-top:10px;">' +
              '<div class="qty-control">' +
                '<button type="button" data-action="dec" data-index="' + index + '">&minus;</button>' +
                '<span>' + item.qty + '</span>' +
                '<button type="button" data-action="inc" data-index="' + index + '">&plus;</button>' +
              '</div>' +
              '<span class="checkout-item-line-price">' + formatPKR(lineTotal) + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="checkout-item-remove" data-action="remove" data-index="' + index + '" aria-label="Remove">&times;</button>' +
        '</div>'
      );
    }).join("");

    /* Bind qty/remove events for step 1 */
    cartItemsStep1.querySelectorAll("[data-action]").forEach(function (btn) {
      var idx    = parseInt(btn.getAttribute("data-index"), 10);
      var action = btn.getAttribute("data-action");
      btn.addEventListener("click", function () {
        if (action === "inc")    { updateQty(idx,  1); }
        if (action === "dec")    { updateQty(idx, -1); }
        if (action === "remove") { removeFromCart(idx); }
      });
    });

    /* --- Order Summary sidebar --- */
    itemsList.innerHTML = cart.map(function (item) {
      var lineTotal = item.price * item.qty;
      var colorText = item.color
        ? '<span style="font-size:0.75rem;color:var(--color-text-muted);display:block;">Color: ' + item.color + '</span>'
        : '';
      return (
        '<div class="checkout-item">' +
          '<img src="' + item.img + '" alt="' + item.name + '" class="checkout-item-img">' +
          '<div class="checkout-item-details">' +
            '<h4>' + item.name + '</h4>' +
            colorText +
            '<div class="checkout-item-meta">' +
              '<span class="checkout-item-qty">Qty: ' + item.qty + '</span>' +
              '<span class="checkout-item-line-price">' + formatPKR(lineTotal) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    window.currentSubtotal = subtotal;
    updateShippingDisplay();
  }

  /* City / delivery time live update */
  var cityInputField = document.getElementById("city");
  if (cityInputField) { cityInputField.addEventListener("input", updateShippingDisplay); }
  var timeInputField = document.getElementById("deliveryTime");
  if (timeInputField) { timeInputField.addEventListener("change", updateShippingDisplay); }

  /* ========================================================
     STEP NAVIGATION
     ======================================================== */
  function goToStep(stepNumber) {
    currentStep = stepNumber;

    /* Progress bar */
    progressBar.style.width = (((stepNumber - 1) / 2) * 100) + "%";
    progressSteps.forEach(function (step, idx) {
      step.classList.remove("active", "completed");
      if (idx + 1 === currentStep)       { step.classList.add("active"); }
      else if (idx + 1 < currentStep)    { step.classList.add("completed"); }
    });

    /* Content panels */
    stepContents.forEach(function (c) { c.classList.remove("active"); });
    document.getElementById("step" + stepNumber).classList.add("active");

    if (stepNumber >= 2) { updateShippingDisplay(); }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.getElementById("btnNextToStep2")?.addEventListener("click", function () { goToStep(2); });
  document.getElementById("btnBackToStep1")?.addEventListener("click", function () { goToStep(1); });
  document.getElementById("btnBackToStep2")?.addEventListener("click", function () { goToStep(2); });

  document.getElementById("checkoutFormStep2")?.addEventListener("submit", function (e) {
    e.preventDefault();
    goToStep(3);
  });

  /* ========================================================
     PAYMENT METHOD SELECTION
     ======================================================== */
  var paymentLabels = document.querySelectorAll(".payment-method-option");
  var paymentInfoPanel   = document.getElementById("paymentInfoPanel");
  var paymentInfoContent = document.getElementById("paymentInfoContent");

  /* Payment detail panels */
  var paymentDetails = {
    cod: null, // no info panel for COD
    easypaisa: (
      '<div class="payment-info-inner">' +
        '<div class="payment-info-icon">💚</div>' +
        '<div>' +
          '<p class="payment-info-title">Transfer to Easypaisa</p>' +
          '<p class="payment-info-number">03332240559</p>' +
          '<p class="payment-info-note">Transfer the exact order total, then share your payment screenshot on WhatsApp when we contact you.</p>' +
        '</div>' +
      '</div>'
    ),
    jazzcash: (
      '<div class="payment-info-inner">' +
        '<div class="payment-info-icon">🔴</div>' +
        '<div>' +
          '<p class="payment-info-title">Transfer to JazzCash</p>' +
          '<p class="payment-info-number">03332240559</p>' +
          '<p class="payment-info-note">Transfer the exact order total, then share your payment screenshot on WhatsApp when we contact you.</p>' +
        '</div>' +
      '</div>'
    ),
    bank: (
      '<div class="payment-info-inner">' +
        '<div class="payment-info-icon">🏦</div>' +
        '<div>' +
          '<p class="payment-info-title">Bank Transfer</p>' +
          '<p class="payment-info-note">Our bank account details will be shared with you on WhatsApp after you place your order.</p>' +
        '</div>' +
      '</div>'
    )
  };

  function selectPaymentMethod(value) {
    selectedPayment = value;
    paymentLabels.forEach(function (lbl) {
      var radio = lbl.querySelector("input[type=radio]");
      lbl.classList.toggle("selected", radio && radio.value === value);
    });

    /* Show/hide info panel */
    if (paymentDetails[value] && paymentInfoPanel && paymentInfoContent) {
      paymentInfoContent.innerHTML = paymentDetails[value];
      paymentInfoPanel.style.display = "";
      paymentInfoPanel.classList.add("panel-visible");
    } else if (paymentInfoPanel) {
      paymentInfoPanel.style.display = "none";
      paymentInfoPanel.classList.remove("panel-visible");
    }

    /* Update Place Order button label */
    var btn = document.getElementById("placeOrderBtn");
    var btnText = btn ? btn.querySelector(".submit-text") : null;
    if (btnText) {
      if (value === "cod") {
        btnText.textContent = "Place Order — Cash on Delivery";
      } else {
        btnText.textContent = "Place Order → Confirm on WhatsApp";
      }
    }
  }

  paymentLabels.forEach(function (lbl) {
    lbl.addEventListener("click", function () {
      var radio = lbl.querySelector("input[type=radio]");
      if (radio) { selectPaymentMethod(radio.value); }
    });
  });

  /* ========================================================
     FORM SUBMISSION → WHATSAPP
     ======================================================== */
  var form3 = document.getElementById("checkoutFormStep3");
  if (form3) {
    form3.addEventListener("submit", function (e) {
      e.preventDefault();

      var btn     = document.getElementById("placeOrderBtn");
      var btnTxt  = btn.querySelector(".submit-text");
      var spinner = btn.querySelector(".submit-spinner");
      btnTxt.style.display  = "none";
      spinner.style.display = "";
      btn.disabled = true;

      /* Collect form data */
      var nameVal    = (document.getElementById("fullName")   || {}).value || "";
      var phoneVal   = (document.getElementById("phone")      || {}).value || "";
      var emailVal   = (document.getElementById("email")      || {}).value || "";
      var addressVal = (document.getElementById("address")    || {}).value || "";
      var cityVal    = (document.getElementById("city")       || {}).value || "";
      var notesVal   = (document.getElementById("orderNotes") || {}).value || "";

      setTimeout(function () {
        var orderId = generateOrderId();
        var cart    = getCart();

        /* Build cart + totals */
        var subtotal  = cart.reduce(function (s, i) { return s + (i.price * i.qty); }, 0);
        var timeInput = document.getElementById("deliveryTime");
        var timeVal   = timeInput ? timeInput.value : "medium";
        var shipping  = calculateShipping(cityVal, subtotal, timeVal);
        var totalAmt  = subtotal + shipping.cost;

        /* Payment label strings */
        var paymentLabelsMap = {
          cod:       "Cash on Delivery (COD)",
          easypaisa: "Easypaisa — 03332240559",
          jazzcash:  "JazzCash — 03332240559",
          bank:      "Bank Transfer (details on WhatsApp)"
        };
        var paymentLabel = paymentLabelsMap[selectedPayment] || "Cash on Delivery";

        /* ---- Build WhatsApp message ---- */
        var msg = "*New Order: " + orderId + "*%0A%0A";
        msg += "*Customer:*%0A";
        msg += "Name: " + nameVal + "%0A";
        msg += "Phone: " + phoneVal + "%0A";
        if (emailVal) { msg += "Email: " + emailVal + "%0A"; }
        msg += "Address: " + addressVal + ", " + cityVal + "%0A";
        if (notesVal) { msg += "Notes: " + notesVal + "%0A"; }
        msg += "%0A*Items:*%0A";
        cart.forEach(function (item) {
          msg += "- " + item.qty + "x " + item.name;
          if (item.color) { msg += " (" + item.color + ")"; }
          msg += " — " + formatPKR(item.price * item.qty) + "%0A";
        });
        msg += "%0A*Subtotal:* " + formatPKR(subtotal) + "%0A";
        msg += "*Shipping:* " + shipping.text + "%0A";
        msg += "*Total:* " + formatPKR(totalAmt) + "%0A";
        msg += "*Payment:* " + paymentLabel + "%0A";
        if (selectedPayment === "easypaisa" || selectedPayment === "jazzcash") {
          msg += "%0A⚠️ Please share your payment screenshot on WhatsApp to confirm the order.";
        }

        var whatsappUrl = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + msg;

        /* ---- Success screen ---- */
        var paymentMethodDisplay = {
          cod:       "<strong>Cash on Delivery</strong>",
          easypaisa: "<strong>Easypaisa</strong> — confirm via WhatsApp",
          jazzcash:  "<strong>JazzCash</strong> — confirm via WhatsApp",
          bank:      "<strong>Bank Transfer</strong> — details via WhatsApp"
        };

        orderIdDisplay.textContent = "Order ID: " + orderId;

        var detailsHtml =
          '<p>Delivering to <strong>' + nameVal + '</strong> in <strong>' + cityVal + '</strong></p>' +
          '<p style="font-size:0.85rem;color:var(--color-text-muted);margin-top:6px;">Payment: ' + (paymentMethodDisplay[selectedPayment] || paymentMethodDisplay.cod) + '</p>' +
          '<div style="margin-top:20px;">' +
            '<a href="' + whatsappUrl + '" target="_blank" rel="noopener" class="btn btn-gold whatsapp-cta">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="margin-right:8px;vertical-align:middle;"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>' +
              'Send Order via WhatsApp' +
            '</a>' +
            '<p style="font-size:0.8rem;color:var(--color-text-muted);margin-top:10px;">Click above to confirm your order on WhatsApp.</p>' +
          '</div>';

        successDetails.innerHTML = detailsHtml;

        /* Show email resend section for COD only */
        var emailResendSection = document.getElementById("emailResendSection");
        if (emailResendSection) {
          if (selectedPayment === "cod") {
            /* Pre-fill email if provided */
            var emailInput = document.getElementById("resendEmailInput");
            if (emailInput && emailVal) { emailInput.value = emailVal; }
            emailResendSection.style.display = "";

            /* Store order data for email send */
            window.__pendingOrder = {
              orderId:   orderId,
              name:      nameVal,
              phone:     phoneVal,
              email:     emailVal,
              address:   addressVal,
              city:      cityVal,
              notes:     notesVal,
              cart:      cart,
              subtotal:  subtotal,
              shipping:  shipping,
              total:     totalAmt,
              payment:   selectedPayment
            };
          } else {
            emailResendSection.style.display = "none";
          }
        }

        /* Switch to success state */
        emptyState.style.display   = "none";
        layout.style.display       = "none";
        successState.style.display = "";

        /* Clear cart */
        saveCart([]);

        /* Auto-open WhatsApp */
        window.open(whatsappUrl, "_blank");
      }, 800);
    });
  }

  /* ========================================================
     EMAIL RESEND (COD only — backend API)
     ======================================================== */
  var resendBtn = document.getElementById("resendEmailBtn");
  if (resendBtn) {
    resendBtn.addEventListener("click", function () {
      var emailInput  = document.getElementById("resendEmailInput");
      var statusEl    = document.getElementById("emailResendStatus");
      var email = emailInput ? emailInput.value.trim() : "";

      if (!email || !email.includes("@")) {
        if (statusEl) { statusEl.textContent = "Please enter a valid email address."; statusEl.className = "email-resend-status error"; }
        return;
      }

      resendBtn.disabled = true;
      resendBtn.textContent = "Sending…";
      if (statusEl) { statusEl.textContent = ""; statusEl.className = "email-resend-status"; }

      var orderData = window.__pendingOrder || {};
      orderData.email = email;

      fetch(EMAIL_API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(orderData)
      })
      .then(function (res) {
        if (res.ok) {
          if (statusEl) { statusEl.textContent = "✓ Confirmation email sent to " + email; statusEl.className = "email-resend-status success"; }
          resendBtn.textContent = "Sent ✓";
        } else {
          throw new Error("Server error");
        }
      })
      .catch(function () {
        if (statusEl) { statusEl.textContent = "Failed to send. Please try again."; statusEl.className = "email-resend-status error"; }
        resendBtn.disabled = false;
        resendBtn.textContent = "Send";
      });
    });
  }

  /* ========================================================
     CART DRAWER — Fix: on checkout page, close drawer instead of redirecting
     ======================================================== */
  var cartCheckoutBtn = document.getElementById("checkoutBtn");
  if (cartCheckoutBtn) {
    /* Replace the node to remove main.js listener, then add our own */
    var clone = cartCheckoutBtn.cloneNode(true);
    clone.textContent = "Done — Go to Order";
    cartCheckoutBtn.parentNode.replaceChild(clone, cartCheckoutBtn);
    clone.addEventListener("click", function () {
      var cartDrawer  = document.getElementById("cartDrawer");
      var cartOverlay = document.getElementById("cartOverlay");
      if (cartDrawer)  { cartDrawer.classList.remove("active"); }
      if (cartOverlay) { cartOverlay.classList.remove("active"); }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ========================================================
     INIT
     ======================================================== */
  renderAll();
  selectPaymentMethod("cod"); // set initial state
})();
