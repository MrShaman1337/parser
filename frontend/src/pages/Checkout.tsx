import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useI18n } from "../i18n/I18nContext";

const Checkout = () => {
  const { items, clear } = useCart();
  const [orderId, setOrderId] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const { t } = useI18n();

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
      alert(data.error || t("checkout.failed"));
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
          <h1>{t("checkout.title")}</h1>
          <form className="card" onSubmit={handleSubmit}>
            <label htmlFor="email">{t("checkout.email")}</label>
            <input id="email" name="email" type="email" required />
            <label htmlFor="nickname">{t("checkout.nickname")}</label>
            <input id="nickname" name="nickname" type="text" placeholder={t("checkout.optional")} />
            <label htmlFor="server">{t("checkout.server")}</label>
            <input id="server" name="server" type="text" required placeholder={t("checkout.serverPlaceholder")} />
            <label htmlFor="note">{t("checkout.note")}</label>
            <textarea id="note" name="note" rows={3} placeholder={t("checkout.optional")}></textarea>
            <div style={{ marginTop: "1rem" }}>
              <h3>{t("checkout.payment")}</h3>
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
              {t("checkout.placeOrder")}
            </button>
          </form>
        </section>

        <aside className="card sticky">
          <h3>{t("checkout.summary")}</h3>
          <p className="muted">{t("checkout.summaryDesc")}</p>
          <Link className="btn btn-secondary" to="/cart" style={{ width: "100%" }}>
            {t("checkout.backToCart")}
          </Link>
        </aside>
      </div>

      <div className={`modal ${successOpen ? "open" : ""}`}>
        <div className="modal-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>{t("checkout.confirmed")}</h3>
            <button className="btn btn-ghost" onClick={() => setSuccessOpen(false)}>
              {t("checkout.close")}
            </button>
          </div>
          <p className="muted">{t("checkout.thanks")}</p>
          <p>
            {t("checkout.orderId")}: <strong>{orderId}</strong>
          </p>
          <Link className="btn btn-primary" to="/">
            {t("checkout.returnHome")}
          </Link>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
