export type Product = {
  id: string;
  region?: "eu" | "ru";
  name?: string;
  title?: string;
  perks?: string;
  short_description?: string;
  full_description?: string;
  price: number;
  priceFormatted?: string;
  compareAt?: string | null;
  discount?: number;
  image: string;
  gallery?: string[];
  items?: string[];
  requirements?: string;
  delivery?: string;
  category?: string;
  tags?: string[];
  variants?: string[];
  popularity?: number;
  is_active?: boolean;
  is_featured?: boolean;
  featured_order?: number;
  created_at?: string;
};

export type CartItem = {
  id: string;
  title: string;
  price: number;
  priceFormatted?: string;
  image: string;
  qty: number;
};

export type Order = {
  id: string;
  created_at: string;
  status: string;
  customer_email: string;
  customer_name?: string;
  customer_note?: string;
  total: number | string;
  currency?: string;
};

export type User = {
  id: number;
  steam_id: string;
  nickname: string;
  avatar?: string;
  profile_url?: string;
  balance?: number;
  balance_usd?: number;
  balance_formatted?: string;
  balance_formatted_usd?: string;
};

export type FeaturedDrop = {
  product_id: string;
  title: string;
  subtitle?: string;
  cta_text: string;
  old_price?: number | null;
  price: number;
  is_enabled: boolean;
  product?: Product;
};
