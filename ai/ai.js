// ai.js - client-side AI orchestration (privacy-first)
// Loads face-api models from /models, uses MoveNet (tfjs) for poses and WebAudio for intonation.

// Lightweight wrapper object
const ai = (function () {
  // DOM video will be provided by session pages
  let videoEl = null;
  let stream = null;
  let audioCtx = null;
  let analyser = null;
  let micSource = null;

  // face-api loaded?
  let faceLoaded = false;
  // pose detector
  let poseDetector = null;

  // loops
  let emotionTimer = null;
  let poseTimer = null;
  let intonationTimer = null;

  // helpers
  function nowISO() { return new Date().toISOString(); }
  function baseLog(level, ...args) { /*console.log('[ai]', level, ...args)*/ }

  // load face-api models (tiny face + expression)
  async function loadFaceModels() {
    if (faceLoaded) return;
    await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
    await faceapi.nets.faceExpressionNet.loadFromUri('/models');
    faceLoaded = true;
  }

  // load pose detector via tfjs MoveNet
  async function loadPoseDetector() {
    if (poseDetector) return;
    await tf.setBackend('webgl');
    await tf.ready();
    poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: 'SinglePose.Lightning' });
  }

  // start media (video+audio)
  async function startMedia(videoElement, needAudio = true) {
    videoEl = videoElement;
    const constraints = { video: { facingMode: 'user' }, audio: needAudio };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = stream;
    await videoEl.play();
  }

  async function stopMedia() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    if (audioCtx) { try { await audioCtx.close(); } catch (e) {} audioCtx = null; }
  }

  // intonation sampling (simple auto-correlation)
  function autoCorrelate(buf, sampleRate) {
    // very basic; returns -1 if no pitch
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;
    let r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
    buf = buf.slice(r1, r2);
    const newSize = buf.length;
    const c = new Array(newSize).fill(0);
    for (let i = 0; i < newSize; i++) for (let j = 0; j < newSize - i; j++) c[i] = c[i] + buf[j] * buf[j + i];
    let d = 0; while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < newSize; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
    let T0 = maxpos;
    let pitch = sampleRate / T0;
    if (pitch > 1000 || pitch < 50) return -1;
    return pitch;
  }

  async function sampleIntonation() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      micSource = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      micSource.connect(analyser);
    }
    const buffer = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buffer);
    const pitch = autoCorrelate(buffer, audioCtx.sampleRate);
    let sum = 0; for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
    const rms = Math.sqrt(sum / buffer.length);
    return { timestamp: nowISO(), pitch, rms, loudnessDb: 20 * Math.log10(rms + 1e-8) };
  }

  // simple pose classification
  function classifyPose(pose) {
    if (!pose || !pose.keypoints) return 'unknown';
    const keypoints = {};
    pose.keypoints.forEach(k => keypoints[k.name] = k);
    const nose = keypoints.nose, lShoulder = keypoints.left_shoulder, rShoulder = keypoints.right_shoulder, lHip = keypoints.left_hip, rHip = keypoints.right_hip;
    if (!nose || !lShoulder || !rShoulder || !lHip || !rHip) return 'unknown';
    const shouldersY = (lShoulder.y + rShoulder.y) / 2;
    const noseY = nose.y;
    const slouch = noseY - shouldersY;
    if (slouch > 25) return 'slouched';
    const shoulderDist = Math.hypot(lShoulder.x - rShoulder.x, lShoulder.y - rShoulder.y);
    const hipDist = Math.hypot(lHip.x - rHip.x, lHip.y - rHip.y);
    if (shoulderDist > hipDist * 1.1) return 'open';
    return 'neutral';
  }

  // start loops for a session type; onUpdate receives { emotion, pose, intonation, snapshot }
  async function startSessionLoop(type, onUpdate) {
    if (!stream) throw new Error('Media not started');
    if (type === 'facial' || type === 'full') await loadFaceModels();
    if (type === 'full') await loadPoseDetector();
    // EMOTION loop
    if (type === 'facial' || type === 'full') {
      emotionTimer = setInterval(async () => {
        try {
          const res = await faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
          if (res && res.expressions) {
            const entries = Object.entries(res.expressions).sort((a, b) => b[1] - a[1]);
            const top = entries[0];
            const r = { label: top[0], score: top[1], raw: res.expressions, timestamp: nowISO() };
            onUpdate({ emotion: r, snapshot: { emotion: r } });
          } else onUpdate({ emotion: null });
        } catch (err) { onUpdate({ emotion: null }); }
      }, 400);
    }
    // POSE loop
    if (type === 'full') {
      poseTimer = setInterval(async () => {
        try {
          const poses = await poseDetector.estimatePoses(videoEl);
          if (poses && poses.length) {
            const p = poses[0];
            const label = classifyPose(p);
            onUpdate({ pose: label, snapshot: { pose: label } });
          } else onUpdate({ pose: null });
        } catch (err) { onUpdate({ pose: null }); }
      }, 500);
    }
    // INTONATION loop
    if (type === 'intonation' || type === 'full') {
      intonationTimer = setInterval(async () => {
        try {
          const snap = await sampleIntonation();
          // map to simple labels
          let labelObj = { label: 'silent', score: 0 };
          if (snap.pitch > 0) {
            if (snap.loudnessDb > -20) labelObj = { label: 'energetic', score: 0.9 };
            else if (snap.loudnessDb > -30) labelObj = { label: 'engaged', score: 0.7 };
            else labelObj = { label: 'calm', score: 0.6 };
          }
          onUpdate({ intonation: { label: labelObj.label, score: labelObj.score, raw: snap }, snapshot: { intonation: { label: labelObj.label, raw: snap } } });
        } catch (err) { onUpdate({ intonation: null }); }
      }, 800);
    }
  }

  async function loadPoseDetector() {
    if (!poseDetector) {
      await tf.setBackend('webgl');
      await tf.ready();
      poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: 'SinglePose.Lightning' });
    }
  }

  async function pauseSessionLoop() {
    if (emotionTimer) clearInterval(emotionTimer);
    if (poseTimer) clearInterval(poseTimer);
    if (intonationTimer) clearInterval(intonationTimer);
    emotionTimer = poseTimer = intonationTimer = null;
  }

  async function endSessionLoop() { await pauseSessionLoop(); }

  // public methods
  return {
    startMedia: async (videoElement, needAudio = true) => { await startMedia(videoElement, needAudio); },
    stopMedia: async () => { await stopMedia(); },
    startSessionLoop: async (type, onUpdate) => { await startSessionLoop(type, onUpdate); },
    pauseSessionLoop: async () => { await pauseSessionLoop(); },
    endSessionLoop: async () => { await endSessionLoop(); },
    summarizeSession: async (sessionObj) => {
      // sessionObj.metrics array should contain snapshots collected by the session page
      const metrics = sessionObj.metrics || [];
      if (!metrics.length) return { short: 'No measurable data', dominantEmotion: null, details: {} };
      const emotionCounts = {}, emotionScores = {}, poseCounts = {}, intonationCounts = {};
      metrics.forEach(m => {
        if (m.emotion && m.emotion.label) { emotionCounts[m.emotion.label] = (emotionCounts[m.emotion.label] || 0) + 1; emotionScores[m.emotion.label] = (emotionScores[m.emotion.label] || 0) + (m.emotion.score || 0); }
        if (m.pose) poseCounts[m.pose] = (poseCounts[m.pose] || 0) + 1;
        if (m.intonation && m.intonation.label) intonationCounts[m.intonation.label] = (intonationCounts[m.intonation.label] || 0) + 1;
      });
      const emoEntries = Object.entries(emotionCounts).sort((a,b)=>b[1]-a[1]);
      const dominant = emoEntries.length ? emoEntries[0][0] : null;
      const avgScores = {}; Object.keys(emotionScores).forEach(k => avgScores[k] = emotionScores[k] / emotionCounts[k]);
      const pose = Object.entries(poseCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
      const voice = Object.entries(intonationCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || null;
      const positivityMap = { happy:1, neutral:0.8, engaged:0.7, calm:0.7, energetic:0.6, sad:0.2, angry:0.2, fearful:0.3, disgusted:0.3, silent:0.5 };
      let posSum=0, posCount=0;
      Object.keys(emotionCounts).forEach(k => { posSum += (positivityMap[k] || 0.5) * emotionCounts[k]; posCount += emotionCounts[k]; });
      const positiveRatio = posCount ? Math.round((posSum/posCount)*100) : 50;
      const short = dominant ? `Mostly ${dominant}. Posture: ${pose || 'neutral'}. Voice: ${voice || 'neutral'}.` : 'No clear emotion detected.';
      return { short, dominantEmotion: dominant, details: { avgScores, pose, voice }, positiveRatio };
    }
  };
})();

window.ai = ai;
