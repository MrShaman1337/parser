import { useUserSession } from "../context/UserSessionContext";
import { useI18n } from "../i18n/I18nContext";

const Account = () => {
  const { authenticated, user, loading, logout } = useUserSession();
  const { t } = useI18n();

  if (loading) {
    return (
      <main className="section">
        <div className="container">
          <div className="card">{t("account.loading")}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="container layout-2">
        <section>
          <h1>{t("account.title")}</h1>
          {authenticated && user ? (
            <div className="card" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <img src={user.avatar || "/assets/img/avatar.svg"} alt="User avatar" width={80} style={{ borderRadius: "50%" }} />
              <div>
                <h3>{user.nickname}</h3>
                <p className="muted">
                  {t("account.steamId")}: {user.steam_id}
                </p>
                {user.profile_url ? (
                  <p>
                    <a className="btn btn-ghost" href={user.profile_url} target="_blank" rel="noreferrer">
                      {t("account.openProfile")}
                    </a>
                  </p>
                ) : null}
                <button className="btn btn-secondary" onClick={logout}>
                  {t("nav.signOut")}
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h3>{t("account.signInTitle")}</h3>
              <p className="muted">{t("account.signInDesc")}</p>
              <a className="btn btn-primary" href="/api/auth/steam-login.php">
                {t("nav.signIn")}
              </a>
            </div>
          )}

          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>{t("account.history")}</h3>
            <div className="muted">{t("account.historyEmpty")}</div>
          </div>
        </section>

        <aside className="card sticky">
          <h3>{t("account.steamAccount")}</h3>
          <p className="muted">{t("account.steamOnly")}</p>
          {authenticated ? (
            <button className="btn btn-secondary" onClick={logout} style={{ marginTop: "1rem" }}>
              {t("nav.signOut")}
            </button>
          ) : (
            <a className="btn btn-primary" href="/api/auth/steam-login.php" style={{ marginTop: "1rem", display: "inline-block" }}>
              {t("nav.signIn")}
            </a>
          )}
        </aside>
      </div>
    </main>
  );
};

export default Account;
