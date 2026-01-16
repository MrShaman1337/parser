const Account = () => {
  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>Account</h1>
          <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <img src="/assets/img/avatar.svg" alt="User avatar" width={80} style={{ borderRadius: "50%" }} />
            <div>
              <h3>StoneWarden</h3>
              <p className="muted">Steam ID: STEAM_0:1:123456</p>
              <button className="btn btn-secondary">Sign out</button>
            </div>
          </div>

          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>Purchase history</h3>
            <div className="grid">
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.8rem 0" }}>
                <div>
                  <strong>Elite VIP</strong>
                  <div className="muted">Jan 10, 2026</div>
                </div>
                <div>$24.00</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", padding: "0.8rem 0" }}>
                <div>
                  <strong>Wipe Day Kit</strong>
                  <div className="muted">Jan 5, 2026</div>
                </div>
                <div>$18.00</div>
              </div>
            </div>
          </div>
        </section>

        <aside className="card sticky">
          <h3>Login</h3>
          <form>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" required />
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" required />
            <button className="btn btn-primary" type="submit" style={{ marginTop: "1rem" }}>
              Sign in
            </button>
          </form>
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Register</h3>
            <form>
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" type="email" required />
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" required />
              <button className="btn btn-secondary" type="submit" style={{ marginTop: "1rem" }}>
                Create account
              </button>
            </form>
          </div>
        </aside>
      </div>
    </main>
  );
};

export default Account;
