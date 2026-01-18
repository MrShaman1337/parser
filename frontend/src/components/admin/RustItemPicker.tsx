import { useEffect, useState, useMemo } from "react";

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
        setLoading(true);
        const response = await fetch("https://api.carbonmod.gg/meta/rust/items.json");
        if (!response.ok) throw new Error("Failed to fetch items");
        const data: RustItem[] = await response.json();
        // Filter out hidden items
        setItems(data.filter((item) => !item.Hidden));
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

  const handleSelect = (item: RustItem) => {
    onSelect({
      name: item.DisplayName,
      shortName: item.ShortName,
      command: `inventory.giveto {steamid} ${item.ShortName} {qty}`,
      image: `https://cdn.carbonmod.gg/items/${item.ShortName}.png`
    });
  };

  // Count items per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    items.forEach((item) => {
      counts[item.Category] = (counts[item.Category] || 0) + 1;
    });
    return counts;
  }, [items]);

  return (
    <div className="rust-item-picker-overlay" onClick={onClose}>
      <div className="rust-item-picker" onClick={(e) => e.stopPropagation()}>
        <div className="rust-item-picker-header">
          <h3>Выбор предмета</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            ✕
          </button>
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
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>
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
