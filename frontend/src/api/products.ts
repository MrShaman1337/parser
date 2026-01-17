import { Product } from "../types";

const productsCache: Record<string, Product[] | undefined> = {};
const productsPromise: Record<string, Promise<Product[]> | undefined> = {};

export const fetchProducts = async (region: "eu" | "ru" = "eu"): Promise<Product[]> => {
  if (productsCache[region]) return productsCache[region]!;
  if (productsPromise[region]) return productsPromise[region]!;
  productsPromise[region] = fetch(`/api/products.php?region=${region}`, { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    })
    .then((data) => {
      const items = data.products || [];
      productsCache[region] = items;
      return items;
    })
    .finally(() => {
      productsPromise[region] = undefined;
    });
  return productsPromise[region]!;
};
