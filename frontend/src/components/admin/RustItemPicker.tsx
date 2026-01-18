import { useEffect, useState, useMemo, useCallback } from "react";

// Rust item from API
interface RustItem {
  Id: number;
  DisplayName: string;
  ShortName: string;
  Description: string;
  Stack: number;
  Hidden: boolean;
  Category: number;
}

// Category mapping from Rust API
const CATEGORIES: Record<number, string> = {
  0: "Оружие",
  1: "Конструкции",
  2: "Предметы",
  3: "Ресурсы",
  4: "Одежда",
  5: "Инструменты",
  6: "Медикаменты",
  7: "Еда",
  8: "Боеприпасы",
  9: "Ловушки",
  10: "Прочее",
  11: "Компоненты",
  12: "Электричество",
  13: "Развлечения"
};

// All category IDs
const CATEGORY_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

// Cache key and TTL (24 hours)
const ITEMS_CACHE_KEY = "rust_items_cache";
const ITEMS_CACHE_TTL = 24 * 60 * 60 * 1000;

interface CachedItems {
  items: RustItem[];
  timestamp: number;
}

// Get items from cache
const getCachedItems = (): RustItem[] | null => {
  try {
    const cached = localStorage.getItem(ITEMS_CACHE_KEY);
    if (!cached) return null;
    const data: CachedItems = JSON.parse(cached);
    if (Date.now() - data.timestamp > ITEMS_CACHE_TTL) {
      localStorage.removeItem(ITEMS_CACHE_KEY);
      return null;
    }
    return data.items;
  } catch {
    return null;
  }
};

// Save items to cache
const setCachedItems = (items: RustItem[]) => {
  try {
    const data: CachedItems = { items, timestamp: Date.now() };
    localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

// Preload images for visible items
const preloadedImages = new Set<string>();
const preloadImage = (src: string) => {
  if (preloadedImages.has(src)) return;
  preloadedImages.add(src);
  const img = new Image();
  img.src = src;
};

interface RustItemPickerProps {
  onSelect: (item: { name: string; shortName: string; command: string; image: string }) => void;
  onClose: () => void;
}

const RustItemPicker = ({ onSelect, onClose }: RustItemPickerProps) => {
  const [items, setItems] = useState<RustItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      try {
        // Check cache first
        const cached = getCachedItems();
        if (cached && cached.length > 0) {
          setItems(cached);
          setLoading(false);
          return;
        }

        setLoading(true);
        const response = await fetch("https://api.carbonmod.gg/meta/rust/items.json");
        if (!response.ok) throw new Error("Failed to fetch items");
        const data: RustItem[] = await response.json();
        // Filter out hidden items
        const visibleItems = data.filter((item) => !item.Hidden);
        setItems(visibleItems);
        setCachedItems(visibleItems);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load items");
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (selectedCategory !== null) {
      list = list.filter((item) => item.Category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.DisplayName.toLowerCase().includes(q) ||
          item.ShortName.toLowerCase().includes(q)
      );
    }
    // Sort alphabetically
    return list.sort((a, b) => a.DisplayName.localeCompare(b.DisplayName));
  }, [items, selectedCategory, search]);

  // Preload images for first 50 filtered items
  useEffect(() => {
    filtered.slice(0, 50).forEach((item) => {
      preloadImage(`https://cdn.carbonmod.gg/items/${item.ShortName}.png`);
    });
  }, [filtered]);

  const handleSelect = useCallback((item: RustItem) => {
    onSelect({
      name: item.DisplayName,
      shortName: item.ShortName,
      command: `inventory.giveto {steamid} ${item.ShortName} {qty}`,
      image: `https://cdn.carbonmod.gg/items/${item.ShortName}.png`
    });
  }, [onSelect]);

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    items.forEach((item) => {
      counts[item.Category] = (counts[item.Category] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Force refresh cache
  const handleRefreshCache = async () => {
    localStorage.removeItem(ITEMS_CACHE_KEY);
    setLoading(true);
    try {
      const response = await fetch("https://api.carbonmod.gg/meta/rust/items.json");
      if (!response.ok) throw new Error("Failed to fetch items");
      const data: RustItem[] = await response.json();
      const visibleItems = data.filter((item) => !item.Hidden);
      setItems(visibleItems);
      setCachedItems(visibleItems);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rust-item-picker-overlay" onClick={onClose}>
      <div className="rust-item-picker" onClick={(e) => e.stopPropagation()}>
        <div className="rust-item-picker-header">
          <h3>Выбор предмета</h3>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button 
              className="btn btn-ghost" 
              onClick={handleRefreshCache}
              title="Обновить кеш предметов"
            >
              🔄
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="rust-item-picker-categories">
          <button
            className={`category-btn ${selectedCategory === null ? "active" : ""}`}
            onClick={() => setSelectedCategory(null)}
          >
            Все ({items.length})
          </button>
          {CATEGORY_IDS.map((catId) => {
            const count = categoryCounts[catId] || 0;
            if (count === 0) return null;
            return (
              <button
                key={catId}
                className={`category-btn ${selectedCategory === catId ? "active" : ""}`}
                onClick={() => setSelectedCategory(catId)}
              >
                {CATEGORIES[catId]} ({count})
              </button>
            );
          })}
        </div>

        <div className="rust-item-picker-search">
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="rust-item-picker-content">
          {loading && (
            <div className="rust-item-picker-loading">
              <div className="spinner"></div>
              <p>Загрузка предметов...</p>
            </div>
          )}

          {error && (
            <div className="rust-item-picker-error">
              <p>❌ {error}</p>
              <button className="btn btn-secondary" onClick={handleRefreshCache}>
                Попробовать снова
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="rust-item-picker-grid">
              {filtered.length === 0 && (
                <div className="rust-item-picker-empty">
                  <p>Предметы не найдены</p>
                </div>
              )}
              {filtered.map((item) => (
                <div
                  key={item.Id}
                  className="rust-item-card"
                  onClick={() => handleSelect(item)}
                  title={`${item.DisplayName}\n${item.ShortName}\n${item.Description}`}
                >
                  <img
                    src={`https://cdn.carbonmod.gg/items/${item.ShortName}.png`}
                    alt={item.DisplayName}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/assets/img/placeholder.svg";
                    }}
                  />
                  <span className="rust-item-name">{item.DisplayName}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RustItemPicker;
