import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Checkout = () => {
  const { items, clear } = useCart();
  const [orderId, setOrderId] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!items.length) return;
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get("email") || ""),
      name: String(formData.get("nickname") || ""),
      note: String(formData.get("note") || ""),
      items: items.map((item) => ({ id: item.id, qty: item.qty }))
    };
    const res = await fetch("/api/order-create.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Order failed");
      return;
    }
    clear();
    setOrderId(data.order_id || "");
    setSuccessOpen(true);
    form.reset();
  };

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>Checkout</h1>
          <form className="card" onSubmit={handleSubmit}>
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
            <label htmlFor="nickname">Nickname / SteamID</label>
            <input id="nickname" name="nickname" type="text" placeholder="Optional" />
            <label htmlFor="server">Server</label>
            <input id="server" name="server" type="text" required placeholder="EU Main #1" />
            <label htmlFor="note">Order note</label>
            <textarea id="note" name="note" rows={3} placeholder="Optional"></textarea>
            <div style={{ marginTop: "1rem" }}>
              <h3>Payment method</h3>
              <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                <label>
                  <input type="radio" name="payment" required /> Visa
                </label>
                <label>
                  <input type="radio" name="payment" /> Mastercard
                </label>
                <label>
                  <input type="radio" name="payment" /> PayPal
                </label>
                <label>
                  <input type="radio" name="payment" /> Crypto
                </label>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" style={{ marginTop: "1.5rem" }}>
              Place order
            </button>
          </form>
        </section>

        <aside className="card sticky">
          <h3>Order summary</h3>
          <p className="muted">Review your cart before placing the order.</p>
          <Link className="btn btn-secondary" to="/cart" style={{ width: "100%" }}>
            Back to cart
          </Link>
        </aside>
      </div>

      <div className={`modal ${successOpen ? "open" : ""}`}>
        <div className="modal-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Order confirmed</h3>
            <button className="btn btn-ghost" onClick={() => setSuccessOpen(false)}>
              Close
            </button>
          </div>
          <p className="muted">Thanks for your order. Items will be delivered shortly.</p>
          <p>
            Order ID: <strong>{orderId}</strong>
          </p>
          <Link className="btn btn-primary" to="/">
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
