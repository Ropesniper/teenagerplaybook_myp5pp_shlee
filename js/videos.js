const videoMap = {
  intonation: ["videos/intonation1.mp4", "videos/intonation2.mp4"],
  body: ["videos/body1.mp4", "videos/body2.mp4"],
  facial: ["videos/facial1.mp4", "videos/facial2.mp4"]
};

function loadVideos(type) {
  const container = document.getElementById("videoContainer");
  container.innerHTML = "";

  videoMap[type].forEach((src, index) => {
    const frame = document.createElement("div");
    frame.className = "video-frame";

    const video = document.createElement("video");
    video.src = src;
    video.controls = true;

    video.addEventListener("timeupdate", () => {
      if (video.currentTime > video.duration / 2 && !video.dataset.checked) {
        video.pause();
        video.dataset.checked = "true";
        showPopup(video);
      }
    });

    frame.appendChild(video);
    container.appendChild(frame);
  });
}
