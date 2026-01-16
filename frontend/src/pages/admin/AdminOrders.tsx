import { useEffect, useState } from "react";
import { adminOrder, adminOrders, adminUpdateOrderStatus } from "../../api/admin";
import { useAdminSession } from "../../context/AdminSessionContext";

const AdminOrders = () => {
  const { csrf, role } = useAdminSession();
  const [orders, setOrders] = useState<any[]>([]);
  const canEdit = role === "admin" || role === "superadmin";

  const [filters, setFilters] = useState({ q: "", status: "", sort: "date" });
  const [modalOpen, setModalOpen] = useState(false);
  const [current, setCurrent] = useState<any | null>(null);

  const load = async () => {
    const data = await adminOrders(filters.q, filters.status, filters.sort);
    setOrders(data.orders || []);
  };

  useEffect(() => {
    load();
  }, [filters]);

  const openModal = async (id: string) => {
    const data = await adminOrder(id);
    setCurrent(data.order);
    setModalOpen(true);
  };

  const updateStatus = async () => {
    if (!canEdit) return;
    if (!current) return;
    await adminUpdateOrderStatus(current.id, current.status, csrf);
    setModalOpen(false);
    load();
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Orders</h1>
          <p className="muted">Track and update order status.</p>
        </div>
      </div>

      <section className="card admin-panel">
        <div className="filters admin-filters">
          <input placeholder="Search order id/email" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
          <select onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="paid">Paid</option>
            <option value="delivered">Delivered</option>
            <option value="canceled">Canceled</option>
          </select>
          <select onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
            <option value="date">Newest</option>
            <option value="date_asc">Oldest</option>
          </select>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Email</th>
                <th>Status</th>
                <th>Total</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6}>No orders found.</td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.id}</td>
                  <td>{order.customer_email}</td>
                  <td>{order.status}</td>
                  <td>
                    {order.total} {order.currency || ""}
                  </td>
                  <td>{order.created_at}</td>
                  <td className="actions">
                    <button className="btn btn-secondary" onClick={() => openModal(order.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className={`modal ${modalOpen ? "open" : ""}`}>
        <div className="modal-panel admin-modal">
          <div className="admin-modal-header">
            <h3>Order {current?.id}</h3>
            <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
              Close
            </button>
          </div>
          {current && (
            <>
              <div className="grid" style={{ marginTop: "1rem" }}>
                <div><strong>Status:</strong> {current.status}</div>
                <div><strong>Email:</strong> {current.customer_email}</div>
                <div><strong>Name:</strong> {current.customer_name || "-"}</div>
                <div><strong>Note:</strong> {current.customer_note || "-"}</div>
                <div><strong>Total:</strong> {current.total} {current.currency || ""}</div>
                <div>
                  <strong>Items</strong>
                  <ul className="admin-order-items">
                    {(current.items || []).map((item: any) => (
                      <li key={item.id}>
                        {item.name} x{item.qty} — ${Number(item.line_total || 0).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div style={{ marginTop: "1rem" }}>
                <label>Update status</label>
                <select
                  value={current.status}
                  disabled={!canEdit}
                  onChange={(e) => setCurrent({ ...current, status: e.target.value })}
                >
                  <option value="new">New</option>
                  <option value="paid">Paid</option>
                  <option value="delivered">Delivered</option>
                  <option value="canceled">Canceled</option>
                </select>
                <button className="btn btn-primary" style={{ marginTop: "0.8rem" }} onClick={updateStatus} disabled={!canEdit}>
                  Save status
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminOrders;
