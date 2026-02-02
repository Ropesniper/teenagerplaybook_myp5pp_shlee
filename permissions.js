async function startExercise() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById("exercisePopup").style.display = "none";
    evaluateExercise();
  } catch {
    alert("Permission denied.");
  }
}

function skipExercise() {
  document.getElementById("exercisePopup").style.display = "none";
}
