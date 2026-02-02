function saveHistory(videoName) {
  let history = JSON.parse(localStorage.getItem("history")) || [];
  history.push({ video: videoName, time: new Date().toLocaleString() });
  localStorage.setItem("history", JSON.stringify(history));
}
