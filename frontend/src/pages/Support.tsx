import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";

const Support = () => {
  const [open, setOpen] = useState<number | null>(0);
  const { t, lang } = useI18n();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const toggle = (index: number) => setOpen(open === index ? null : index);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("idle");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      orderId: String(formData.get("orderId") || ""),
      message: String(formData.get("message") || ""),
      lang
    };
    const res = await fetch("/api/support/send.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      setStatus("error");
      return;
    }
    setStatus("success");
    form.reset();
  };

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>{t("support.title")}</h1>
          <div className="card">
            {[
              {
                q: t("support.faq.q1"),
                a: t("support.faq.a1")
              },
              { q: t("support.faq.q2"), a: t("support.faq.a2") },
              { q: t("support.faq.q3"), a: t("support.faq.a3") }
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
            <h3>{t("support.deliveryTitle")}</h3>
            <p className="muted">{t("support.deliveryDesc")}</p>
          </div>
        </section>

        <aside className="card sticky">
          <h3>{t("support.contact")}</h3>
          <form onSubmit={handleSubmit}>
            <label htmlFor="support-name">{t("support.name")}</label>
            <input id="support-name" name="name" type="text" required />
            <label htmlFor="support-email">{t("support.email")}</label>
            <input id="support-email" name="email" type="email" />
            <label htmlFor="support-order">{t("support.orderId")}</label>
            <input id="support-order" name="orderId" type="text" />
            <label htmlFor="support-message">{t("support.message")}</label>
            <textarea id="support-message" name="message" rows={4} required></textarea>
            <button className="btn btn-primary" type="submit">
              {t("support.send")}
            </button>
            {status === "success" ? <div className="muted">{t("support.sent")}</div> : null}
            {status === "error" ? <div className="muted">{t("support.failed")}</div> : null}
          </form>
        </aside>
      </div>
    </main>
  );
};

export default Support;
