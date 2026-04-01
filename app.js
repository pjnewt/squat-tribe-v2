let reps=0, running=false, timer=0, tInt;
let anchorReps=0, anchorTime=0, myoTarget=0;

let buffer=[];
let lastState="up";
let lastTime=0;

const el=id=>document.getElementById(id);

function startAnchor(){
  reps=0; timer=0; running=true;
  anchorReps=0;
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
  if(anchorReps===0){
    anchorReps=reps;
    anchorTime=timer;
    myoTarget=Math.max(1, Math.round(anchorReps*0.2));
    el('phase').innerText="REST";
    setTimeout(()=>{
      el('phase').innerText="TARGET";
      el('target').innerText=myoTarget;
    }, anchorTime*1000);
  }
}

function startMyo(){
  reps=0; timer=0; running=true;
  el('phase').innerText="MYO";
  el('reps').innerText=0;
  el('time').innerText=0;
  el('target').innerText=myoTarget;

  tInt=setInterval(()=>{timer++; el('time').innerText=timer;},1000);
  window.addEventListener('devicemotion', detect);
}

function detect(e){
  if(!running) return;

  let y=e.accelerationIncludingGravity?.y||0;

  buffer.push(y);
  if(buffer.length>5) buffer.shift();
  let avg = buffer.reduce((a,b)=>a+b,0)/buffer.length;

  let downThresh = -1.2;
  let upThresh = 1.2;

  if(avg < downThresh && lastState==="up"){
    lastState="down";
  }

  if(avg > upThresh && lastState==="down"){
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
