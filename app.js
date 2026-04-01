let reps=0,running=false,timer=0,tInt;
let last="up",lastTime=0;
let anchorReps=0,anchorTime=0,myoTarget=0;
let sensitivity=3.2;

function goProfile(){home.style.display='none';profile.style.display='block';}
function goHome(){home.style.display='block';profile.style.display='none';session.style.display='none';}
function saveProfile(){sensitivity=parseFloat(document.getElementById('sens').value);goHome();}

function startAnchor(){
home.style.display='none';session.style.display='block';
reps=0;timer=0;running=true;
phase.innerText="ANCHOR";
tInt=setInterval(()=>{timer++;time.innerText=timer;},1000);
window.addEventListener('devicemotion',detect);
}

function stopSet(){running=false;clearInterval(tInt);window.removeEventListener('devicemotion',detect);}

function saveSet(){
if(anchorReps===0){
anchorReps=reps;anchorTime=timer;
myoTarget=Math.max(1,Math.round(anchorReps*0.2));
phase.innerText="REST";
setTimeout(()=>{phase.innerText="MYO TARGET";target.innerText=myoTarget;},anchorTime*1000);
}else{
phase.innerText="MYO REST";
setTimeout(()=>{phase.innerText="READY";},10000);
}
}

function startMyo(){
reps=0;timer=0;running=true;
phase.innerText="MYO";
tInt=setInterval(()=>{timer++;time.innerText=timer;},1000);
window.addEventListener('devicemotion',detect);
}

function finish(){phase.innerText="COMPLETE";}

function detect(e){
if(!running)return;
let y=e.accelerationIncludingGravity?.y||0;
if(y<-sensitivity && last==="up") last="down";
if(y> sensitivity && last==="down"){
let now=Date.now();
if(now-lastTime>700){
reps++;repsEl.innerText=reps;lastTime=now;
if(anchorReps>0 && reps>=myoTarget){stopSet();}
}
last="up";
}
}
