let isLoggedIn = false;
let currentStream = null;
let lastTarget = 'home';
const stopPoints = [10, 25]; 

// ACCESS GUARD
function route(id) {
    const protectedRoutes = ['dashboard', 'sessions', 'history', 'session-detail'];
    
    if (protectedRoutes.includes(id) && !isLoggedIn) {
        lastTarget = id;
        showLogin();
        return;
    }

    if (id !== 'session-detail') stopWebcam();
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function showLogin() {
    document.getElementById('login-page').style.display = 'flex';
}

function processLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if (email && pass) {
        isLoggedIn = true;
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('login-nav').innerText = "Account ✅";
        route(lastTarget);
    } else {
        alert("Please enter credentials.");
    }
}

function logout() {
    isLoggedIn = false;
    document.getElementById('login-nav').innerText = "Login";
    alert("Logged out successfully.");
    route('home');
}

// AI & SESSIONS
function openSession(type) {
    document.getElementById('session-title').innerText = type;
    route('session-detail');
}

function startExercise() {
    const video = document.getElementById('main-video');
    if (confirm("Allow webcam for exercise?")) {
        video.play();
        checkVideo(video);
        document.getElementById('session-action-btn').style.display = 'none';
    }
}

function checkVideo(video) {
    let p = 0;
    video.ontimeupdate = () => {
        if (p < stopPoints.length && video.currentTime >= stopPoints[p]) {
            video.pause(); p++; startAI();
        }
    };
}

async function startAI() {
    document.getElementById('ai-overlay').style.display = 'block';
    const webcamElem = document.getElementById('webcam');
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamElem.srcObject = currentStream;
        const faceapi = ml5.faceApi(webcamElem, { withLandmarks: true }, () => detect(faceapi));
    } catch (e) { alert("Camera Error"); }
}

function detect(faceapi) {
    if (!currentStream) return;
    faceapi.detect((err, res) => {
        let score = parseInt(document.getElementById('match-val').innerText);
        if (res && res.length > 0) {
            score += 15;
            document.getElementById('match-val').innerText = score;
            if (score >= 80) { stopWebcam(); document.getElementById('main-video').play(); return; }
        }
        setTimeout(() => detect(faceapi), 500);
    });
}

function stopWebcam() {
    if (currentStream) { currentStream.getTracks().forEach(t => t.stop()); currentStream = null; }
    document.getElementById('ai-overlay').style.display = 'none';
    document.getElementById('match-val').innerText = "0";
}

function closePopup(id) { document.getElementById(id).style.display = 'none'; }
window.onload = () => document.getElementById('cookie-overlay').style.display = 'flex';
