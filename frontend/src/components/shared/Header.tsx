import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useUserSession } from "../../context/UserSessionContext";
import { useI18n } from "../../i18n/I18nContext";

const Header = () => {
  const { count } = useCart();
  const { authenticated, user, logout } = useUserSession();
  const { lang, setLang, t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link className="logo" to="/">
            <span>⚙</span>
            <span>Go Rust</span>
          </Link>
          <nav className="nav">
            <Link to="/catalog">{t("nav.catalog")}</Link>
            <Link to="/support">{t("nav.support")}</Link>
            <Link to="/account">{t("nav.account")}</Link>
          </nav>
          <div className="search">
            <span>🔍</span>
            <input type="search" placeholder={t("nav.search")} aria-label={t("nav.search")} />
          </div>
          <div className="nav" style={{ gap: "0.4rem" }}>
            <button
              type="button"
              className={`btn btn-ghost ${lang === "en" ? "active" : ""}`}
              aria-label="Switch to English"
              onClick={() => setLang("en")}
            >
              🇪🇺
            </button>
            <button
              type="button"
              className={`btn btn-ghost ${lang === "ru" ? "active" : ""}`}
              aria-label="Переключить на русский"
              onClick={() => setLang("ru")}
            >
              🇷🇺
            </button>
          </div>
          <div className="nav">
            <Link className="cart-pill" to="/cart">
              🛒 <span>{count}</span>
            </Link>
            {authenticated ? (
              <div className="nav" style={{ gap: "0.6rem" }}>
                <Link to="/account" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <img
                    src={user?.avatar || "/assets/img/avatar.svg"}
                    alt={user?.nickname || "User"}
                    width={26}
                    height={26}
                    style={{ borderRadius: "50%" }}
                  />
                  <span>{user?.nickname || "Account"}</span>
                </Link>
                <button className="btn btn-ghost" onClick={logout}>
                  {t("nav.signOut")}
                </button>
              </div>
            ) : (
              <a className="btn btn-secondary" href="/api/auth/steam-login.php">
                {t("nav.signIn")}
              </a>
            )}
          </div>
          <button className="btn btn-ghost" aria-label="Open menu" onClick={() => setDrawerOpen((prev) => !prev)}>
            ☰
          </button>
        </div>
      </header>

      <div className={`drawer ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)}>
        <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
          <div className="logo" style={{ marginBottom: "2rem" }}>
            <span>⚙</span>
            <span>Go Rust</span>
          </div>
          <nav className="grid">
            <Link to="/catalog">{t("nav.catalog")}</Link>
            <Link to="/support">{t("nav.support")}</Link>
            <Link to="/account">{t("nav.account")}</Link>
            <Link to="/cart">{t("nav.cart")}</Link>
          </nav>
          <div style={{ marginTop: "2rem" }}>
            {authenticated ? (
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={logout}>
                {t("nav.signOut")}
              </button>
            ) : (
              <a className="btn btn-secondary" href="/api/auth/steam-login.php" style={{ width: "100%" }}>
                {t("nav.signIn")}
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
