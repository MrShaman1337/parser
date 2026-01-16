const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

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

const setupActions = () => {
  document.body.addEventListener("click", (e) => {
    const target = e.target.closest("[data-gs-action]");
    if (!target) return;
    const action = target.dataset.gsAction;
    if (action === "add-to-cart") toast("Added to cart");
    if (action === "remove-item") toast("Item removed");
    if (action === "apply-coupon") toast("Coupon applied");
    if (action === "login") toast("Connecting account...");
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

document.addEventListener("DOMContentLoaded", () => {
  setupDrawer();
  setupAccordion();
  setupActions();
  setupModal();
});
