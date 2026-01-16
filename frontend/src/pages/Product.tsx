import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProducts } from "../api/products";
import { Product } from "../types";
import { useCart } from "../context/CartContext";

const ProductPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetchProducts()
      .then((products) => {
        const active = products.filter((p) => p.is_active !== false);
        const current = active.find((p) => p.id === id);
        setProduct(current || null);
        setRelated(active.filter((p) => p.id !== id).slice(0, 4));
      })
      .catch(() => {
        setProduct(null);
      });
  }, [id]);

  if (!product) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">Product not found.</div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="section">
        <div className="container">
          <div className="breadcrumb">
            <Link to="/">Home</Link>
            <span>›</span>
            <Link to="/catalog">Catalog</Link>
            <span>›</span>
            <span>{product.name || product.title}</span>
          </div>
          <div className="layout-2">
            <section>
              <div className="card">
                <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                  <div>
                    <img src={product.image} alt={product.name || product.title} />
                    <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: "0.8rem" }}>
                      {(product.gallery || []).map((img) => (
                        <img key={img} src={img} alt={`${product.name} thumbnail`} loading="lazy" />
                      ))}
                    </div>
                  </div>
                  <div className="grid">
                    <h1>{product.name || product.title}</h1>
                    <p className="muted">{product.full_description || product.short_description}</p>
                    <div>
                      {product.discount ? <span className="badge">Sale</span> : null}
                      <span className="price">{product.priceFormatted}</span>
                      {product.compareAt ? <del>{product.compareAt}</del> : null}
                    </div>
                    <div>
                      <label htmlFor="variant">Select variant</label>
                      <select id="variant">{(product.variants || []).map((variant) => <option key={variant}>{variant}</option>)}</select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid" style={{ marginTop: "2rem" }}>
                <div className="card">
                  <h3>What you get</h3>
                  <ul>
                    {(product.items || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="card">
                  <h3>Requirements</h3>
                  <p className="muted">{product.requirements}</p>
                  <h3>Delivery</h3>
                  <p className="muted">{product.delivery}</p>
                  <h3>Refunds</h3>
                  <p className="muted">Refunds available within 24 hours for unused digital items.</p>
                </div>
              </div>
            </section>
            <aside className="card sticky">
              <h3>Buy now</h3>
              <p className="muted">Instant delivery to your Rust account.</p>
              <div className="price">{product.priceFormatted}</div>
              <button className="btn btn-primary" onClick={() => addItem(product, 1)}>
                Add to cart
              </button>
              <Link className="btn btn-secondary" to="/checkout" style={{ marginTop: "0.5rem" }}>
                Buy now
              </Link>
              <div style={{ marginTop: "1rem" }}>
                <p className="muted">Delivery method</p>
                <span className="chip">{product.delivery}</span>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <section className="section">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2>Related items</h2>
            <Link className="btn btn-ghost" to="/catalog">
              View all
            </Link>
          </div>
          <div className="carousel">
            {related.map((item) => (
              <article className="product-card" key={item.id}>
                <img src={item.image} alt={item.name || item.title} loading="lazy" />
                <h3>{item.name || item.title}</h3>
                <div className="price">{item.priceFormatted}</div>
                <button className="btn btn-secondary" onClick={() => addItem(item, 1)}>
                  Add to cart
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default ProductPage;
