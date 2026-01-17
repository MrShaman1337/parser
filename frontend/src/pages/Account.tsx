import { useEffect, useState } from "react";
import { useUserSession } from "../context/UserSessionContext";
import { useI18n } from "../i18n/I18nContext";

interface Transaction {
  id: number;
  amount: number;
  amount_formatted: string;
  type: string;
  description: string;
  created_at: string;
  is_credit: boolean;
}

interface TopupOption {
  amount: number;
  label: string;
  usd: string;
}

const Account = () => {
  const { authenticated, user, loading, logout, refresh } = useUserSession();
  const { t, lang } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topupOptions, setTopupOptions] = useState<TopupOption[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<number | null>(null);

  useEffect(() => {
    if (authenticated) {
      loadHistory();
      loadTopupOptions();
    }
  }, [authenticated]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/balance/history.php", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadTopupOptions = async () => {
    try {
      const res = await fetch("/api/balance/topup.php", { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setTopupOptions(data.options || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatBalance = (amount: number) => {
    const rub = amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽";
    if (lang === "en") {
      const usd = (amount / 90).toFixed(2);
      return `${rub} (~$${usd})`;
    }
    return rub;
  };

  const handleTopup = (amount: number) => {
    setSelectedTopup(amount);
    // In production, this would redirect to payment gateway
    alert(lang === "ru" 
      ? `Пополнение на ${amount} ₽ - интеграция с платёжной системой в разработке`
      : `Top up ${amount} ₽ - payment integration coming soon`
    );
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

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>{t("account.title")}</h1>
          {authenticated && user ? (
            <>
              <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <img src={user.avatar || "/assets/img/avatar.svg"} alt="User avatar" width={80} style={{ borderRadius: "50%" }} />
                <div>
                  <h3>{user.nickname}</h3>
                  <p className="muted">
                    {t("account.steamId")}: {user.steam_id}
                  </p>
                  {user.profile_url ? (
                    <p>
                      <a className="btn btn-ghost" href={user.profile_url} target="_blank" rel="noreferrer">
                        {t("account.openProfile")}
                      </a>
                    </p>
                  ) : null}
                  <button className="btn btn-secondary" onClick={logout}>
                    {t("nav.signOut")}
                  </button>
                </div>
              </div>

              {/* Balance Card */}
              <div className="card" style={{ marginTop: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3 style={{ margin: 0 }}>{lang === "ru" ? "Баланс" : "Balance"}</h3>
                  <div className="balance-display">
                    <span className="balance-amount">{formatBalance(user.balance || 0)}</span>
                  </div>
                </div>

                <h4 style={{ marginBottom: "1rem", color: "#888" }}>
                  {lang === "ru" ? "Пополнить баланс" : "Top up balance"}
                </h4>
                <div className="topup-grid">
                  {topupOptions.map((opt) => (
                    <button
                      key={opt.amount}
                      className={`topup-option ${selectedTopup === opt.amount ? "selected" : ""}`}
                      onClick={() => handleTopup(opt.amount)}
                    >
                      <span className="topup-amount">{opt.label}</span>
                      {lang === "en" && <span className="topup-usd">{opt.usd}</span>}
                    </button>
                  ))}
                </div>

                <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
                  {lang === "ru" 
                    ? "Все покупки совершаются с баланса аккаунта. Пополните баланс для покупки товаров."
                    : "All purchases are made from your account balance. Top up your balance to buy products."
                  }
                </p>
              </div>

              {/* Transaction History */}
              <div className="card" style={{ marginTop: "2rem" }}>
                <h3>{lang === "ru" ? "История операций" : "Transaction History"}</h3>
                {loadingHistory ? (
                  <div className="muted">{t("account.loading")}</div>
                ) : transactions.length > 0 ? (
                  <div className="transactions-list">
                    {transactions.map((tx) => (
                      <div key={tx.id} className={`transaction-item ${tx.is_credit ? "credit" : "debit"}`}>
                        <div className="transaction-info">
                          <span className="transaction-desc">{tx.description || tx.type}</span>
                          <span className="transaction-date">
                            {new Date(tx.created_at).toLocaleString(lang === "ru" ? "ru-RU" : "en-US")}
                          </span>
                        </div>
                        <span className={`transaction-amount ${tx.is_credit ? "positive" : "negative"}`}>
                          {tx.amount_formatted}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="muted">{lang === "ru" ? "Операций пока нет" : "No transactions yet"}</div>
                )}
              </div>
            </>
          ) : (
            <div className="card">
              <h3>{t("account.signInTitle")}</h3>
              <p className="muted">{t("account.signInDesc")}</p>
              <a className="btn btn-primary" href="/api/auth/steam-login.php">
                {t("nav.signIn")}
              </a>
            </div>
          )}
        </section>

        <aside className="card sticky">
          <h3>{t("account.steamAccount")}</h3>
          <p className="muted">{t("account.steamOnly")}</p>
          {authenticated ? (
            <>
              <div style={{ margin: "1rem 0", padding: "1rem", background: "rgba(16,185,129,0.1)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>
                  {lang === "ru" ? "Ваш баланс" : "Your balance"}
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#10b981" }}>
                  {formatBalance(user?.balance || 0)}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={logout} style={{ marginTop: "0.5rem" }}>
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <a className="btn btn-primary" href="/api/auth/steam-login.php" style={{ marginTop: "1rem", display: "inline-block" }}>
              {t("nav.signIn")}
            </a>
          )}
        </aside>
      </div>

      <style>{`
        .balance-display {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 8px;
          padding: 0.5rem 1rem;
        }
        .balance-amount {
          font-size: 1.25rem;
          font-weight: 600;
          color: #10b981;
        }
        .topup-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .topup-option {
          padding: 1rem;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .topup-option:hover {
          background: rgba(255,255,255,0.06);
          border-color: var(--accent);
        }
        .topup-option.selected {
          border-color: #10b981;
          background: rgba(16,185,129,0.1);
        }
        .topup-amount {
          display: block;
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text);
        }
        .topup-usd {
          display: block;
          font-size: 0.8rem;
          color: #888;
          margin-top: 0.25rem;
        }
        .transactions-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .transaction-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255,255,255,0.02);
          border-radius: 6px;
          border-left: 3px solid transparent;
        }
        .transaction-item.credit {
          border-left-color: #10b981;
        }
        .transaction-item.debit {
          border-left-color: #ef4444;
        }
        .transaction-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .transaction-desc {
          font-size: 0.9rem;
        }
        .transaction-date {
          font-size: 0.75rem;
          color: #666;
        }
        .transaction-amount {
          font-weight: 600;
        }
        .transaction-amount.positive {
          color: #10b981;
        }
        .transaction-amount.negative {
          color: #ef4444;
        }
      `}</style>
    </main>
  );
};

export default Account;
