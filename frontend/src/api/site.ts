import { FeaturedDrop } from "../types";

export const fetchStats = async (): Promise<{ orders_delivered: number; active_players: number }> => {
  const res = await fetch("/api/stats.php", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
};

export const fetchFeaturedDrop = async (): Promise<{ featured_drop: FeaturedDrop | null }> => {
  const res = await fetch("/api/featured-drop.php", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load featured drop");
  return res.json();
};
