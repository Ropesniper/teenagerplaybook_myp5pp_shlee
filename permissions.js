function startExercise(){
const agree=document.getElementById("agree").checked;
if(!agree){document.getElementById("popup").style.display="none";return;}
navigator.mediaDevices.getUserMedia({video:true,audio:true})
.then(stream=>evaluate())
.catch(()=>alert("Permission denied"));
}
