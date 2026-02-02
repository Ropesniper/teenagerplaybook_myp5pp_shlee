let h=JSON.parse(localStorage.getItem("history"))||[];
document.getElementById("history").innerHTML=h.map(x=>`<p>${x.video} - ${x.time}</p>`).join("");
