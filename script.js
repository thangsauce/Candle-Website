// script.js
const CART_KEY = "STORENAME_cart_v1";

const CATALOG = window.CATALOG || {};
const money = (n) => `$${Number(n).toFixed(2)}`;

function normalize(str) {
  return String(str || "").toLowerCase().trim();
}

// ===== DOM elements =====
const productGrid = document.getElementById("productGrid");

const moodFilter = document.getElementById("moodFilter");
const sortSelect = document.getElementById("sortSelect");
const inStockOnly = document.getElementById("inStockOnly");
const searchInput = document.getElementById("searchInput");

// Cart UI
const overlay = document.getElementById("overlay");
const cartDrawer = document.getElementById("cartDrawer");
const cartList = document.getElementById("cartList");
const cartEmpty = document.getElementById("cartEmpty");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const openCartBtn = document.getElementById("openCartBtn");
const closeCartBtn = document.getElementById("closeCartBtn");
const clearCartBtn = document.getElementById("clearCartBtn");
const toastCloseBtn = document.getElementById("toastCloseBtn");
const toastViewCartBtn = document.getElementById("toastViewCartBtn");

// Toast UI
const cartToast = document.getElementById("cartToast");
const toastTitle = document.getElementById("toastTitle");
const toastBody = document.getElementById("toastBody");
let toastTimer = null;

// ===== Build products from catalog =====
let products = [];

function createProductCard(p) {
  const article = document.createElement("article");
  article.className = "product";
  article.dataset.id = p.id;
  article.dataset.name = p.name;
  article.dataset.destination = p.destination;
  article.dataset.mood = p.mood;
  article.dataset.scents = p.scents.join(",");
  article.dataset.price = String(p.price);
  article.dataset.instock = String(!!p.inStock);

  const chipsHTML = p.scents.map((s) => `<span class="chip">${s}</span>`).join("");

  const badgeHTML = p.inStock
    ? `<span class="pill">${p.tag || "SIGNATURE"}</span>`
    : `<span class="oos-badge">OUT OF STOCK</span>`;

  article.innerHTML = `
    <div class="label">
      <div class="label-top">
        <div>
          <h4>${p.name}</h4>
          <p class="mood">${p.mood}</p>
        </div>
        <div style="display:flex;align-items:flex-start;gap:6px;flex-shrink:0;">
          <button class="wishlist-btn" type="button" data-wishlist-id="${p.id}" aria-label="Save to wishlist" title="Save to wishlist">♡</button>
          ${badgeHTML}
        </div>
      </div>

      <p class="meta"><span>Destination:</span> ${p.destination}</p>

      <div class="chips">
        ${chipsHTML}
      </div>

      <div class="buy-row">
        <div>
          <p class="price">${money(p.price)}</p>
          <p class="muted tiny">8oz • Soy blend</p>
        </div>
        ${p.inStock ? `
        <div class="card-add-row">
          <div class="card-qty-controls">
            <button class="qty-btn card-qty-btn" type="button" data-card-action="dec" data-card-id="${p.id}">−</button>
            <span class="card-qty-display" id="card-qty-${p.id}">1</span>
            <button class="qty-btn card-qty-btn" type="button" data-card-action="inc" data-card-id="${p.id}">+</button>
          </div>
          <button class="btn add" type="button">Add to Cart</button>
        </div>
        ` : `<button class="btn add notify-btn" type="button" disabled>Notify Me</button>`}
      </div>
    </div>
  `;

  if (!p.inStock) article.classList.add("oos");
  return article;
}

function renderProductsFromCatalog() {
  const list = Object.values(CATALOG);

  productGrid.innerHTML = "";
  products = list.map((p) => {
    const el = createProductCard(p);
    productGrid.appendChild(el);
    return { ...p, el };
  });
}

// ===== Mood options =====
function populateMoodOptions() {
  moodFilter.innerHTML = `<option value="all">All moods</option>`;
  const moods = [...new Set(products.map((p) => p.mood))].sort((a, b) => a.localeCompare(b));

  for (const mood of moods) {
    const opt = document.createElement("option");
    opt.value = mood;
    opt.textContent = mood;
    moodFilter.appendChild(opt);
  }
}

// ===== Filtering + Sorting =====
function applyFilters() {
  const moodValue = moodFilter.value;
  const q = normalize(searchInput.value);
  const sortValue = sortSelect.value;
  const stockOnly = inStockOnly.checked;

  const visible = [];

  for (const p of products) {
    const moodOk = moodValue === "all" || p.mood === moodValue;

    const haystack = normalize(
      [p.name, p.destination, p.mood, (p.scents || []).join(" ")].join(" ")
    );

    const searchOk = !q || haystack.includes(q);
    const stockOk = !stockOnly || !!p.inStock;

    const show = moodOk && searchOk && stockOk;
    p.el.style.display = show ? "" : "none";
    if (show) visible.push(p);
  }

  visible.sort((a, b) => {
    switch (sortValue) {
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "mood-asc":
        return a.mood.localeCompare(b.mood) || a.name.localeCompare(b.name);
      case "mood-desc":
        return b.mood.localeCompare(a.mood) || a.name.localeCompare(b.name);
      case "price-asc":
        return a.price - b.price || a.name.localeCompare(b.name);
      case "price-desc":
        return b.price - a.price || a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  for (const p of visible) productGrid.appendChild(p.el);
}

// ===== Cart storage =====
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

let cart = loadCart();

function getProductById(id) {
  return products.find((p) => p.id === id) || CATALOG[id] || null;
}

// ===== Toast =====
function showToast({ title = "Added to cart", message = "Item added." } = {}) {
  toastTitle.textContent = title;
  toastBody.textContent = message;
  cartToast.hidden = false;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    cartToast.hidden = true;
  }, 3500);
}

function hideToast() {
  cartToast.hidden = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = null;
}

// ===== Cart logic =====
function addToCart(productId, qty = 1) {
  const p = getProductById(productId);
  if (!p || !p.inStock) return;

  if (!cart[productId]) cart[productId] = { qty: 0 };
  cart[productId].qty += qty;

  if (cart[productId].qty <= 0) delete cart[productId];

  saveCart(cart);
  renderCart();

  showToast({
    title: `Added to cart${qty > 1 ? ` ×${qty}` : ""}`,
    message: qty > 1
      ? `${p.name} • ${money(p.price)} each — ${money(p.price * qty)} total`
      : `${p.name} • ${money(p.price)}`,
  });
}

function setQty(productId, qty) {
  if (qty <= 0) delete cart[productId];
  else cart[productId] = { qty };

  saveCart(cart);
  renderCart();
}

function clearCart() {
  cart = {};
  saveCart(cart);
  renderCart();
}

function computeCartSummary() {
  let totalQty = 0;
  let totalCost = 0;

  for (const [id, item] of Object.entries(cart)) {
    const p = getProductById(id);
    if (!p) continue;
    totalQty += item.qty;
    totalCost += item.qty * p.price;
  }

  return { totalQty, totalCost };
}

function renderCart() {
  cartList.innerHTML = "";

  const entries = Object.entries(cart);
  const hasItems = entries.length > 0;

  cartEmpty.style.display = hasItems ? "none" : "";
  cartList.style.display = hasItems ? "" : "none";

  for (const [id, item] of entries) {
    const p = getProductById(id);
    if (!p) continue;

    const li = document.createElement("li");
    li.className = "cart-item";

    li.innerHTML = `
      <div class="cart-item-top">
        <div>
          <h4>${p.name}</h4>
          <p class="sub">${p.mood} • ${p.destination}</p>
        </div>
        <div style="text-align:right;">
          <div class="sub">${money(p.price)}</div>
          <button class="remove" type="button" data-action="remove" data-id="${id}">Remove</button>
        </div>
      </div>

      <div class="qty-row">
        <div class="qty-controls">
          <button class="qty-btn" type="button" data-action="dec" data-id="${id}" aria-label="Decrease quantity">−</button>
          <div class="qty" aria-label="Quantity">${item.qty}</div>
          <button class="qty-btn" type="button" data-action="inc" data-id="${id}" aria-label="Increase quantity">+</button>
        </div>

        <div class="sub">
          Line: <b>${money(p.price * item.qty)}</b>
        </div>
      </div>
    `;

    cartList.appendChild(li);
  }

  const { totalQty, totalCost } = computeCartSummary();
  cartTotal.textContent = money(totalCost);
  cartCount.textContent = String(totalQty);
}

// ===== Drawer open/close =====
function openCart() {
  overlay.classList.add("open");
  cartDrawer.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  overlay.classList.remove("open");
  cartDrawer.classList.remove("open");
  document.body.style.overflow = "";
}

// ===== Hard-wired listeners (bulletproof) =====
openCartBtn.addEventListener("click", (e) => {
  e.preventDefault();
  hideToast();
  openCart();
});

closeCartBtn.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeCart();
});

overlay.addEventListener("click", (e) => {
  e.preventDefault();
  if (wishlistDrawer && wishlistDrawer.classList.contains("open")) {
    closeWishlist();
  } else {
    closeCart();
  }
});

clearCartBtn.addEventListener("click", (e) => {
  e.preventDefault();
  clearCart();
});

toastCloseBtn.addEventListener("click", (e) => {
  e.preventDefault();
  hideToast();
});

toastViewCartBtn.addEventListener("click", (e) => {
  e.preventDefault();
  hideToast();
  openCart();
});

// ===== One unified click handler (FIXED for Text nodes) =====
document.addEventListener("click", (e) => {
  const target = (e.target instanceof Element) ? e.target : e.target.parentElement;
  if (!target) return;

  const btn = target.closest("button");
  if (!btn) return;

  // Card qty controls (inc/dec on product card)
  if (btn.dataset.cardAction) {
    const id = btn.dataset.cardId;
    const display = document.getElementById("card-qty-" + id);
    if (!display) return;
    let qty = parseInt(display.textContent) || 1;
    if (btn.dataset.cardAction === "inc") qty = Math.min(qty + 1, 10);
    if (btn.dataset.cardAction === "dec") qty = Math.max(qty - 1, 1);
    display.textContent = qty;
    return;
  }

  // Add to cart
  if (btn.classList.contains("add")) {
    const card = btn.closest(".product");
    if (!card) return;

    const id = card.dataset.id;
    const p = getProductById(id);
    if (!p || !p.inStock) return;

    const display = document.getElementById("card-qty-" + id);
    const qty = display ? (parseInt(display.textContent) || 1) : 1;
    addToCart(id, qty);
    if (display) display.textContent = "1"; // reset after adding
    return;
  }

  // Cart quantity controls
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!action || !id) return;

  const currentQty = cart[id]?.qty ?? 0;

  if (action === "inc") setQty(id, currentQty + 1);
  if (action === "dec") setQty(id, currentQty - 1);
  if (action === "remove") setQty(id, 0);
});

// Esc closes cart + toast
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (cartDrawer.classList.contains("open")) closeCart();
    if (!cartToast.hidden) hideToast();
  }
});

// Filters
moodFilter.addEventListener("change", applyFilters);
sortSelect.addEventListener("change", applyFilters);
inStockOnly.addEventListener("change", applyFilters);
searchInput.addEventListener("input", applyFilters);

// ===== Wishlist =====
const WISHLIST_KEY = "STORENAME_wishlist_v1";

function loadWishlist() {
  try { return JSON.parse(localStorage.getItem(WISHLIST_KEY) || "[]"); }
  catch { return []; }
}
function saveWishlist(list) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
}

let wishlist = loadWishlist();

function isWishlisted(id) { return wishlist.includes(id); }

function toggleWishlist(id) {
  if (isWishlisted(id)) {
    wishlist = wishlist.filter(w => w !== id);
  } else {
    wishlist.push(id);
  }
  saveWishlist(wishlist);
  renderWishlistButtons();
  renderWishlistDrawer();
  updateWishlistBadge();
}

function updateWishlistBadge() {
  const count = wishlist.length;
  const badge = document.getElementById("wishlistBadge");
  const badgeMobile = document.getElementById("wishlistBadgeMobile");
  if (badge) badge.textContent = count;
  if (badgeMobile) badgeMobile.textContent = count;
}

function renderWishlistButtons() {
  document.querySelectorAll(".wishlist-btn").forEach(btn => {
    const id = btn.dataset.wishlistId;
    const saved = isWishlisted(id);
    btn.textContent = saved ? "♥" : "♡";
    btn.classList.toggle("wishlisted", saved);
    btn.setAttribute("aria-label", saved ? "Remove from wishlist" : "Save to wishlist");
  });
}

function renderWishlistDrawer() {
  const list = document.getElementById("wishlistList");
  const empty = document.getElementById("wishlistEmpty");
  if (!list || !empty) return;

  list.innerHTML = "";
  if (wishlist.length === 0) {
    empty.style.display = "";
    list.style.display = "none";
    return;
  }

  empty.style.display = "none";
  list.style.display = "";

  for (const id of wishlist) {
    const p = CATALOG[id];
    if (!p) continue;
    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item-top">
        <div>
          <h4>${p.name}</h4>
          <p class="sub">${p.mood} • ${p.destination}</p>
        </div>
        <div style="text-align:right;">
          <div class="sub">${money(p.price)}</div>
          <button class="remove" type="button" data-wishlist-remove="${id}">Remove</button>
        </div>
      </div>
      <div class="qty-row">
        <span class="sub">${p.inStock ? "In Stock" : "Out of Stock"}</span>
        ${p.inStock ? `<button class="btn" style="font-size:12px;padding:6px 10px;" data-wishlist-add="${id}">Add to Cart</button>` : ""}
      </div>
    `;
    list.appendChild(li);
  }
}

// Wishlist drawer open/close
const wishlistDrawer = document.getElementById("wishlistDrawer");
const openWishlistBtn = document.getElementById("openWishlistBtn");
const closeWishlistBtn = document.getElementById("closeWishlistBtn");
const clearWishlistBtn = document.getElementById("clearWishlistBtn");
const addAllToCartBtn = document.getElementById("addAllToCartBtn");
const mobileWishlistBtn = document.getElementById("mobileWishlistBtn");

function openWishlist() {
  overlay.classList.add("open");
  wishlistDrawer.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeWishlist() {
  overlay.classList.remove("open");
  wishlistDrawer.classList.remove("open");
  document.body.style.overflow = "";
}

if (openWishlistBtn) openWishlistBtn.addEventListener("click", () => { hideToast(); openWishlist(); });
if (closeWishlistBtn) closeWishlistBtn.addEventListener("click", closeWishlist);
if (mobileWishlistBtn) mobileWishlistBtn.addEventListener("click", () => {
  document.getElementById("mobileMenu").classList.remove("open");
  document.getElementById("mobileMenuBtn").classList.remove("open");
  openWishlist();
});

if (clearWishlistBtn) clearWishlistBtn.addEventListener("click", () => {
  wishlist = [];
  saveWishlist(wishlist);
  renderWishlistButtons();
  renderWishlistDrawer();
  updateWishlistBadge();
});

if (addAllToCartBtn) addAllToCartBtn.addEventListener("click", () => {
  const inStock = wishlist.filter(id => CATALOG[id]?.inStock);
  inStock.forEach(id => addToCart(id, 1));
  if (inStock.length > 0) {
    closeWishlist();
    showToast({ title: `${inStock.length} item${inStock.length > 1 ? "s" : ""} added to cart`, message: "From your wishlist" });
  }
});

// Wishlist click delegation
document.addEventListener("click", (e) => {
  // Heart button on card
  const wishBtn = e.target.closest(".wishlist-btn");
  if (wishBtn) { toggleWishlist(wishBtn.dataset.wishlistId); return; }
  // Remove from wishlist drawer
  const removeBtn = e.target.closest("[data-wishlist-remove]");
  if (removeBtn) { toggleWishlist(removeBtn.dataset.wishlistRemove); return; }
  // Add to cart from wishlist drawer
  const addBtn = e.target.closest("[data-wishlist-add]");
  if (addBtn) { addToCart(addBtn.dataset.wishlistAdd, 1); return; }
});



// ===== Mobile filter drawer =====
const filterToggleBtn = document.getElementById("filterToggleBtn");
const heroControls = document.getElementById("heroControls");

if (filterToggleBtn && heroControls) {
  filterToggleBtn.addEventListener("click", () => {
    const isOpen = heroControls.classList.toggle("filters-open");
    filterToggleBtn.classList.toggle("active", isOpen);
    filterToggleBtn.textContent = isOpen ? "✕ Close Filters" : "⚙️ Filters & Sort";
  });
}

// ===== Mobile menu =====
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenu = document.getElementById("mobileMenu");
const mobileShopLink = document.getElementById("mobileShopLink");

if (mobileMenuBtn && mobileMenu) {
  mobileMenuBtn.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    mobileMenuBtn.classList.toggle("open", isOpen);
    mobileMenuBtn.setAttribute("aria-expanded", String(isOpen));
  });

  // Close menu when a link is clicked
  mobileMenu.querySelectorAll(".mobile-link").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      mobileMenuBtn.classList.remove("open");
      mobileMenuBtn.setAttribute("aria-expanded", "false");
    });
  });

  // Close menu when cart opens
  const _origOpenCart = openCart;
  // Already defined above, just close menu on cart open
  document.getElementById("openCartBtn").addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    mobileMenuBtn.classList.remove("open");
  });
}

// ===== Init =====
renderProductsFromCatalog();
populateMoodOptions();
applyFilters();
renderCart();
renderWishlistButtons();
renderWishlistDrawer();
updateWishlistBadge();