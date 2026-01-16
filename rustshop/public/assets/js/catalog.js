const catalogGrid = document.getElementById("catalog-grid");
const searchInput = document.getElementById("filter-search");
const minInput = document.getElementById("filter-min");
const maxInput = document.getElementById("filter-max");
const tagSelect = document.getElementById("filter-tag");
const sortSelect = document.getElementById("filter-sort");
const pagination = document.getElementById("pagination");

let products = [];
let currentPage = 1;
const pageSize = 8;

const getName = (product) => product.name || product.title || "Untitled";
const getPerks = (product) => product.perks || product.short_description || "";

const renderProducts = (list) => {
  if (!catalogGrid) return;
  catalogGrid.innerHTML = "";
  if (!list.length) {
    catalogGrid.innerHTML = '<div class="card">No products found.</div>';
    return;
  }
  list.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <div style="position: relative;">
        <img src="${product.image}" alt="${getName(product)}" loading="lazy" />
        ${product.discount ? `<span class="badge discount">-${product.discount}%</span>` : ""}
      </div>
      <div>
        <h3>${getName(product)}</h3>
        <p class="muted">${getPerks(product)}</p>
      </div>
      <div class="price">${product.priceFormatted} ${product.compareAt ? `<del>${product.compareAt}</del>` : ""}</div>
      <button class="btn btn-primary" data-add="${product.id}">Add to cart</button>
    `;
    catalogGrid.appendChild(card);
  });
};

const filterProducts = () => {
  const query = (searchInput?.value || "").toLowerCase();
  const min = parseFloat(minInput?.value || "0");
  const max = parseFloat(maxInput?.value || "0");
  const tag = tagSelect?.value || "";
  const sort = sortSelect?.value || "popular";

  let list = products.filter((p) => {
    if (p.is_active === false) return false;
    const matchesQuery = getName(p).toLowerCase().includes(query);
    const matchesTag = tag ? (p.tags || []).includes(tag) || p.category === tag : true;
    const matchesMin = min ? p.price >= min : true;
    const matchesMax = max ? p.price <= max : true;
    return matchesQuery && matchesTag && matchesMin && matchesMax;
  });

  if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
  if (sort === "popular") list.sort((a, b) => b.popularity - a.popularity);

  return list;
};

const renderPagination = (total) => {
  if (!pagination) return;
  const totalPages = Math.ceil(total / pageSize);
  pagination.innerHTML = "";
  for (let i = 1; i <= totalPages; i += 1) {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("btn-primary");
    btn.addEventListener("click", () => {
      currentPage = i;
      updateCatalog();
    });
    pagination.appendChild(btn);
  }
};

const updateCatalog = () => {
  const list = filterProducts();
  const start = (currentPage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  renderProducts(pageItems);
  renderPagination(list.length);
};

const handleAddToCart = () => {
  if (!catalogGrid) return;
  catalogGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const product = products.find((p) => p.id === btn.dataset.add);
    if (product) window.RustShop.addToCart(product, 1);
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    products = await window.RustShop.fetchProducts();
    updateCatalog();
    handleAddToCart();
    [searchInput, minInput, maxInput, tagSelect, sortSelect].forEach((el) => {
      if (el) el.addEventListener("input", updateCatalog);
    });
  } catch (err) {
    if (catalogGrid) catalogGrid.innerHTML = '<div class="card">Failed to load products.</div>';
  }
});
