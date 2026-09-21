/* =====================================================================
   Angadi — Supabase data layer (replaces the old localStorage version)

   SETUP:
   1. Paste your Project URL and anon key below.
   2. Add this line to the <head> of every HTML page, BEFORE data.js:
      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

   Every function here is now ASYNC — call it with `await` inside an
   `async function`. Function names match the old file where possible,
   so most page logic only needs small changes (add `async`/`await`).
   ===================================================================== */

const SUPABASE_URL = "https://dxmkwqyxgjgfpkogwrkd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_3BPJOg6gXZt5Pwov2XNBZQ_lS7vf2JE";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ---------------- AUTH ---------------- */

async function signUp(email, password, name, role, extra = {}) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const userId = data.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({ id: userId, name, role, phone: extra.phone || null });
  if (profileError) throw profileError;

  if (role === "supplier") {
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .insert({ supplier_id: userId, name: extra.shopName, area: extra.area || "Kerala" })
      .select()
      .single();
    if (shopError) throw shopError;
    return { userId, role, shopId: shop.id, name };
  }
  return { userId, role, name };
}

async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return getSessionProfile();
}

async function signOut() {
  await supabase.auth.signOut();
}

// Returns { userId, role, name, shopId? } for the currently logged-in user, or null.
async function getSessionProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  let shopId = null;
  if (profile.role === "supplier") {
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("supplier_id", user.id)
      .single();
    shopId = shop ? shop.id : null;
  }
  return { userId: user.id, role: profile.role, name: profile.name, shopId };
}

/* ---------------- PROFILES (admin use — RLS lets admins read all rows) ---------------- */

async function getProfiles(role) {
  let query = supabase.from("profiles").select("*");
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/* ---------------- SHOPS ---------------- */

async function getShops() {
  const { data, error } = await supabase.from("shops").select("*");
  if (error) throw error;
  return data;
}

function findShop(shops, id) {
  return shops.find(s => s.id === id);
}

async function getShopById(id) {
  const { data, error } = await supabase.from("shops").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

async function deleteShop(id) {
  const { error } = await supabase.from("shops").delete().eq("id", id);
  if (error) throw error;
}

async function createShop(supplierId, name, area) {
  const { data, error } = await supabase
    .from("shops").insert({ supplier_id: supplierId, name, area }).select().single();
  if (error) throw error;
  return data;
}

/* ---------------- PRODUCTS ---------------- */

async function getProducts(filters = {}) {
  let query = supabase.from("products").select("*");
  if (filters.shopId) query = query.eq("shop_id", filters.shopId);
  if (filters.category) query = query.eq("category", filters.category);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function findProduct(products, id) {
  return products.find(p => p.id === id);
}

async function getProductById(id) {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
  if (error) return null;
  return data;
}

async function createProduct(product) {
  const { data, error } = await supabase.from("products").insert(product).select().single();
  if (error) throw error;
  return data;
}

async function updateProduct(id, changes) {
  const { error } = await supabase.from("products").update(changes).eq("id", id);
  if (error) throw error;
}

async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- REVIEWS ---------------- */

async function getReviews(productId) {
  const { data, error } = await supabase
    .from("reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

async function uploadReviewMedia(file) {
  const path = `${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("review-media").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("review-media").getPublicUrl(path);
  return data.publicUrl;
}

async function addReview(review) {
  const { error } = await supabase.from("reviews").insert(review);
  if (error) throw error;
}

/* ---------------- ORDERS ---------------- */

async function createOrder(order, items) {
  const { data: newOrder, error } = await supabase.from("orders").insert(order).select().single();
  if (error) throw error;

  const rows = items.map(it => ({
    order_id: newOrder.id, product_id: it.productId, qty: it.qty, price_at_order: it.price
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(rows);
  if (itemsError) throw itemsError;

  return newOrder;
}

async function getOrders(filters = {}) {
  let query = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function getOrderById(id) {
  const { data, error } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function updateOrderStatus(id, status) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

// Live updates for track.html — calls onUpdate(order) whenever the order changes.
function subscribeToOrder(orderId, onUpdate) {
  return supabase
    .channel(`order-${orderId}`)
    .on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
      payload => onUpdate(payload.new))
    .subscribe();
}

/* ---------------- CART (still local — nothing sensitive, no need for a DB round trip) ---------------- */

function readLocal(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch (e) { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function getCart() { return readLocal("angadi_cart", []); }
function saveCart(v) { writeLocal("angadi_cart", v); }
function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find(c => c.productId === productId);
  if (existing) existing.qty += qty; else cart.push({ productId, qty });
  saveCart(cart);
  updateCartBadge();
}
function removeFromCart(productId) {
  saveCart(getCart().filter(c => c.productId !== productId));
  updateCartBadge();
}
function setCartQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(c => c.productId === productId);
  if (item) { item.qty = Math.max(1, qty); saveCart(cart); }
  updateCartBadge();
}
function cartCount() { return getCart().reduce((n, c) => n + c.qty, 0); }
function cartTotal(products) {
  return getCart().reduce((sum, c) => {
    const p = findProduct(products, c.productId);
    return sum + (p ? p.price * c.qty : 0);
  }, 0);
}
function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (el) el.textContent = cartCount();
}

/* ---------------- DISPLAY HELPERS (unchanged) ---------------- */

function money(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
function stars(rating) {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(5 - full);
}
function stockBadge(stock) {
  if (stock === "available") return '<span class="badge ok">In stock</span>';
  if (stock === "soldout") return '<span class="badge warn">Sold out</span>';
  return '<span class="badge warn">Unavailable</span>';
}
function toast(msg) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}
