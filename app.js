// ─── BloomOS hero: directional bloom with native video ────────────────────────
// • Entering the computer + flowers area starts the bloom. The reveal opens as a soft
//   wave from where the pointer entered and grows in the direction you move, so a
//   rough sweep opens the whole picture.
// • Everything revealed shows the same moment of the video (one shared clock), so
//   there is never a patchwork of old and new flowers.
// • Leaving the computer + flowers area plays the bloom backwards to the first frame.
// • Playback uses the browser's native video decoder (a forward and a pre-reversed
//   copy), so motion is as smooth as the video itself.
const hero=document.querySelector('#hero');
const trigger=document.querySelector('#bloom-trigger');
const status=document.querySelector('#bloom-status');
const plane=document.querySelector('#media-plane');
const fwd=document.querySelector('#garden-video');
const cursorGlow=document.querySelector('#bloom-cursor');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');

const SRC_W=1920,SRC_H=1080;
const VIDEO={forward:'assets/media/bloom-forward.mp4',reverse:'assets/media/bloom-reverse.mp4'};
const PLAY_RATE=.85;      // forward speed (1 = real time, 3 s); lower = more unhurried
const REWIND_RATE=1.25;   // backward speed after leaving
const SWEEP=.5;           // pointer travel (share of the artwork width) that opens everything
const IDLE_OPEN=.18;      // share opened per second while hovering without moving
const FEATHER=.32;        // soft edge of the reveal, as a share of the artwork width
// Core of the computer (monitor + base) in source px: leaving it rewinds immediately.
const CORE={x0:990,y0:265,x1:1625,y1:850};
const LEAVE_DELAY=0;      // ms before rewinding once the pointer leaves the core

// Second video element for the pre-reversed copy.
fwd.src=VIDEO.forward;fwd.preload='auto';fwd.loop=false;
const rev=fwd.cloneNode(false);rev.removeAttribute('id');rev.src=VIDEO.reverse;fwd.after(rev);
for(const v of [fwd,rev]){v.muted=true;v.playsInline=true;v.style.opacity='0';v.style.transition='none';}

let started=false,inside=false,mode='idle',amount=0,origin=null,lastPtr=null,leaveTimer=0,raf=0,last=0,demo=null,touchTimer=0;
let visible=null; // the video element currently on screen

function layout(){
 const rect=plane.getBoundingClientRect(),scale=Math.max(rect.width/SRC_W,rect.height/SRC_H);
 const p=innerWidth<=700?.5:(innerWidth/innerHeight<=1.5?.68:.62);
 return {rect,scale,ox:(rect.width-SRC_W*scale)*p,oy:(rect.height-SRC_H*scale)*.5};
}
function sourcePoint(cx,cy){const l=layout();return{x:(cx-l.rect.left-l.ox)/l.scale,y:(cy-l.rect.top-l.oy)/l.scale};}
function artworkPoint(u,v){const l=layout();return{x:l.rect.left+l.ox+u*SRC_W*l.scale,y:l.rect.top+l.oy+v*SRC_H*l.scale};}

function inCore(p){return p.x>=CORE.x0&&p.x<=CORE.x1&&p.y>=CORE.y0&&p.y<=CORE.y1;}

// ── Reveal mask (shared by the videos and the occluder)
function maskRadius(){
 if(!origin)return 0;
 const far=Math.max(Math.hypot(origin.x,origin.y),Math.hypot(SRC_W-origin.x,origin.y),Math.hypot(origin.x,SRC_H-origin.y),Math.hypot(SRC_W-origin.x,SRC_H-origin.y));
 return amount*(far+FEATHER*SRC_W);
}
function applyMask(){
 const l=layout(),r=maskRadius(),f=FEATHER*SRC_W;
 let css='none';
 if(origin&&amount<1){
  const cx=l.ox+origin.x*l.scale,cy=l.oy+origin.y*l.scale,R=r*l.scale,F=f*l.scale;
  css=`radial-gradient(circle at ${cx}px ${cy}px,#000 ${Math.max(0,R-F)}px,rgba(0,0,0,.5) ${Math.max(0,R-F*.5)}px,transparent ${Math.max(1,R)}px)`;
 }
 for(const v of [fwd,rev]){v.style.maskImage=css;v.style.webkitMaskImage=css;}
 occluder.uniforms(origin,r,f,amount);
}

// ── Video switching
function show(v){visible=v;fwd.style.opacity=v===fwd?'1':'0';rev.style.opacity=v===rev?'1':'0';occluder.source(v);}
function clockTime(){
 if(visible===rev)return Math.max(0,(rev.duration||3.04)-rev.currentTime);
 if(visible===fwd)return fwd.currentTime;
 return 0;
}
function seek(v,t){return new Promise(res=>{if(Math.abs(v.currentTime-t)<.01)return res();v.addEventListener('seeked',res,{once:true});v.currentTime=t;});}
async function playForward(){
 mode='forward';const t=clockTime();
 rev.pause();
 if(motion.matches){await seek(fwd,(fwd.duration||3.04)-.04);show(fwd);amount=1;applyMask();return;}
 await seek(fwd,t);if(mode!=='forward')return;
 show(fwd);fwd.playbackRate=PLAY_RATE;fwd.play().catch(()=>{});
}
async function playBackward(){
 mode='backward';fwd.pause();const t=clockTime();
 if(t<=.02||motion.matches){sleep();return;}
 const d=rev.duration||3.04;
 await seek(rev,Math.max(0,d-t));if(mode!=='backward')return;
 show(rev);rev.playbackRate=REWIND_RATE;rev.play().catch(()=>{});
}
function sleep(){
 mode='idle';started=false;amount=0;origin=null;lastPtr=null;fwd.pause();rev.pause();
 visible=null;fwd.style.opacity='0';rev.style.opacity='0';occluder.source(null);applyMask();
 hero.classList.remove('has-explored','garden-playing');
 status.textContent='The garden is asleep. Move over the computer to let it bloom.';
}
rev.addEventListener('ended',()=>{if(mode==='backward')sleep();});

// ── Pointer handling
function tick(now){
 raf=0;const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
 if(demo){
  const k=Math.min(1,(now-demo.start)/3600);
  const p=artworkPoint(.5+.32*k,.72-.3*k);pointerAt(p.x,p.y,true);
  if(k===1){demo=null;setTimeout(()=>{if(!inside)return;inside=false;hero.classList.remove('is-revealing');playBackward();},1600);}
 }
 if(inside&&mode==='forward'&&amount<1){amount=Math.min(1,amount+IDLE_OPEN*dt);applyMask();}
 if(inside||demo||(visible&&!visible.paused))raf=requestAnimationFrame(tick);else last=0;
}
const wake=()=>{if(!raf)raf=requestAnimationFrame(tick);};
function pointerAt(cx,cy,force){
 const p=sourcePoint(cx,cy),core=inCore(p);
 const hr=hero.getBoundingClientRect();cursorGlow.style.transform=`translate3d(${cx-hr.left}px,${cy-hr.top}px,0)`;
 if(!inside&&(core||force)){
  clearTimeout(leaveTimer);inside=true;hero.classList.add('is-revealing');
  if(!started){started=true;origin={x:p.x,y:p.y};amount=0;lastPtr=null;hero.classList.add('has-explored','garden-playing');status.textContent='The garden is blooming.';}
  playForward();
 }else if(inside&&!core&&!force){
  leaveArea();
 }else if(inside){clearTimeout(leaveTimer);}
 if(inside){
  if(lastPtr)amount=Math.min(1,amount+Math.hypot(p.x-lastPtr.x,p.y-lastPtr.y)/(SRC_W*SWEEP));
  lastPtr=p;applyMask();
 }
 wake();
}
function leaveArea(){
 clearTimeout(leaveTimer);
 const go=()=>{inside=false;lastPtr=null;hero.classList.remove('is-revealing');if(started)playBackward();wake();};
 if(LEAVE_DELAY>0)leaveTimer=setTimeout(go,LEAVE_DELAY);else go();
}
function isControl(t){return t instanceof Element&&!!t.closest('button,a,input,dialog,nav,header');}
hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!finePointer.matches)return;if(isControl(e.target)){if(inside&&!demo)leaveArea();return;}demo=null;pointerAt(e.clientX,e.clientY);});
hero.addEventListener('pointerleave',()=>{if(!demo&&inside)leaveArea();});
hero.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||isControl(e.target))return;clearTimeout(touchTimer);pointerAt(e.clientX,e.clientY,true);touchTimer=setTimeout(leaveArea,2200);});
hero.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!inside||isControl(e.target))return;clearTimeout(touchTimer);pointerAt(e.clientX,e.clientY,true);touchTimer=setTimeout(leaveArea,2200);});
function previewSpotlight(){sleep();inside=false;const p=artworkPoint(.5,.72);demo={start:performance.now()};pointerAt(p.x,p.y,true);}
trigger.addEventListener('focus',()=>{const p=artworkPoint(.69,.5);pointerAt(p.x,p.y,true);amount=1;applyMask();});
trigger.addEventListener('blur',leaveArea);
trigger.addEventListener('click',e=>{if(e.pointerType!=='touch')previewSpotlight();});
document.querySelector('#watch-demo').addEventListener('click',previewSpotlight);
document.querySelector('#replay').addEventListener('click',()=>{clearTimeout(leaveTimer);inside=false;demo=null;hero.classList.remove('is-revealing');sleep();});
window.addEventListener('resize',()=>applyMask());
document.addEventListener('visibilitychange',()=>{if(document.hidden){fwd.pause();rev.pause();}else if(mode==='forward'&&inside)fwd.play().catch(()=>{});else if(mode==='backward')rev.play().catch(()=>{});});

// ── Foreground occluder: computer and flowers in front of the headline
// Redraws the same picture (start frame / masked video) above the <h1>, keeping only
// the computer and plants: sky keyed out, edge eroded 1–2 px, blue spill removed.
const occluder=(()=>{
 const canvas=document.querySelector('#occluder');
 const gl=canvas&&canvas.getContext('webgl',{premultipliedAlpha:true,antialias:false,depth:false});
 const noop={uniforms(){},source(){},draw(){}};
 if(!gl)return noop;
 const VS='attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
 const FS=`precision mediump float;varying vec2 v;
 uniform sampler2D uStart,uVideo,uDomain;uniform float uOn,uR,uF,uFull;uniform vec2 uO,uPx;
 vec3 pic(vec2 q){
  vec3 s=texture2D(uStart,q).rgb;
  if(uOn<.5)return s;
  float m=uFull>.5?1.:1.-smoothstep(max(0.,uR-uF),uR,distance(q*vec2(${SRC_W}.,${SRC_H}.),uO));
  return mix(s,texture2D(uVideo,q).rgb,m);
 }
 float key(vec3 c){return 1.-smoothstep(.02,.12,c.b-c.r)*smoothstep(.18,.34,c.b);}
 void main(){
  vec3 c=pic(v);
  float a=key(c);
  a=min(a,key(pic(v+vec2(uPx.x*1.5,0.))));a=min(a,key(pic(v-vec2(uPx.x*1.5,0.))));
  a=min(a,key(pic(v+vec2(0.,uPx.y*1.5))));a=min(a,key(pic(v-vec2(0.,uPx.y*1.5))));
  a=smoothstep(.4,.95,a)*texture2D(uDomain,v).r;
  c.b=min(c.b,max(c.r,c.g)*1.04);
  gl_FragColor=vec4(c*a,a);
 }`;
 const sh=(t,s)=>{const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;};
 const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(prog);gl.useProgram(prog);
 gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(prog,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const U=n=>gl.getUniformLocation(prog,n);
 const tex=(unit,name)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
  for(const [k,val] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,val);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));gl.uniform1i(U(name),unit);return t;};
 const tStart=tex(0,'uStart'),tVideo=tex(1,'uVideo'),tDomain=tex(2,'uDomain');
 const upload=(t,unit,src)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,src);};
 let loaded=0,src=null,dirty=true,handle=0;
 for(const [t,unit,s] of [[tStart,0,'assets/media/bloom-start-v2.webp'],[tDomain,2,'assets/media/occlusion-domain.png']]){
  const img=new Image();img.onload=()=>{upload(t,unit,img);if(++loaded===2){hero.classList.add('occluder-ready');dirty=true;draw();}};img.src=s;
 }
 gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(U('uPx'),1/SRC_W,1/SRC_H);
 function draw(){
  if(loaded<2)return;
  if(src&&src.readyState>=2){upload(tVideo,1,src);dirty=true;}
  if(!dirty)return;dirty=false;
  gl.uniform1f(U('uOn'),src?1:0);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
 function pump(){draw();if(src&&!src.paused&&!src.ended)handle=src.requestVideoFrameCallback?src.requestVideoFrameCallback(pump):requestAnimationFrame(pump);}
 for(const v of [fwd,rev]){v.addEventListener('play',()=>{if(v===src)pump();});for(const ev of ['seeked','pause','ended'])v.addEventListener(ev,()=>{if(v===src){dirty=true;draw();}});}
 return {
  uniforms(o,r,f,amt){gl.uniform2f(U('uO'),o?o.x:0,o?o.y:0);gl.uniform1f(U('uR'),r);gl.uniform1f(U('uF'),f);gl.uniform1f(U('uFull'),amt>=1?1:0);dirty=true;if(!src||src.paused)draw();},
  source(v){src=v;dirty=true;draw();if(v&&!v.paused)pump();},
  draw
 };
})();
applyMask();
