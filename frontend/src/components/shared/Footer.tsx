import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

const Footer = () => {
  const { lang } = useI18n();
  
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <div className="logo">
            <span>💙</span>
            <span>GO RUST</span>
          </div>
          <p className="muted">
            {lang === "ru" 
              ? "Премиальные наборы, VIP-перки и скины Rust с мгновенной доставкой."
              : "Premium Rust kits, VIP perks and skins with instant delivery."}
          </p>
        </div>
        <div>
          <strong>{lang === "ru" ? "Магазин" : "Store"}</strong>
          <div className="grid">
            <Link to="/catalog">{lang === "ru" ? "Наборы" : "Kits"}</Link>
            <Link to="/catalog#vip">VIP</Link>
          </div>
        </div>
        <div>
          <strong>{lang === "ru" ? "Поддержка" : "Support"}</strong>
          <div className="grid">
            <Link to="/support">{lang === "ru" ? "Помощь" : "Help"}</Link>
            <a href="#">{lang === "ru" ? "Правила" : "Rules"}</a>
            <a href="#">{lang === "ru" ? "Условия" : "Terms"}</a>
            <a href="https://discord.gg/gorust" target="_blank" rel="noreferrer">
              Discord
            </a>
          </div>
        </div>
        <div>
          <strong>{lang === "ru" ? "Контакты" : "Contact"}</strong>
          <div className="grid">
            <a href="mailto:support@gorust.shop">✉ support@gorust.shop</a>
            <span className="muted">⊙ EU / RU</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
