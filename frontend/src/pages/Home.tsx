import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../api/products";
import { FeaturedDrop, Product } from "../types";
import { useCart } from "../context/CartContext";
import { fetchFeaturedDrop, fetchStats } from "../api/site";

const Home = () => {
  const [featured, setFeatured] = useState<Product[]>([]);
  const { addItem } = useCart();
  const [stats, setStats] = useState({ orders_delivered: 214, active_players: 23 });
  const [featuredDrop, setFeaturedDrop] = useState<FeaturedDrop | null>(null);

  useEffect(() => {
    const load = async () => {
      const products = await fetchProducts();
      const active = products.filter((p) => p.is_active !== false);
      const featuredList = active
        .filter((p) => p.is_featured)
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
      setFeatured(featuredList.length ? featuredList : active.slice(0, 3));
    };
    load().catch(() => setFeatured([]));
    fetchStats().then(setStats).catch(() => setStats({ orders_delivered: 214, active_players: 23 }));
    fetchFeaturedDrop()
      .then((data) => setFeaturedDrop(data.featured_drop))
      .catch(() => setFeaturedDrop(null));
  }, []);

  return (
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <div className="badge">Official Rust Marketplace</div>
            <h1>Gear up fast. Dominate the wipe.</h1>
            <p className="muted">
              Premium Rust kits, skins, and VIP perks delivered instantly. Secure checkout, real-time stock, elite rewards.
            </p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link className="btn btn-primary" to="/catalog">
                Shop Now
              </Link>
              <Link className="btn btn-secondary" to="/account">
                Sign In
              </Link>
            </div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", marginTop: "2rem" }}>
              <div>
                <strong>{stats.orders_delivered}</strong>
                <div className="muted">Orders delivered</div>
              </div>
              <div>
                <strong>{stats.active_players}</strong>
                <div className="muted">Active players</div>
              </div>
              <div>
                <strong>99.98%</strong>
                <div className="muted">Server uptime</div>
              </div>
            </div>
          </div>
          {featuredDrop ? (
            <div className="card">
              <h3>{featuredDrop.title}</h3>
              {featuredDrop.subtitle ? <p className="muted">{featuredDrop.subtitle}</p> : null}
              <div className="price">
                ${featuredDrop.price.toFixed(2)}{" "}
                {featuredDrop.old_price ? <del>${featuredDrop.old_price.toFixed(2)}</del> : null}
              </div>
              {featuredDrop.product ? (
                <button className="btn btn-primary" onClick={() => addItem(featuredDrop.product as Product, 1)}>
                  {featuredDrop.cta_text}
                </button>
              ) : (
                <Link className="btn btn-primary" to={`/product/${featuredDrop.product_id}`}>
                  {featuredDrop.cta_text}
                </Link>
              )}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
            <h2>Featured</h2>
            <Link className="btn btn-ghost" to="/catalog">
              View all
            </Link>
          </div>
          <div className="product-grid">
            {featured.length === 0 && (
              <>
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </>
            )}
            {featured.map((product) => (
              <article className="product-card" key={product.id}>
                <div style={{ position: "relative" }}>
                  <img src={product.image} alt={product.name || product.title} loading="lazy" />
                  {product.discount ? <span className="badge discount">-{product.discount}%</span> : null}
                </div>
                <div>
                  <h3>{product.name || product.title}</h3>
                  <p className="muted">{product.perks || product.short_description}</p>
                </div>
                <div className="price">
                  {product.priceFormatted} {product.compareAt ? <del>{product.compareAt}</del> : null}
                </div>
                <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <Link className="btn btn-secondary" to={`/product/${product.id}`}>
                    View
                  </Link>
                  <button className="btn btn-primary" onClick={() => addItem(product, 1)}>
                    Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Shop by category</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", marginTop: "1.5rem" }}>
            <Link className="card" to="/catalog#kits">
              Kits
            </Link>
            <Link className="card" to="/catalog#vip">
              VIP
            </Link>
            <Link className="card" to="/catalog#skins">
              Skins
            </Link>
            <Link className="card" to="/catalog#currency">
              Currency
            </Link>
            <Link className="card" to="/catalog#resources">
              Resources
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>How it works</h2>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: "1.5rem" }}>
            <div className="card">
              <h3>1. Connect</h3>
              <p className="muted">Sign in with your account and verify your Rust profile.</p>
            </div>
            <div className="card">
              <h3>2. Choose</h3>
              <p className="muted">Select kits, skins, or VIP perks tailored to your playstyle.</p>
            </div>
            <div className="card">
              <h3>3. Receive</h3>
              <p className="muted">Instant delivery in-game with real-time order tracking.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="card">
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", alignItems: "center" }}>
              <div>
                <h3>Trusted by the Rust community</h3>
                <p className="muted">Secure payments, instant delivery, and 24/7 support.</p>
              </div>
              <div>
                <p className="muted">Payment Partners</p>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <span className="chip">Visa</span>
                  <span className="chip">Mastercard</span>
                  <span className="chip">PayPal</span>
                  <span className="chip">Crypto</span>
                </div>
              </div>
              <div>
                <p className="muted">Community Rating</p>
                <strong>4.9/5</strong> from 3,200 reviews
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Home;
