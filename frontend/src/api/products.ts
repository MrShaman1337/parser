import { Product } from "../types";

export const fetchProducts = async (): Promise<Product[]> => {
  const res = await fetch("/data/products.json");
  if (!res.ok) throw new Error("Failed to load products");
  return res.json();
};
