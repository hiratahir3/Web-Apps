// Shared client logic: cart, auth, fetch helpers
const API = '/api';
const fmt = n => 'PKR ' + Number(n).toLocaleString('en-PK');

const cart = {
  key: 'lumiere_cart',
  read() { try { return JSON.parse(localStorage.getItem(this.key)) || []; } catch { return []; } },
  write(items) { localStorage.setItem(this.key, JSON.stringify(items)); this.update(); },
  add(p, qty = 1) {
    const items = this.read();
    const ex = items.find(i => i.product_id === p.id);
    if (ex) ex.qty += qty; else items.push({ product_id: p.id, name: p.name, price: p.price, image: p.image, qty });
    this.write(items);
  },
  remove(id) { this.write(this.read().filter(i => i.product_id !== id)); },
  setQty(id, qty) {
    const items = this.read();
    const it = items.find(i => i.product_id === id);
    if (!it) return;
    it.qty = Math.max(1, qty);
    this.write(items);
  },
  clear() { this.write([]); },
  count() { return this.read().reduce((s, i) => s + i.qty, 0); },
  subtotal() { return this.read().reduce((s, i) => s + i.qty * i.price, 0); },
  update() {
    const c = this.count();
    document.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = c ? `Bag (${c})` : 'Bag (0)';
    });
    this.renderDrawer();
  },
  renderDrawer() {
    const list = document.getElementById('cartItems');
    if (!list) return;
    const items = this.read();
    if (!items.length) {
      list.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    } else {
      list.innerHTML = items.map(i => `
        <div class="cart-row">
          <img src="${i.image || ''}" alt="">
          <div class="cart-row-info">
            <div class="cart-row-name">${i.name}</div>
            <div class="cart-row-price">${fmt(i.price)}</div>
            <div class="cart-row-qty">
              <button onclick="cart.setQty(${i.product_id}, ${i.qty - 1})">−</button>
              <span>${i.qty}</span>
              <button onclick="cart.setQty(${i.product_id}, ${i.qty + 1})">+</button>
              <button class="cart-row-remove" onclick="cart.remove(${i.product_id})">remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
    const sub = document.getElementById('cartSubtotal');
    if (sub) sub.textContent = fmt(this.subtotal());
  },
};

function openCart() { document.getElementById('cartDrawer')?.classList.add('open'); cart.renderDrawer(); }
function closeCart() { document.getElementById('cartDrawer')?.classList.remove('open'); }

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
    body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function getMe() { try { return await api('/auth/me'); } catch { return { user: null, admin: null }; } }

document.addEventListener('DOMContentLoaded', () => {
  cart.update();
  // Close cart on overlay click
  document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
  // Update nav greeting if logged in
  getMe().then(({ user }) => {
    document.querySelectorAll('[data-acct-link]').forEach(el => {
      el.textContent = user ? (user.name ? user.name.split(' ')[0] : 'Account') : 'Sign In';
    });
  });
});

window.cart = cart;
window.openCart = openCart;
window.closeCart = closeCart;
window.api = api;
window.fmt = fmt;
