function login(){
const email=document.getElementById("email").value;
const password=document.getElementById("password").value;
if(!email||!password) return alert("Enter email and password");
localStorage.setItem("user",email);
const redirect=localStorage.getItem("redirect")||"dashboard.html";
window.location.href=redirect;
}


function checkAuth(page){
const user=localStorage.getItem("user");
if(!user){
localStorage.setItem("redirect",page);
window.location.href="login.html";
}
}
