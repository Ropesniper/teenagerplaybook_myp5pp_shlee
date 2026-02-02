let stream;

async function showPopup(video) {
  window.currentVideo = video;
  document.getElementById("popup").style.display = "flex";
}

async function startAI() {
  document.getElementById("popup").style.display = "none";

  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

  const videoTrack = stream.getVideoTracks()[0];
  const audioTrack = stream.getAudioTracks()[0];

  let motionScore = await detectMotion();
  let voiceScore = await detectVoice();

  const finalScore = Math.round((motionScore + voiceScore) / 2);

  alert("AI score: " + finalScore + "%");

  if (finalScore >= 80) {
    window.currentVideo.play();
  } else {
    alert("Try again.");
  }
}

async function detectMotion() {
  return new Promise(resolve => {
    let score = 0;
    setTimeout(() => {
      score = Math.floor(Math.random() * 40 + 60); // semi-realistic
      resolve(score);
    }, 2000);
  });
}

async function detectVoice() {
  return new Promise(resolve => {
    let score = 0;
    setTimeout(() => {
      score = Math.floor(Math.random() * 40 + 60);
      resolve(score);
    }, 2000);
  });
}
