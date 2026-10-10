// ─── BloomOS site: hash router, marketing pages, demo account flow, workspace ───
// Everything is local: the "account" is a demo session in localStorage; no data leaves the browser.
(()=>{
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={
 get(k,f){try{const v=JSON.parse(localStorage.getItem(k));return v??f;}catch{return f;}},
 set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}},
 del(k){try{localStorage.removeItem(k);}catch{}}
};
const KEYS={session:'bloomos-demo-session',tasks:'bloomos-demo-tasks',intent:'bloomos-demo-intent'};
const PLANS={seed:'Seed',bloom:'Bloom',garden:'Garden'};
const ACCENTS={peach:'#f1b48f',sage:'#a9bf92',butter:'#f0cf73',rose:'#e7a3a8'};
const TEMPLATES={
 creative:{label:'Studio project',tasks:[['Kick-off & brief','Align on goals, audience and timeline with the client.','Draft'],['Moodboard','Collect references and a first visual direction.','Design'],['Client review','Share concepts and gather one round of feedback.','Review']]},
 product:{label:'Product cycle',tasks:[['Research synthesis','Tag interview notes into three to five themes.','Research'],['Opportunity map','Rank problems by impact and effort.','Draft'],['Spec & design','Write the first spec for the top opportunity.','Design']]},
 marketing:{label:'Launch campaign',tasks:[['Campaign story','One sentence that explains why this launch matters.','Draft'],['Channel plan','Choose channels, owners and dates.','Plan'],['Content production','Write, design and schedule the launch content.','Design']]},
 founders:{label:'Company garden',tasks:[['Quarterly goals','Three goals and how we will know they bloomed.','Plan'],['Hiring pipeline','Open roles, candidates and next steps.','Draft'],['Weekly review','A calm look at what grew and what needs care.','Review']]}
};
const USE_TO_TEMPLATE={launch:'marketing',content:'marketing',client:'creative',research:'product',company:'founders',personal:'founders'};
const TITLES={home:'BloomOS — Make work bloom.',product:'Product — BloomOS',solutions:'Solutions — BloomOS',pricing:'Pricing — BloomOS',login:'Log in — BloomOS',signup:'Get started — BloomOS',workspace:'Workspace — BloomOS'};

let session=store.get(KEYS.session,null);
const intent=Object.assign({plan:'seed',template:null},store.get(KEYS.intent,{}));
const saveIntent=()=>store.set(KEYS.intent,intent);

// ── Footer (shared) ──
const footerTpl=$('#site-footer-tpl');
$$('[data-footer]').forEach(el=>el.replaceWith(footerTpl.content.cloneNode(true)));

// ── Router ──
const pages=Object.fromEntries($$('[data-page]').map(p=>[p.dataset.page,p]));
const menu=$('#mobile-menu'), menuToggle=$('#menu-toggle');
const heroVideo=$('#garden-video');
let route='home', heroWasPlaying=false;
function closeMenu(){menu.hidden=true;menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Open navigation');}
menuToggle.addEventListener('click',()=>{menu.hidden=!menu.hidden;menuToggle.setAttribute('aria-expanded',String(!menu.hidden));menuToggle.setAttribute('aria-label',menu.hidden?'Open navigation':'Close navigation');});
function parseRoute(){const r=location.hash.replace(/^#\/?/,'').split(/[?/]/)[0];return pages[r]?r:'home';}
function go(r){if(parseRoute()===r)render();else location.hash='#/'+(r==='home'?'':r);}
function render(){
 const next=parseRoute();
 if(next===route&&document.body.dataset.route===next)return;
 // Pause the hero garden when leaving it; resume when coming back.
 if(route==='home'&&next!=='home'&&heroVideo){heroWasPlaying=!heroVideo.paused&&!heroVideo.ended;heroVideo.pause();}
 if(next==='home'&&route!=='home'&&heroVideo&&heroWasPlaying)heroVideo.play().catch(()=>{});
 route=next;
 for(const [name,el] of Object.entries(pages))el.hidden=name!==next;
 document.body.dataset.route=next;
 document.title=TITLES[next];
 $$('[data-nav]').forEach(a=>{if(a.dataset.nav===next)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 closeMenu();
 window.scrollTo(0,0);
 if(next==='signup')enterSignup();
 if(next==='login')showLogin();
 if(next==='workspace')enterWorkspace();
 const heading=pages[next].querySelector('[tabindex="-1"]');
 if(heading&&next!=='home')heading.focus({preventScroll:true});
}
window.addEventListener('hashchange',render);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();$('#user-pop').hidden=true;$('#user-button').setAttribute('aria-expanded','false');}});

// ── Session state in the header ──
function syncSession(){
 document.body.classList.toggle('is-member',!!session);
}

// ── Tabs (Product features, Solutions teams) ──
$$('[data-tabs]').forEach(group=>{
 const tabs=$$('[role=tab]',group);
 const select=tab=>{tabs.forEach(t=>{const on=t===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;$('#'+t.getAttribute('aria-controls')).hidden=!on;});};
 tabs.forEach((t,i)=>{
  t.addEventListener('click',()=>select(t));
  t.addEventListener('keydown',e=>{
   const d={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[e.key];if(!d)return;
   e.preventDefault();const n=tabs[(i+d+tabs.length)%tabs.length];select(n);n.focus();
  });
 });
});

// ── Pricing ──
$$('[data-billing]').forEach(b=>b.addEventListener('click',()=>{
 const yearly=b.dataset.billing==='yearly';
 $$('[data-billing]').forEach(x=>x.setAttribute('aria-checked',String(x===b)));
 $$('[data-price-monthly]').forEach(p=>p.textContent=yearly?p.dataset.priceYearly:p.dataset.priceMonthly);
 $$('.plan .price span').forEach(s=>{if(s.textContent!=='forever')s.textContent=yearly?'per member / month, billed yearly':'per member / month';});
}));
$$('[data-plan]').forEach(b=>b.addEventListener('click',()=>{
 intent.plan=b.dataset.plan;saveIntent();
 if(session){session.plan=intent.plan;store.set(KEYS.session,session);go('workspace');}else go('signup');
}));
// ── Solutions templates ──
$$('[data-template]').forEach(b=>b.addEventListener('click',()=>{
 intent.template=b.dataset.template;saveIntent();
 if(session){seedTasks(intent.template,false);intent.template=null;saveIntent();go('workspace');}else go('signup');
}));

// ── Form helpers ──
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function setError(input,msg){const f=input.closest('.field');if(!f)return!msg;f.classList.toggle('invalid',!!msg);f.querySelector('.field-error').textContent=msg||'';input.setAttribute('aria-invalid',msg?'true':'false');return !msg;}
function checkEmail(i){const v=i.value.trim();return setError(i,!v?'Please enter your email.':!EMAIL.test(v)?'That email doesn’t look quite right.':'');}
function checkPassword(i){return setError(i,i.value.length<6?'Use at least 6 characters.':'');}
$$('.pw-toggle').forEach(b=>b.addEventListener('click',()=>{const i=b.previousElementSibling,show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'Hide':'Show';b.setAttribute('aria-label',show?'Hide password':'Show password');}));
const nameFromEmail=e=>{const n=e.split('@')[0].replace(/[._-]+/g,' ').trim();return n?n.replace(/\b\w/g,c=>c.toUpperCase()):'Friend';};

// ── Log in ──
const loginForm=$('#login-form'), resetForm=$('#reset-form');
function showLogin(){resetForm.hidden=true;loginForm.hidden=false;$('#login-note').textContent='';}
$('#forgot-link').addEventListener('click',()=>{loginForm.hidden=true;resetForm.hidden=false;resetForm.email.value=loginForm.email.value;resetForm.querySelector('.form-note').textContent='';resetForm.querySelector('h1').focus();});
$('#back-to-login').addEventListener('click',showLogin);
resetForm.addEventListener('submit',e=>{e.preventDefault();if(!checkEmail(resetForm.email))return;resetForm.querySelector('.form-note').textContent=`If ${resetForm.email.value.trim()} has an account, a reset link would be on its way. (Demo: no email is sent.)`;});
loginForm.email.addEventListener('blur',()=>loginForm.email.value&&checkEmail(loginForm.email));
loginForm.addEventListener('submit',e=>{
 e.preventDefault();
 const ok=[checkEmail(loginForm.email),checkPassword(loginForm.password)].every(Boolean);
 if(!ok){loginForm.querySelector('[aria-invalid=true]').focus();return;}
 const email=loginForm.email.value.trim();
 const prev=store.get(KEYS.session,null);
 session=prev&&prev.email===email?prev:{name:nameFromEmail(email),email,workspace:`${nameFromEmail(email).split(' ')[0]}’s garden`,plan:intent.plan||'seed',accent:'peach',team:'1',uses:[]};
 store.set(KEYS.session,session);syncSession();
 const btn=loginForm.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Logging in…';
 setTimeout(()=>{btn.disabled=false;btn.textContent='Log in';loginForm.reset();loginForm.remember.checked=true;go('workspace');},500);
});
$$('[data-guest]').forEach(a=>a.addEventListener('click',()=>{session=null;store.del(KEYS.session);syncSession();}));

// ── Sign up + onboarding ──
const form=$('#signup-form'), steps=$$('.step',form), stepper=$$('.stepper li',form);
let step=1;
const ART=['assets/media/bloom-start-v2.webp','assets/media/bloom-start-v2.webp','assets/media/bloom-end-v2.webp'];
const ART_COPY=['“Every garden starts<br>with a single seed.”','“Tell us what<br>you’d like to grow.”','“Almost in bloom.”'];
function showStep(n,focus=true){
 step=n;
 steps.forEach(s=>s.hidden=+s.dataset.step!==n);
 stepper.forEach((li,i)=>{li.classList.toggle('is-current',i+1===n);li.classList.toggle('is-done',i+1<n);if(i+1===n)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
 $('#signup-art').src=ART[n-1];$('#signup-art-copy').innerHTML=ART_COPY[n-1];
 if(n===3&&!form.workspace.value){const first=(form.elements.name.value.trim().split(' ')[0]||'My');form.workspace.value=`${first}’s garden`;}
 updatePreview();
 if(focus)steps[n-1].querySelector('.page-title').focus();
}
function enterSignup(){
 $('#planting').hidden=true;
 $('#plan-note').textContent=`${PLANS[intent.plan]||'Seed'} plan`;
 if(intent.template){const use=Object.entries(USE_TO_TEMPLATE).find(([,t])=>t===intent.template);if(use)form.querySelector(`[name=use][value=${use[0]}]`).checked=true;}
 showStep(1,false);
}
function validateStep(n){
 if(n===1){const ok=[setError(form.elements.name,form.elements.name.value.trim()?'':'Please tell us your name.'),checkEmail(form.email),checkPassword(form.password)].every(Boolean);if(!ok)steps[0].querySelector('[aria-invalid=true]').focus();return ok;}
 if(n===2){const any=$$('[name=use]:checked',form).length>0;$('#use-error').textContent=any?'':'Choose at least one, so we can plant the right starter tasks.';return any;}
 if(n===3){const ok=setError(form.workspace,form.workspace.value.trim()?'':'Give your workspace a name.');if(!ok)form.workspace.focus();return ok;}
 return true;
}
$$('[data-next]',form).forEach(b=>b.addEventListener('click',()=>{if(validateStep(step))showStep(step+1);}));
$$('[data-back]',form).forEach(b=>b.addEventListener('click',()=>showStep(step-1)));
form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName==='INPUT'&&step<3){e.preventDefault();if(validateStep(step))showStep(step+1);}});
form.addEventListener('change',e=>{if(e.target.name==='use')$('#use-error').textContent='';updatePreview();});
form.workspace.addEventListener('input',updatePreview);
form.password.addEventListener('input',()=>{
 const v=form.password.value;let s=0;if(v.length>=6)s++;if(v.length>=10)s++;if(/[A-Z]/.test(v)&&/[a-z]/.test(v))s++;if(/\d|[^\w]/.test(v))s++;
 const bar=$('.strength i',form);bar.style.width=`${s*25}%`;bar.style.background=['#c0583c','#c0583c','#e0a84a','#9db27f','#4f7d5c'][s];
});
function updatePreview(){
 const accent=form.accent.value||'peach';
 $('#ws-preview').style.setProperty('--accent',ACCENTS[accent]);
 $('#ws-preview-name').textContent=form.workspace.value.trim()||'My workspace';
 const team=form.team.value;
 $('#ws-preview-meta').textContent=`${PLANS[intent.plan]||'Seed'} plan · ${team==='1'?'Just me':team+' people'}`;
}
form.addEventListener('submit',e=>{
 e.preventDefault();if(!validateStep(3))return;
 const uses=$$('[name=use]:checked',form).map(i=>i.value);
 session={name:form.elements.name.value.trim(),email:form.email.value.trim(),workspace:form.workspace.value.trim(),plan:intent.plan||'seed',accent:form.accent.value,team:form.team.value,uses};
 store.set(KEYS.session,session);syncSession();
 seedTasks(intent.template||USE_TO_TEMPLATE[uses[0]]||'marketing',true);
 intent.template=null;saveIntent();
 steps.forEach(s=>s.hidden=true);$('.stepper',form).hidden=true;$('#planting').hidden=false;
 setTimeout(()=>{form.reset();$('.stepper',form).hidden=false;showStep(1,false);go('workspace');},matchMedia('(prefers-reduced-motion: reduce)').matches?100:1400);
});

// ── Workspace ──
const DEFAULT_TASKS=[
 {id:'brand',title:'Brand direction',description:'A visual world for a fresh start.',tag:'Design',done:false,botanical:true},
 {id:'story',title:'Launch story',description:'A campaign that celebrates creativity in everyday work.',tag:'Draft',done:false},
 {id:'research',title:'Research brief',description:'Customer insights, key themes, and opportunity areas.',tag:'Complete',done:true}
];
const validTasks=t=>Array.isArray(t)&&t.length<200&&t.every(x=>typeof x.id==='string'&&typeof x.title==='string'&&typeof x.done==='boolean'&&typeof x.description==='string'&&typeof x.tag==='string');
let tasks=store.get(KEYS.tasks,null);if(!validTasks(tasks))tasks=DEFAULT_TASKS.map(t=>({...t}));
let boardName=store.get('bloomos-demo-board','Spring launch');
const saveTasks=()=>store.set(KEYS.tasks,tasks);
function seedTasks(key,replace){
 const tpl=TEMPLATES[key];if(!tpl)return;
 const fresh=tpl.tasks.map(([title,description,tag],i)=>({id:`${key}-${i}-${Date.now()}`,title,description,tag,done:false,botanical:i===0}));
 tasks=replace?fresh:[...fresh,...tasks];boardName=tpl.label;store.set('bloomos-demo-board',boardName);saveTasks();
}
const searchInput=$('#task-search');
function renderTasks(){
 const q=searchInput.value.toLowerCase().trim();
 const visible=tasks.filter(t=>(t.title+' '+t.description).toLowerCase().includes(q));
 for(const done of [false,true]){
  const c=$(done?'#done-tasks':'#progress-tasks');c.replaceChildren();
  for(const task of visible.filter(t=>t.done===done)){
   const a=document.createElement('article');a.className='task';
   const top=document.createElement('div');top.className='task-top';
   if(task.botanical){const s=document.createElement('span');s.className='botanical';s.innerHTML=window.icon?window.icon('sprout'):'';s.setAttribute('aria-hidden','true');top.append(s);}
   const text=document.createElement('div');
   const h=document.createElement('h5');h.textContent=task.title;
   const p=document.createElement('p');p.textContent=task.description;
   const tag=document.createElement('span');tag.className='task-tag '+(done?'complete':task.tag==='Draft'?'draft':'');tag.textContent=done?'Complete':task.tag;
   text.append(h,p,tag);top.append(text);
   const bottom=document.createElement('div');bottom.className='task-bottom';
   const label=document.createElement('span');label.textContent=done?'Ready to bloom':'Room to grow';
   const tg=document.createElement('button');tg.className='task-toggle';tg.innerHTML=(window.icon?window.icon(done?'rotate-ccw':'check'):'')+(done?' Reopen':' Complete');tg.setAttribute('aria-label',(done?'Reopen ':'Complete ')+task.title);
   tg.addEventListener('click',()=>{task.done=!task.done;saveTasks();renderTasks();});
   bottom.append(label,tg);a.append(top,bottom);c.append(a);
  }
 }
 $('#progress-count').textContent=tasks.filter(t=>!t.done).length;
 $('#done-count').textContent=tasks.filter(t=>t.done).length;
 $('#empty-search').hidden=visible.length>0;
 if($('[data-view=projects]').classList.contains('selected'))$('#view-title').firstChild.textContent=boardName+' ';
}
searchInput.addEventListener('input',renderTasks);
const taskForm=$('#task-form');
$('#new-task').addEventListener('click',()=>{taskForm.hidden=!taskForm.hidden;if(!taskForm.hidden)$('#task-title').focus();});
taskForm.addEventListener('submit',e=>{
 e.preventDefault();const input=$('#task-title');const title=input.value.trim();if(!title)return;
 tasks.push({id:(crypto.randomUUID?crypto.randomUUID():String(Date.now())),title,description:'A fresh idea, ready to take shape.',tag:'Draft',done:false});
 saveTasks();searchInput.value='';renderTasks();input.value='';taskForm.hidden=true;
});
function viewCopy(view){
 const first=session?session.name.split(' ')[0]:'there';
 return {
  home:[`Good to see you, ${first}.`,`${tasks.filter(t=>!t.done).length} tasks are growing and ${tasks.filter(t=>t.done).length} are ready to bloom. Open Projects to tend them, or ask the assistant for a plan.`],
  knowledge:['Keep your inspiration close.','Sample notes: warm ivory, forest green, and the feeling of a fresh start. A thoughtful launch starts with a clear story and a little space to explore.'],
  agents:['Meet your Bloom assistant.','Try the composer below to create a three-step plan. This is a scripted demonstration of the interface, with no external AI connection.']
 }[view];
}
let currentView='projects';
function showView(view){
 currentView=view;const projects=view==='projects';
 $$('[data-view]').forEach(b=>b.classList.toggle('selected',b.dataset.view===view));
 $('#board').hidden=!projects;$('#new-task').hidden=!projects;$('#empty-search').hidden=true;taskForm.hidden=true;
 const alt=$('#alternative-view');alt.hidden=projects;
 $('#view-title').firstChild.textContent=(projects?boardName:$(`[data-view=${view}] span`).textContent)+' ';
 if(!projects){const [t,c]=viewCopy(view);alt.replaceChildren();const h=document.createElement('h4');h.textContent=t;const p=document.createElement('p');p.textContent=c;alt.append(h,p);}else renderTasks();
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
$('#assistant-form').addEventListener('submit',e=>{
 e.preventDefault();const input=$('#assistant-input');if(!input.value.trim())return;
 const r=$('#assistant-reply');r.hidden=false;
 r.textContent=`A small plan for “${input.value.trim().slice(0,60)}”:\n1. Gather the references and define the story.\n2. Turn your direction into a first draft.\n3. Review together, refine, and share.\n\nSample response · Your text stays in this browser.`;
 input.value='';
});
// User menu
const userBtn=$('#user-button'),userPop=$('#user-pop');
userBtn.addEventListener('click',()=>{userPop.hidden=!userPop.hidden;userBtn.setAttribute('aria-expanded',String(!userPop.hidden));});
document.addEventListener('click',e=>{if(!e.target.closest('.user-menu')){userPop.hidden=true;userBtn.setAttribute('aria-expanded','false');}});
$('#sign-out').addEventListener('click',()=>{session=null;store.del(KEYS.session);syncSession();userPop.hidden=true;go('home');});
$('#reset-demo').addEventListener('click',()=>{tasks=DEFAULT_TASKS.map(t=>({...t}));boardName='Spring launch';store.del('bloomos-demo-board');saveTasks();userPop.hidden=true;showView('projects');});
function enterWorkspace(){
 const page=pages.workspace;
 const accent=ACCENTS[session?.accent]||ACCENTS.peach;
 page.style.setProperty('--accent',accent);
 $('#app-ws-name').textContent=session?session.workspace:'BloomOS Workspace';
 $('#app-mode-badge').textContent=session?`${PLANS[session.plan]||'Seed'} plan · demo`:'Interactive demo';
 $('#guest-banner').hidden=!!session;
 userBtn.textContent=session?session.name.trim().charAt(0).toUpperCase():'G';
 userBtn.setAttribute('aria-label',session?`Account menu for ${session.name}`:'Guest menu');
 $('#user-name').textContent=session?session.name:'Guest';
 $('#user-email').textContent=session?session.email:'Exploring the demo';
 $('#user-plan').textContent=session?`${PLANS[session.plan]||'Seed'} plan · Change`:'See plans';
 $('#sign-out').textContent=session?'Sign out':'Leave demo';
 $('#workspace-title').innerHTML=session?`Welcome to ${escapeHtml(session.workspace)}.`:'A little focus.<br class="mobile-only"> A lot of possibility.';
 showView('projects');
}
const escapeHtml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ── Boot ──
syncSession();
route=null;render();
})();
