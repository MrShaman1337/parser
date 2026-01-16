import { useState } from "react";

const Support = () => {
  const [open, setOpen] = useState<number | null>(0);
  const toggle = (index: number) => setOpen(open === index ? null : index);

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>Support & FAQ</h1>
          <div className="card">
            {[
              {
                q: "When will I receive my items?",
                a: "Most items are delivered instantly. If a server is offline, delivery will resume automatically."
              },
              { q: "How do I connect my Steam account?", a: "Use the Sign In button to link your profile and enable delivery." },
              { q: "Refund policy", a: "Refunds are available for unused digital items within 24 hours." }
            ].map((item, idx) => (
              <div className={`accordion-item ${open === idx ? "open" : ""}`} key={item.q}>
                <button type="button" onClick={() => toggle(idx)}>
                  {item.q}
                </button>
                <div className="accordion-content">{item.a}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>Delivery issues?</h3>
            <p className="muted">
              If you did not receive an item within 15 minutes, check your inventory and reconnect. Then contact support with your order ID.
            </p>
          </div>
        </section>

        <aside className="card sticky">
          <h3>Contact support</h3>
          <form>
            <label htmlFor="support-name">Name</label>
            <input id="support-name" type="text" required />
            <label htmlFor="support-email">Email</label>
            <input id="support-email" type="email" required />
            <label htmlFor="support-order">Order ID</label>
            <input id="support-order" type="text" />
            <label htmlFor="support-message">Message</label>
            <textarea id="support-message" rows={4} required></textarea>
            <button className="btn btn-primary" type="submit">
              Send message
            </button>
          </form>
        </aside>
      </div>
    </main>
  );
};

export default Support;
