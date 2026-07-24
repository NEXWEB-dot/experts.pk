/* ==========================================================================
   Expert Services — Store logic (products, cart, checkout)
   Persists cart in localStorage under "expertsStoreCart" (shared w/ main.js)
   Fetches from Sanity CMS
   ========================================================================== */
(function () {
  "use strict";

  var CART_KEY = "expertsStoreCart";

  var PLACEHOLDER_PHOTO = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#0d0d0d"/>' +
      '<text x="300" y="310" font-family="Michroma, Arial, sans-serif" font-size="26" font-weight="700" fill="#fabe1a" text-anchor="middle" letter-spacing="1">COMING SOON</text>' +
    "</svg>"
  );

  var allProducts = [];
  var currentCategory = 'all';

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

  // Adding to cart from store uses default first color if available, or none
  function addToCart(productId) {
    var product = allProducts.find(function (p) { return p._id === productId; });
    if (!product) return;

    var cart = getCart();
    var defaultColor = (product.colors && product.colors.length > 0) ? product.colors[0].name : null;
    
    var existing = cart.find(function (i) { 
      return i.id === productId && i.color === defaultColor; 
    });

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id: productId, qty: 1, color: defaultColor, price: product.price, name: product.name, img: product.images ? window.sanityClient.urlFor(product.images[0], {width: 200}) : PLACEHOLDER_PHOTO });
    }
    saveCart(cart);
    renderCart();
    openCart();
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

  /* ---------- Product & Category Fetching ---------- */
  async function loadStoreData() {
    if (!window.sanityClient) {
      console.error("Sanity client not found");
      return;
    }

    try {
      // Fetch categories
      const catQuery = `*[_type == "category"] | order(order asc) { _id, title, "slug": slug.current }`;
      const categories = await window.sanityClient.fetch(catQuery);
      renderFilterBar(categories);

      // Fetch products
      const prodQuery = `*[_type == "product"] | order(order asc, _createdAt desc) {
        _id, name, "slug": slug.current, description, price, oldPrice, badge, comingSoon, inStock,
        "categorySlug": category->slug.current,
        colors, images
      }`;
      allProducts = await window.sanityClient.fetch(prodQuery);
      
      applyFiltersAndSort();
    } catch (err) {
      console.error("Failed to load store data:", err);
      const grid = document.getElementById("productGrid");
      if (grid) grid.innerHTML = '<div class="store-loading">Failed to load products. Please try again later.</div>';
    }
  }

  /* ---------- Filtering and Sorting ---------- */
  function renderFilterBar(categories) {
    const filterBar = document.getElementById('categoryFilterBar');
    if (!filterBar) return;

    let html = `<button class="filter-btn active" data-category="all">All</button>`;
    
    if (categories && categories.length > 0) {
      categories.forEach(cat => {
        html += `<button class="filter-btn" data-category="${cat.slug}">${cat.title}</button>`;
      });
    }

    filterBar.innerHTML = html;

    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        applyFiltersAndSort();
      });
    });
  }

  function applyFiltersAndSort() {
    let filtered = allProducts;
    
    // Apply category filter
    if (currentCategory !== 'all') {
      filtered = allProducts.filter(p => p.categorySlug === currentCategory);
    }

    // Apply sort
    const sortSelect = document.getElementById('productSort');
    if (sortSelect) {
      const sortVal = sortSelect.value;
      if (sortVal === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
      } else if (sortVal === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
      } else {
        // newest (default, already sorted somewhat by the query, but we can't reliably resort without createdAt here unless we fetch it. 
        // We'll just rely on the original array order which was fetched by order/createdAt
        const originalOrderMap = new Map(allProducts.map((p, i) => [p._id, i]));
        filtered.sort((a, b) => originalOrderMap.get(a._id) - originalOrderMap.get(b._id));
      }
    }

    renderProductGrid(filtered);
  }

  const sortSelect = document.getElementById('productSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', applyFiltersAndSort);
  }

  /* ---------- Product grid ---------- */
  function renderProductGrid(products) {
    var grid = document.getElementById("productGrid");
    if (!grid) { return; }

    if (!products || products.length === 0) {
      grid.innerHTML = '<div class="store-loading">No products found.</div>';
      return;
    }

    grid.innerHTML = products.map(function (p) {
      var badgeHtml = p.badge
        ? '<span class="product-badge' + (p.comingSoon ? " badge-soon" : "") + '">' + p.badge + "</span>"
        : "";
      var oldPriceHtml = p.oldPrice
        ? '<span class="old-price">' + formatPKR(p.oldPrice) + "</span>"
        : "";

      var btnHtml = p.comingSoon || !p.inStock
        ? '<button class="add-to-cart-btn soon-btn" disabled>' + (p.comingSoon ? 'Coming Soon' : 'Out of Stock') + '</button>'
        : '<button class="add-to-cart-btn" data-id="' + p._id + '">Add to Cart</button>';

      var imgSrc = (p.images && p.images.length > 0) ? window.sanityClient.urlFor(p.images[0], {width: 600, height: 600}) : PLACEHOLDER_PHOTO;

      // Wrap image and title in an a tag to go to product details
      var productLink = `product.html?slug=${p.slug}`;

      return (
        '<div class="product-card reveal' + (p.comingSoon ? " product-card--soon" : "") + '">' +
          '<a href="' + productLink + '" class="product-media">' +
            badgeHtml +
            '<img src="' + imgSrc + '" alt="' + p.name + '" loading="lazy">' +
            (p.comingSoon ? '<div class="soon-overlay"><span>Coming Soon</span></div>' : (!p.inStock ? '<div class="soon-overlay"><span>Out of Stock</span></div>' : '')) +
          "</a>" +
          '<div class="product-info">' +
            '<a href="' + productLink + '"><h3>' + p.name + '</h3></a>' +
            '<p class="product-desc">' + p.description + "</p>" +
            '<div class="product-price-row">' +
              '<span class="product-price">' + oldPriceHtml + formatPKR(p.price) + "</span>" +
              btnHtml +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    grid.querySelectorAll(".add-to-cart-btn:not([disabled])").forEach(function (btn) {
      btn.addEventListener("click", function (e) { 
        e.preventDefault(); 
        addToCart(btn.getAttribute("data-id")); 
      });
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

    itemsWrap.innerHTML = cart.map(function (item, index) {
      var colorText = item.color ? `<span style="font-size:0.75rem; color:#8a8a8a; display:block; margin-bottom:4px;">Color: ${item.color}</span>` : '';
      
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

  /* ---------- Checkout modal handling (legacy removed in favor of separate page) ---------- */
  var checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function() { window.location.href = "checkout.html"; });
  }

  /* ---------- Init ---------- */
  loadStoreData();
  renderCart();
})();
