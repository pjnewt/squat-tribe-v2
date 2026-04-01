let reps=0, running=false, timer=0, tInt;
let last="up", lastTime=0;
let anchorReps=0, anchorTime=0, myoTarget=0;
let sensitivity=3.2;

const el = id => document.getElementById(id);

function goProfile(){ el('home').style.display='none'; el('profile').style.display='block'; }
function goHome(){ el('home').style.display='block'; el('profile').style.display='none'; el('session').style.display='none'; }

function saveProfile(){ sensitivity=parseFloat(el('sens').value); goHome(); }

function startAnchor(){
  el('home').style.display='none';
  el('session').style.display='block';
  reps=0; timer=0; running=true;
  anchorReps=0; // reset

  el('phase').innerText="ANCHOR SET";
  el('reps').innerText=0;
  el('time').innerText=0;
  el('target').innerText='-';

  tInt=setInterval(()=>{ timer++; el('time').innerText=timer; },1000);
  window.addEventListener('devicemotion', detect);
}

function stopSet(){
  running=false;
  clearInterval(tInt);
  window.removeEventListener('devicemotion', detect);
}

function saveSet(){
  if(anchorReps===0){
    if(reps<=0){ el('phase').innerText="NO REPS RECORDED"; return; }
    anchorReps=reps;
    anchorTime=timer;
    myoTarget=Math.max(1, Math.round(anchorReps*0.2));
    el('phase').innerText="REST";
    setTimeout(()=>{
      el('phase').innerText="MYO TARGET";
      el('target').innerText=myoTarget;
    }, anchorTime*1000);
  } else {
    el('phase').innerText="MYO REST";
    setTimeout(()=>{ el('phase').innerText="READY"; },10000);
  }
}

function startMyo(){
  if(anchorReps===0){ el('phase').innerText="COMPLETE ANCHOR FIRST"; return; }
  reps=0; timer=0; running=true;
  el('phase').innerText="MYO SET";
  el('reps').innerText=0;
  el('time').innerText=0;
  el('target').innerText=myoTarget;

  tInt=setInterval(()=>{ timer++; el('time').innerText=timer; },1000);
  window.addEventListener('devicemotion', detect);
}

function finish(){
  running=false;
  clearInterval(tInt);
  window.removeEventListener('devicemotion', detect);
  el('phase').innerText="SESSION COMPLETE";
}

function detect(e){
  if(!running) return;
  let y=e.accelerationIncludingGravity?.y||0;

  if(y < -sensitivity && last==="up") last="down";

  if(y > sensitivity && last==="down"){
    let now=Date.now();
    if(now-lastTime>700){
      reps++;
      el('reps').innerText=reps;
      lastTime=now;

      if(anchorReps>0 && reps>=myoTarget){
        stopSet();
      }
    }
    last="up";
  }
}
