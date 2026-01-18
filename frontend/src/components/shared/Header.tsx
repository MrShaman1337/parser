import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useCart } from "../../context/CartContext";
import { useUserSession } from "../../context/UserSessionContext";
import { useI18n } from "../../i18n/I18nContext";
import { fetchProducts } from "../../api/products";
import { Product } from "../../types";

const Header = () => {
  const { count } = useCart();
  const { authenticated, user, logout } = useUserSession();
  const { lang, setLang, t, region } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load products for search
  useEffect(() => {
    fetchProducts(region).then(setAllProducts).catch(() => setAllProducts([]));
  }, [region]);

  // Filter products by search query
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = allProducts
      .filter((p) => p.is_active !== false)
      .filter((p) => 
        (p.name?.toLowerCase().includes(query)) ||
        (p.title?.toLowerCase().includes(query)) ||
        (p.category?.toLowerCase().includes(query))
      )
      .slice(0, 6);
    setSearchResults(filtered);
  }, [searchQuery, allProducts]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductClick = (productId: string) => {
    setShowResults(false);
    setSearchQuery("");
    navigate(`/product/${productId}`);
  };

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
          </nav>
          <div className="search" ref={searchRef}>
            <span>🔍</span>
            <input 
              type="search" 
              placeholder={t("nav.search")} 
              aria-label={t("nav.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowResults(true)}
            />
            {showResults && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((product) => (
                  <div 
                    key={product.id} 
                    className="search-result-item"
                    onClick={() => handleProductClick(product.id)}
                  >
                    <img src={product.image} alt={product.name || product.title} />
                    <div className="search-result-info">
                      <span className="search-result-name">{product.name || product.title}</span>
                      <span className="search-result-price">{product.priceFormatted}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {showResults && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="search-dropdown">
                <div className="search-no-results">
                  {lang === "ru" ? "Ничего не найдено" : "No results found"}
                </div>
              </div>
            )}
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
                {user?.balance !== undefined && user.balance > 0 && (
                  <Link to="/account" className="balance-pill" title={lang === "ru" ? "Ваш баланс" : "Your balance"}>
                    <span className="balance-rub">{user.balance.toLocaleString("ru-RU")} ₽</span>
                    {lang === "en" && <span className="balance-usd">(~${(user.balance / 90).toFixed(2)})</span>}
                  </Link>
                )}
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
            <Link to="/cart">{t("nav.cart")}</Link>
            {authenticated && <Link to="/account">{t("nav.account")}</Link>}
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
