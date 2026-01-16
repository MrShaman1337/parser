import { apiFetch } from "./client";
import { User } from "../types";

export const userSession = () => apiFetch<{ ok: boolean; user: User }>(`/api/auth/session.php`);
export const userLogout = () => apiFetch(`/api/auth/logout.php`, { method: "POST" });
