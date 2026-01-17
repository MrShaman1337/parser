import { useEffect, useState } from "react";
import { useAdminSession } from "../../context/AdminSessionContext";

interface User {
  id: number;
  steam_id: string;
  steam_nickname: string;
  steam_avatar: string;
  balance: number;
  created_at: string;
  last_login_at: string;
  is_banned: number;
}

const AdminUsers = () => {
  const { csrf } = useAdminSession();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceDescription, setBalanceDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadUsers = async (q?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      params.set("limit", "100");
      const res = await fetch(`/admin/api/users.php?${params}`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) {
        setUsers(data.users || []);
        setTotal(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers(search);
  };

  const formatBalance = (amount: number) => {
    const rub = amount.toLocaleString("ru-RU", { minimumFractionDigits: 2 }) + " ₽";
    const usd = (amount / 90).toFixed(2);
    return `${rub} (~$${usd})`;
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !balanceAmount) return;

    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount === 0) {
      setMessage("Введите корректную сумму");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/admin/api/user-balance.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csrf_token: csrf,
          user_id: selectedUser.id,
          amount,
          description: balanceDescription
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Успешно! Новый баланс: ${formatBalance(data.user.balance)}`);
        // Update user in list
        setUsers(users.map(u => 
          u.id === selectedUser.id ? { ...u, balance: data.user.balance } : u
        ));
        setBalanceAmount("");
        setBalanceDescription("");
        setTimeout(() => setSelectedUser(null), 1500);
      } else {
        setMessage(data.error || "Ошибка");
      }
    } catch (e) {
      setMessage("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-users">
      <h2>Пользователи ({total})</h2>

      <form onSubmit={handleSearch} className="admin-search-form">
        <input
          type="text"
          placeholder="Поиск по нику или Steam ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-input"
        />
        <button type="submit" className="admin-btn" disabled={loading}>
          Поиск
        </button>
      </form>

      {loading && <p>Загрузка...</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Аватар</th>
            <th>Никнейм</th>
            <th>Steam ID</th>
            <th>Баланс</th>
            <th>Последний вход</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className={user.is_banned ? "banned" : ""}>
              <td>
                <img
                  src={user.steam_avatar || "/assets/img/avatar.svg"}
                  alt=""
                  className="user-avatar"
                  style={{ width: 32, height: 32, borderRadius: "50%" }}
                />
              </td>
              <td>{user.steam_nickname}</td>
              <td>
                <code>{user.steam_id}</code>
              </td>
              <td className={user.balance > 0 ? "balance-positive" : ""}>
                {formatBalance(user.balance)}
              </td>
              <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString("ru-RU") : "-"}</td>
              <td>
                <button
                  className="admin-btn admin-btn-sm"
                  onClick={() => {
                    setSelectedUser(user);
                    setBalanceAmount("");
                    setBalanceDescription("");
                    setMessage("");
                  }}
                >
                  Баланс
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && !loading && (
        <p className="no-data">Пользователи не найдены</p>
      )}

      {/* Balance Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Изменить баланс</h3>
            <div className="user-info">
              <img
                src={selectedUser.steam_avatar || "/assets/img/avatar.svg"}
                alt=""
                style={{ width: 48, height: 48, borderRadius: "50%" }}
              />
              <div>
                <strong>{selectedUser.steam_nickname}</strong>
                <p>Текущий баланс: {formatBalance(selectedUser.balance)}</p>
              </div>
            </div>

            <form onSubmit={handleBalanceSubmit}>
              <div className="form-group">
                <label>Сумма (₽)</label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="Положительная = пополнение, отрицательная = списание"
                  className="admin-input"
                  required
                />
                <small>Введите положительное число для пополнения, отрицательное для списания</small>
              </div>

              <div className="form-group">
                <label>Причина (опционально)</label>
                <input
                  type="text"
                  value={balanceDescription}
                  onChange={(e) => setBalanceDescription(e.target.value)}
                  placeholder="Например: Бонус за активность"
                  className="admin-input"
                />
              </div>

              {message && (
                <p className={message.includes("Успешно") ? "success-msg" : "error-msg"}>
                  {message}
                </p>
              )}

              <div className="modal-actions">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelectedUser(null)}>
                  Отмена
                </button>
                <button type="submit" className="admin-btn" disabled={saving}>
                  {saving ? "Сохранение..." : "Применить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .admin-users { padding: 20px; }
        .admin-search-form { display: flex; gap: 10px; margin-bottom: 20px; }
        .admin-input { padding: 8px 12px; border: 1px solid #444; background: #1a1a1a; color: #fff; border-radius: 4px; }
        .admin-btn { padding: 8px 16px; background: #10b981; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        .admin-btn:hover { background: #059669; }
        .admin-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .admin-btn-sm { padding: 4px 8px; font-size: 12px; }
        .admin-btn-secondary { background: #444; }
        .admin-btn-secondary:hover { background: #555; }
        .admin-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .admin-table th, .admin-table td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
        .admin-table th { background: #1a1a1a; color: #888; font-weight: 500; }
        .admin-table tr:hover { background: rgba(255,255,255,0.02); }
        .admin-table tr.banned { opacity: 0.5; }
        .balance-positive { color: #10b981; font-weight: 500; }
        .no-data { color: #666; text-align: center; padding: 40px; }
        .admin-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .admin-modal { background: #1a1a1a; padding: 24px; border-radius: 12px; width: 100%; max-width: 400px; border: 1px solid #333; }
        .admin-modal h3 { margin: 0 0 16px; }
        .user-info { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; padding: 12px; background: #0a0a0a; border-radius: 8px; }
        .user-info p { margin: 4px 0 0; color: #888; font-size: 14px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 4px; color: #888; font-size: 14px; }
        .form-group small { display: block; margin-top: 4px; color: #666; font-size: 12px; }
        .form-group .admin-input { width: 100%; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .success-msg { color: #10b981; margin: 10px 0; }
        .error-msg { color: #ef4444; margin: 10px 0; }
        code { background: #0a0a0a; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
      `}</style>
    </div>
  );
};

export default AdminUsers;
