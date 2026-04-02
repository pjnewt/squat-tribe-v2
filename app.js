const STORAGE_KEY = "squatTribe_v2_2_history";

let reps = 0, running = false, timer = 0, tInt;
let anchorReps = 0, anchorTime = 0, myoTarget = 0;
let totalReps = 0, totalTime = 0;
let myoLog = [];

let currentPhase = "anchor";

let buffer = [], lastState = "up", lastTime = 0;

const el = id => document.getElementById(id);

function startSession() {
  el('home').style.display = 'none';
  el('session').style.display = 'block';

  reps = 0;
  timer = 0;
  running = true;

  anchorReps = 0;
  anchorTime = 0;
  myoTarget = 0;
  totalReps = 0;
  totalTime = 0;
  myoLog = [];
  currentPhase = "anchor";

  buffer = [];
  lastState = "up";
  lastTime = 0;

  el('phase').innerText = "ANCHOR";
  el('reps').innerText = 0;
  el('time').innerText = 0;
  el('target').innerText = '-';

  tInt = setInterval(() => {
    timer++;
    el('time').innerText = timer;
  }, 1000);

  window.addEventListener('devicemotion', detect);
}

function stopSet() {
  running = false;
  clearInterval(tInt);
  window.removeEventListener('devicemotion', detect);
}

function saveSet() {
  const bodyweight = parseFloat(localStorage.getItem('bw') || 70);
  const coeff = 0.7;
  const load = bodyweight * coeff;

  if (currentPhase === "anchor") {
    if (reps <= 0) {
      el('phase').innerText = "NO REPS";
      return;
    }

    anchorReps = reps;
    anchorTime = timer;

    totalReps += reps;
    totalTime += timer;

    const anchorMLS = load * reps;
    const anchorTRDS = anchorMLS / Math.max(1, timer);

    myoTarget = Math.max(1, Math.round(anchorReps * 0.2));
    currentPhase = "myo";

    // Store anchor as a summary field later in finishSession
    el('phase').innerText = "REST";

    setTimeout(() => {
      el('phase').innerText = "MYO TARGET";
      el('target').innerText = myoTarget;
    }, anchorTime * 1000);

  } else {
    const myoMLS = load * reps;
    const myoTRDS = myoMLS / Math.max(1, timer);

    totalReps += reps;
    totalTime += timer;

    myoLog.push({
      reps: reps,
      time: timer,
      TRDS: myoTRDS.toFixed(2)
    });

    el('phase').innerText = "MYO REST";

    setTimeout(() => {
      el('phase').innerText = "READY FOR NEXT MYO";
    }, 10000);
  }
}

function startMyo() {
  if (currentPhase !== "myo") {
    el('phase').innerText = "COMPLETE ANCHOR FIRST";
    return;
  }

  reps = 0;
  timer = 0;
  running = true;

  buffer = [];
  lastState = "up";
  lastTime = 0;

  el('phase').innerText = "MYO SET";
  el('reps').innerText = 0;
  el('time').innerText = 0;
  el('target').innerText = myoTarget;

  tInt = setInterval(() => {
    timer++;
    el('time').innerText = timer;
  }, 1000);

  window.addEventListener('devicemotion', detect);
}

function finishSession() {
  stopSet();

  const bodyweight = parseFloat(localStorage.getItem('bw') || 70);
  const coeff = 0.7;
  const load = bodyweight * coeff;

  const MLS = load * totalReps;
  const TRDS = MLS / Math.max(1, totalTime);

  const anchorTRDS = ((load * anchorReps) / Math.max(1, anchorTime)).toFixed(2);

  const session = {
    date: new Date().toLocaleString(),
    anchorReps: anchorReps,
    anchorTime: anchorTime,
    anchorTRDS: anchorTRDS,
    myoSets: myoLog,
    totalReps: totalReps,
    totalTime: totalTime,
    MLS: MLS.toFixed(1),
    TRDS: TRDS.toFixed(2)
  };

  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  history.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  el('phase').innerText = "SAVED";

  setTimeout(() => {
    goHome();
  }, 800);
}

function showHistory() {
  el('home').style.display = 'none';
  el('history').style.display = 'block';

  const history = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  let html = "";

  history.forEach(h => {
    let myoText = "";

    if (h.myoSets && h.myoSets.length > 0) {
      h.myoSets.forEach((set, i) => {
        myoText += `Myo ${i + 1}: ${set.reps} reps (${set.time}s) | TRDS: ${set.TRDS}<br>`;
      });
    } else {
      myoText = "No Myo sets logged<br>";
    }

    html += `<div class="card">
      ${h.date}<br><br>
      Anchor: ${h.anchorReps} reps (${h.anchorTime}s) | TRDS: ${h.anchorTRDS}<br><br>
      ${myoText}<br>
      Total Reps: ${h.totalReps}<br>
      Total TRDS: ${h.TRDS}
    </div>`;
  });

  el('historyList').innerHTML = html;
}

function clearHistory() {
  localStorage.removeItem(STORAGE_KEY);
  showHistory();
}

function goHome() {
  el('home').style.display = 'block';
  el('session').style.display = 'none';
  el('history').style.display = 'none';
}

function detect(e) {
  if (!running) return;

  const acc = e.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
  const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

  buffer.push(mag);
  if (buffer.length > 5) buffer.shift();

  const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;

  const down = 9.5;
  const up = 11.5;

  if (avg < down && lastState === "up") {
    lastState = "down";
  }

  if (avg > up && lastState === "down") {
    const now = Date.now();
    if (now - lastTime > 500) {
      reps++;
      el('reps').innerText = reps;
      lastTime = now;

      if (currentPhase === "myo" && reps >= myoTarget) {
        stopSet();
      }
    }
    lastState = "up";
  }
}
