# Rust Premium Storefront Theme (GameStores)

Production-ready, premium gaming storefront theme for Rust servers. Built with clean HTML templates, CSS variables, and minimal JS.

## Structure
- `theme.config.json` theme tokens (colors, radius, spacing, fonts)
- `assets/css/theme.css` main styles
- `assets/js/main.js` minimal interactions (drawer, modal, accordion, toasts)
- `templates/` page templates
- `mock-data.json` local preview data

## Setup
1. Upload the `theme/` folder to your GameStores theme directory.
2. Map GameStores template variables to the placeholders (e.g., `{{store.name}}`, `{{products}}`).
3. Replace hero/image assets in `assets/img/`.
4. Update `theme.config.json` and mirror values into `:root` in `assets/css/theme.css` if your platform does not auto-bind config values.

## GameStores Hooks
These templates include placeholder variables and `data-gs-*` attributes for easy binding:
- `data-gs-action` for buttons: `add-to-cart`, `remove-item`, `apply-coupon`, `login`, `checkout`
- `data-gs-product-*` for product info
- `data-gs-cart-*` for cart info

## Notes
- Images are lazy-loaded and responsive-ready.
- Modals, drawer, and accordion are vanilla JS and optional.
- For SEO, update meta tags and OG images per page.
