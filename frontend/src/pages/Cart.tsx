import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

const Cart = () => {
  const { items, updateQty, removeItem, subtotal } = useCart();

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>Your cart</h1>
          <div className="grid">
            {items.length === 0 && <div className="card">Your cart is empty.</div>}
            {items.map((item) => (
              <article className="card" key={item.id}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <img src={item.image} alt={item.title} width={120} />
                  <div style={{ flex: 1 }}>
                    <h3>{item.title}</h3>
                    <div className="price">{item.priceFormatted || `$${item.price.toFixed(2)}`}</div>
                  </div>
                  <div>
                    <label htmlFor={`qty-${item.id}`}>Qty</label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateQty(item.id, Number(e.target.value))}
                    />
                  </div>
                  <button className="btn btn-ghost" onClick={() => removeItem(item.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="card sticky">
          <h3>Order summary</h3>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: "0.5rem" }}>
            <span>Total</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label htmlFor="coupon">Coupon</label>
            <input id="coupon" type="text" placeholder="Enter code" />
            <button className="btn btn-secondary" style={{ width: "100%", marginTop: "0.6rem" }}>
              Apply
            </button>
          </div>
          <Link className="btn btn-primary" to="/checkout" style={{ width: "100%", marginTop: "1rem" }}>
            Proceed to checkout
          </Link>
        </aside>
      </div>
    </main>
  );
};

export default Cart;
