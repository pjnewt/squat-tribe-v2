const PROFILE_KEY = "squatTribe_v23a_profile";
const HISTORY_KEY = "squatTribe_v23a_history";
const ROTATION_KEY = "squatTribe_v23a_rotation";

const EXERCISES = [
  { key: "back", name: "Back Squat", type: "bilateral", coeff: 0.70 },
  { key: "bulgarian", name: "Bulgarian Squat", type: "unilateral", coeff: 0.85 },
  { key: "front", name: "Front Squat", type: "bilateral", coeff: 0.70 },
  { key: "sidestep", name: "Side Step Squat", type: "unilateral", coeff: 0.85 },
  { key: "sumo", name: "Sumo Squat", type: "bilateral", coeff: 0.70 }
];

let reps = 0;
let running = false;
let timer = 0;
let tInt = null;

let anchorReps = 0;
let anchorTime = 0;
let myoTarget = 0;
let totalReps = 0;
let totalTime = 0;
let myoLog = [];
let currentPhase = "anchor";

let buffer = [];
let lastState = "up";
let lastTime = 0;

let currentExerciseIndex = 0;

const el = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

function init() {
  loadProfileIntoForm();
  loadRotation();
  bindUI();
  renderHome();
}

function bindUI() {
  el("btnInfo").addEventListener("click", () => showScreen("screen-info"));
  el("btnProfile").addEventListener("click", () => {
    loadProfileIntoForm();
    showScreen("screen-profile");
  });
  el("btnHistory").addEventListener("click", showHistory);

  document.querySelectorAll("[data-back='home']").forEach(btn => {
    btn.addEventListener("click", renderHome);
  });

  el("btnSaveProfile").addEventListener("click", saveProfile);
  el("btnClearHistory").addEventListener("click", clearHistory);

  el("btnStartExercise").addEventListener("click", startSelectedExercise);

  el("btnStartAnchor").addEventListener("click", startAnchorSet);
  el("btnStopSet").addEventListener("click", stopSet);
  el("btnSaveSet").addEventListener("click", saveSet);
  el("btnStartMyo").addEventListener("click", startMyo);
  el("btnFinishSession").addEventListener("click", finishSession);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.classList.remove("active");
  });
  el(id).classList.add("active");
}

function getProfile() {
  return JSON.parse(localStorage.getItem(PROFILE_KEY) || JSON.stringify({
    bodyweight: 70,
    sensitivity: "high"
  }));
}

function saveProfile() {
  const profile = {
    bodyweight: parseFloat(el("profileBodyweight").value || "70"),
    sensitivity: el("profileSensitivity").value
  };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  renderHome();
}

function loadProfileIntoForm() {
  const profile = getProfile();
  el("profileBodyweight").value = profile.bodyweight;
  el("profileSensitivity").value = profile.sensitivity;
}

function loadRotation() {
  currentExerciseIndex = parseInt(localStorage.getItem(ROTATION_KEY) || "0", 10);
  if (Number.isNaN(currentExerciseIndex) || currentExerciseIndex < 0 || currentExerciseIndex > 4) {
    currentExerciseIndex = 0;
  }
}

function saveRotation() {
  localStorage.setItem(ROTATION_KEY, String(currentExerciseIndex));
}

function getCurrentExercise() {
  return EXERCISES[currentExerciseIndex];
}

function renderHome() {
  loadRotation();
  renderPentagon();
  renderSelectedExercise();
  showScreen("screen-home");
}

function renderPentagon() {
  const svgGroup = el("pentagonPoints");
  svgGroup.innerHTML = "";

  const positions = [
    { x: 160, y: 35, tx: 160, ty: 20 },
    { x: 275, y: 118, tx: 296, ty: 122 },
    { x: 230, y: 255, tx: 248, ty: 276 },
    { x: 90, y: 255, tx: 72, ty: 276 },
    { x: 45, y: 118, tx: 24, ty: 122 }
  ];

  EXERCISES.forEach((exercise, i) => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "pentagon-point");
    g.addEventListener("click", () => {
      currentExerciseIndex = i;
      saveRotation();
      renderHome();
    });

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", positions[i].x);
    circle.setAttribute("cy", positions[i].y);
    circle.setAttribute("r", 16);
    let cls = "pentagon-dot";
    if (i === currentExerciseIndex) cls += " active";
    circle.setAttribute("class", cls);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", positions[i].tx);
    label.setAttribute("y", positions[i].ty);
    label.setAttribute("class", "pentagon-label");
    label.textContent = String(i + 1);

    g.appendChild(circle);
    g.appendChild(label);
    svgGroup.appendChild(g);
  });

  const currentExercise = getCurrentExercise();
  el("avgTrdsValue").textContent = getAverageTRDSForExercise(currentExercise.key).toFixed(2);
}

function renderSelectedExercise() {
  const exercise = getCurrentExercise();
  el("selectedExerciseName").textContent = exercise.name;

  if (exercise.type === "bilateral") {
    el("selectedExerciseStatus").textContent = "Ready to train";
  } else {
    el("selectedExerciseStatus").innerHTML = `<span class="coming-soon">Unilateral flow comes in v2.3b</span>`;
  }

  el("selectedExerciseImage").innerHTML = getExerciseArt(exercise.name);
  const last = getLastSessionForExercise(exercise.key);

  if (!last) {
    el("lastSessionSummary").textContent = "No sessions yet.";
  } else {
    const myoPattern = last.myoSets && last.myoSets.length
      ? last.myoSets.map(set => set.reps).join(", ")
      : "none";

    el("lastSessionSummary").innerHTML = `
      Anchor: ${last.anchorReps} reps<br>
      Myo sets: ${last.myoSets.length}<br>
      Myo reps: ${myoPattern}
    `;
  }
}

function startSelectedExercise() {
  const exercise = getCurrentExercise();

  if (exercise.type !== "bilateral") {
    alert("This exercise will be added in v2.3b.");
    return;
  }

  const profile = getProfile();

  el("sessionExerciseName").textContent = exercise.name;
  el("sessionSupportText").textContent = "Bilateral session";
  el("sessionExerciseImage").innerHTML = getExerciseArt(exercise.name);
  el("sessionBodyweight").value = profile.bodyweight;
  el("sessionExternalWeight").value = 0;

  resetSessionState();
  showScreen("screen-session");
}

function resetSessionState() {
  reps = 0;
  running = false;
  timer = 0;
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
  clearInterval(tInt);

  el("phase").innerText = "READY";
  el("reps").innerText = "0";
  el("time").innerText = "0";
  el("target").innerText = "-";
}

function startAnchorSet() {
  if (running) return;

  reps = 0;
  timer = 0;
  running = true;
  currentPhase = "anchor";

  buffer = [];
  lastState = "up";
  lastTime = 0;

  el("phase").innerText = "ANCHOR";
  el("reps").innerText = "0";
  el("time").innerText = "0";
  el("target").innerText = "-";

  tInt = setInterval(() => {
    timer++;
    el("time").innerText = String(timer);
  }, 1000);

  window.addEventListener("devicemotion", detect);
}

function stopSet() {
  running = false;
  clearInterval(tInt);
  window.removeEventListener("devicemotion", detect);
}

function saveSet() {
  const profileBodyweight = parseFloat(el("sessionBodyweight").value || "70");
  const externalWeight = parseFloat(el("sessionExternalWeight").value || "0");
  const exercise = getCurrentExercise();
  const load = externalWeight + (profileBodyweight * exercise.coeff);

  if (currentPhase === "anchor") {
    if (reps <= 0) {
      el("phase").innerText = "NO REPS";
      return;
    }

    anchorReps = reps;
    anchorTime = timer;

    totalReps += reps;
    totalTime += timer;

    myoTarget = Math.max(1, Math.round(anchorReps * 0.2));
    currentPhase = "myo";

    el("phase").innerText = "REST";

    setTimeout(() => {
      el("phase").innerText = "MYO TARGET";
      el("target").innerText = String(myoTarget);
    }, anchorTime * 1000);

  } else {
    const myoMLS = load * reps;
    const myoTRDS = myoMLS / Math.max(1, timer);

    totalReps += reps;
    totalTime += timer;

    myoLog.push({
      reps,
      time: timer,
      TRDS: myoTRDS.toFixed(2)
    });

    el("phase").innerText = "MYO REST";

    setTimeout(() => {
      el("phase").innerText = "READY FOR NEXT MYO";
    }, 10000);
  }
}

function startMyo() {
  if (currentPhase !== "myo") {
    el("phase").innerText = "COMPLETE ANCHOR FIRST";
    return;
  }

  if (running) return;

  reps = 0;
  timer = 0;
  running = true;

  buffer = [];
  lastState = "up";
  lastTime = 0;

  el("phase").innerText = "MYO";
  el("reps").innerText = "0";
  el("time").innerText = "0";
  el("target").innerText = String(myoTarget);

  tInt = setInterval(() => {
    timer++;
    el("time").innerText = String(timer);
  }, 1000);

  window.addEventListener("devicemotion", detect);
}

function finishSession() {
  stopSet();

  const profileBodyweight = parseFloat(el("sessionBodyweight").value || "70");
  const externalWeight = parseFloat(el("sessionExternalWeight").value || "0");
  const exercise = getCurrentExercise();

  // persist profile bodyweight if changed on session screen
  const profile = getProfile();
  profile.bodyweight = profileBodyweight;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  const load = externalWeight + (profileBodyweight * exercise.coeff);
  const MLS = load * totalReps;
  const TRDS = MLS / Math.max(1, totalTime);
  const anchorTRDS = ((load * anchorReps) / Math.max(1, anchorTime)).toFixed(2);

  const session = {
    exerciseKey: exercise.key,
    exerciseName: exercise.name,
    date: new Date().toLocaleString(),
    bodyweight: profileBodyweight,
    externalWeight: externalWeight,
    anchorReps,
    anchorTime,
    anchorTRDS,
    myoSets: myoLog,
    totalReps,
    totalTime,
    MLS: MLS.toFixed(1),
    TRDS: TRDS.toFixed(2)
  };

  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  history.unshift(session);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  // advance to next exercise in order
  currentExerciseIndex = (currentExerciseIndex + 1) % EXERCISES.length;
  saveRotation();

  el("phase").innerText = "SAVED";

  setTimeout(() => {
    renderHome();
  }, 700);
}

function showHistory() {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const list = el("historyList");

  if (!history.length) {
    list.innerHTML = `<div class="history-card">No history yet.</div>`;
  } else {
    list.innerHTML = history.map((h, idx) => {
      const previousAvg = getAverageTRDSForExercise(h.exerciseKey, idx + 1).toFixed(2);
      const myoText = h.myoSets && h.myoSets.length
        ? h.myoSets.map((set, i) =>
            `Myo ${i + 1}: ${set.reps} reps (${set.time}s) | TRDS: ${set.TRDS}`
          ).join("<br>")
        : "No Myo sets logged";

      return `
        <div class="history-card">
          <div class="history-title">${h.exerciseName}</div>
          <div class="history-sub">${h.date}</div>
          Anchor: ${h.anchorReps} reps (${h.anchorTime}s) | TRDS: ${h.anchorTRDS}<br><br>
          ${myoText}<br><br>
          Total Reps: ${h.totalReps}<br>
          TRDS: ${h.TRDS} (${previousAvg})
        </div>
      `;
    }).join("");
  }

  showScreen("screen-history");
}

function clearHistory() {
  if (!confirm("Clear all history?")) return;
  localStorage.removeItem(HISTORY_KEY);
  showHistory();
}

function getAverageTRDSForExercise(exerciseKey, limit = null) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  const filtered = history
    .slice(0, limit || history.length)
    .filter(item => item.exerciseKey === exerciseKey);

  if (!filtered.length) return 0;
  const sum = filtered.reduce((acc, item) => acc + parseFloat(item.TRDS), 0);
  return sum / filtered.length;
}

function getLastSessionForExercise(exerciseKey) {
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  return history.find(item => item.exerciseKey === exerciseKey) || null;
}

function getSensitivityThresholds() {
  const profile = getProfile();
  const sensitivity = profile.sensitivity || "high";

  if (sensitivity === "low") {
    return { down: 9.3, up: 11.7, debounce: 550 };
  }
  if (sensitivity === "medium") {
    return { down: 9.4, up: 11.6, debounce: 525 };
  }
  return { down: 9.5, up: 11.5, debounce: 500 };
}

function detect(e) {
  if (!running) return;

  const acc = e.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
  const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

  buffer.push(mag);
  if (buffer.length > 5) buffer.shift();

  const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length;
  const thresholds = getSensitivityThresholds();

  if (avg < thresholds.down && lastState === "up") {
    lastState = "down";
  }

  if (avg > thresholds.up && lastState === "down") {
    const now = Date.now();
    if (now - lastTime > thresholds.debounce) {
      reps++;
      el("reps").innerText = String(reps);
      lastTime = now;

      if (currentPhase === "myo" && reps >= myoTarget) {
        stopSet();
      }
    }
    lastState = "up";
  }
}

function getExerciseArt(name) {
  return `<div>${name}</div>`;
}
