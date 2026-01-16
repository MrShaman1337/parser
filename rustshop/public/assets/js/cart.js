const cartList = document.getElementById("cart-items");
const summarySubtotal = document.getElementById("summary-subtotal");
const summaryTotal = document.getElementById("summary-total");

const formatPrice = (value) => `$${value.toFixed(2)}`;

const renderCart = () => {
  const cart = window.RustShop.getCart();
  if (!cartList) return;
  cartList.innerHTML = "";
  if (!cart.length) {
    cartList.innerHTML = '<div class="card">Your cart is empty.</div>';
    if (summarySubtotal) summarySubtotal.textContent = "$0.00";
    if (summaryTotal) summaryTotal.textContent = "$0.00";
    return;
  }
  cart.forEach((item) => {
    const row = document.createElement("article");
    row.className = "card";
    row.innerHTML = `
      <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <img src="${item.image}" alt="${item.title}" width="120" />
        <div style="flex: 1;">
          <h3>${item.title}</h3>
          <div class="price">${item.priceFormatted || formatPrice(item.price)}</div>
        </div>
        <div>
          <label for="qty-${item.id}">Qty</label>
          <input id="qty-${item.id}" type="number" min="1" value="${item.qty}" data-qty="${item.id}" />
        </div>
        <button class="btn btn-ghost" data-remove="${item.id}">Remove</button>
      </div>
    `;
    cartList.appendChild(row);
  });

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  if (summarySubtotal) summarySubtotal.textContent = formatPrice(subtotal);
  if (summaryTotal) summaryTotal.textContent = formatPrice(subtotal);
};

const handleCartActions = () => {
  if (!cartList) return;
  cartList.addEventListener("input", (e) => {
    const input = e.target.closest("[data-qty]");
    if (!input) return;
    const cart = window.RustShop.getCart();
    const item = cart.find((p) => p.id === input.dataset.qty);
    if (!item) return;
    item.qty = Math.max(1, parseInt(input.value, 10) || 1);
    window.RustShop.saveCart(cart);
    window.RustShop.toast("Cart updated");
    renderCart();
  });

  cartList.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-remove]");
    if (!btn) return;
    const cart = window.RustShop.getCart().filter((item) => item.id !== btn.dataset.remove);
    window.RustShop.saveCart(cart);
    window.RustShop.toast("Item removed");
    renderCart();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  renderCart();
  handleCartActions();
});
