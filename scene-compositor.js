// Scene-space occlusion plus a perspective-tracked, natively rendered screen.
(() => {
  const hero = document.querySelector('#hero');
  const video = document.querySelector('#garden-video');
  const presentation = document.querySelector('#video-frame');
  const presentationCtx = presentation.getContext('2d');
  const poster = document.querySelector('.start-frame');
  const plane = document.querySelector('#media-plane');
  const foregroundPlane = document.querySelector('.occluder-plane');
  const canvas = document.querySelector('#occluder');
  const screen = document.querySelector('#screen-ui');
  const screenPlane = screen.parentElement;
  screenPlane.inert = true;
  function updateInteraction() {
    // Enable the original screen controls only when the final frame is decoded.
    const active = document.body.dataset.route === 'home' && scrollProgress >= .995 &&
      currentSource === video && hasFrame && frameTime >= video.duration - .09;
    if (!active && screenPlane.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    screenPlane.inert = !active;
    screenPlane.setAttribute('aria-hidden', String(!active));
    screen.classList.toggle('is-interactive', active);
  }
  const clamp = n => Math.max(0, Math.min(1, n));
  const smooth = (a,b,n) => {const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
  const ready = image => image.complete && image.naturalWidth ? Promise.resolve() : new Promise(resolve => image.addEventListener('load',resolve,{once:true}));
  let currentSource = poster, scrollProgress = 0, frameTime = 0, renderedTime = -1, hasFrame = false;
  // Measured inner glass corners in the supplied 1920×1080 video, clockwise.
  // The UI only appears once the original display starts to light up.
  const track = [
    [3.0, [[846,340],[1334,344],[1347,788],[840,791]]],
    [3.5, [[813,337],[1300,341],[1313,782],[806,785]]],
    [4.0, [[787,334],[1277,338],[1290,781],[779,784]]],
    [4.5, [[764,332],[1256,336],[1270,780],[756,783]]],
    [5.0, [[748,329],[1242,333],[1257,779],[739,782]]]
  ];
  function corners(time) {
    let i=0;while(i<track.length-2 && time>track[i+1][0])i++;
    const [t0,a]=track[i], [t1,b]=track[i+1], k=clamp((time-t0)/(t1-t0));
    return a.map((p,j)=>p.map((v,d)=>v+(b[j][d]-v)*k));
  }
  function homography(q) {
    const [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q;
    const dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3;
    const dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3;
    const den=dx1*dy2-dx2*dy1;
    const g=(dx3*dy2-dx2*dy3)/den,h=(dx1*dy3-dx3*dy1)/den;
    return [x1-x0+g*x1,x3-x0+h*x3,x0,y1-y0+g*y1,y3-y0+h*y3,y0,g,h];
  }
  function cover() {
    const r=plane.getBoundingClientRect(),w=1920,h=1080;
    const scale=Math.max(r.width/w,r.height/h);
    const pos=getComputedStyle(video).objectPosition.split(' ').map(parseFloat);
    return {scale,x:(r.width-w*scale)*pos[0]/100+(innerWidth<=700?r.width*scrollProgress*.13:0),y:(r.height-h*scale)*pos[1]/100};
  }
  function positionScreen(q) {
    const l=cover(),m=homography(q.map(([x,y])=>[l.x+x*l.scale,l.y+y*l.scale]));
    const [a,b,c,d,e,f,g,h]=m;
    screen.style.transform=`matrix3d(${a/900},${d/900},0,${g/900},${b/800},${e/800},0,${h/800},0,0,1,0,${c},${f},0,1)`;
    screen.style.opacity=String(currentSource===video?smooth(3.06,3.3,frameTime):0);
  }

  // Extract colored petals in the lower-left border band. Neutral glass and
  // dark UI lettering are rejected, so the screen never inherits black halos.
  const sample=document.createElement('canvas');sample.width=960;sample.height=540;
  const sampleCtx=sample.getContext('2d',{willReadFrequently:true});
  const mask=document.createElement('canvas');mask.width=450;mask.height=400;
  const maskCtx=mask.getContext('2d');
  function flowerMask(q) {
    sampleCtx.drawImage(presentation,0,0,960,540);
    const src=sampleCtx.getImageData(0,0,960,540).data;
    const w=mask.width,h=mask.height,m=homography(q),candidate=new Uint8Array(w*h),plant=new Uint8Array(w*h);
    const queue=new Int32Array(w*h);let head=0,tail=0;
    for(let y=Math.floor(h*.36);y<h;y++)for(let x=0;x<w*.20;x++) {
      const u=x/(w-1),v=y/(h-1),den=m[6]*u+m[7]*v+1;
      const sx=Math.round((m[0]*u+m[1]*v+m[2])/den/2),sy=Math.round((m[3]*u+m[4]*v+m[5])/den/2);
      const i=(sy*960+sx)*4,r=src[i]/255,g=src[i+1]/255,b=src[i+2]/255;
      const hi=Math.max(r,g,b),lo=Math.min(r,g,b);
      const at=y*w+x;
      candidate[at]=hi>.45&&hi-lo>.22&&lo<.69?1:0;
      if(candidate[at]){plant[at]=1;queue[tail++]=at;}
    }
    while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&candidate[j]&&!plant[j]){plant[j]=1;queue[tail++]=j;}}
    const pixels=maskCtx.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const i=y*w+x;let occluded=0;
      // Feather inside the plant edge; never expose the original dark glass
      // outside petals, which would create a black halo during screen ignition.
      if(plant[i]){
        let neighbors=0;
        for(const j of [i-1,i+1,i-w,i+w])if(j>=0&&j<w*h&&plant[j])neighbors++;
        occluded=neighbors===4?1:.35+neighbors*.14;
      }
      const edge=smooth(0,2,Math.min(x,y,w-1-x,h-1-y));
      pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;
      pixels.data[i*4+3]=Math.round(255*(1-occluded)*edge);
    }
    maskCtx.putImageData(pixels,0,0);
    screen.style.maskImage=screen.style.webkitMaskImage=`url(${mask.toDataURL()})`;
  }

  // Key the current video frame over the complete headline. The occluder moves
  // with the scene, never with the glyph: K becomes whole as it clears the bezel.
  let drawForeground=()=>{};
  const gl=canvas.getContext('webgl',{premultipliedAlpha:true,antialias:false,depth:false});
  if(gl){
    const vs='attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
    const fs=`precision mediump float;varying vec2 v;uniform sampler2D pic,domain;uniform float shift;
      float key(vec3 c){return 1.-smoothstep(.02,.12,c.b-c.r)*smoothstep(.18,.34,c.b);}
      void main(){vec3 c=texture2D(pic,v).rgb;vec2 px=vec2(1.5/1920.,1.5/1080.);float alpha=key(c);
      alpha=min(alpha,key(texture2D(pic,v+vec2(px.x,0.)).rgb));alpha=min(alpha,key(texture2D(pic,v-vec2(px.x,0.)).rgb));
      alpha=min(alpha,key(texture2D(pic,v+vec2(0.,px.y)).rgb));alpha=min(alpha,key(texture2D(pic,v-vec2(0.,px.y)).rgb));
      alpha=smoothstep(.4,.95,alpha)*texture2D(domain,v+vec2(shift,0.)).r;gl_FragColor=vec4(c*alpha,alpha);}`;
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
    const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    const texture=(unit,name)=>{const t=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);for(const [k,v]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,v);gl.uniform1i(gl.getUniformLocation(program,name),unit);return t;};
    const picture=texture(0,'pic'),domainTex=texture(1,'domain');
    const upload=(unit,t,src)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);};
    const domain=new Image();domain.src='assets/media/occlusion-domain.png';
    Promise.all([ready(poster),ready(domain)]).then(()=>{
      upload(1,domainTex,domain);gl.viewport(0,0,1920,1080);
      drawForeground=()=>{
        foregroundPlane.style.opacity=scrollProgress<.36?'1':'0';
        if(scrollProgress>=.36)return;
        upload(0,picture,currentSource===video&&hasFrame?presentation:poster);
        gl.uniform1f(gl.getUniformLocation(program,'shift'),currentSource===video?frameTime*.028:0);
        gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      };
      hero.classList.add('occluder-ready');drawForeground();
    });
  }
  function render(source,p) {
    currentSource=source;scrollProgress=p;
    canvas.style.transform=source===video?video.style.transform:'';
    presentation.style.transform=video.style.transform;
    presentation.style.opacity=source===video&&hasFrame?'1':'0';
    drawForeground();
    const q=corners(frameTime);
    positionScreen(q);
    updateInteraction();
    if(source===video&&frameTime>=3.06&&renderedTime!==frameTime){flowerMask(q);renderedTime=frameTime;}
  }
  video.addEventListener('seeked',()=>{
    frameTime=video.currentTime;
    presentationCtx.drawImage(video,0,0,1920,1080);
    hasFrame=true;
    render(currentSource,scrollProgress);
  });
  video.addEventListener('error',()=>render(poster,scrollProgress));
  window.BloomScene={render};
  ready(poster).then(()=>render(poster,0));
})();
