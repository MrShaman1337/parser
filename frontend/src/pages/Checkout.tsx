import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useI18n } from "../i18n/I18nContext";
import { useUserSession } from "../context/UserSessionContext";
import { Server } from "../types";

const Checkout = () => {
  const { items, subtotal: total, clear } = useCart();
  const { authenticated, user, loading, refresh } = useUserSession();
  const [orderId, setOrderId] = useState("");
  const [successOpen, setSuccessOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const { t, lang } = useI18n();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState("");
  const [loadingServers, setLoadingServers] = useState(true);

  // Load available servers from both regions
  useEffect(() => {
    const loadServers = async () => {
      try {
        const [euRes, ruRes] = await Promise.all([
          fetch("/api/servers.php?region=eu"),
          fetch("/api/servers.php?region=ru")
        ]);
        const [euData, ruData] = await Promise.all([
          euRes.json(),
          ruRes.json()
        ]);
        
        const allServers: Server[] = [];
        if (euData.ok) allServers.push(...(euData.servers || []));
        if (ruData.ok) allServers.push(...(ruData.servers || []));
        
        if (allServers.length > 0) {
          setServers(allServers);
          setSelectedServer(allServers[0].id);
        }
      } catch (e) {
        console.error("Failed to load servers", e);
      }
      setLoadingServers(false);
    };
    loadServers();
  }, []);

  const balance = user?.balance ?? 0;
  const canAfford = balance >= total;
  const shortage = total - balance;

  const formatPrice = (amount: number) => {
    const rub = Math.round(amount).toLocaleString("ru-RU") + " ₽";
    if (lang === "en") {
      const usd = (amount / 90).toFixed(2);
      return `${rub} (~$${usd})`;
    }
    return rub;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    
    if (!authenticated || !user) {
      setError(lang === "ru" ? "Войдите через Steam для покупки" : "Please sign in via Steam to purchase");
      return;
    }

    if (!items.length) {
      setError(lang === "ru" ? "Корзина пуста" : "Cart is empty");
      return;
    }

    if (!canAfford) {
      setError(lang === "ru" 
        ? `Недостаточно средств. Пополните баланс на ${formatPrice(shortage)}`
        : `Insufficient balance. Please top up ${formatPrice(shortage)}`
      );
      return;
    }

    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    if (!selectedServer) {
      setError(lang === "ru" ? "Выберите сервер" : "Please select a server");
      return;
    }

    setProcessing(true);
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get("email") || ""),
      name: String(formData.get("nickname") || ""),
      server_id: selectedServer,
      note: String(formData.get("note") || ""),
      items: items.map((item) => ({ id: item.id, qty: item.qty }))
    };

    try {
      const res = await fetch("/api/order-create.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        const errMsg = lang === "ru" ? data.error : (data.error_en || data.error);
        setError(errMsg || t("checkout.failed"));
        setProcessing(false);
        return;
      }

      clear();
      setOrderId(data.order_id || "");
      setSuccessOpen(true);
      form.reset();
      
      // Refresh user session to get updated balance
      if (refresh) {
        refresh();
      }
    } catch (e) {
      setError(lang === "ru" ? "Ошибка сети" : "Network error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">{t("account.loading")}</div>
        </div>
      </main>
    );
  }

  // Not authenticated - prompt to sign in
  if (!authenticated || !user) {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: "600px" }}>
          <h1>{t("checkout.title")}</h1>
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔒</div>
            <h2>{lang === "ru" ? "Требуется авторизация" : "Authentication Required"}</h2>
            <p className="muted" style={{ marginBottom: "2rem" }}>
              {lang === "ru" 
                ? "Войдите через Steam, чтобы совершать покупки с баланса аккаунта"
                : "Sign in via Steam to make purchases using your account balance"
              }
            </p>
            <a className="btn btn-primary" href="/api/auth/steam-login.php" style={{ fontSize: "1.1rem", padding: "1rem 2rem" }}>
              {t("nav.signIn")}
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Empty cart
  if (!items.length && !successOpen) {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: "600px" }}>
          <h1>{t("checkout.title")}</h1>
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🛒</div>
            <h2>{lang === "ru" ? "Корзина пуста" : "Cart is Empty"}</h2>
            <p className="muted" style={{ marginBottom: "2rem" }}>
              {lang === "ru" 
                ? "Добавьте товары в корзину для оформления заказа"
                : "Add items to your cart to proceed with checkout"
              }
            </p>
            <Link className="btn btn-primary" to="/catalog">
              {lang === "ru" ? "Перейти в каталог" : "Go to Catalog"}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>{t("checkout.title")}</h1>
          
          {/* Balance & Total Summary */}
          <div className="card" style={{ marginBottom: "1.5rem", background: canAfford ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.25rem" }}>
                  {lang === "ru" ? "Ваш баланс" : "Your balance"}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: canAfford ? "#10b981" : "#ef4444" }}>
                  {formatPrice(balance)}
                </div>
              </div>
              <div style={{ fontSize: "2rem", color: "#444" }}>→</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", color: "#888", marginBottom: "0.25rem" }}>
                  {lang === "ru" ? "К оплате" : "Order total"}
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                  {formatPrice(total)}
                </div>
              </div>
            </div>
            
            {!canAfford && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(239,68,68,0.15)", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: "0.5rem" }}>
                  ⚠️ {lang === "ru" ? "Недостаточно средств" : "Insufficient balance"}
                </div>
                <div style={{ color: "#ccc", fontSize: "0.9rem" }}>
                  {lang === "ru" 
                    ? `Пополните баланс минимум на ${formatPrice(shortage)} для оформления заказа`
                    : `Please top up at least ${formatPrice(shortage)} to complete this order`
                  }
                </div>
                <Link 
                  className="btn btn-secondary" 
                  to="/account" 
                  style={{ marginTop: "1rem", display: "inline-block" }}
                >
                  {lang === "ru" ? "Пополнить баланс" : "Top Up Balance"}
                </Link>
              </div>
            )}

            {canAfford && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(16,185,129,0.15)", borderRadius: "8px", border: "1px solid rgba(16,185,129,0.3)" }}>
                <div style={{ color: "#10b981", fontWeight: 600 }}>
                  ✓ {lang === "ru" ? "Достаточно средств для покупки" : "Sufficient balance for purchase"}
                </div>
                <div style={{ color: "#aaa", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  {lang === "ru" 
                    ? `После покупки останется: ${formatPrice(balance - total)}`
                    : `After purchase: ${formatPrice(balance - total)} remaining`
                  }
                </div>
              </div>
            )}
          </div>

          <form className="card" onSubmit={handleSubmit}>
            <h3 style={{ marginBottom: "1rem" }}>
              {lang === "ru" ? "Информация о доставке" : "Delivery Information"}
            </h3>
            
            <label htmlFor="server">{lang === "ru" ? "Сервер для доставки" : "Delivery Server"} *</label>
            {loadingServers ? (
              <div className="skeleton" style={{ height: 42 }} />
            ) : servers.length === 0 ? (
              <div style={{ padding: "0.75rem", background: "rgba(239,68,68,0.1)", borderRadius: 8, color: "#ef4444" }}>
                {lang === "ru" ? "Нет доступных серверов" : "No servers available"}
              </div>
            ) : (
              <select 
                id="server" 
                name="server" 
                required
                value={selectedServer}
                onChange={(e) => setSelectedServer(e.target.value)}
                style={{ width: "100%" }}
              >
                {servers.map(server => (
                  <option key={server.id} value={server.id}>
                    [{server.region?.toUpperCase() || "EU"}] {server.name} ({server.current_players}/{server.max_players} {lang === "ru" ? "игроков" : "players"})
                  </option>
                ))}
              </select>
            )}
            
            <label htmlFor="nickname">{t("checkout.nickname")}</label>
            <input 
              id="nickname" 
              name="nickname" 
              type="text" 
              placeholder={t("checkout.optional")}
              defaultValue={user.nickname || ""}
            />
            
            <label htmlFor="email">{lang === "ru" ? "Email (для чека)" : "Email (for receipt)"}</label>
            <input id="email" name="email" type="email" placeholder={t("checkout.optional")} />
            
            <label htmlFor="note">{t("checkout.note")}</label>
            <textarea id="note" name="note" rows={3} placeholder={t("checkout.optional")}></textarea>

            {error && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(239,68,68,0.15)", borderRadius: "8px", color: "#ef4444" }}>
                {error}
              </div>
            )}

            <button 
              className="btn btn-primary" 
              type="submit" 
              disabled={!canAfford || processing}
              style={{ 
                marginTop: "1.5rem", 
                width: "100%", 
                padding: "1rem",
                fontSize: "1.1rem",
                opacity: (!canAfford || processing) ? 0.5 : 1,
                cursor: (!canAfford || processing) ? "not-allowed" : "pointer"
              }}
            >
              {processing 
                ? (lang === "ru" ? "Обработка..." : "Processing...") 
                : (lang === "ru" ? `Оплатить с баланса ${formatPrice(total)}` : `Pay with Balance ${formatPrice(total)}`)
              }
            </button>

            <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem", textAlign: "center" }}>
              {lang === "ru" 
                ? "💳 Оплата производится с баланса вашего аккаунта"
                : "💳 Payment will be deducted from your account balance"
              }
            </p>
          </form>
        </section>

        <aside>
          <div className="card sticky">
            <h3>{t("checkout.summary")}</h3>
            
            <div style={{ marginTop: "1rem" }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.title}</div>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>x{item.qty}</div>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {formatPrice(item.price * item.qty)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "2px solid rgba(255,255,255,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.2rem", fontWeight: 700 }}>
                <span>{lang === "ru" ? "Итого" : "Total"}</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <Link className="btn btn-secondary" to="/cart" style={{ width: "100%", marginTop: "1.5rem" }}>
              {t("checkout.backToCart")}
            </Link>
          </div>

          {/* Balance info sidebar */}
          <div className="card" style={{ marginTop: "1rem", background: "rgba(16,185,129,0.05)" }}>
            <h4 style={{ margin: "0 0 0.5rem 0", color: "#10b981" }}>
              💰 {lang === "ru" ? "Ваш баланс" : "Your Balance"}
            </h4>
            <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              {formatPrice(balance)}
            </div>
            <Link 
              to="/account" 
              className="btn btn-ghost" 
              style={{ marginTop: "0.75rem", width: "100%", fontSize: "0.9rem" }}
            >
              {lang === "ru" ? "Пополнить баланс" : "Top Up Balance"}
            </Link>
          </div>
        </aside>
      </div>

      {/* Success Modal */}
      <div className={`modal ${successOpen ? "open" : ""}`}>
        <div className="modal-panel" style={{ textAlign: "center", maxWidth: "500px" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={{ color: "#10b981" }}>{t("checkout.confirmed")}</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>{t("checkout.thanks")}</p>
          <div style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <div className="muted" style={{ fontSize: "0.85rem" }}>{t("checkout.orderId")}</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "monospace" }}>{orderId}</div>
          </div>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
            <Link className="btn btn-primary" to="/" onClick={() => setSuccessOpen(false)}>
              {t("checkout.returnHome")}
            </Link>
            <Link className="btn btn-secondary" to="/account" onClick={() => setSuccessOpen(false)}>
              {lang === "ru" ? "Мой аккаунт" : "My Account"}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
