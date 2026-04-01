const STORAGE_KEY = "squatTribe_v2_2_history";

let reps=0, running=false, timer=0, tInt;
let anchorReps=0, anchorTime=0, myoTarget=0;
let totalReps=0, totalTime=0;

let currentPhase = "anchor"; // 🔥 KEY FIX

let buffer=[], lastState="up", lastTime=0;

const el=id=>document.getElementById(id);

function startSession(){
  el('home').style.display='none';
  el('session').style.display='block';

  reps=0; timer=0; running=true;
  anchorReps=0; totalReps=0; totalTime=0;
  currentPhase = "anchor";

  el('phase').innerText="ANCHOR";
  el('reps').innerText=0;
  el('time').innerText=0;
  el('target').innerText='-';

  tInt=setInterval(()=>{timer++; el('time').innerText=timer;},1000);
  window.addEventListener('devicemotion', detect);
}

function stopSet(){
  running=false;
  clearInterval(tInt);
  window.removeEventListener('devicemotion', detect);
}

function saveSet(){

  if(currentPhase === "anchor"){
    if(reps <= 0){
      el('phase').innerText="NO REPS";
      return;
    }

    anchorReps = reps;
    anchorTime = timer;

    totalReps += reps;
    totalTime += timer;

    myoTarget = Math.max(1, Math.round(anchorReps * 0.2));

    currentPhase = "myo";

    el('phase').innerText="REST";

    setTimeout(()=>{
      el('phase').innerText="MYO TARGET";
      el('target').innerText=myoTarget;
    }, anchorTime * 1000);

  } else {

    // 🔥 FIXED MYO SAVE
    totalReps += reps;
    totalTime += timer;

    el('phase').innerText="MYO REST";

    setTimeout(()=>{
      el('phase').innerText="READY FOR NEXT MYO";
    }, 10000);
  }
}

function startMyo(){
  if(currentPhase !== "myo"){
    el('phase').innerText="COMPLETE ANCHOR FIRST";
    return;
  }

  reps=0; timer=0; running=true;

  el('phase').innerText="MYO SET";
  el('reps').innerText=0;
  el('time').innerText=0;
  el('target').innerText=myoTarget;

  tInt=setInterval(()=>{timer++; el('time').innerText=timer;},1000);
  window.addEventListener('devicemotion', detect);
}

function finishSession(){
  stopSet();

  let bodyweight = parseFloat(localStorage.getItem('bw')||70);
  let coeff = 0.7;
  let load = bodyweight * coeff;

  let MLS = load * totalReps;
  let TRDS = MLS / Math.max(1,totalTime);

  let session = {
    date: new Date().toLocaleString(),
    reps: totalReps,
    MLS: MLS.toFixed(1),
    TRDS: TRDS.toFixed(2)
  };

  let history = JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
  history.unshift(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

  el('phase').innerText="SAVED";
}

function showHistory(){
  el('home').style.display='none';
  el('history').style.display='block';

  let history = JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");

  let html="";
  history.forEach(h=>{
    html += `<div class="card">
      ${h.date}<br>
      Reps: ${h.reps}<br>
      TRDS: ${h.TRDS}
    </div>`;
  });

  el('historyList').innerHTML=html;
}

function clearHistory(){
  localStorage.removeItem(STORAGE_KEY);
  showHistory();
}

function goHome(){
  el('home').style.display='block';
  el('session').style.display='none';
  el('history').style.display='none';
}

// ✅ SENSOR (UNCHANGED - LOCKED)
function detect(e){
  if(!running) return;

  let acc=e.accelerationIncludingGravity||{x:0,y:0,z:0};
  let mag=Math.sqrt(acc.x*acc.x+acc.y*acc.y+acc.z*acc.z);

  buffer.push(mag);
  if(buffer.length>5) buffer.shift();
  let avg=buffer.reduce((a,b)=>a+b,0)/buffer.length;

  let down=9.5, up=11.5;

  if(avg<down && lastState==="up") lastState="down";

  if(avg>up && lastState==="down"){
    let now=Date.now();
    if(now-lastTime>500){
      reps++;
      el('reps').innerText=reps;
      lastTime=now;

      if(anchorReps>0 && reps>=myoTarget){
        stopSet();
      }
    }
    lastState="up";
  }
}
