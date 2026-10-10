// One native video timeline: a local entrance opens into the complete garden.
const hero=document.querySelector('#hero');
const trigger=document.querySelector('#bloom-trigger');
const status=document.querySelector('#bloom-status');
const plane=document.querySelector('#media-plane');
const gardenVideo=document.querySelector('#garden-video');
const cursorGlow=document.querySelector('#bloom-cursor');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const SRC_W=1920,SRC_H=1080;
// Open the whole frame well before the first butterfly appears (~1.3s).
const OPEN_TIME=.8;
let started=false,ready=false,active=false,epoch=0,frameHandle=0,touchTimer=0;
let origin={x:0,y:0};
function layout(){
 const rect=plane.getBoundingClientRect(),scale=Math.max(rect.width/SRC_W,rect.height/SRC_H);
 const pos=innerWidth<=700?.5:(innerWidth/innerHeight<=1.5?.68:.62);
 return {rect,scale,ox:(rect.width-SRC_W*scale)*pos,oy:(rect.height-SRC_H*scale)*.5};
}
function sourcePoint(cx,cy){const l=layout();return{x:(cx-l.rect.left-l.ox)/l.scale,y:(cy-l.rect.top-l.oy)/l.scale};}
function artworkPoint(u,v){const l=layout();return{x:l.rect.left+l.ox+u*SRC_W*l.scale,y:l.rect.top+l.oy+v*SRC_H*l.scale};}
function updateEntrance(){
 if(!started||!ready)return;
 const t=motion.matches?1:Math.min(1,gardenVideo.currentTime/OPEN_TIME);
 if(t>=1){hero.classList.add('garden-open');return;}
 const rect=plane.getBoundingClientRect();
 const radius=150+Math.hypot(rect.width,rect.height)*Math.pow(t,1.4);
 gardenVideo.style.setProperty('--reveal-x',`${origin.x*rect.width}px`);
 gardenVideo.style.setProperty('--reveal-y',`${origin.y*rect.height}px`);
 gardenVideo.style.setProperty('--reveal-radius',`${radius}px`);
}
function followEntrance(){
 if(!started||!ready||document.hidden)return;
 updateEntrance();
 if(gardenVideo.currentTime>=OPEN_TIME||gardenVideo.ended)return;
 frameHandle=gardenVideo.requestVideoFrameCallback?gardenVideo.requestVideoFrameCallback(followEntrance):requestAnimationFrame(followEntrance);
}
function cancelEntrance(){
 if(gardenVideo.requestVideoFrameCallback)gardenVideo.cancelVideoFrameCallback(frameHandle);
 else cancelAnimationFrame(frameHandle);
 frameHandle=0;
}
async function startGarden(cx,cy){
 if(started)return;
 started=true;const token=++epoch;
 const rect=plane.getBoundingClientRect();
 origin={x:Math.max(0,Math.min(1,(cx-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(cy-rect.top)/rect.height))};
 gardenVideo.style.setProperty('--reveal-x',`${origin.x*rect.width}px`);
 gardenVideo.style.setProperty('--reveal-y',`${origin.y*rect.height}px`);
 gardenVideo.style.setProperty('--reveal-radius','150px');
 hero.classList.add('has-explored');
 try{
  if(motion.matches){
   if(gardenVideo.readyState<1)await new Promise((resolve,reject)=>{gardenVideo.addEventListener('loadedmetadata',resolve,{once:true});gardenVideo.addEventListener('error',reject,{once:true});});
   if(token!==epoch)return;
   const seek=new Promise(resolve=>gardenVideo.addEventListener('seeked',resolve,{once:true}));
   gardenVideo.currentTime=Math.max(0,gardenVideo.duration-.04);await seek;
  }else await gardenVideo.play();
  if(token!==epoch){if(!started)gardenVideo.pause();return;}
  ready=true;hero.classList.add('garden-playing');updateEntrance();followEntrance();
  status.textContent='The whole garden is blooming. The crown, flowers and butterflies play together.';
 }catch(err){
  if(token!==epoch)return;
  started=false;ready=false;hero.classList.remove('garden-playing','garden-open');
  status.textContent='The garden could not play. Move over the scene to try again.';
  console.warn('[bloom] Playback unavailable.',err);
 }
}
function activate(cx,cy){
 active=true;hero.classList.add('is-revealing');
 const hr=hero.getBoundingClientRect();cursorGlow.style.transform=`translate3d(${cx-hr.left}px,${cy-hr.top}px,0)`;
 const p=sourcePoint(cx,cy);
 if(p.x>=SRC_W*.3&&p.x<=SRC_W&&p.y>=0&&p.y<=SRC_H)startGarden(cx,cy);
}
function deactivate(){active=false;hero.classList.remove('is-revealing');}
function isControl(target){return target instanceof Element&&!!target.closest('button,a,input,dialog,nav,header');}
hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!finePointer.matches)return;if(isControl(e.target)){deactivate();return;}activate(e.clientX,e.clientY);});
hero.addEventListener('pointerleave',deactivate);
hero.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||isControl(e.target))return;clearTimeout(touchTimer);activate(e.clientX,e.clientY);touchTimer=setTimeout(deactivate,1800);});
hero.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!active||isControl(e.target))return;clearTimeout(touchTimer);activate(e.clientX,e.clientY);touchTimer=setTimeout(deactivate,1800);});
function resetGarden(){
 epoch++;cancelEntrance();clearTimeout(touchTimer);deactivate();started=false;ready=false;
 gardenVideo.pause();hero.classList.remove('has-explored','garden-playing','garden-open');
 if(gardenVideo.readyState>=1)gardenVideo.currentTime=0;
 status.textContent='The garden is asleep again. Move over either side to wake the whole garden.';
}
function previewSpotlight(){resetGarden();const p=artworkPoint(.48,.75);activate(p.x,p.y);}
trigger.addEventListener('focus',()=>{const p=artworkPoint(.69,.5);activate(p.x,p.y);});
trigger.addEventListener('blur',deactivate);
trigger.addEventListener('click',e=>{if(e.pointerType==='touch'){activate(e.clientX,e.clientY);clearTimeout(touchTimer);touchTimer=setTimeout(deactivate,1800);}else previewSpotlight();});
document.querySelector('#watch-demo').addEventListener('click',previewSpotlight);
document.querySelector('#replay').addEventListener('click',resetGarden);
gardenVideo.addEventListener('ended',()=>{if(started){hero.classList.add('garden-open');status.textContent='The whole garden is in bloom. Reset garden to watch it grow again.';}});
gardenVideo.addEventListener('timeupdate',updateEntrance);
gardenVideo.addEventListener('error',()=>{ready=false;hero.classList.remove('garden-playing','garden-open');status.textContent='The garden video could not load.';});
window.addEventListener('resize',updateEntrance);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){gardenVideo.pause();cancelEntrance();}
 else if(started&&ready&&!gardenVideo.ended&&!motion.matches){gardenVideo.play().then(followEntrance).catch(()=>{});}
});


// ─── Foreground occlusion ────────────────────────────────────────────────────
// Redraws whatever the artwork currently shows (start frame, entrance circle, video)
// above the headline, keeping only the computer/plants: sky is keyed out, and only
// inside a soft domain around the computer, so clouds and mountains never cover type.
const occluder=(()=>{
 const canvas=document.querySelector('#occluder');
 const gl=canvas&&canvas.getContext('webgl',{premultipliedAlpha:true,antialias:false,depth:false});
 if(!gl)return {render(){},frame(){}};
 const VS='attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
 const FS=`precision mediump float;varying vec2 v;
 uniform sampler2D uStart,uVideo,uDomain;uniform float uMode,uR;uniform vec2 uCenter;uniform vec3 uLayout;
 void main(){
  vec2 px=uLayout.xy+v*vec2(${SRC_W}.,${SRC_H}.)*uLayout.z;
  float m=uMode<.5?0.:(uMode>1.5?1.:1.-smoothstep(max(0.,uR-65.),uR,distance(px,uCenter)));
  vec3 c=mix(texture2D(uStart,v).rgb,texture2D(uVideo,v).rgb,m);
  float sky=smoothstep(.06,.16,c.b-c.r)*smoothstep(.25,.4,c.b);
  float alpha=texture2D(uDomain,v).r*(1.-sky);
  gl_FragColor=vec4(c*alpha,alpha);
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
 let loaded=0,videoReady=false;
 const upload=(t,unit,src)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,src);};
 for(const [t,unit,src] of [[tStart,0,document.querySelector('.start-frame').currentSrc||'assets/media/bloom-start-v2.webp'],[tDomain,2,'assets/media/occlusion-domain.png']]){
  const img=new Image();img.onload=()=>{upload(t,unit,img);if(++loaded===2){hero.classList.add('occluder-ready');render();}};img.src=src;
 }
 gl.viewport(0,0,canvas.width,canvas.height);
 function render(){
  if(loaded<2)return;
  const l=layout();
  const mode=!started||!videoReady?0:(hero.classList.contains('garden-open')?2:1);
  gl.uniform1f(U('uMode'),mode);
  gl.uniform3f(U('uLayout'),l.ox,l.oy,l.scale);
  gl.uniform2f(U('uCenter'),origin.x*l.rect.width,origin.y*l.rect.height);
  gl.uniform1f(U('uR'),parseFloat(gardenVideo.style.getPropertyValue('--reveal-radius'))||150);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 }
 // Copy the current video frame, then redraw.
 function frame(){
  if(gardenVideo.readyState>=2){upload(tVideo,1,gardenVideo);videoReady=true;}
  render();
 }
 let handle=0;
 function pump(){frame();if(!gardenVideo.paused&&!gardenVideo.ended)handle=gardenVideo.requestVideoFrameCallback?gardenVideo.requestVideoFrameCallback(pump):requestAnimationFrame(pump);}
 gardenVideo.addEventListener('play',pump);
 for(const ev of ['seeked','ended','pause'])gardenVideo.addEventListener(ev,frame);
 window.addEventListener('resize',render);
 return {render,frame,reset(){videoReady=false;render();}};
})();
document.querySelector('#replay').addEventListener('click',()=>occluder.reset&&occluder.reset());
new MutationObserver(()=>occluder.render()).observe(hero,{attributes:true,attributeFilter:['class']});
