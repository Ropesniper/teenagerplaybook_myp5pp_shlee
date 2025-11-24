// Switching tabs
const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");

tabs.forEach(tab => {
    tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        pages.forEach(p => p.classList.remove("visible"));
        document.getElementById(target).classList.add("visible");
    });
});

// Simple 7-day login system using localStorage
document.getElementById("loginSubmit").addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("user", email);
    localStorage.setItem("expiry", expiry);
    alert("Logged in successfully!");
});

function checkLogin() {
    const expiry = localStorage.getItem("expiry");
    if (!expiry || Date.now() > expiry) {
        localStorage.clear();
        return false;
    }
    return true;
}

// Block Dashboard, Sessions, Progress, History if not logged in
function gateProtected() {
    if (!checkLogin()) {
        alert("You must log in first!");
        pages.forEach(p => p.classList.remove("visible"));
        document.getElementById("login").classList.add("visible");
    }
}
["dashboard", "sessions", "progress", "history"].forEach(id => {
    document.getElementById(id).addEventListener("click", gateProtected);
});

