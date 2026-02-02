const canvas = document.getElementById("progressChart");
const ctx = canvas.getContext("2d");

const data = [70, 40, 90]; // example progress %

function drawCircle(percent, color, startAngle) {
  const angle = (percent / 100) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(150, 150, 100, startAngle, startAngle + angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = 15;
  ctx.stroke();
  return startAngle + angle;
}

let start = 0;
start = drawCircle(data[0], "#ff6f61", start);
start = drawCircle(data[1], "#6a5acd", start);
drawCircle(data[2], "#2ecc71", start);
