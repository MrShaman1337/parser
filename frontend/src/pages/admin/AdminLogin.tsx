import { useEffect, useState } from "react";
import { adminLogin } from "../../api/admin";
import { useAdminSession } from "../../context/AdminSessionContext";

const AdminLogin = () => {
  const [csrf, setCsrf] = useState("");
  const [error, setError] = useState("");
  const { refresh } = useAdminSession();

  useEffect(() => {
    fetch("/admin/api/login.php")
      .then((res) => res.json())
      .then((data) => setCsrf(data.csrf_token || ""));
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await adminLogin(String(formData.get("username")), String(formData.get("password")), csrf);
      await refresh();
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="admin-body">
      <main className="section">
        <div className="container admin-auth">
          <div className="card">
            <div className="logo">
              <span>⚙</span>
              <span>Go Rust Admin</span>
            </div>
            <p className="muted">Sign in to manage products and featured items.</p>
            <form className="grid" onSubmit={handleSubmit}>
              <label htmlFor="username">Username</label>
              <input id="username" name="username" type="text" required />
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required />
              <button className="btn btn-primary" type="submit">
                Login
              </button>
            </form>
            <div className="muted" style={{ marginTop: "0.5rem" }}>
              {error}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
