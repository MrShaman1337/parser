const state = {
  products: [],
  orders: [],
  csrf: "",
  featuredLimit: 8,
  currentOrderId: ""
};

const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const toast = (() => {
  const el = document.createElement("div");
  el.className = "toast";
  document.body.appendChild(el);
  let timer;
  return (message) => {
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove("show"), 2200);
  };
})();

const fetchSession = async () => {
  const res = await fetch("api/session.php", { credentials: "same-origin" });
  if (!res.ok) {
    window.location.href = "login.html";
    return;
  }
  const data = await res.json();
  state.csrf = data.csrf_token;
  state.featuredLimit = data.featured_limit || 8;
  const limitEl = qs("#featured-limit");
  if (limitEl) limitEl.textContent = state.featuredLimit;
};

const fetchProducts = async () => {
  const res = await fetch("api/products.php?include_inactive=true", { credentials: "same-origin" });
  if (!res.ok) throw new Error("Failed to load products");
  const data = await res.json();
  state.products = data.products || [];
};

const fetchOrders = async () => {
  const query = encodeURIComponent(qs("#order-search")?.value || "");
  const status = encodeURIComponent(qs("#order-status-filter")?.value || "");
  const sort = encodeURIComponent(qs("#order-sort")?.value || "date");
  const res = await fetch(`api/orders.php?q=${query}&status=${status}&sort=${sort}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error("Failed to load orders");
  const data = await res.json();
  state.orders = data.orders || [];
};

const getName = (product) => product.name || product.title || "Untitled";

const renderTable = () => {
  const tableBody = qs("#products-table tbody");
  if (!tableBody) return;
  const search = (qs("#admin-search")?.value || "").toLowerCase();
  const category = qs("#admin-category")?.value || "";
  const featured = qs("#admin-featured")?.value || "";
  const sort = qs("#admin-sort")?.value || "name";

  let list = state.products.filter((p) => {
    const name = getName(p).toLowerCase();
    if (search && !name.includes(search)) return false;
    if (category && p.category !== category) return false;
    if (featured !== "") {
      const isFeatured = p.is_featured ? "1" : "0";
      if (isFeatured !== featured) return false;
    }
    return true;
  });

  list.sort((a, b) => {
    if (sort === "price") return (a.price || 0) - (b.price || 0);
    if (sort === "price_desc") return (b.price || 0) - (a.price || 0);
    if (sort === "date") return (b.created_at || "").localeCompare(a.created_at || "");
    if (sort === "popularity") return (b.popularity || 0) - (a.popularity || 0);
    return getName(a).localeCompare(getName(b));
  });

  tableBody.innerHTML = "";
  if (!list.length) {
    tableBody.innerHTML = "<tr><td colspan='6'>No products found.</td></tr>";
    return;
  }

  list.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${getName(product)}</td>
      <td>${product.category || "-"}</td>
      <td>${product.priceFormatted || `$${Number(product.price || 0).toFixed(2)}`}</td>
      <td>${product.is_active === false ? "No" : "Yes"}</td>
      <td>${product.is_featured ? "Yes" : "No"}</td>
      <td class="actions">
        <button class="btn btn-secondary" data-edit="${product.id}">Edit</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
};

const openModal = (product = null) => {
  const modal = qs("#product-modal");
  if (!modal) return;
  const title = qs("#modal-title");
  if (title) title.textContent = product ? "Edit Product" : "New Product";
  modal.classList.add("open");
  fillForm(product);
  updatePreview();
};

const closeModal = () => {
  const modal = qs("#product-modal");
  if (modal) modal.classList.remove("open");
};

const fillForm = (product) => {
  qs("#product-id").value = product?.id || "";
  qs("#product-name").value = product?.name || product?.title || "";
  qs("#product-category").value = product?.category || "";
  qs("#product-price").value = product?.price ?? "";
  qs("#product-compare").value = product?.compareAt || "";
  qs("#product-discount").value = product?.discount ?? "";
  qs("#product-tags").value = (product?.tags || []).join(", ");
  qs("#product-short").value = product?.short_description || "";
  qs("#product-full").value = product?.full_description || "";
  qs("#product-perks").value = product?.perks || "";
  qs("#product-image").value = product?.image || "";
  qs("#product-gallery").value = (product?.gallery || []).join(", ");
  qs("#product-variants").value = (product?.variants || []).join(", ");
  qs("#product-popularity").value = product?.popularity ?? "";
  qs("#product-featured-order").value = product?.featured_order ?? "";
  qs("#product-active").checked = product?.is_active !== false;
  qs("#product-featured").checked = !!product?.is_featured;
};

const updatePreview = () => {
  const preview = qs("#preview-card");
  if (!preview) return;
  const name = qs("#product-name").value || "Product";
  const perks = qs("#product-perks").value || qs("#product-short").value || "";
  const rawImage = qs("#product-image").value || "assets/img/placeholder.svg";
  const image = rawImage.startsWith("http") || rawImage.startsWith("/") ? rawImage : `../${rawImage}`;
  const price = Number(qs("#product-price").value || 0);
  const compare = qs("#product-compare").value;
  const discount = qs("#product-discount").value;
  preview.innerHTML = `
    <div style="position: relative;">
      <img src="${image}" alt="${name}" />
      ${discount ? `<span class="badge discount">-${discount}%</span>` : ""}
    </div>
    <div>
      <h3>${name}</h3>
      <p class="muted">${perks}</p>
    </div>
    <div class="price">$${price.toFixed(2)} ${compare ? `<del>${compare}</del>` : ""}</div>
  `;
};

const saveProduct = async (payload) => {
  const res = await fetch("api/product-save.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ ...payload, csrf_token: state.csrf })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save product");
  }
  return res.json();
};

const deleteProduct = async (id) => {
  const res = await fetch("api/product-delete.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ id, csrf_token: state.csrf })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to delete product");
  }
};

const renderFeatured = () => {
  const list = qs("#featured-list");
  if (!list) return;
  const featured = state.products
    .filter((p) => p.is_featured)
    .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0))
    .slice(0, state.featuredLimit);

  list.innerHTML = "";
  if (!featured.length) {
    list.innerHTML = "<li class='admin-featured-item'>No featured items selected.</li>";
    return;
  }
  featured.forEach((product) => {
    const item = document.createElement("li");
    item.className = "admin-featured-item";
    item.setAttribute("draggable", "true");
    item.dataset.id = product.id;
    item.innerHTML = `
      <span>${getName(product)}</span>
      <button class="btn btn-ghost" data-unfeature="${product.id}">Remove</button>
    `;
    list.appendChild(item);
  });
};

const renderOrders = () => {
  const tableBody = qs("#orders-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "";
  if (!state.orders.length) {
    tableBody.innerHTML = "<tr><td colspan='6'>No orders found.</td></tr>";
    return;
  }
  state.orders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.customer_email}</td>
      <td>${order.status}</td>
      <td>${order.total} ${order.currency || ""}</td>
      <td>${order.created_at}</td>
      <td class="actions">
        <button class="btn btn-secondary" data-order="${order.id}">View</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
};

const openOrderModal = async (orderId) => {
  const modal = qs("#order-modal");
  if (!modal) return;
  const res = await fetch(`api/order.php?id=${encodeURIComponent(orderId)}`, { credentials: "same-origin" });
  if (!res.ok) {
    toast("Failed to load order");
    return;
  }
  const data = await res.json();
  const order = data.order;
  state.currentOrderId = order.id;
  qs("#order-modal-title").textContent = `Order ${order.id}`;
  qs("#order-status").value = order.status;
  const detail = qs("#order-detail");
  const items = (order.items || [])
    .map((item) => `<li>${item.name} x${item.qty} — $${Number(item.line_total || 0).toFixed(2)}</li>`)
    .join("");
  detail.innerHTML = `
    <div><strong>Status:</strong> ${order.status}</div>
    <div><strong>Email:</strong> ${order.customer_email}</div>
    <div><strong>Name:</strong> ${order.customer_name || "-"}</div>
    <div><strong>Note:</strong> ${order.customer_note || "-"}</div>
    <div><strong>Total:</strong> ${order.total} ${order.currency || ""}</div>
    <div>
      <strong>Items</strong>
      <ul class="admin-order-items">${items}</ul>
    </div>
  `;
  modal.classList.add("open");
};

const saveFeaturedOrder = async () => {
  const list = qs("#featured-list");
  const ids = qsa(".admin-featured-item", list).map((item) => item.dataset.id);
  const res = await fetch("api/featured-save.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ featured: ids, csrf_token: state.csrf })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to save featured order");
  }
  toast("Featured order saved");
};

const handleDragDrop = () => {
  const list = qs("#featured-list");
  if (!list) return;
  let dragged = null;
  list.addEventListener("dragstart", (e) => {
    const target = e.target.closest(".admin-featured-item");
    if (!target) return;
    dragged = target;
    target.classList.add("dragging");
  });
  list.addEventListener("dragend", (e) => {
    const target = e.target.closest(".admin-featured-item");
    if (target) target.classList.remove("dragging");
  });
  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest(".admin-featured-item");
    if (!target || target === dragged) return;
    const rect = target.getBoundingClientRect();
    const next = e.clientY > rect.top + rect.height / 2;
    list.insertBefore(dragged, next ? target.nextSibling : target);
  });
};

const bindEvents = () => {
  const filters = ["#admin-search", "#admin-category", "#admin-featured", "#admin-sort"];
  filters.forEach((sel) => {
    const el = qs(sel);
    if (el) el.addEventListener("input", renderTable);
  });

  const orderFilters = ["#order-search", "#order-status-filter", "#order-sort"];
  orderFilters.forEach((sel) => {
    const el = qs(sel);
    if (el) {
      el.addEventListener("input", async () => {
        await fetchOrders();
        renderOrders();
      });
    }
  });

  qs("#new-product")?.addEventListener("click", () => openModal(null));
  qs("#logout-btn")?.addEventListener("click", async () => {
    await fetch("api/logout.php", { credentials: "same-origin" });
    window.location.href = "login.html";
  });

  qs("#products-table")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-edit]");
    if (!btn) return;
    const product = state.products.find((p) => p.id === btn.dataset.edit);
    openModal(product);
  });

  qs("#orders-table")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order]");
    if (!btn) return;
    openOrderModal(btn.dataset.order);
  });

  qs("#product-form")?.addEventListener("input", updatePreview);
  qs("#product-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      id: qs("#product-id").value || undefined,
      name: qs("#product-name").value,
      category: qs("#product-category").value,
      price: parseFloat(qs("#product-price").value || "0"),
      compareAt: qs("#product-compare").value,
      discount: parseInt(qs("#product-discount").value || "0", 10),
      tags: qs("#product-tags").value,
      short_description: qs("#product-short").value,
      full_description: qs("#product-full").value,
      perks: qs("#product-perks").value,
      image: qs("#product-image").value,
      gallery: qs("#product-gallery").value,
      variants: qs("#product-variants").value,
      popularity: parseInt(qs("#product-popularity").value || "0", 10),
      featured_order: parseInt(qs("#product-featured-order").value || "0", 10),
      is_active: qs("#product-active").checked,
      is_featured: qs("#product-featured").checked
    };
    try {
      const result = await saveProduct(payload);
      const saved = result.product;
      const idx = state.products.findIndex((p) => p.id === saved.id);
      if (idx >= 0) state.products[idx] = saved;
      else state.products.push(saved);
      renderTable();
      renderFeatured();
      toast("Product saved");
      closeModal();
    } catch (err) {
      toast(err.message);
    }
  });

  qs("#delete-product")?.addEventListener("click", async () => {
    const id = qs("#product-id").value;
    if (!id) return;
    if (!confirm("Deactivate this product?")) return;
    try {
      await deleteProduct(id);
      const target = state.products.find((p) => p.id === id);
      if (target) target.is_active = false;
      renderTable();
      renderFeatured();
      toast("Product deactivated");
      closeModal();
    } catch (err) {
      toast(err.message);
    }
  });

  qs("#product-image-upload")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("csrf_token", state.csrf);
    try {
      const res = await fetch("api/upload.php", {
        method: "POST",
        credentials: "same-origin",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      qs("#product-image").value = data.path;
      updatePreview();
      toast("Image uploaded");
    } catch (err) {
      toast(err.message);
    }
  });

  qs("#featured-list")?.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-unfeature]");
    if (!btn) return;
    const product = state.products.find((p) => p.id === btn.dataset.unfeature);
    if (!product) return;
    try {
      const result = await saveProduct({ id: product.id, is_featured: false, featured_order: 0 });
      const idx = state.products.findIndex((p) => p.id === product.id);
      state.products[idx] = result.product;
      renderFeatured();
      renderTable();
      toast("Removed from featured");
    } catch (err) {
      toast(err.message);
    }
  });

  qs("#save-featured")?.addEventListener("click", async () => {
    try {
      await saveFeaturedOrder();
    } catch (err) {
      toast(err.message);
    }
  });

  qs("#order-status-save")?.addEventListener("click", async () => {
    if (!state.currentOrderId) return;
    const status = qs("#order-status").value;
    try {
      const res = await fetch("api/order-status.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ id: state.currentOrderId, status, csrf_token: state.csrf })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update status");
      }
      toast("Order status updated");
      await fetchOrders();
      renderOrders();
    } catch (err) {
      toast(err.message);
    }
  });

  qsa("[data-modal-close]").forEach((btn) => btn.addEventListener("click", closeModal));
  qs("#product-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "product-modal") closeModal();
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  await fetchSession();
  await fetchProducts();
  renderTable();
  renderFeatured();
  await fetchOrders();
  renderOrders();
  handleDragDrop();
  bindEvents();
});
