import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">
            <span>⚙</span>
            <span>Rust Dominion</span>
          </div>
          <p className="muted">Premium Rust store for survivors who want the edge.</p>
        </div>
        <div>
          <strong>Store</strong>
          <div className="grid">
            <Link to="/catalog">Catalog</Link>
            <Link to="/support">Support</Link>
            <Link to="/account">Account</Link>
          </div>
        </div>
        <div>
          <strong>Community</strong>
          <div className="grid">
            <a href="#">Discord</a>
            <a href="#">Twitter</a>
            <a href="#">YouTube</a>
          </div>
        </div>
        <div>
          <strong>Legal</strong>
          <div className="grid">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
            <a href="#">Refunds</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
