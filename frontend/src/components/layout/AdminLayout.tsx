import { Link } from "react-router-dom";
import { adminLogout } from "../../api/admin";
import { useAdminSession } from "../../context/AdminSessionContext";

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { refresh } = useAdminSession();
  const handleLogout = async () => {
    await adminLogout();
    await refresh();
    window.location.href = "/admin/login";
  };

  return (
    <div className="admin-body">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="logo">
            <span>⚙</span>
            <span>Rust Admin</span>
          </div>
          <nav className="grid" style={{ marginTop: "2rem" }}>
            <Link to="/">View Site</Link>
            <Link to="/admin">Products</Link>
            <Link to="/admin/orders">Orders</Link>
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          </nav>
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
