import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../api/products";
import { Product } from "../types";
import { useCart } from "../context/CartContext";

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("popular");
  const { addItem } = useCart();

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setProducts([]));
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.is_active !== false);
    if (query) list = list.filter((p) => (p.name || p.title || "").toLowerCase().includes(query.toLowerCase()));
    if (tag) list = list.filter((p) => (p.tags || []).includes(tag) || p.category === tag);
    if (min) list = list.filter((p) => p.price >= parseFloat(min));
    if (max) list = list.filter((p) => p.price <= parseFloat(max));
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "popular") list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return list;
  }, [products, query, min, max, tag, sort]);

  return (
    <main className="section">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          <span>Catalog</span>
        </div>
        <h1>Catalog</h1>
        <div className="filters" style={{ margin: "1.5rem 0" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search in catalog" />
          <input value={min} onChange={(e) => setMin(e.target.value)} type="number" placeholder="Min price" />
          <input value={max} onChange={(e) => setMax(e.target.value)} type="number" placeholder="Max price" />
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">All tags</option>
            <option value="kits">Kits</option>
            <option value="vip">VIP</option>
            <option value="skins">Skins</option>
            <option value="currency">Currency</option>
            <option value="resources">Resources</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popular">Sort: Popular</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </div>
        <div className="product-grid">
          {filtered.length === 0 && <div className="card">No products found.</div>}
          {filtered.map((product) => (
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
    </main>
  );
};

export default Catalog;
