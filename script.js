function login() {
  const email = document.getElementById("email").value;
  if (!email) return alert("Enter email");

  localStorage.setItem("user", email);
  const redirect = localStorage.getItem("redirect") || "dashboard.html";
  window.location.href = redirect;
}

function checkAuth(page) {
  const user = localStorage.getItem("user");
  if (!user) {
    localStorage.setItem("redirect", page);
    window.location.href = "login.html";
  }
}
