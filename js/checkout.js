/* ==========================================================================
   Expert Services — Checkout page logic (Multi-step)
   ========================================================================== */
(function () {
  "use strict";

  var CART_KEY = "expertsStoreCart";
  var currentStep = 1;

  function formatPKR(n) { return "PKR " + n.toLocaleString("en-PK"); }

  function getCart() {
    try {
      var val = localStorage.getItem(CART_KEY);
      if (!val) return [];
      var parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
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

  /* ---------- DOM refs ---------- */
  var emptyState      = document.getElementById("checkoutEmptyState");
  var layout          = document.getElementById("checkoutLayout");
  var successState    = document.getElementById("checkoutSuccess");
  var itemsList       = document.getElementById("checkoutItemsList");
  var cartItemsStep1  = document.getElementById("checkoutCartItems");
  var totalsEl        = document.getElementById("checkoutTotals");
  var orderIdDisplay  = document.getElementById("orderIdDisplay");
  var successDetails  = document.getElementById("successDetails");
  
  var progressBar = document.getElementById("progressBar");
  var progressSteps = document.querySelectorAll(".progress-step");
  var stepContents = document.querySelectorAll(".checkout-step-content");

  /* ---------- Render ---------- */
  function renderAll() {
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

    var subtotal = 0;
    window.currentSubtotal = 0;
    
    // Render Step 1 editable cart
    cartItemsStep1.innerHTML = cart.map(function (item, index) {
      var lineTotal = item.price * item.qty;
      subtotal += lineTotal;
      var colorText = item.color ? `<span style="font-size:0.8rem; color:var(--color-text-muted); display:block; margin-bottom:4px;">Color: ${item.color}</span>` : '';
      
      return `
        <div class="checkout-item">
          <img src="${item.img}" alt="${item.name}" class="checkout-item-img">
          <div class="checkout-item-details">
            <h4>${item.name}</h4>
            ${colorText}
            <div class="checkout-item-meta" style="margin-top:10px;">
              <div class="qty-control">
                <button type="button" data-action="dec" data-index="${index}">&minus;</button>
                <span>${item.qty}</span>
                <button type="button" data-action="inc" data-index="${index}">&plus;</button>
              </div>
              <span class="checkout-item-line-price">${formatPKR(lineTotal)}</span>
            </div>
          </div>
          <button type="button" class="checkout-item-remove" data-action="remove" data-index="${index}" aria-label="Remove">&times;</button>
        </div>
      `;
    }).join("");

    // Bind edit events for Step 1
    cartItemsStep1.querySelectorAll("[data-action]").forEach(function (btn) {
      var index = parseInt(btn.getAttribute("data-index"), 10);
      var action = btn.getAttribute("data-action");
      btn.addEventListener("click", function () {
        if (action === "inc")    { updateQty(index, 1); }
        if (action === "dec")    { updateQty(index, -1); }
        if (action === "remove") { removeFromCart(index); }
      });
    });

    // Render Order Summary (Sidebar)
    itemsList.innerHTML = cart.map(function (item) {
      var lineTotal = item.price * item.qty;
      var colorText = item.color ? `<span style="font-size:0.75rem; color:var(--color-text-muted); display:block;">Color: ${item.color}</span>` : '';
      return `
        <div class="checkout-item">
          <img src="${item.img}" alt="${item.name}" class="checkout-item-img">
          <div class="checkout-item-details">
            <h4>${item.name}</h4>
            ${colorText}
            <div class="checkout-item-meta">
              <span class="checkout-item-qty">Qty: ${item.qty}</span>
              <span class="checkout-item-line-price">${formatPKR(lineTotal)}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");

    /* Totals */
    window.currentSubtotal = subtotal;
    updateShippingDisplay();
  }

  function calculateShipping(cityVal, subtotal, timeVal) {
    if (!cityVal) {
      return { text: "Enter city for shipping", cost: 0 };
    }
    var cityLower = cityVal.toLowerCase().trim();
    if (cityLower.includes("karachi")) {
      var cost = 350;
      var text = "PKR 350 (12pm - 8pm)";
      if (timeVal === "high") {
        cost = 500;
        text = "PKR 500 (8am - 12pm)";
      } else if (timeVal === "low") {
        cost = 200;
        text = "PKR 200 (8pm - 12am)";
      }
      return { text: text, cost: cost };
    } else {
      return { text: "Standard courier rates (PKR 500)", cost: 500 };
    }
  }

  function updateShippingDisplay() {
    if (!totalsEl) return;
    var cityInput = document.getElementById("city");
    var cityVal = cityInput ? cityInput.value : "";
    var subtotal = window.currentSubtotal || 0;
    
    var deliveryTimeField = document.getElementById("deliveryTimeField");
    var deliveryTimeInput = document.getElementById("deliveryTime");
    var timeVal = "medium";
    if (deliveryTimeField && deliveryTimeInput) {
      if (cityVal.toLowerCase().trim().includes("karachi")) {
        deliveryTimeField.style.display = "block";
        timeVal = deliveryTimeInput.value;
      } else {
        deliveryTimeField.style.display = "none";
      }
    }
    
    var shippingInfo = calculateShipping(cityVal, subtotal, timeVal);
    var total = subtotal + shippingInfo.cost;
    
    var shippingHtml = shippingInfo.text === "FREE" 
      ? '<span class="free-tag">FREE</span>' 
      : '<span style="font-size:0.85rem; text-align:right;">' + shippingInfo.text + '</span>';

    var totalText = formatPKR(total) + (shippingInfo.cost === 0 && shippingInfo.text !== "FREE" && shippingInfo.text !== "Enter city for shipping" ? " + Shipping" : "");

    totalsEl.innerHTML =
      '<div class="summary-row"><span>Subtotal</span><span>' + formatPKR(subtotal) + '</span></div>' +
      '<div class="summary-row"><span>Shipping</span>' + shippingHtml + '</div>' +
      '<div class="summary-row summary-total"><span>Total</span><span>' + totalText + '</span></div>';
  }

  var cityInputField = document.getElementById("city");
  if (cityInputField) {
    cityInputField.addEventListener("input", function() {
      updateShippingDisplay();
    });
  }
  var timeInputField = document.getElementById("deliveryTime");
  if (timeInputField) {
    timeInputField.addEventListener("change", function() {
      updateShippingDisplay();
    });
  }

  /* ---------- Step Navigation ---------- */
  function goToStep(stepNumber) {
    currentStep = stepNumber;
    
    // Update Progress Bar
    var progressPercentage = ((stepNumber - 1) / 2) * 100;
    progressBar.style.width = progressPercentage + "%";
    
    progressSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      step.classList.remove('active', 'completed');
      if (stepNum === currentStep) {
        step.classList.add('active');
      } else if (stepNum < currentStep) {
        step.classList.add('completed');
      }
    });

    // Update Content
    stepContents.forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById('step' + stepNumber).classList.add('active');
    
    if (stepNumber === 2 || stepNumber === 3) {
       updateShippingDisplay();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('btnNextToStep2')?.addEventListener('click', () => {
    goToStep(2);
  });
  
  document.getElementById('btnBackToStep1')?.addEventListener('click', () => {
    goToStep(1);
  });
  
  document.getElementById('checkoutFormStep2')?.addEventListener('submit', (e) => {
    e.preventDefault();
    goToStep(3);
  });
  
  document.getElementById('btnBackToStep2')?.addEventListener('click', () => {
    goToStep(2);
  });

  /* ---------- Form submission ---------- */
  function generateOrderId() {
    return "ES-" + Date.now().toString(36).toUpperCase().slice(-6);
  }

  var form3 = document.getElementById("checkoutFormStep3");
  if (form3) {
    form3.addEventListener("submit", function (e) {
      e.preventDefault();

      var btn = document.getElementById("placeOrderBtn");
      btn.querySelector(".submit-text").style.display   = "none";
      btn.querySelector(".submit-spinner").style.display = "";
      btn.disabled = true;

      // Collect data for WhatsApp integration
      var nameVal = document.getElementById("fullName").value;
      var phoneVal = document.getElementById("phone").value;
      var addressVal = document.getElementById("address").value;
      var cityVal = document.getElementById("city").value;
      var notesVal = document.getElementById("orderNotes").value;

      // Simulate brief processing delay
      setTimeout(function () {
        var orderId = generateOrderId();
        var cart = getCart();
        
        var orderText = `*New Order: ${orderId}*%0A%0A`;
        orderText += `*Customer Details:*%0AName: ${nameVal}%0APhone: ${phoneVal}%0AAddress: ${addressVal}, ${cityVal}%0A`;
        if (notesVal) orderText += `Notes: ${notesVal}%0A`;
        orderText += `%0A*Order Items:*%0A`;
        
        cart.forEach(item => {
          orderText += `- ${item.qty}x ${item.name} `;
          if (item.color) orderText += `(${item.color}) `;
          orderText += `- ${formatPKR(item.price * item.qty)}%0A`;
        });
        
        var deliveryTimeInput = document.getElementById("deliveryTime");
        var timeVal = deliveryTimeInput ? deliveryTimeInput.value : "medium";
        var subtotal = cart.reduce(function (sum, item) { return sum + (item.price * item.qty); }, 0);
        var shippingInfo = calculateShipping(cityVal, subtotal, timeVal);
        var totalAmount = subtotal + shippingInfo.cost;
        
        orderText += `%0A*Subtotal:* ${formatPKR(subtotal)}%0A`;
        orderText += `*Shipping:* ${shippingInfo.text}%0A`;
        orderText += `*Total Amount:* ${formatPKR(totalAmount)} ${shippingInfo.cost === 0 && shippingInfo.text !== "FREE" ? "+ Shipping" : ""} (COD)%0A`;

        // Redirect to WhatsApp
        var whatsappNumber = "923001234567"; // Placeholder, the user can change this
        var whatsappUrl = `https://wa.me/${whatsappNumber}?text=${orderText}`;

        orderIdDisplay.textContent = "Order ID: " + orderId;
        successDetails.innerHTML =
          '<p>Delivering to <strong>' + nameVal + '</strong> in <strong>' + cityVal + '</strong></p>' +
          '<div style="margin-top: 20px;"><a href="' + whatsappUrl + '" target="_blank" class="btn btn-gold" style="text-decoration:none; display:inline-block; margin-bottom: 15px;">Send Order via WhatsApp</a><p style="font-size: 0.85rem; color: var(--color-text-muted);">Please click the button above to confirm your order via WhatsApp.</p></div>';

        emptyState.style.display   = "none";
        layout.style.display       = "none";
        successState.style.display = "";

        // Clear cart
        saveCart([]);
        
        // Auto-open WhatsApp in a new tab
        window.open(whatsappUrl, '_blank');
      }, 800);
    });
  }

  /* ---------- Init ---------- */
  renderAll();
})();
