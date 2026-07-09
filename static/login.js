const form = document.getElementById("login-form");
const usernameInput = document.getElementById("username-input");
const passwordInput = document.getElementById("password-input");
const errorEl = document.getElementById("login-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.hidden = true;

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: usernameInput.value.trim(),
        password: passwordInput.value,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      errorEl.textContent = body.detail || "Invalid username or password.";
      errorEl.hidden = false;
      passwordInput.value = "";
      passwordInput.focus();
      return;
    }

    window.location.href = "/app/";
  } catch (err) {
    errorEl.textContent = "Could not reach the server. Try again.";
    errorEl.hidden = false;
  }
});
