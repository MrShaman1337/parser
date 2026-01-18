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
  product_type?: "privilege" | "kit" | "item" | "mixed";
  rust_command_template?: string;
  server_restriction?: string; // "all" or specific server_id
  created_at?: string;
};

export type Server = {
  id: string;
  name: string;
  description?: string;
  ip: string;
  current_players: number;
  max_players: number;
  fill_percent: number;
  map?: string;
  region: string;
  is_online: boolean;
};

export type CartItem = {
  id: string;
  title: string;
  price: number;
  priceFormatted?: string;
  image: string;
  qty: number;
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

// Order and purchase history types
export type OrderItem = {
  id: string;
  product_id: string;
  name: string;
  quantity: number;
  price: number;
  price_formatted: string;
};

export type Order = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  total_formatted: string;
  currency: string;
  items: OrderItem[];
};

// Cart entries for Rust delivery
export type CartEntry = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  status: "pending" | "delivering" | "delivered" | "failed" | "cancelled";
  attempt_count: number;
  last_error?: string;
  created_at: string;
  delivered_at?: string;
  status_label: {
    en: string;
    ru: string;
  };
};
