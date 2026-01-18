import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useI18n } from "../i18n/I18nContext";

const Cart = () => {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { t } = useI18n();

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>{t("cart.title")}</h1>
          <div className="grid">
            {items.length === 0 && <div className="card">{t("cart.empty")}</div>}
            {items.map((item) => (
              <article className="card" key={item.id}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <img src={item.image} alt={item.title} width={120} />
                  <div style={{ flex: 1 }}>
                    <h3>{item.title}</h3>
                    <div className="price">{item.priceFormatted || `${item.price.toFixed(0)} ₽`}</div>
                  </div>
                  <div>
                    <label htmlFor={`qty-${item.id}`}>{t("cart.qty")}</label>
                    <input
                      id={`qty-${item.id}`}
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => updateQty(item.id, Number(e.target.value))}
                    />
                  </div>
                  <button className="btn btn-ghost" onClick={() => removeItem(item.id)}>
                    {t("cart.remove")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="card sticky">
          <h3>{t("cart.summary")}</h3>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="muted">{t("cart.subtotal")}</span>
            <span>{subtotal.toFixed(0)} ₽</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: "0.5rem" }}>
            <span>{t("cart.total")}</span>
            <span>{subtotal.toFixed(0)} ₽</span>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <label htmlFor="coupon">{t("cart.coupon")}</label>
            <input id="coupon" type="text" placeholder={t("cart.couponPlaceholder")} />
            <button className="btn btn-secondary" style={{ width: "100%", marginTop: "0.6rem" }}>
              {t("cart.apply")}
            </button>
          </div>
          <Link className="btn btn-primary" to="/checkout" style={{ width: "100%", marginTop: "1rem" }}>
            {t("cart.checkout")}
          </Link>
        </aside>
      </div>
    </main>
  );
};

export default Cart;
