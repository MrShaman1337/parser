const checkoutForm = document.getElementById("checkout-form");
const checkoutSuccess = document.getElementById("checkout-success");
const orderIdEl = document.getElementById("order-id");

document.addEventListener("DOMContentLoaded", () => {
  if (!checkoutForm) return;
  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!checkoutForm.reportValidity()) return;
    const cart = window.RustShop.getCart();
    if (!cart.length) {
      window.RustShop.toast("Cart is empty");
      return;
    }
    const payload = {
      email: document.getElementById("email").value,
      name: document.getElementById("nickname").value,
      note: document.getElementById("note").value,
      items: cart.map((item) => ({ id: item.id, qty: item.qty }))
    };
    try {
      const res = await fetch("api/order-create.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");
      window.RustShop.saveCart([]);
      window.RustShop.toast("Order placed");
      if (orderIdEl) orderIdEl.textContent = data.order_id || "";
      if (checkoutSuccess) checkoutSuccess.classList.add("open");
      checkoutForm.reset();
    } catch (err) {
      window.RustShop.toast(err.message || "Order failed");
    }
  });
});
