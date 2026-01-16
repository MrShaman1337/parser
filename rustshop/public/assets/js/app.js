const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const storageKey = "rustshop_cart";

const getCart = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
const saveCart = (items) => localStorage.setItem(storageKey, JSON.stringify(items));

const cartCount = () => getCart().reduce((sum, item) => sum + item.qty, 0);

const updateCartCount = () => {
  qsa("[data-cart-count]").forEach((el) => {
    el.textContent = cartCount();
  });
};

const toast = (() => {
  const el = document.createElement("div");
  el.className = "toast";
  document.body.appendChild(el);
  let timer;
  return (message) => {
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("show"), 2200);
  };
})();

const setupDrawer = () => {
  const drawer = qs("[data-drawer]");
  if (!drawer) return;
  qsa("[data-drawer-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => drawer.classList.toggle("open"));
  });
  drawer.addEventListener("click", (e) => {
    if (e.target === drawer) drawer.classList.remove("open");
  });
};

const setupAccordion = () => {
  qsa("[data-accordion-item]").forEach((item) => {
    const btn = qs("button", item);
    if (!btn) return;
    btn.addEventListener("click", () => item.classList.toggle("open"));
  });
};

const setupModal = () => {
  qsa("[data-modal-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = qs(btn.dataset.modalTarget);
      if (modal) modal.classList.add("open");
    });
  });
  qsa("[data-modal-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const modal = btn.closest("[data-modal]");
      if (modal) modal.classList.remove("open");
    });
  });
  qsa("[data-modal]").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  });
};

const fetchProducts = async () => {
  const res = await fetch("data/products.json");
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
};

const addToCart = (product, qty = 1) => {
  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    const name = product.name || product.title || "Item";
    cart.push({
      id: product.id,
      title: name,
      price: product.price,
      priceFormatted: product.priceFormatted,
      image: product.image,
      qty
    });
  }
  saveCart(cart);
  updateCartCount();
  toast("Added to cart");
};

document.addEventListener("DOMContentLoaded", () => {
  setupDrawer();
  setupAccordion();
  setupModal();
  updateCartCount();
});

window.RustShop = {
  fetchProducts,
  addToCart,
  getCart,
  saveCart,
  toast
};
