const productContainer = document.getElementById("product-detail");
const relatedGrid = document.getElementById("related-grid");

const getProductId = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
};

const getName = (product) => product.name || product.title || "Untitled";
const getDescription = (product) => product.full_description || product.description || product.short_description || "";

const renderProduct = (product) => {
  if (!productContainer) return;
  productContainer.innerHTML = `
    <div class="layout-2">
      <section>
        <div class="card">
          <div class="grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
            <div>
              <img src="${product.image}" alt="${getName(product)}" />
              <div class="grid" style="grid-template-columns: repeat(4, 1fr); margin-top: 0.8rem;">
                ${(product.gallery || []).map((img) => `<img src="${img}" alt="${getName(product)} thumbnail" loading="lazy" />`).join("")}
              </div>
            </div>
            <div class="grid">
              <h1>${getName(product)}</h1>
              <p class="muted">${getDescription(product)}</p>
              <div>
                ${product.discount ? `<span class="badge">Sale</span>` : ""}
                <span class="price">${product.priceFormatted}</span>
                ${product.compareAt ? `<del>${product.compareAt}</del>` : ""}
              </div>
              <div>
                <label for="variant">Select variant</label>
                <select id="variant">
                  ${(product.variants || []).map((variant) => `<option value="${variant}">${variant}</option>`).join("")}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="grid" style="margin-top: 2rem;">
          <div class="card">
            <h3>What you get</h3>
            <ul>
              ${(product.items || []).map((item) => `<li>${item}</li>`).join("")}
            </ul>
          </div>
          <div class="card">
            <h3>Requirements</h3>
            <p class="muted">${product.requirements}</p>
            <h3>Delivery</h3>
            <p class="muted">${product.delivery}</p>
            <h3>Refunds</h3>
            <p class="muted">Refunds available within 24 hours for unused digital items.</p>
          </div>
        </div>
      </section>
      <aside class="card sticky">
        <h3>Buy now</h3>
        <p class="muted">Instant delivery to your Rust account.</p>
        <div class="price">${product.priceFormatted}</div>
        <button class="btn btn-primary" id="buy-btn">Add to cart</button>
        <a class="btn btn-secondary" href="checkout.html" style="margin-top: 0.5rem;">Buy now</a>
        <div style="margin-top: 1rem;">
          <p class="muted">Delivery method</p>
          <span class="chip">${product.delivery}</span>
        </div>
      </aside>
    </div>
  `;

  const buyBtn = document.getElementById("buy-btn");
  if (buyBtn) {
    buyBtn.addEventListener("click", () => window.RustShop.addToCart(product, 1));
  }
};

const renderRelated = (list) => {
  if (!relatedGrid) return;
  relatedGrid.innerHTML = "";
  list.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${product.image}" alt="${getName(product)}" loading="lazy" />
      <h3>${getName(product)}</h3>
      <div class="price">${product.priceFormatted}</div>
      <button class="btn btn-secondary" data-add="${product.id}">Add to cart</button>
    `;
    relatedGrid.appendChild(card);
  });

  relatedGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add]");
    if (!btn) return;
    const product = list.find((p) => p.id === btn.dataset.add);
    if (product) window.RustShop.addToCart(product, 1);
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const allProducts = await window.RustShop.fetchProducts();
    const activeProducts = allProducts.filter((p) => p.is_active !== false);
    const product = activeProducts.find((p) => p.id === getProductId());
    if (!product) {
      if (productContainer) productContainer.innerHTML = '<div class="card">Product not found.</div>';
      return;
    }
    renderProduct(product);
    const related = activeProducts.filter((p) => p.id !== product.id).slice(0, 4);
    renderRelated(related);
  } catch (err) {
    if (productContainer) productContainer.innerHTML = '<div class="card">Failed to load product.</div>';
  }
});
