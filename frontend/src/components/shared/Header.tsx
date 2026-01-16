import { Link } from "react-router-dom";
import { useState } from "react";
import { useCart } from "../../context/CartContext";

const Header = () => {
  const { count } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link className="logo" to="/">
            <span>⚙</span>
            <span>Rust Dominion</span>
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
            <Link className="btn btn-secondary" to="/account">
              Sign In
            </Link>
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
            <span>Rust Dominion</span>
          </div>
          <nav className="grid">
            <Link to="/catalog">Catalog</Link>
            <Link to="/support">Support</Link>
            <Link to="/account">Account</Link>
            <Link to="/cart">Cart</Link>
          </nav>
          <div style={{ marginTop: "2rem" }}>
            <Link className="btn btn-secondary" to="/account" style={{ width: "100%" }}>
              Connect Account
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
