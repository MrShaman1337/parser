import { useUserSession } from "../context/UserSessionContext";

const Account = () => {
  const { authenticated, user, loading, logout } = useUserSession();

  if (loading) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">Loading account...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>Account</h1>
          {authenticated && user ? (
            <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <img src={user.avatar || "/assets/img/avatar.svg"} alt="User avatar" width={80} style={{ borderRadius: "50%" }} />
              <div>
                <h3>{user.nickname}</h3>
                <p className="muted">Steam ID: {user.steam_id}</p>
                {user.profile_url ? (
                  <p>
                    <a className="btn btn-ghost" href={user.profile_url} target="_blank" rel="noreferrer">
                      Open Steam profile
                    </a>
                  </p>
                ) : null}
                <button className="btn btn-secondary" onClick={logout}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3>Sign in with Steam</h3>
              <p className="muted">Use your Steam account to access your orders and perks.</p>
              <a className="btn btn-primary" href="/api/auth/steam-login.php">
                Sign in with Steam
              </a>
            </div>
          )}

          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>Purchase history</h3>
            <div className="muted">Order history will appear here after your first purchase.</div>
          </div>
        </section>

        <aside className="card sticky">
          <h3>Steam account</h3>
          <p className="muted">We only support Steam sign-in for player accounts.</p>
          {authenticated ? (
            <button className="btn btn-secondary" onClick={logout} style={{ marginTop: "1rem" }}>
              Sign out
            </button>
          ) : (
            <a className="btn btn-primary" href="/api/auth/steam-login.php" style={{ marginTop: "1rem", display: "inline-block" }}>
              Sign in with Steam
            </a>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Account;
