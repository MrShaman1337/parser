const form = document.getElementById("login-form");
const errorEl = document.getElementById("login-error");

let csrfToken = "";

const loadToken = async () => {
  const res = await fetch("api/login.php");
  const data = await res.json();
  csrfToken = data.csrf_token || "";
};

const showError = (message) => {
  if (errorEl) errorEl.textContent = message;
};

document.addEventListener("DOMContentLoaded", async () => {
  await loadToken();
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const res = await fetch("api/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password, csrf_token: csrfToken })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showError(data.error || "Login failed");
      return;
    }
    window.location.href = "index.html";
  });
});
