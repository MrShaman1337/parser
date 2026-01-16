import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../../context/CartContext";
import { useUserSession } from "../../context/UserSessionContext";

const Header = () => {
  const { count } = useCart();
  const { authenticated, user, logout } = useUserSession();
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
            <Link to="/catalog">Catalog</Link>
            <Link to="/support">Support</Link>
            <Link to="/account">Account</Link>
          </nav>
          <div className="search">
            <span>🔍</span>
            <input type="search" placeholder="Search items" aria-label="Search items" />
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
                  Sign out
                </button>
              </div>
            ) : (
              <a className="btn btn-secondary" href="/api/auth/steam-login.php">
                Sign in with Steam
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
            <Link to="/catalog">Catalog</Link>
            <Link to="/support">Support</Link>
            <Link to="/account">Account</Link>
            <Link to="/cart">Cart</Link>
          </nav>
          <div style={{ marginTop: "2rem" }}>
            {authenticated ? (
              <button className="btn btn-secondary" style={{ width: "100%" }} onClick={logout}>
                Sign out
              </button>
            ) : (
              <a className="btn btn-secondary" href="/api/auth/steam-login.php" style={{ width: "100%" }}>
                Sign in with Steam
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
