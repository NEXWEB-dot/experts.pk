/* ==========================================================================
   Expert Services — Product Detail Page
   ========================================================================== */
(function () {
  "use strict";

  var currentProduct = null;
  var selectedColor = null;
  var quantity = 1;
  var CART_KEY = "expertsStoreCart";

  var PLACEHOLDER_PHOTO = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#0d0d0d"/>' +
      '<text x="300" y="310" font-family="Michroma, Arial, sans-serif" font-size="26" font-weight="700" fill="#fabe1a" text-anchor="middle" letter-spacing="1">COMING SOON</text>' +
    "</svg>"
  );

  function formatPKR(n) {
    return "PKR " + n.toLocaleString("en-PK");
  }

  /* ---------- URL Params ---------- */
  function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug');
  }

  /* ---------- Cart storage ---------- */
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

  /* ---------- Fetch Product ---------- */
  async function loadProduct() {
    const slug = getSlugFromUrl();
    const container = document.getElementById('productDetailContainer');
    
    if (!slug) {
      container.innerHTML = '<div class="store-loading">Product not found. <a href="store.html" style="color:var(--color-secondary)">Go to Store</a></div>';
      return;
    }

    if (!window.sanityClient) {
      console.error("Sanity client not found");
      return;
    }

    try {
      const query = `*[_type == "product" && slug.current == "${slug}"][0]`;
      currentProduct = await window.sanityClient.fetch(query);

      if (!currentProduct) {
        container.innerHTML = '<div class="store-loading">Product not found. <a href="store.html" style="color:var(--color-secondary)">Go to Store</a></div>';
        return;
      }

      renderProduct(currentProduct, container);
    } catch (err) {
      console.error("Error fetching product:", err);
      container.innerHTML = '<div class="store-loading">Failed to load product details.</div>';
    }
  }

  /* ---------- Render Product ---------- */
  function renderProduct(product, container) {
    // Images
    let mainImgSrc = PLACEHOLDER_PHOTO;
    let thumbnailsHtml = '';
    
    if (product.images && product.images.length > 0) {
      mainImgSrc = window.sanityClient.urlFor(product.images[0], {width: 800, height: 800});
      
      if (product.images.length > 1) {
        thumbnailsHtml = '<div class="thumbnail-list">';
        product.images.forEach((img, idx) => {
          const thumbSrc = window.sanityClient.urlFor(img, {width: 150, height: 150});
          const fullSrc = window.sanityClient.urlFor(img, {width: 800, height: 800});
          thumbnailsHtml += `
            <div class="thumbnail ${idx === 0 ? 'active' : ''}" data-full="${fullSrc}">
              <img src="${thumbSrc}" alt="Thumbnail ${idx + 1}">
            </div>
          `;
        });
        thumbnailsHtml += '</div>';
      }
    }

    // Colors
    let colorsHtml = '';
    if (product.colors && product.colors.length > 0) {
      selectedColor = product.colors[0].name; // default
      colorsHtml = `
        <div class="color-selector">
          <h4>Colors</h4>
          <div class="color-options" id="colorOptions">
            ${product.colors.map((c, i) => `
              <div class="color-swatch-wrapper ${i === 0 ? 'active' : ''}" data-color="${c.name}">
                <div class="color-swatch" style="background-color: ${c.hex}"></div>
                <span class="color-name">${c.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Price
    let oldPriceHtml = product.oldPrice ? `<span class="detail-old-price">${formatPKR(product.oldPrice)}</span>` : '';
    let btnDisabled = product.comingSoon || !product.inStock ? 'disabled' : '';
    let btnText = product.comingSoon ? 'Coming Soon' : (!product.inStock ? 'Out of Stock' : 'Add to Cart');

    container.innerHTML = `
      <div class="product-detail-grid reveal">
        <div class="product-gallery">
          <div class="main-image">
            <img src="${mainImgSrc}" id="mainProductImage" alt="${product.name}">
          </div>
          ${thumbnailsHtml}
        </div>
        
        <div class="product-info-block">
          <h1>${product.name}</h1>
          <div class="detail-price">
            ${oldPriceHtml}
            ${formatPKR(product.price)}
          </div>
          
          <div class="detail-description">
            ${product.description}
          </div>
          
          ${colorsHtml}
          
          <div class="add-to-cart-section">
            <div class="qty-input">
              <button id="qtyDec">&minus;</button>
              <span id="qtyDisplay">1</span>
              <button id="qtyInc">&plus;</button>
            </div>
            <button class="btn btn-gold btn-add-cart" id="addToCartBtn" ${btnDisabled}>${btnText}</button>
          </div>
          
          <div class="trust-badges-detail">
            <div class="trust-badge-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Secure Checkout</span>
            </div>
            <div class="trust-badge-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5a2 2 0 0 1-2 2h-1M6 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
              <span>Cash on Delivery Available</span>
            </div>
            <div class="trust-badge-item">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>Genuine Products</span>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    
    // Trigger reveal
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in-view'));
    }, 50);
  }

  function bindEvents() {
    // Gallery Thumbnails
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImg = document.getElementById('mainProductImage');
    
    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', function() {
        thumbnails.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        mainImg.src = this.getAttribute('data-full');
      });
    });

    // Colors
    const colorSwatches = document.querySelectorAll('.color-swatch-wrapper');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', function() {
        colorSwatches.forEach(s => s.classList.remove('active'));
        this.classList.add('active');
        selectedColor = this.getAttribute('data-color');
      });
    });

    // Quantity
    const qtyDec = document.getElementById('qtyDec');
    const qtyInc = document.getElementById('qtyInc');
    const qtyDisplay = document.getElementById('qtyDisplay');
    
    if (qtyDec && qtyInc && qtyDisplay) {
      qtyDec.addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          qtyDisplay.textContent = quantity;
        }
      });
      qtyInc.addEventListener('click', () => {
        quantity++;
        qtyDisplay.textContent = quantity;
      });
    }

    // Add to Cart
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        if (!currentProduct) return;
        
        var cart = getCart();
        var existing = cart.find(function (i) { 
          return i.id === currentProduct._id && i.color === selectedColor; 
        });

        if (existing) {
          existing.qty += quantity;
        } else {
          cart.push({ 
            id: currentProduct._id, 
            qty: quantity, 
            color: selectedColor, 
            price: currentProduct.price, 
            name: currentProduct.name, 
            img: (currentProduct.images && currentProduct.images.length > 0) ? window.sanityClient.urlFor(currentProduct.images[0], {width: 200}) : PLACEHOLDER_PHOTO 
          });
        }
        
        window.expertsCart.saveCart(cart);
        window.expertsCart.renderCart();
        window.expertsCart.openCart();
        
        // Reset qty
        quantity = 1;
        if(qtyDisplay) qtyDisplay.textContent = quantity;
      });
    }
  }

  /* ---------- Init ---------- */
  loadProduct();
  window.expertsCart.renderCart();
})();

