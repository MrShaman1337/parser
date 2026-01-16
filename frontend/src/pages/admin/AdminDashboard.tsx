import { useEffect, useMemo, useState } from "react";
import {
  adminDeleteProduct,
  adminFeaturedDrop,
  adminProducts,
  adminSaveFeatured,
  adminSaveFeaturedDrop,
  adminSaveProduct,
  adminUploadImage
} from "../../api/admin";
import { useAdminSession } from "../../context/AdminSessionContext";
import { Product } from "../../types";

const emptyProduct: Partial<Product> = {
  name: "",
  category: "",
  price: 0,
  compareAt: "",
  discount: 0,
  tags: [],
  short_description: "",
  full_description: "",
  perks: "",
  image: "assets/img/placeholder.svg",
  gallery: [],
  variants: [],
  popularity: 0,
  is_active: true,
  is_featured: false,
  featured_order: 0
};

const emptyFeaturedDrop = {
  product_id: "",
  title: "",
  subtitle: "",
  cta_text: "Add VIP",
  price: "",
  old_price: "",
  is_enabled: true
};

const AdminDashboard = () => {
  const { csrf, featuredLimit, role } = useAdminSession();
  const [products, setProducts] = useState<Product[]>([]);
  const canEdit = role === "admin" || role === "superadmin";

  const [filters, setFilters] = useState({ q: "", category: "", featured: "", sort: "name" });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<Product>>(emptyProduct);
  const [dropForm, setDropForm] = useState({ ...emptyFeaturedDrop });
  const [dragId, setDragId] = useState<string | null>(null);

  const toInputValue = (value?: string[] | string) => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") return value;
    return "";
  };

  const load = async () => {
    const [productsData, dropData] = await Promise.all([adminProducts(), adminFeaturedDrop()]);
    setProducts(productsData.products || []);
    const drop = dropData.featured_drop || null;
    if (drop) {
      setDropForm({
        product_id: drop.product_id || "",
        title: drop.title || "",
        subtitle: drop.subtitle || "",
        cta_text: drop.cta_text || "Add VIP",
        price: drop.price ? String(drop.price) : "",
        old_price: drop.old_price ? String(drop.old_price) : "",
        is_enabled: drop.is_enabled !== 0
      });
    } else {
      setDropForm({ ...emptyFeaturedDrop });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (filters.q) list = list.filter((p) => (p.name || p.title || "").toLowerCase().includes(filters.q.toLowerCase()));
    if (filters.category) list = list.filter((p) => p.category === filters.category);
    if (filters.featured !== "") list = list.filter((p) => (p.is_featured ? "1" : "0") === filters.featured);
    if (filters.sort === "price") list.sort((a, b) => a.price - b.price);
    if (filters.sort === "price_desc") list.sort((a, b) => b.price - a.price);
    if (filters.sort === "date") list.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (filters.sort === "popularity") list.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    if (filters.sort === "name") list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return list;
  }, [products, filters]);

  const featured = useMemo(
    () =>
      products
        .filter((p) => p.is_featured)
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))
        .slice(0, featuredLimit),
    [products, featuredLimit]
  );

  const openModal = (product?: Product) => {
    if (!canEdit) return;
    setForm(product ? { ...product } : { ...emptyProduct });
    setModalOpen(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    const payload = {
      ...form,
      tags: typeof form.tags === "string" ? form.tags : (form.tags || []).join(", "),
      gallery: typeof form.gallery === "string" ? form.gallery : (form.gallery || []).join(", "),
      variants: typeof form.variants === "string" ? form.variants : (form.variants || []).join(", "),
      csrf_token: csrf
    };
    const result = await adminSaveProduct(payload as Record<string, unknown>);
    const saved = result.product;
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (!canEdit) return;
    if (!form.id) return;
    await adminDeleteProduct(form.id, csrf);
    setProducts((prev) => prev.map((p) => (p.id === form.id ? { ...p, is_active: false } : p)));
    setModalOpen(false);
  };

  const handleUpload = async (file: File) => {
    if (!canEdit) return;
    const data = await adminUploadImage(file, csrf);
    setForm((prev) => ({ ...prev, image: data.path }));
  };

  const handleFeaturedSave = async () => {
    if (!canEdit) return;
    const ids = featured.map((p) => p.id);
    await adminSaveFeatured(ids, csrf);
    await load();
  };

  const handleFeaturedDropSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    const payload = {
      product_id: dropForm.product_id,
      title: dropForm.title,
      subtitle: dropForm.subtitle,
      cta_text: dropForm.cta_text,
      price: dropForm.price ? Number(dropForm.price) : 0,
      old_price: dropForm.old_price ? Number(dropForm.old_price) : "",
      is_enabled: dropForm.is_enabled,
      csrf_token: csrf
    };
    await adminSaveFeaturedDrop(payload);
    await load();
  };

  const handleDragOver = (event: React.DragEvent<HTMLLIElement>, id: string) => {
    event.preventDefault();
    if (!dragId || dragId === id) return;
    const order = featured.map((p) => p.id);
    const from = order.indexOf(dragId);
    const to = order.indexOf(id);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    setProducts((prev) =>
      prev.map((p) => ({
        ...p,
        featured_order: order.includes(p.id) ? order.indexOf(p.id) + 1 : p.featured_order
      }))
    );
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Products</h1>
          <p className="muted">Manage catalog and featured items.</p>
        </div>
        <div className="admin-actions">
          {canEdit ? (
            <button className="btn btn-primary" onClick={() => openModal()}>
              New Product
            </button>
          ) : null}
        </div>
      </div>

      <section className="card admin-panel">
        <div className="filters admin-filters">
          <input placeholder="Search products" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <select onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All categories</option>
            <option value="kits">Kits</option>
            <option value="vip">VIP</option>
            <option value="skins">Skins</option>
            <option value="currency">Currency</option>
            <option value="resources">Resources</option>
          </select>
          <select onChange={(e) => setFilters({ ...filters, featured: e.target.value })}>
            <option value="">All</option>
            <option value="1">Featured</option>
            <option value="0">Not featured</option>
          </select>
          <select onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
            <option value="name">Sort: Name</option>
            <option value="price">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="date">Newest</option>
            <option value="popularity">Popularity</option>
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Active</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>No products found.</td>
                </tr>
              )}
              {filtered.map((product) => (
                <tr key={product.id}>
                  <td>{product.name || product.title}</td>
                  <td>{product.category || "-"}</td>
                  <td>{product.priceFormatted}</td>
                  <td>{product.is_active === false ? "No" : "Yes"}</td>
                  <td>{product.is_featured ? "Yes" : "No"}</td>
                  <td className="actions">
                    {canEdit ? (
                      <button className="btn btn-secondary" onClick={() => openModal(product)}>
                        Edit
                      </button>
                    ) : (
                      <span className="muted">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card admin-panel">
        <div className="admin-header">
          <div>
            <h2>Featured on Home</h2>
            <p className="muted">Drag to reorder. Limit: {featuredLimit}.</p>
          </div>
          {canEdit ? (
            <button className="btn btn-secondary" onClick={handleFeaturedSave}>
              Save order
            </button>
          ) : null}
        </div>
        <ul className="admin-featured-list">
          {featured.length === 0 && <li className="admin-featured-item">No featured items selected.</li>}
          {featured.map((item) => (
            <li
              key={item.id}
              className="admin-featured-item"
              draggable={canEdit}
              onDragStart={() => canEdit && setDragId(item.id)}
              onDragOver={(e) => handleDragOver(e, item.id)}
            >
              <span>{item.name || item.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card admin-panel">
        <div className="admin-header">
          <div>
            <h2>Featured Drop</h2>
            <p className="muted">Homepage hero card configured from database.</p>
          </div>
        </div>
        <form className="admin-form" onSubmit={handleFeaturedDropSave}>
          <div className="admin-form-grid">
            <div>
              <label>Enable</label>
              <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={dropForm.is_enabled}
                  disabled={!canEdit}
                  onChange={(e) => setDropForm({ ...dropForm, is_enabled: e.target.checked })}
                />
                Active
              </label>
            </div>
            <div>
              <label>Product</label>
              <select
                value={dropForm.product_id}
                disabled={!canEdit}
                onChange={(e) => setDropForm({ ...dropForm, product_id: e.target.value })}
              >
                <option value="">Select product</option>
                {products
                  .filter((p) => p.is_active !== false)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name || product.title}
                    </option>
                  ))}
              </select>
            </div>
            <div className="admin-form-wide">
              <label>Title</label>
              <input
                value={dropForm.title}
                disabled={!canEdit}
                onChange={(e) => setDropForm({ ...dropForm, title: e.target.value })}
                placeholder="Optional override"
              />
            </div>
            <div className="admin-form-wide">
              <label>Subtitle</label>
              <input
                value={dropForm.subtitle}
                disabled={!canEdit}
                onChange={(e) => setDropForm({ ...dropForm, subtitle: e.target.value })}
                placeholder="Optional override"
              />
            </div>
            <div>
              <label>CTA text</label>
              <input
                value={dropForm.cta_text}
                disabled={!canEdit}
                onChange={(e) => setDropForm({ ...dropForm, cta_text: e.target.value })}
              />
            </div>
            <div>
              <label>Price</label>
              <input
                type="number"
                value={dropForm.price}
                disabled={!canEdit}
                onChange={(e) => setDropForm({ ...dropForm, price: e.target.value })}
                placeholder="Defaults to product price"
              />
            </div>
            <div>
              <label>Old price</label>
              <input
                type="number"
                value={dropForm.old_price}
                disabled={!canEdit}
                onChange={(e) => setDropForm({ ...dropForm, old_price: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit" disabled={!canEdit}>
              Save Featured Drop
            </button>
          </div>
        </form>
      </section>

      <div className={`modal ${modalOpen ? "open" : ""}`}>
        <div className="modal-panel admin-modal">
          <div className="admin-modal-header">
            <h3>{form.id ? "Edit Product" : "New Product"}</h3>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
          <form className="admin-form" onSubmit={handleSave}>
            <div className="admin-form-grid">
              <div>
                <label>Name</label>
                <input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label>Category</label>
                <input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div>
                <label>Price</label>
                <input type="number" value={form.price || 0} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <label>Old price</label>
                <input value={form.compareAt || ""} onChange={(e) => setForm({ ...form, compareAt: e.target.value })} />
              </div>
              <div>
                <label>Discount %</label>
                <input type="number" value={form.discount || 0} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} />
              </div>
              <div>
                <label>Tags (comma)</label>
                <input value={toInputValue(form.tags)} onChange={(e) => setForm({ ...form, tags: e.target.value as any })} />
              </div>
              <div className="admin-form-wide">
                <label>Short description</label>
                <input value={form.short_description || ""} onChange={(e) => setForm({ ...form, short_description: e.target.value })} />
              </div>
              <div className="admin-form-wide">
                <label>Full description</label>
                <textarea value={form.full_description || ""} onChange={(e) => setForm({ ...form, full_description: e.target.value })}></textarea>
              </div>
              <div className="admin-form-wide">
                <label>Perks</label>
                <input value={form.perks || ""} onChange={(e) => setForm({ ...form, perks: e.target.value })} />
              </div>
              <div className="admin-form-wide">
                <label>Image URL</label>
                <input value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} />
              </div>
              <div>
                <label>Gallery (comma URLs)</label>
                <input value={toInputValue(form.gallery)} onChange={(e) => setForm({ ...form, gallery: e.target.value as any })} />
              </div>
              <div>
                <label>Variants (comma)</label>
                <input value={toInputValue(form.variants)} onChange={(e) => setForm({ ...form, variants: e.target.value as any })} />
              </div>
              <div>
                <label>Popularity</label>
                <input type="number" value={form.popularity || 0} onChange={(e) => setForm({ ...form, popularity: Number(e.target.value) })} />
              </div>
              <div>
                <label>Featured order</label>
                <input
                  type="number"
                  value={form.featured_order || 0}
                  onChange={(e) => setForm({ ...form, featured_order: Number(e.target.value) })}
                />
              </div>
              <div className="admin-form-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={form.is_active !== false}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  />
                  Active
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={!!form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  />
                  Featured
                </label>
              </div>
              <div className="admin-form-wide">
                <label>Upload image</label>
                <input type="file" accept="image/png, image/jpeg, image/webp" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
              </div>
            </div>
            <div className="admin-form-actions">
              <button className="btn btn-primary" type="submit">
                Save
              </button>
              {form.id && (
                <button type="button" className="btn btn-secondary" onClick={handleDelete}>
                  Deactivate
                </button>
              )}
            </div>
          </form>
          <div className="admin-preview">
            <h4>Live Preview</h4>
            <article className="product-card">
              <div style={{ position: "relative" }}>
                <img src={form.image || "/assets/img/placeholder.svg"} alt={form.name} />
                {form.discount ? <span className="badge discount">-{form.discount}%</span> : null}
              </div>
              <div>
                <h3>{form.name || "Product"}</h3>
                <p className="muted">{form.perks || form.short_description}</p>
              </div>
              <div className="price">${(form.price || 0).toFixed(2)}</div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
