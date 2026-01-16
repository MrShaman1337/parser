export type Product = {
  id: string;
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
