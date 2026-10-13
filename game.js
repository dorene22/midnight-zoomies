'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const cat=new Image(),human=new Image();cat.src='gigi.png';human.src='dordor.png';
const sprites=new Image();let spriteReady=false;sprites.onload=()=>{spriteReady=true;};sprites.onerror=()=>{spriteReady=false;};sprites.src='gigi-sprites.png';
const W=960,H=480,ground=390,px=175;
let state='ready',y=ground-76,vy=0,jumps=0,score=0,treats=0,lives=3,chaos=0,time=0,spawn=1,objects=[],boost=0,immune=0,last=0,world=0,flash=0,ducking=false;
const $=id=>document.getElementById(id);
let audio=null,master=null,muted=false,cleanDucks=0,missionDone=[false,false,false],musicClock=0,pawClock=0,musicStep=0;
function unlockSound(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!audio&&Audio){audio=new Audio();master=audio.createGain();master.gain.value=.65;master.connect(audio.destination);}if(audio?.state==='suspended')audio.resume().catch(()=>{});}catch{audio=null;}}
function tone(freq,duration,type='sine',delay=0,endFreq=freq,volume=.07){if(muted||!audio||audio.state!=='running')return;try{const t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};}catch{}}
function sound(kind){if(kind==='jump')tone(260,.13,'sine',0,620);if(kind==='treat'){tone(800,.07);tone(1150,.09,'sine',.07);}if(kind==='crash')tone(180,.22,'triangle',0,45);if(kind==='zoom')tone(110,.4,'sawtooth',0,720);if(kind==='duck')tone(380,.09,'triangle',0,130);if(kind==='mission')[523,659,784,1047].forEach((n,i)=>tone(n,.15,'sine',i*.09));if(kind==='over'){tone(310,.18);tone(220,.23,'sine',.18);}}
function courseSound(dt){
    if(muted||!audio||audio.state!=='running')return;
    musicClock-=dt;pawClock-=dt;
    if(musicClock<=0){
        const melody=[523,659,784,659,587,698,880,698,440,523,659,523,392,494,587,494];
        const tempo=boost>0?.19:.27;
        tone(melody[musicStep%16],.13,'triangle',0,melody[musicStep%16],.018);
        if(musicStep%4===0)tone([131,147,110,98][Math.floor(musicStep/4)%4],.18,'sine',0,55,.028);
        musicStep++;musicClock+=tempo;
    }
    if(jumps===0&&pawClock<=0){tone(isCrouched()?110:180,.035,'triangle',0,60,.014);pawClock=boost>0?.10:.17;}
}
function missionUpdate(){const values=[Math.min(20,treats),Math.min(5,cleanDucks),Math.min(60,Math.floor(time))],goals=[20,5,60],names=['Snack thief','Too sneaky',"Dordor’s worst nightmare"];for(let i=0;i<3;i++){if(!missionDone[i]&&values[i]>=goals[i]){missionDone[i]=true;sound('mission');$('notice').textContent='Mission complete: '+names[i]+'!';}$('mission'+i).textContent=(missionDone[i]?'✓ ':'' )+names[i]+' · '+values[i]+'/'+goals[i];$('mission'+i).classList.toggle('complete',missionDone[i]);}}
$('mute').addEventListener('click',()=>{muted=!muted;unlockSound();if(master)master.gain.setValueAtTime(muted||state==='paused'?0:.65,audio.currentTime);$('mute').textContent=muted?'Sound off':'Sound on';$('mute').setAttribute('aria-pressed',String(muted)); });
function stats(){ $('score').textContent=Math.floor(score);$('treats').textContent=treats;$('lives').textContent=lives;$('chaos').textContent=chaos+'%';$('fill').style.width=chaos+'%';$('boost').disabled=state!=='running'||chaos<100||boost>0;$('pause').disabled=state==='ready'||state==='over';$('duck').disabled=state!=='running';$('duck').setAttribute('aria-pressed',String(isCrouched()));}
function show(title,detail,label){$('title').textContent=title;$('detail').textContent=detail;$('start').textContent=label;$('overlay').hidden=false;}
function start(){unlockSound();musicClock=0;pawClock=0;musicStep=0;if(master)master.gain.setValueAtTime(muted?0:.65,audio.currentTime);cleanDucks=0;missionDone=[false,false,false];beginScoreRun();$('submitForm').hidden=true;state='running';ducking=false;y=ground-76;vy=0;jumps=0;score=0;treats=0;lives=3;chaos=0;time=0;spawn=1.3;objects=[];boost=0;immune=0;world=0;flash=0;last=0;$('overlay').hidden=true;$('pause').textContent='Pause';$('notice').textContent='Gigi is on the loose!';missionUpdate();stats();}
function jump(){if(state!=='running'||jumps>=2||ducking)return;vy=jumps===0?-650:-540;jumps++;sound('jump');}
function zoom(){if(state!=='running'||chaos<100||boost>0)return;chaos=0;boost=4;sound('zoom');$('notice').textContent='ZOOMIES! Nothing can stop Boss Queen Gigi.';stats();}
function pause(){ducking=false;if(state==='running'){state='paused';if(master)master.gain.setValueAtTime(0,audio.currentTime);show('Dordor needs a breather.','Your run is paused. Ready for more chaos?','Resume zoomies');$('pause').textContent='Resume';}else if(state==='paused'){state='running';unlockSound();if(master)master.gain.setValueAtTime(muted?0:.65,audio.currentTime);last=0;$('overlay').hidden=true;$('pause').textContent='Pause';}stats();}
function end(){sound('over');ducking=false;state='over';$('submitForm').hidden=false;$('saveScore').disabled=false;$('saveMessage').textContent='Your score: '+Math.floor(score).toLocaleString();show(score>=1000?'Certified Zoomies Queen!':'Dordor caught you!',Math.floor(score)+' points · '+treats+' treats · '+Math.floor(time)+' seconds of chaos. '+missionDone.filter(Boolean).length+'/3 missions completed. Can you beat that?','Run again');$('notice').textContent='One tiny cat. One very tired human.';stats();}
function setDuck(held){if(held&&!ducking&&state==='running')sound('duck');ducking=state==='running'&&held;}
function isCrouched(){return ducking&&jumps===0;}
function speedNow(){return 350+Math.min(280,Math.floor(time/15)*35)+(boost>0?160:0);}
const obstacleTypes={
    box:{icon:'📦',w:60,h:60},slipper:{icon:'🥿',w:60,h:35},
    basket:{icon:'🧺',w:66,h:68},teddy:{icon:'🧸',w:58,h:80},
    plant:{icon:'🪴',w:68,h:95},dordor:{w:65,h:112}
};
function addObject(){
    const r=Math.random(),x=W+50;
    if(r<.22){
        const high=Math.random()<.5;
        for(let i=0;i<3;i++)objects.push({kind:'treat',x:x+i*65,y:ground-(high?175:95),w:36,h:36});
    }else if(r<.53){
        // Hanging laundry sits above crouched Gigi but intersects her standing body.
        objects.push({kind:'overhead',x,y:ground-110,w:118,h:65});
        objects.push({kind:'treat',x:x+38,y:ground-39,w:30,h:30});
    }else{
        const kinds=Object.keys(obstacleTypes);
        const kind=kinds[Math.floor(Math.random()*kinds.length)],spec=obstacleTypes[kind];
        objects.push({kind,x,y:ground-spec.h,w:spec.w,h:spec.h});
    }
}
function playerBounds(){return isCrouched()?{x:px+10,y:y+45,w:55,h:28}:{x:px+10,y:y+10,w:55,h:58};}

function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function update(dt){if(state!=='running')return;courseSound(dt);time+=dt;const speed=speedNow();score+=dt*(boost>0?30:10);world+=speed*dt;immune=Math.max(0,immune-dt);flash=Math.max(0,flash-dt);const hadBoost=boost>0;boost=Math.max(0,boost-dt);if(hadBoost&&boost===0)$('notice').textContent='Zoomies cooled down. Keep collecting treats!';vy+=1700*dt;y+=vy*dt;if(y>=ground-76){y=ground-76;vy=0;jumps=0;}spawn-=dt;if(spawn<=0){addObject();spawn=Math.max(.72,1.35-time*.005)+Math.random()*.38;}const player=playerBounds();for(const o of objects){o.x-=speed*dt;if(!o.used&&hit(player,o)){o.used=true;if(o.kind!=='treat')o.failed=true;if(o.kind==='treat'){sound('treat');treats++;score+=50;chaos=Math.min(100,chaos+20);if(chaos===100)$('notice').textContent='Chaos full! Tap Zoomies or press Z.';}else if(boost>0){score+=75;}else if(immune===0){sound('crash');cleanDucks=0;lives--;immune=1.5;flash=.15;$('notice').textContent=lives>0?'Bonk! '+lives+' lives left. Keep jumping!':'Dordor finally gets some sleep.';if(lives<=0){end();break;}}}}if(state==='running'){for(const o of objects){if(o.kind==='overhead'&&!o.counted&&!o.failed&&o.x+o.w<player.x){o.counted=true;if(o.ducked)cleanDucks++;}if(o.kind==='overhead'&&!o.failed&&isCrouched()&&o.x<player.x+player.w&&o.x+o.w>player.x)o.ducked=true;}missionUpdate();}objects=objects.filter(o=>o.x>-100&&!o.used);stats();}
function portrait(img,x,y,w,h){ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,14);ctx.clip();if(img.complete&&img.naturalWidth){if(img===cat)ctx.drawImage(img,320,60,600,730,x,y,w,h);else ctx.drawImage(img,340,0,510,875,x,y,w,h);}else{ctx.fillStyle='#8754c8';ctx.fillRect(x,y,w,h);}ctx.restore();ctx.strokeStyle=img===cat?'#cb9dff':'#cdf47b';ctx.lineWidth=3;ctx.strokeRect(x+1,y+1,w-2,h-2);}
// Atlas: six running poses, one jump, one landing/caught pose.
function gigiFrame(){
    if(state==='over'||state==='ready'||isCrouched())return 7;
    if(jumps>0)return 6;
    if(immune>1.2)return 7;
    return Math.floor(time*(boost>0?19:11))%6;
}
function drawGigi(){
    if(!spriteReady){portrait(cat,px,y,76,76);return;}
    // Measured atlas regions preserve each complete pose without neighboring cells.
    const frames=[[23,86,453,294],[474,96,414,325],[909,113,402,306],
      [1337,91,423,330],[25,507,413,283],[456,521,433,278],
      [905,488,421,274],[1330,550,418,264]];
    const [sx,sy,sw,sh]=frames[gigiFrame()];
    const scale=0.33,width=sw*scale,height=sh*scale*(isCrouched()?0.46:1);
    const x=px+38-width/2,bottom=y+76;
    ctx.save();
    if(boost>0){ctx.shadowColor='#cef17d';ctx.shadowBlur=12;}
    ctx.drawImage(sprites,sx,sy,sw,sh,x,bottom-height,width,height);
    ctx.restore();
}
function draw(){ctx.clearRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#17132e');grad.addColorStop(1,'#3a2856');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);ctx.fillStyle='#6c5384';ctx.font='bold 18px system-ui';ctx.fillText('3:00 AM',30,38);ctx.fillStyle='#a991c3';ctx.font='14px system-ui';ctx.fillText('LIVING ROOM · LEVEL '+(1+Math.floor(time/15)),30,62);ctx.globalAlpha=.12;for(let i=0;i<8;i++){const x=((i*160-world*.2)%1280+1280)%1280-100;ctx.fillStyle='#c2a2eb';ctx.fillRect(x,105,2,260);}ctx.globalAlpha=1;ctx.fillStyle='#483359';ctx.fillRect(0,ground,W,H-ground);ctx.fillStyle='#b58bcf';ctx.fillRect(0,ground,W,3);for(let i=0;i<15;i++){ctx.fillStyle='#705279';ctx.fillRect(((i*85-world)%1275+1275)%1275,ground+35,45,3);}for(const o of objects){
    if(o.kind==='dordor')portrait(human,o.x,o.y,o.w,o.h);
    else if(o.kind==='overhead'){
        ctx.strokeStyle='#a991c3';ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(o.x+8,145);ctx.lineTo(o.x+8,o.y+4);ctx.moveTo(o.x+o.w-8,145);ctx.lineTo(o.x+o.w-8,o.y+4);ctx.stroke();
        ctx.font='57px system-ui';ctx.fillText('👕',o.x,o.y+o.h-2);ctx.fillText('👕',o.x+57,o.y+o.h-2);
        ctx.fillStyle='#d9fb94';ctx.font='bold 14px system-ui';ctx.fillText('DUCK',o.x+35,o.y-10);
    }else{
        ctx.font=(o.kind==='treat'?32:Math.min(76,o.h+10))+'px system-ui';
        ctx.fillText(o.kind==='treat'?'🐟':obstacleTypes[o.kind].icon,o.x,o.y+o.h-3);
    }
}
if(boost>0){ctx.fillStyle='#c9f87c';ctx.globalAlpha=.55;for(let i=1;i<5;i++)ctx.fillRect(px-i*35,y+20,24,5);ctx.globalAlpha=1;}ctx.save();if(immune>0&&Math.floor(immune*12)%2===0)ctx.globalAlpha=.4;drawGigi();ctx.restore();ctx.fillStyle='#eee0ff';ctx.font='bold 14px system-ui';ctx.fillText('GIGI',px+17,y-10);if(boost>0){ctx.fillStyle='#d4f68b';ctx.font='bold 25px system-ui';ctx.fillText('ZOOMIES! '+boost.toFixed(1)+'s',660,45);}if(flash>0){ctx.fillStyle='#ff638044';ctx.fillRect(0,0,W,H);}}
function frame(t){const dt=last?Math.min((t-last)/1000,.033):0;last=t;update(dt);draw();requestAnimationFrame(frame);}
$('start').addEventListener('click',()=>state==='paused'?pause():start());$('duck').addEventListener('pointerdown',e=>{e.preventDefault();$('duck').setPointerCapture(e.pointerId);setDuck(true);});
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('duck').addEventListener(event,()=>setDuck(false));
$('duck').addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code)){e.preventDefault();setDuck(true);}});
$('duck').addEventListener('keyup',()=>setDuck(false));$('duck').addEventListener('blur',()=>setDuck(false));
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});canvas.addEventListener('pointerdown',e=>{e.preventDefault();jump();});$('boost').addEventListener('click',zoom);$('pause').addEventListener('click',pause);document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA'].includes(e.target.tagName))return;if(['ArrowDown','KeyS'].includes(e.code)){e.preventDefault();setDuck(true);return;}if(e.target.tagName==='BUTTON'&&e.code==='Space')return;if(['Space','ArrowUp','KeyZ','KeyP'].includes(e.code)){e.preventDefault();if(e.repeat)return;if(e.code==='KeyP')pause();else if(e.code==='KeyZ')zoom();else jump();}});document.addEventListener('keyup',e=>{if(['ArrowDown','KeyS'].includes(e.code))setDuck(false);});window.addEventListener('blur',()=>{setDuck(false);if(state==='running')pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='running')pause();});missionUpdate();stats();requestAnimationFrame(frame);

const API='https://life-with-gigi-game.doreneharris22.chatgpt.site/api';
let runPromise=Promise.resolve(null),submissionBusy=false;
function beginScoreRun(){runPromise=fetch(API+'/run',{method:'POST'}).then(async r=>{if(!r.ok)return null;return (await r.json()).runId;}).catch(()=>null);}
async function loadBoard(){const message=$('boardMessage');message.textContent='Loading scores…';try{const r=await fetch(API+'/leaderboard');if(!r.ok)throw Error('Leaderboard is temporarily unavailable. Tap Refresh to try again.');const data=await r.json();$('boardRows').replaceChildren();data.scores.forEach((entry,i)=>{const tr=document.createElement('tr');[String(i+1),entry.name,Number(entry.score).toLocaleString()].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.appendChild(td);});$('boardRows').appendChild(tr);});message.textContent=data.scores.length?'Highest scores from all players.':'No scores yet. Be the first Zoomies champion!';}catch(e){message.textContent='Leaderboard is temporarily unavailable. Tap Refresh to try again.';}}
$('refreshBoard').addEventListener('click',loadBoard);
$('submitForm').addEventListener('submit',async e=>{e.preventDefault();if(state!=='over'||submissionBusy)return;const name=$('nickname').value.trim();if(!/^[\p{L}\p{N} ._'!-]{1,20}$/u.test(name)){$('saveMessage').textContent='Use 1–20 letters, numbers, or simple punctuation.';return;}const snapshot={score:Math.floor(score),treats,seconds:Math.floor(time)};const promise=runPromise;submissionBusy=true;$('saveScore').disabled=true;$('saveMessage').textContent='Saving score…';try{const runId=await promise;if(!runId)throw Error('This run was offline. Start a new run to submit a score.');const r=await fetch(API+'/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...snapshot,name,runId})});const data=await r.json();if(!r.ok)throw Error(data.error||'Could not save your score.');$('saveMessage').textContent='Score submitted! Thanks for playing.';await loadBoard();}catch(error){$('saveMessage').textContent=error.message;$('saveScore').disabled=false;}finally{submissionBusy=false;}});
loadBoard();
