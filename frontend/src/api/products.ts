import { Product } from "../types";

let productsCache: Product[] | null = null;
let productsPromise: Promise<Product[]> | null = null;

export const fetchProducts = async (): Promise<Product[]> => {
  if (productsCache) return productsCache;
  if (productsPromise) return productsPromise;
  productsPromise = fetch("/data/products.json", { cache: "force-cache" })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load products");
      return res.json();
    })
    .then((data) => {
      productsCache = data;
      return data;
    })
    .finally(() => {
      productsPromise = null;
    });
  return productsPromise;
};
