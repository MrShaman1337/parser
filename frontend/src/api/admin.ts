import { apiFetch } from "./client";
import { Product } from "../types";

export const adminSession = () =>
  apiFetch<{ ok: boolean; csrf_token: string; featured_limit: number; role: string; user: string }>(`/admin/api/session.php`);
export const adminLogin = (username: string, password: string, csrfToken: string) =>
  apiFetch(`/admin/api/login.php`, { method: "POST", body: { username, password, csrf_token: csrfToken } });
export const adminLogout = () => apiFetch(`/admin/api/logout.php`);

export const adminProducts = () => apiFetch<{ products: Product[] }>(`/admin/api/products.php?include_inactive=true`);
export const adminSaveProduct = (payload: Record<string, unknown>) =>
  apiFetch<{ ok: boolean; product: Product }>(`/admin/api/product-save.php`, { method: "POST", body: payload });
export const adminDeleteProduct = (id: string, csrfToken: string) =>
  apiFetch(`/admin/api/product-delete.php`, { method: "POST", body: { id, csrf_token: csrfToken } });
export const adminSaveFeatured = (featured: string[], csrfToken: string) =>
  apiFetch(`/admin/api/featured-save.php`, { method: "POST", body: { featured, csrf_token: csrfToken } });

export const adminFeaturedDrop = () =>
  apiFetch<{ featured_drop: any }>(`/admin/api/featured-drop.php`);
export const adminSaveFeaturedDrop = (payload: Record<string, unknown>) =>
  apiFetch<{ ok: boolean; featured_drop: any }>(`/admin/api/featured-drop.php`, { method: "POST", body: payload });

export const adminOrders = (query = "", status = "", sort = "date") =>
  apiFetch<{ orders: any[] }>(`/admin/api/orders.php?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&sort=${sort}`);
export const adminOrder = (id: string) => apiFetch<{ order: any }>(`/admin/api/order.php?id=${encodeURIComponent(id)}`);
export const adminUpdateOrderStatus = (id: string, status: string, csrfToken: string) =>
  apiFetch(`/admin/api/order-status.php`, { method: "POST", body: { id, status, csrf_token: csrfToken } });

export const adminUploadImage = async (file: File, csrfToken: string) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("csrf_token", csrfToken);
  const res = await fetch("/admin/api/upload.php", { method: "POST", body: formData, credentials: "same-origin" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data as { ok: boolean; path: string };
};
