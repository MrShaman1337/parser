import { useEffect, useState } from "react";
import { useUserSession } from "../context/UserSessionContext";
import { useI18n } from "../i18n/I18nContext";
import type { Order, CartEntry } from "../types";

const Account = () => {
  const { authenticated, user, loading, logout } = useUserSession();
  const { t, lang } = useI18n();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartEntries, setCartEntries] = useState<CartEntry[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "cart">("orders");
  const [selectedTopup, setSelectedTopup] = useState<number | null>(null);

  const topupOptions = [100, 300, 500, 1000, 2000, 5000];

  useEffect(() => {
    if (authenticated) {
      loadOrders();
      loadCartEntries();
    }
  }, [authenticated]);

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch("/api/me/orders.php", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setOrders(data.orders || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadCartEntries = async () => {
    setCartLoading(true);
    try {
      const res = await fetch("/api/me/cart.php", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setCartEntries(data.entries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCartLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    const rub = amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽";
    if (lang === "en") {
      const usd = (amount / 90).toFixed(2);
      return `${rub} (~$${usd})`;
    }
    return rub;
  };

  const handleTopup = (amount: number) => {
    setSelectedTopup(amount);
    alert(lang === "ru" 
      ? `Пополнение на ${amount} ₽ - интеграция с платёжной системой в разработке`
      : `Top up ${amount} ₽ - payment integration coming soon`
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "#f59e0b";
      case "delivering": return "#3b82f6";
      case "delivered": return "#10b981";
      case "failed": return "#ef4444";
      case "cancelled": return "#6b7280";
      default: return "#888";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return "⏳";
      case "delivering": return "🚀";
      case "delivered": return "✅";
      case "failed": return "❌";
      case "cancelled": return "🚫";
      default: return "❓";
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

  if (!authenticated || !user) {
    return (
      <main className="section">
        <div className="container" style={{ maxWidth: "600px" }}>
          <h1>{t("account.title")}</h1>
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🎮</div>
            <h2>{t("account.signInTitle")}</h2>
            <p className="muted" style={{ marginBottom: "2rem" }}>{t("account.signInDesc")}</p>
            <a className="btn btn-primary" href="/api/auth/steam-login.php" style={{ fontSize: "1.1rem", padding: "1rem 2rem" }}>
              {t("nav.signIn")}
            </a>
          </div>
        </div>
      </main>
    );
  }

  const pendingCount = cartEntries.filter(e => e.status === "pending" || e.status === "delivering").length;

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>{t("account.title")}</h1>

          {/* User Profile Card */}
          <div className="card" style={{ display: "flex", gap: "1.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <img 
              src={user.avatar || "/assets/img/avatar.svg"} 
              alt="User avatar" 
              width={80} 
              style={{ borderRadius: "50%", border: "3px solid var(--accent)" }} 
            />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{user.nickname}</h3>
              <p className="muted" style={{ margin: "0.25rem 0" }}>
                Steam ID: <code style={{ background: "rgba(255,255,255,0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>{user.steam_id}</code>
              </p>
              {user.profile_url && (
                <a className="btn btn-ghost" href={user.profile_url} target="_blank" rel="noreferrer" style={{ marginTop: "0.5rem" }}>
                  {t("account.openProfile")} ↗
                </a>
              )}
            </div>
            <button className="btn btn-secondary" onClick={logout}>
              {t("nav.signOut")}
            </button>
          </div>

          {/* Balance Card */}
          <div className="card" style={{ marginTop: "1.5rem", background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.02))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0 }}>💰 {lang === "ru" ? "Баланс" : "Balance"}</h3>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#10b981" }}>
                {formatPrice(user.balance || 0)}
              </div>
            </div>

            <h4 style={{ marginBottom: "0.75rem", color: "#888", fontSize: "0.9rem" }}>
              {lang === "ru" ? "Пополнить баланс" : "Top up balance"}
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "0.5rem" }}>
              {topupOptions.map((amount) => (
                <button
                  key={amount}
                  className={`btn ${selectedTopup === amount ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => handleTopup(amount)}
                  style={{ padding: "0.75rem 0.5rem" }}
                >
                  {amount} ₽
                </button>
              ))}
            </div>
          </div>

          {/* Pending Delivery Banner */}
          {pendingCount > 0 && (
            <div className="card" style={{ marginTop: "1.5rem", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ fontSize: "2rem" }}>📦</span>
                <div>
                  <h4 style={{ margin: 0, color: "#f59e0b" }}>
                    {lang === "ru" 
                      ? `${pendingCount} товар(ов) ожидают доставки` 
                      : `${pendingCount} item(s) pending delivery`
                    }
                  </h4>
                  <p className="muted" style={{ margin: "0.25rem 0 0 0" }}>
                    {lang === "ru" 
                      ? "Зайдите на сервер и нажмите 'Получить' в игровом меню"
                      : "Join the server and click 'Claim' in the in-game menu"
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.5rem", borderBottom: "2px solid rgba(255,255,255,0.1)", paddingBottom: "0.5rem" }}>
            <button 
              className={`btn ${activeTab === "orders" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("orders")}
            >
              📋 {lang === "ru" ? "История покупок" : "Purchase History"}
            </button>
            <button 
              className={`btn ${activeTab === "cart" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("cart")}
              style={{ position: "relative" }}
            >
              🎁 {lang === "ru" ? "Доставка" : "Delivery"}
              {pendingCount > 0 && (
                <span style={{ 
                  position: "absolute", 
                  top: "-5px", 
                  right: "-5px", 
                  background: "#f59e0b", 
                  color: "#000",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700
                }}>
                  {pendingCount}
                </span>
              )}
            </button>
          </div>

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="card" style={{ marginTop: "1rem" }}>
              {ordersLoading ? (
                <div className="muted">{t("account.loading")}</div>
              ) : orders.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {orders.map((order) => (
                    <div key={order.id} style={{ 
                      padding: "1rem", 
                      background: "rgba(255,255,255,0.03)", 
                      borderRadius: "8px",
                      borderLeft: "4px solid var(--accent)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontFamily: "monospace" }}>{order.id}</div>
                          <div className="muted" style={{ fontSize: "0.85rem" }}>
                            {new Date(order.created_at).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "#10b981" }}>{order.total_formatted}</div>
                          <div className="muted" style={{ fontSize: "0.8rem", textTransform: "capitalize" }}>{order.status}</div>
                        </div>
                      </div>
                      {order.items && order.items.length > 0 && (
                        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                          {order.items.map((item, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "0.25rem 0" }}>
                              <span>{item.name} x{item.quantity}</span>
                              <span className="muted">{item.price_formatted}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                  {lang === "ru" ? "История покупок пуста" : "No purchase history yet"}
                </div>
              )}
            </div>
          )}

          {/* Cart/Delivery Tab */}
          {activeTab === "cart" && (
            <div className="card" style={{ marginTop: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4 style={{ margin: 0 }}>{lang === "ru" ? "Очередь доставки" : "Delivery Queue"}</h4>
                <button className="btn btn-ghost" onClick={loadCartEntries} style={{ fontSize: "0.85rem" }}>
                  🔄 {lang === "ru" ? "Обновить" : "Refresh"}
                </button>
              </div>

              {cartLoading ? (
                <div className="muted">{t("account.loading")}</div>
              ) : cartEntries.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {cartEntries.map((entry) => (
                    <div key={entry.id} style={{ 
                      padding: "1rem", 
                      background: "rgba(255,255,255,0.03)", 
                      borderRadius: "8px",
                      borderLeft: `4px solid ${getStatusColor(entry.status)}`
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {getStatusIcon(entry.status)} {entry.product_name}
                            {entry.quantity > 1 && <span className="muted"> x{entry.quantity}</span>}
                          </div>
                          <div className="muted" style={{ fontSize: "0.8rem" }}>
                            {new Date(entry.created_at).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
                          </div>
                        </div>
                        <div style={{ 
                          padding: "0.25rem 0.75rem", 
                          borderRadius: "999px", 
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          background: `${getStatusColor(entry.status)}22`,
                          color: getStatusColor(entry.status)
                        }}>
                          {entry.status_label ? (lang === "ru" ? entry.status_label.ru : entry.status_label.en) : entry.status}
                        </div>
                      </div>
                      {entry.status === "failed" && entry.last_error && (
                        <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "rgba(239,68,68,0.1)", borderRadius: "4px", fontSize: "0.85rem", color: "#ef4444" }}>
                          {entry.last_error}
                        </div>
                      )}
                      {entry.delivered_at && (
                        <div className="muted" style={{ marginTop: "0.5rem", fontSize: "0.8rem" }}>
                          ✓ {lang === "ru" ? "Доставлено" : "Delivered"}: {new Date(entry.delivered_at).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted" style={{ textAlign: "center", padding: "2rem" }}>
                  {lang === "ru" ? "Нет товаров в очереди доставки" : "No items in delivery queue"}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sidebar */}
        <aside>
          <div className="card sticky" style={{ background: "rgba(16,185,129,0.05)" }}>
            <h4 style={{ margin: "0 0 1rem 0", color: "#10b981" }}>
              💰 {lang === "ru" ? "Ваш баланс" : "Your Balance"}
            </h4>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              {formatPrice(user.balance || 0)}
            </div>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>
              {lang === "ru" 
                ? "Все покупки совершаются с баланса. Пополните баланс для покупки товаров."
                : "All purchases use your balance. Top up to buy products."
              }
            </p>
            <button className="btn btn-secondary" onClick={() => handleTopup(500)} style={{ width: "100%" }}>
              {lang === "ru" ? "Пополнить баланс" : "Top Up Balance"}
            </button>
          </div>

          <div className="card" style={{ marginTop: "1rem" }}>
            <h4 style={{ margin: "0 0 0.5rem 0" }}>ℹ️ {lang === "ru" ? "Как получить товары" : "How to claim items"}</h4>
            <ol className="muted" style={{ paddingLeft: "1.25rem", margin: 0, fontSize: "0.9rem" }}>
              <li>{lang === "ru" ? "Купите товар на сайте" : "Purchase items on the website"}</li>
              <li>{lang === "ru" ? "Зайдите на Rust сервер" : "Join the Rust server"}</li>
              <li>{lang === "ru" ? "Откройте меню магазина" : "Open the shop menu"}</li>
              <li>{lang === "ru" ? "Нажмите 'Получить'" : "Click 'Claim'"}</li>
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default Account;
