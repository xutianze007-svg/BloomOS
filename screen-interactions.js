// Enhance the original scene UI in place; all edits stay in this browser.
(() => {
  const screen = document.querySelector('#screen-ui');
  const main = screen.querySelector('.screen-main');
  const board = screen.querySelector('.screen-board');
  const boardTitle = screen.querySelector('.screen-board-title');
  const assistant = screen.querySelector('.screen-assistant');
  const key = 'bloomos-screen-tasks-v1';
  const cards = [...board.querySelectorAll('.screen-card')];
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(key)) || {}; } catch {}
  const tasks = cards.map((card, i) => ({
    id: String(i), title: card.querySelector('h3').firstChild.textContent.trim(),
    description: card.querySelector('p').innerText, done: i >= 2, card
  }));
  if (Array.isArray(saved)) {
    for (const item of saved.slice(0, 100)) {
      if (typeof item.title !== 'string' || typeof item.description !== 'string' || typeof item.id !== 'string') continue;
      let task = tasks.find(t => t.id === item.id);
      if (!task) { task = {id: item.id, card: makeCard()}; tasks.push(task); }
      Object.assign(task, {title:item.title, description:item.description, done:!!item.done});
    }
  }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(tasks.map(({id,title,description,done}) => ({id,title,description,done})))); } catch {}
  }
  function makeCard() {
    const card = document.createElement('article');
    card.className = 'screen-card';
    card.innerHTML = '<div class="screen-card-top"><div><h3></h3><p></p><em>Draft</em></div></div>';
    return card;
  }
  const search = document.createElement('input');
  search.className = 'screen-search'; search.placeholder = '⌕  Search projects, files, or ask anything…';
  search.setAttribute('aria-label', 'Search screen tasks');
  screen.querySelector('.screen-search').replaceWith(search);
  search.addEventListener('input', render);
  function render() {
    for (const task of tasks) {
      const card = task.card;
      card.querySelector('h3').firstChild
        ? card.querySelector('h3').firstChild.textContent = task.title + ' '
        : card.querySelector('h3').append(document.createTextNode(task.title));
      card.querySelector('p').textContent = task.description;
      card.hidden = !(task.title + ' ' + task.description).toLowerCase().includes(search.value.trim().toLowerCase());
      board.children[task.done ? 1 : 0].append(card);
      card.setAttribute('role', 'button'); card.tabIndex = 0;
      card.setAttribute('aria-label', 'Edit ' + task.title);
      card.onclick = () => edit(task);
      card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') {e.preventDefault(); edit(task);} };
    }
    [...board.querySelectorAll('.screen-column-label small')].forEach((label,i) => {
      label.textContent = tasks.filter(t => t.done === !!i).length;
    });
  }
  const panel = document.createElement('section');
  panel.className = 'screen-editor'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label', 'Task details');
  panel.innerHTML = '<form><div class="screen-editor-heading"><strong>Task details</strong><button type="button" aria-label="Close task details">×</button></div><label>Title<input name="title" required maxlength="100"></label><label>Notes<textarea name="notes" rows="5" maxlength="2000"></textarea></label><label class="screen-done"><input name="done" type="checkbox"> Ready to bloom</label><button class="screen-save" type="submit">Save task</button></form>';
  screen.append(panel);
  const form = panel.querySelector('form');
  const shell = screen.querySelector('.screen-shell');
  let editing, returnFocus;
  function close() {panel.hidden = true; shell.inert = false; returnFocus?.focus({preventScroll:true});}
  function edit(task) {
    editing = task; returnFocus = document.activeElement;
    form.elements.title.value = task?.title || '';
    form.elements.notes.value = task?.description || '';
    form.elements.done.checked = task?.done || false;
    panel.hidden = false; shell.inert = true; form.elements.title.focus({preventScroll:true});
  }
  panel.querySelector('[aria-label="Close task details"]').onclick = close;
  panel.addEventListener('keydown', e => {
    if(e.key === 'Escape') {e.stopPropagation(); close();}
    if(e.key === 'Tab') {
      const controls = [...form.querySelectorAll('button,input,textarea')];
      const first = controls[0], last = controls[controls.length-1];
      if(e.shiftKey && document.activeElement === first){e.preventDefault();last.focus();}
      else if(!e.shiftKey && document.activeElement === last){e.preventDefault();first.focus();}
    }
  });
  form.onsubmit = e => {
    e.preventDefault(); const title = form.elements.title.value.trim(); if(!title)return;
    if(!editing){editing = {id:crypto.randomUUID(),card:makeCard()};tasks.push(editing);}
    Object.assign(editing, {title,description:form.elements.notes.value.trim(),done:form.elements.done.checked});
    save(); render(); close();
  };
  const newButton = document.createElement('button'); newButton.textContent = '＋ New';
  newButton.className = 'screen-new'; newButton.onclick = () => edit(null);
  boardTitle.querySelector('span').replaceWith(newButton);
  const alt = document.createElement('div'); alt.className = 'screen-view'; alt.hidden = true;
  board.after(alt);
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const notesKey = 'bloomos-screen-notes-v1';
  const notes = [
    {title:'A voice that feels like us',tag:'Brand & design',icon:'✿',color:'peach',text:'Warm, clear, a little poetic. Speak like a thoughtful teammate. Make space for possibility, and keep every next step simple.',date:'Brand voice · 4 min read'},
    {title:'What our customers taught us',tag:'Research',icon:'◉',color:'sage',text:'People want fewer places to look and more room to think. Keep the thinking beside the work. Make progress visible without adding noise.',date:'Interview synthesis · 6 min read'},
    {title:'The spring launch checklist',tag:'Planning',icon:'☼',color:'butter',text:'01 — Define the story.\n02 — Gather the visual references.\n03 — Draft the campaign.\n04 — Review with the team.\n05 — Launch, reflect, and keep what we learned.',date:'Spring launch · 3 min read'}
  ];
  try {const savedNotes=JSON.parse(localStorage.getItem(notesKey)); if(Array.isArray(savedNotes)) notes.forEach((n,i)=>{if(typeof savedNotes[i]==='string')n.text=savedNotes[i];});} catch {}
  let noteIndex = 0, category = 'All notes', agentIndex = 0;
  const agents = [
    {name:'Bloom assistant',icon:'✣',type:'Your everyday thinking partner',color:'sage',description:'From a blank page to a clear next step. Shape ideas, connect the dots, and give your work a little momentum.',prompts:['Plan our spring launch','Break a big idea into tasks','Write a project brief']},
    {name:'Research companion',icon:'◉',type:'Find the thread in your thinking',color:'peach',description:'Bring scattered observations together. Turn your notes into themes, questions, and opportunities worth exploring.',prompts:['Summarise customer themes','Build an interview guide','Map our opportunities']},
    {name:'Story gardener',icon:'✿',type:'Make every word feel like you',color:'butter',description:'Give your next chapter a fresh perspective. Explore campaign directions and find a story your team can grow together.',prompts:['Draft a campaign story','Explore three headlines','Refine our brand voice']}
  ];
  function renderView(view) {
    if(view===0) {
      const done=tasks.filter(t=>t.done).length, percent=tasks.length?Math.round(done/tasks.length*100):0;
      alt.innerHTML = `<div class="sv-kicker">YOUR WORKSPACE <span>✦ A little progress, every day</span></div>
        <div class="sv-welcome"><div><span class="sv-tag">A NEW SEASON OF IDEAS</span><h3>Make space for<br>your next good idea.</h3><p>Your people, projects, and possibilities.<br>All growing together.</p><button data-open-projects>Explore your projects ↗</button></div><div class="sv-botanical" aria-hidden="true"><img src="assets/media/meadow-flower.png" alt=""><span>Let good work grow.</span></div></div>
        <div class="sv-stats"><div><span>Ideas in motion</span><strong>${tasks.length-done}<small>Room to grow ↗</small></strong></div><div><span>Ready to bloom</span><strong>${done}<small>Small wins add up ✦</small></strong></div><div><span>Launch progress</span><strong>${percent}%<small>Spring launch</small></strong><div class="sv-progress"><i style="width:${percent}%"></i></div></div></div>
        <div class="sv-section-title"><h4>Pick up where you left off</h4><button data-open-projects>View all ↗</button></div><div class="sv-recent">${tasks.slice(0,3).map(t=>`<button data-task="${esc(t.id)}"><span class="sv-file">${t.done?'✓':'▧'}</span><span><b>${esc(t.title)}</b><small>Spring launch · ${t.done?'Ready to bloom':'In progress'}</small></span><span>↗</span></button>`).join('')}</div>
        <div class="sv-bottom-note"><span>✿</span><div><b>A gentle reminder</b><p>You don’t have to do it all today. Just tend to the next good thing.</p></div></div>`;
      alt.querySelectorAll('[data-open-projects]').forEach(b=>b.onclick=()=>screen.querySelector('[data-screen-view="Projects"]').click());
      alt.querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>edit(tasks.find(t=>t.id===b.dataset.task)));
    } else if(view===2) {
      alt.innerHTML=`<div class="sv-kicker">YOUR KNOWLEDGE GARDEN <span>3 notes · One connected story</span></div><div class="sv-section-title"><h4>A home for your thinking</h4><span class="sv-tag">PERSONAL LIBRARY</span></div><div class="sv-filters">${['All notes','Brand & design','Research','Planning'].map(c=>`<button data-category="${c}" class="${category===c?'active':''}">${c}</button>`).join('')}</div><div class="sv-note-grid">${notes.map((n,i)=>category==='All notes'||category===n.tag?`<button data-note="${i}" class="sv-note ${n.color} ${i===noteIndex?'chosen':''}"><span class="sv-note-icon">${n.icon}</span><small>${n.tag}</small><b>${n.title}</b><span>${n.date}</span></button>`:'').join('')}</div><div class="sv-note-detail"><div class="sv-section-title"><span class="sv-tag">${notes[noteIndex].tag}</span><span id="screen-note-state" role="status">Saved in this browser</span></div><h3>${notes[noteIndex].title}</h3><p class="sv-note-caption">A living note. Add what you learn as your work grows.</p><label class="sr-only" for="screen-note-body">Edit note</label><textarea id="screen-note-body" rows="5">${esc(notes[noteIndex].text)}</textarea><div class="sv-note-footer"><span>↔ Linked to Spring launch</span><button id="screen-save-note">Save note ↗</button></div></div>`;
      alt.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;const first=notes.findIndex(n=>category==='All notes'||category===n.tag);noteIndex=first;renderView(2);});
      alt.querySelectorAll('[data-note]').forEach(b=>b.onclick=()=>{noteIndex=Number(b.dataset.note);renderView(2);});
      alt.querySelector('textarea').oninput=()=>{alt.querySelector('#screen-note-state').textContent='Unsaved changes';};
      alt.querySelector('#screen-save-note').onclick=()=>{notes[noteIndex].text=alt.querySelector('textarea').value;try{localStorage.setItem(notesKey,JSON.stringify(notes.map(n=>n.text)));alt.querySelector('#screen-note-state').textContent='All changes saved ✓';}catch{alt.querySelector('#screen-note-state').textContent='Kept for this visit';}};
    } else {
      const agent=agents[agentIndex];
      alt.innerHTML=`<div class="sv-kicker">MEET YOUR GROWING TEAM <span>✦ Thoughtful help, on your terms</span></div><div class="sv-agent-grid">${agents.map((a,i)=>`<button data-agent="${i}" class="sv-agent ${a.color} ${i===agentIndex?'chosen':''}"><span class="sv-agent-icon">${a.icon}</span><b>${a.name}</b><small>${a.type}</small><span class="sv-agent-status">● ${i===agentIndex?'Selected':'Ready to help'}</span></button>`).join('')}</div><section class="sv-agent-detail"><div class="sv-agent-heading"><span class="sv-agent-icon ${agent.color}">${agent.icon}</span><div><h3>${agent.name}</h3><span>YOUR CREATIVE CO-PILOT</span></div><small>Local demo</small></div><p>${agent.description}</p><div class="sv-section-title"><h4>Start with a little inspiration</h4></div><div class="sv-prompts">${agent.prompts.map((p,i)=>`<button data-prompt="${i}"><span>${p}</span>↗</button>`).join('')}</div><form class="sv-agent-form"><label for="screen-agent-input">What would you like to grow?</label><div><input id="screen-agent-input" placeholder="Bring an idea. We’ll find a starting point." required maxlength="300"><button aria-label="Generate sample response">↗</button></div></form><div class="sv-agent-reply" role="status" hidden></div><footer>✧ Sample responses · No external AI connection</footer></section>`;
      alt.querySelectorAll('[data-agent]').forEach(b=>b.onclick=()=>{agentIndex=Number(b.dataset.agent);renderView(3);});
      const input=alt.querySelector('input');
      alt.querySelectorAll('[data-prompt]').forEach(b=>b.onclick=()=>{input.value=agent.prompts[Number(b.dataset.prompt)];input.focus({preventScroll:true});});
      alt.querySelector('form').onsubmit=e=>{e.preventDefault();if(!input.value.trim())return;const reply=alt.querySelector('.sv-agent-reply');reply.hidden=false;reply.replaceChildren();const title=document.createElement('b');title.textContent=`A starting point for “${input.value.trim()}”`;const list=document.createElement('ol');const steps=agentIndex===1?['Gather observations and group related notes.','Name three themes and the evidence behind each.','Turn the strongest insight into a question to explore.']:agentIndex===2?['Choose the feeling you want your audience to remember.','Draft three directions in your warm, clear brand voice.','Share a first version and refine the story together.']:['Define the outcome and gather your references.','Break the idea into three small, clear tasks.','Review with your team and choose the next step.'];steps.forEach(step=>{const li=document.createElement('li');li.textContent=step;list.append(li);});reply.append(title,list);reply.scrollIntoView({block:'nearest',behavior:'smooth'});};
    }
  }
  const navs = [...screen.querySelectorAll('.screen-sidebar > div:not(.screen-logo)')];
  const views = ['Home','Projects','Knowledge','Agents'];
  const breadcrumb = document.createElement('span');
  breadcrumb.className = 'sv-breadcrumb'; breadcrumb.hidden = true;
  search.after(breadcrumb);
  navs.forEach((node,i) => {
    const button = document.createElement('button'); button.textContent = node.textContent;
    button.className = node.className; button.dataset.screenView = views[i]; node.replaceWith(button);
    button.onclick = () => {
      screen.querySelectorAll('[data-screen-view]').forEach(b => {b.classList.toggle('selected',b===button); b.setAttribute('aria-pressed',String(b===button));});
      const projects = i === 1; board.hidden = boardTitle.hidden = !projects; alt.hidden = projects;
      main.querySelector('h2').textContent = ['A fresh day. Room to grow.', 'A little focus. A lot of possibility.', 'Good ideas take root here.', 'A little help. A lot of possibility.'][i];
      assistant.hidden = !projects;
      search.hidden = !projects;
      breadcrumb.hidden = projects;
      breadcrumb.textContent = 'Workspace  /  ' + views[i];
      main.scrollTop = 0;
      if (!projects) renderView(i);

    };
    button.setAttribute('aria-pressed',String(i===1));
  });
  const composer = document.createElement('form'); composer.className = 'screen-composer';
  composer.innerHTML = '<input aria-label="Ask Bloom assistant" placeholder="Turn these ideas into a launch plan…" required><button aria-label="Create sample plan">↗</button>';
  assistant.querySelector('div').replaceWith(composer);
  const reply = document.createElement('p'); reply.className = 'screen-reply'; reply.hidden = true; reply.setAttribute('role','status'); assistant.append(reply);
  composer.onsubmit = e => {
    e.preventDefault(); const input = composer.querySelector('input'); if(!input.value.trim())return;
    reply.textContent = `Plan for “${input.value.trim().slice(0,80)}”: Gather references → draft the story → review and share. Sample response · Saved work stays in this browser.`;
    reply.hidden = false; input.value = '';
  };
  render();
})();
