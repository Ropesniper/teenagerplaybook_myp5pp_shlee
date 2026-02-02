function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Enter email and password");
    return;
  }

  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("userEmail", email);

  const redirect = localStorage.getItem("redirect") || "dashboard.html";
  window.location.href = redirect;
}

function requireLogin(page) {
  const loggedIn = localStorage.getItem("loggedIn");
  if (!loggedIn) {
    localStorage.setItem("redirect", page);
    window.location.href = "login.html";
  }
}
