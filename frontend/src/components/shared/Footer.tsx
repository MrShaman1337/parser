import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">
            <span>⚙</span>
            <span>Go Rust</span>
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
            <a href="https://discord.gg/ATnZzTpR" target="_blank" rel="noreferrer">
              Discord
            </a>
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
