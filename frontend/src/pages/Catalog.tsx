import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../api/products";
import { Product } from "../types";
import { useCart } from "../context/CartContext";
import { useI18n } from "../i18n/I18nContext";

const Catalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("popular");
  const { addItem } = useCart();
  const { t, region } = useI18n();

  useEffect(() => {
    fetchProducts(region).then(setProducts).catch(() => setProducts([]));
  }, [region]);

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
          <Link to="/">{t("common.home")}</Link>
          <span>›</span>
          <span>{t("catalog.title")}</span>
        </div>
        <h1>{t("catalog.title")}</h1>
        <div className="filters" style={{ margin: "1.5rem 0" }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder={t("catalog.search")} />
          <input value={min} onChange={(e) => setMin(e.target.value)} type="number" placeholder={t("catalog.minPrice")} />
          <input value={max} onChange={(e) => setMax(e.target.value)} type="number" placeholder={t("catalog.maxPrice")} />
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">{t("catalog.allTags")}</option>
            <option value="kits">{t("home.category.kits")}</option>
            <option value="vip">{t("home.category.vip")}</option>
            <option value="skins">{t("home.category.skins")}</option>
            <option value="currency">{t("home.category.currency")}</option>
            <option value="resources">{t("home.category.resources")}</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="popular">{t("catalog.sort.popular")}</option>
            <option value="price-asc">{t("catalog.sort.priceAsc")}</option>
            <option value="price-desc">{t("catalog.sort.priceDesc")}</option>
          </select>
        </div>
        <div className="product-grid">
          {filtered.length === 0 && (
            <div className="card">{region === "ru" ? t("catalog.emptyRu") : t("catalog.none")}</div>
          )}
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
                  {t("home.view")}
                </Link>
                <button className="btn btn-primary" onClick={() => addItem(product, 1)}>
                  {t("home.addToCart")}
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
