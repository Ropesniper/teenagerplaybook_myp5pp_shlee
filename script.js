let isLoggedIn = false;
let currentStream = null;
let lastTarget = 'home';
const stopPoints = [10, 30]; // Seconds where the video pauses for AI evaluation

// 1. NAVIGATION & LOGIN
function route(id) {
    const protectedRoutes = ['dashboard', 'sessions', 'history'];
    if (protectedRoutes.includes(id) && !isLoggedIn) {
        lastTarget = id;
        document.getElementById('login-page').style.display = 'flex';
        return;
    }
    // Turn off camera if leaving session
    if (id !== 'session-detail') stopWebcam();
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function processLogin() {
    isLoggedIn = true;
    document.getElementById('login-page').style.display = 'none';
    route(lastTarget);
}

// 2. SESSION FLOW
function openSession(type) {
    document.getElementById('session-title').innerText = type;
    route('session-detail');
}

function startExercise() {
    const video = document.getElementById('main-video');
    if (confirm("Would you like to start the training video and agree to the AI exercises?")) {
        video.play();
        checkVideoTime(video);
        document.getElementById('session-action-btn').style.display = 'none';
    }
}

function checkVideoTime(video) {
    let pointIndex = 0;
    video.ontimeupdate = () => {
        if (pointIndex < stopPoints.length && video.currentTime >= stopPoints[pointIndex]) {
            video.pause();
            pointIndex++;
            startAIEvaluation();
        }
    };
}

// 3. AI EVALUATION (STRICTLY START/STOP)
async function startAIEvaluation() {
    alert("Video Paused! Please mirror the expression using your webcam.");
    document.getElementById('ai-overlay').style.display = 'block';
    const webcamElem = document.getElementById('webcam');

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamElem.srcObject = currentStream;

        const faceapi = ml5.faceApi(webcamElem, { withLandmarks: true }, () => {
            evaluate(faceapi);
        });
    } catch (err) { alert("Camera needed for evaluation."); }
}

function evaluate(faceapi) {
    if (!currentStream) return;
    faceapi.detect((err, result) => {
        let scoreSpan = document.getElementById('match-val');
        let score = parseInt(scoreSpan.innerText);

        if (result && result.length > 0) {
            score += 10;
            scoreSpan.innerText = score;
            if (score >= 80) {
                stopWebcam();
                resumeVideo();
                return;
            }
        }
        setTimeout(() => evaluate(faceapi), 500);
    });
}

function stopWebcam() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    document.getElementById('ai-overlay').style.display = 'none';
    document.getElementById('match-val').innerText = "0";
}

function resumeVideo() {
    alert("80% Match! Well done. Resuming video...");
    document.getElementById('main-video').play();
    logToHistory();
}

function logToHistory() {
    const table = document.getElementById('history-body');
    const row = `<tr><td>${document.getElementById('session-title').innerText}</td><td>${new Date().toLocaleTimeString()}</td><td>${Intl.DateTimeFormat().resolvedOptions().timeZone}</td></tr>`;
    table.innerHTML += row;
}

function closePopup(id) { document.getElementById(id).style.display = 'none'; }
window.onload = () => document.getElementById('cookie-overlay').style.display = 'flex';
