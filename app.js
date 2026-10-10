// Cursor spotlight: wherever the pointer moves, a soft-edged brush reveals the blooming
// garden. Revealed areas stay revealed (until Reset) and grow more opaque the longer you linger.
const hero=document.querySelector('#hero');
const trigger=document.querySelector('#bloom-trigger');
const status=document.querySelector('#bloom-status');
const plane=document.querySelector('#media-plane');
const gardenVideo=document.querySelector('#garden-video');
const cursorGlow=document.querySelector('#bloom-cursor');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const SRC_W=1920,SRC_H=1080;
const SPOT_DESKTOP=230,SPOT_MOBILE=140; // brush radius in CSS px
const STRENGTH=.16;                     // opacity added per frame under the brush centre (60fps)
const MASK_W=400;                       // mask resolution (plane space); smooth upscaling keeps edges soft
let started=false,ready=false,active=false,touchTimer=0,raf=0,last=0,demo=null;
let raw={x:0,y:0},pos={x:0,y:0},origin={x:0,y:0};
let occluderHook=null;
const mask=document.createElement('canvas'),mctx=mask.getContext('2d');
function layout(){
 const rect=plane.getBoundingClientRect(),scale=Math.max(rect.width/SRC_W,rect.height/SRC_H);
 const p=innerWidth<=700?.5:(innerWidth/innerHeight<=1.5?.68:.62);
 return {rect,scale,ox:(rect.width-SRC_W*scale)*p,oy:(rect.height-SRC_H*scale)*.5};
}
function sourcePoint(cx,cy){const l=layout();return{x:(cx-l.rect.left-l.ox)/l.scale,y:(cy-l.rect.top-l.oy)/l.scale};}
function artworkPoint(u,v){const l=layout();return{x:l.rect.left+l.ox+u*SRC_W*l.scale,y:l.rect.top+l.oy+v*SRC_H*l.scale};}
function sizeMask(){
 const r=plane.getBoundingClientRect();if(!r.width)return;
 const h=Math.max(1,Math.round(MASK_W*r.height/r.width));
 if(mask.width===MASK_W&&mask.height===h)return;
 const old=document.createElement('canvas');old.width=mask.width||1;old.height=mask.height||1;old.getContext('2d').drawImage(mask,0,0);
 mask.width=MASK_W;mask.height=h;mctx.drawImage(old,0,0,MASK_W,h);applyMask();
}
function applyMask(){
 const url=`url(${mask.toDataURL()})`;
 gardenVideo.style.maskImage=url;gardenVideo.style.webkitMaskImage=url;
 gardenVideo.style.maskSize='100% 100%';gardenVideo.style.webkitMaskSize='100% 100%';
 if(occluderHook)occluderHook.mask();
}
function stamp(cx,cy,amount){
 const r=plane.getBoundingClientRect(),k=mask.width/r.width;
 const x=(cx-r.left)*k,y=(cy-r.top)*k,rad=(innerWidth<=700?SPOT_MOBILE:SPOT_DESKTOP)*k;
 const g=mctx.createRadialGradient(x,y,0,x,y,rad);
 g.addColorStop(0,`rgba(255,255,255,${amount})`);g.addColorStop(.35,`rgba(255,255,255,${amount*.9})`);
 g.addColorStop(.65,`rgba(255,255,255,${amount*.45})`);g.addColorStop(.85,`rgba(255,255,255,${amount*.12})`);g.addColorStop(1,'rgba(255,255,255,0)');
 mctx.fillStyle=g;mctx.fillRect(x-rad,y-rad,rad*2,rad*2);
}
async function startGarden(){
 if(started)return;started=true;hero.classList.add('has-explored');
 try{
  if(motion.matches){
   if(gardenVideo.readyState<1)await new Promise((res,rej)=>{gardenVideo.addEventListener('loadedmetadata',res,{once:true});gardenVideo.addEventListener('error',rej,{once:true});});
   const seek=new Promise(res=>gardenVideo.addEventListener('seeked',res,{once:true}));
   gardenVideo.currentTime=Math.max(0,gardenVideo.duration-.04);await seek;
  }else await gardenVideo.play();
  ready=true;hero.classList.add('garden-playing');
  status.textContent='The garden blooms wherever you move. Revealed areas stay in bloom.';
 }catch(err){started=false;console.warn('[bloom] Playback unavailable.',err);}
}
function tick(now){
 raf=0;const dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
 if(demo){
  const t=Math.min(1,(now-demo.start)/2600);
  const p=artworkPoint(.5+.28*t,.82-.55*t+.12*Math.sin(t*Math.PI*2));raw={x:p.x,y:p.y};
  if(t===1){demo=null;deactivate();}
 }
 if(active){
  const e=motion.matches?1:1-Math.pow(.88,dt*60);
  pos.x+=(raw.x-pos.x)*e;pos.y+=(raw.y-pos.y)*e;
  stamp(pos.x,pos.y,motion.matches?1:Math.min(1,STRENGTH*dt*60));
  applyMask();
  const hr=hero.getBoundingClientRect();cursorGlow.style.transform=`translate3d(${pos.x-hr.left}px,${pos.y-hr.top}px,0)`;
  raf=requestAnimationFrame(tick);
 }else last=0;
}
function activate(cx,cy){
 sizeMask();raw={x:cx,y:cy};
 if(!active){pos={x:cx,y:cy};active=true;hero.classList.add('is-revealing');}
 startGarden();
 if(!raf)raf=requestAnimationFrame(tick);
}
function deactivate(){active=false;hero.classList.remove('is-revealing');}
function isControl(target){return target instanceof Element&&!!target.closest('button,a,input,dialog,nav,header');}
hero.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||!finePointer.matches)return;if(isControl(e.target)){if(!demo)deactivate();return;}demo=null;activate(e.clientX,e.clientY);});
hero.addEventListener('pointerleave',()=>{if(!demo)deactivate();});
hero.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'||isControl(e.target))return;clearTimeout(touchTimer);activate(e.clientX,e.clientY);touchTimer=setTimeout(deactivate,1800);});
hero.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'||!active||isControl(e.target))return;clearTimeout(touchTimer);activate(e.clientX,e.clientY);touchTimer=setTimeout(deactivate,1800);});
function resetGarden(){
 clearTimeout(touchTimer);demo=null;deactivate();started=false;ready=false;
 gardenVideo.pause();hero.classList.remove('has-explored','garden-playing','garden-open');
 if(gardenVideo.readyState>=1)gardenVideo.currentTime=0;
 mctx.clearRect(0,0,mask.width,mask.height);applyMask();
 status.textContent='The garden is asleep again. Move over the scene to let it bloom.';
}
function previewSpotlight(){resetGarden();const p=artworkPoint(.5,.82);activate(p.x,p.y);demo={start:performance.now()};}
trigger.addEventListener('focus',()=>{const p=artworkPoint(.69,.5);activate(p.x,p.y);});
trigger.addEventListener('blur',deactivate);
trigger.addEventListener('click',e=>{if(e.pointerType==='touch'){activate(e.clientX,e.clientY);clearTimeout(touchTimer);touchTimer=setTimeout(deactivate,1800);}else previewSpotlight();});
document.querySelector('#watch-demo').addEventListener('click',previewSpotlight);
document.querySelector('#replay').addEventListener('click',resetGarden);
gardenVideo.addEventListener('error',()=>{ready=false;hero.classList.remove('garden-playing');status.textContent='The garden video could not load.';});
window.addEventListener('resize',sizeMask);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden)gardenVideo.pause();
 else if(started&&ready&&!gardenVideo.ended&&!motion.matches)gardenVideo.play().catch(()=>{});
});
sizeMask();

// ─── Foreground occlusion ────────────────────────────────────────────────────
// Redraws whatever the artwork currently shows (start frame, entrance circle, video)
// above the headline, keeping only the computer/plants: sky is keyed out, and only
// inside a soft domain around the computer, so clouds and mountains never cover type.
const occluder=(()=>{
 const canvas=document.querySelector('#occluder');
 const gl=canvas&&canvas.getContext('webgl',{premultipliedAlpha:true,antialias:false,depth:false});
 if(!gl)return {render(){},frame(){},mask(){}};
 const VS='attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
 const FS=`precision mediump float;varying vec2 v;
 uniform sampler2D uStart,uVideo,uDomain,uMask;uniform float uMode;uniform vec2 uPlane;uniform vec3 uLayout;
 void main(){
  vec2 px=uLayout.xy+v*vec2(${SRC_W}.,${SRC_H}.)*uLayout.z;
  float m=uMode<.5?0.:texture2D(uMask,clamp(px/uPlane,0.,1.)).a;
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
 const tStart=tex(0,'uStart'),tVideo=tex(1,'uVideo'),tDomain=tex(2,'uDomain'),tMask=tex(3,'uMask');
 let loaded=0,videoReady=false;
 const upload=(t,unit,src)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,src);};
 for(const [t,unit,src] of [[tStart,0,document.querySelector('.start-frame').currentSrc||'assets/media/bloom-start-v2.webp'],[tDomain,2,'assets/media/occlusion-domain.png']]){
  const img=new Image();img.onload=()=>{upload(t,unit,img);if(++loaded===2){hero.classList.add('occluder-ready');render();}};img.src=src;
 }
 gl.viewport(0,0,canvas.width,canvas.height);
 function render(){
  if(loaded<2)return;
  const l=layout();
  const mode=!started||!videoReady?0:1;
  gl.uniform1f(U('uMode'),mode);
  gl.uniform3f(U('uLayout'),l.ox,l.oy,l.scale);
  gl.uniform2f(U('uPlane'),l.rect.width,l.rect.height);
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
 function updateMask(){if(!mask.width)return;gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tMask);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask);render();}
 return {render,frame,mask:updateMask,reset(){videoReady=false;render();}};
})();
occluderHook=occluder;occluder.mask();
document.querySelector('#replay').addEventListener('click',()=>occluder.reset&&occluder.reset());
new MutationObserver(()=>occluder.render()).observe(hero,{attributes:true,attributeFilter:['class']});
