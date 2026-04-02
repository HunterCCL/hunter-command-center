// ============================================================
// PROJECTS
// ============================================================
let closingNoteProjectId=null;
let editProjectId=null;

function renderProjects() {
  const projects=DB.get('projects');
  const grid=document.getElementById('projects-grid');
  if(!projects.length){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📁</div><h3>No projects yet</h3><p>Add a project to start tracking.</p></div>`;
    return;
  }
  const statusLabels={new:'New',inprogress:'In Progress',quoted:'Quoted',done:'Done'};
  grid.innerHTML=projects.map(p=>{
    const notes=p.notes||[];
    return `<div class="project-card" style="cursor:pointer" onclick="openProjectDetail('${p.id}')">
      <div class="project-color-bar" style="background:${p.color}"></div>
      <div class="project-snapshot">
        <div class="project-snapshot-header">
          <div><div class="project-name">${p.name}</div><div class="project-customer">${p.customer||''}</div></div>
          <span class="status-badge status-${p.status}">${statusLabels[p.status]||p.status}</span>
        </div>
        ${p.desc?`<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;line-height:1.4">${p.desc}</div>`:''}
        ${p.blocker?`<div class="project-blocker">⚠️ ${p.blocker}</div>`:''}
        ${p.next?`<div class="project-next">→ ${p.next}</div>`:''}
      </div>
      <div class="project-detail">
        <div class="project-detail-toggle" onclick="toggleProjectNotes('${p.id}')">
          <span>Notes log ${notes.length?'('+notes.length+')':''}</span>
          <span id="proj-toggle-${p.id}">▼</span>
        </div>
        <div id="proj-notes-${p.id}" style="display:none">
          <div class="project-notes-log">
            ${notes.length===0?'<div style="font-size:11px;color:var(--text-muted)">No notes yet.</div>':
              [...notes].reverse().map(n=>`<div class="note-entry"><div class="note-date">${formatDate(n.date)}</div>${n.text}</div>`).join('')}
          </div>
          <div style="display:flex;gap:6px;margin-bottom:10px">
            <input type="text" id="note-input-${p.id}" placeholder="Quick note..." style="flex:1;background:var(--accent);border:1px solid var(--border);border-radius:6px;padding:7px 10px;color:var(--text);font-size:11px;font-family:var(--font-body);outline:none">
            <button class="btn btn-primary btn-sm" onclick="addProjectNote('${p.id}')">Add</button>
          </div>
        </div>
        <div class="project-actions">
          <button class="btn btn-ghost btn-sm" onclick="copyProjectCard('${p.id}',event)">📋 Copy to Claude</button>
          <button class="btn btn-ghost btn-sm" onclick="editProjectCard('${p.id}',event)">Edit</button>
          ${p.status!=='done'?`<button class="btn btn-ghost btn-sm" onclick="archiveProjectCard('${p.id}',event)">Archive</button>`:''}
        </div>
      </div>
    </div>`;
  }).join('');
  lastProjectId=null;
}

function toggleProjectNotes(id) {
  const el=document.getElementById('proj-notes-'+id); const toggle=document.getElementById('proj-toggle-'+id);
  if(el.style.display==='none'){el.style.display='block';toggle.textContent='▲';lastProjectId=id;}
  else{el.style.display='none';toggle.textContent='▼';}
}

function addProjectNote(id) {
  const input=document.getElementById('note-input-'+id); const text=input.value.trim(); if(!text)return;
  const projects=DB.get('projects'); const idx=projects.findIndex(p=>p.id===id); if(idx===-1)return;
  if(!projects[idx].notes)projects[idx].notes=[];
  projects[idx].notes.push({date:today(),text});
  DB.set('projects',projects); input.value=''; renderProjects(); showToast('Note saved');
}

function openProjectModal(id=null) {
  editProjectId=id;
  document.getElementById('project-modal-title').textContent=id?'Edit Project':'New Project';
  if(id){
    const p=DB.get('projects').find(x=>x.id===id); if(p){
      document.getElementById('proj-name').value=p.name;
      document.getElementById('proj-customer').value=p.customer||'';
      document.getElementById('proj-status').value=p.status;
      document.getElementById('proj-color').value=p.color||'#4a90d9';
      document.getElementById('proj-desc').value=p.desc||'';
      document.getElementById('proj-blocker').value=p.blocker||'';
      document.getElementById('proj-next').value=p.next||'';
      document.getElementById('proj-deadline').value=p.deadline||'';
    }
  } else {
    ['proj-name','proj-customer','proj-desc','proj-blocker','proj-next'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('proj-status').value='new';
    document.getElementById('proj-color').value='#4a90d9';
    document.getElementById('proj-deadline').value='';
  }
  openModal('project-modal');
}

function saveProject() {
  const name=document.getElementById('proj-name').value.trim(); if(!name){showToast('Project name required');return;}
  const projects=DB.get('projects');
  const data={name,customer:document.getElementById('proj-customer').value.trim(),status:document.getElementById('proj-status').value,
    color:document.getElementById('proj-color').value,desc:document.getElementById('proj-desc').value.trim(),
    blocker:document.getElementById('proj-blocker').value.trim(),next:document.getElementById('proj-next').value.trim(),deadline:document.getElementById('proj-deadline').value||''};
  if(editProjectId){
    const idx=projects.findIndex(p=>p.id===editProjectId); if(idx!==-1)projects[idx]={...projects[idx],...data};
  } else { projects.push({id:uid(),created:today(),notes:[],...data}); }
  DB.set('projects',projects); closeModal('project-modal'); renderProjects(); updateBadges();
  showToast(editProjectId?'Project updated':'Project added');
}

function archiveProject(id) {
  const projects=DB.get('projects'); const idx=projects.findIndex(p=>p.id===id);
  if(idx!==-1)projects[idx].status='done';
  DB.set('projects',projects); renderProjects(); updateBadges(); showToast('Project archived');
}

function copyProjectContext(id) {
  const p=DB.get('projects').find(x=>x.id===id); if(!p)return;
  const notes=(p.notes||[]).slice(-3).map(n=>`[${n.date}] ${n.text}`).join('\n');
  const context=`PROJECT CONTEXT — ${p.name}\nCustomer: ${p.customer||'N/A'}\nStatus: ${p.status}\nWhat they need: ${p.desc||'N/A'}\nBlocker: ${p.blocker||'None'}\nNext action: ${p.next||'None'}\n\nRecent notes:\n${notes||'None'}`;
  navigator.clipboard.writeText(context).then(()=>showToast('Project context copied'));
}

function showClosingNote(projectId) {
  const p=DB.get('projects').find(x=>x.id===projectId); if(!p)return;
  closingNoteProjectId=projectId;
  document.getElementById('closing-project-name').textContent=p.name;
  document.getElementById('closing-note-text').value='';
  document.getElementById('closing-note-banner').classList.add('show');
}

function dismissClosingNote() { document.getElementById('closing-note-banner').classList.remove('show'); closingNoteProjectId=null; }

function saveClosingNote() {
  const text=document.getElementById('closing-note-text').value.trim();
  if(!text||!closingNoteProjectId){dismissClosingNote();return;}
  const projects=DB.get('projects'); const idx=projects.findIndex(p=>p.id===closingNoteProjectId);
  if(idx!==-1){if(!projects[idx].notes)projects[idx].notes=[];projects[idx].notes.push({date:today(),text});DB.set('projects',projects);}
  dismissClosingNote(); showToast('Note saved');
}


// ============================================================
// PROJECT DETAIL SCREEN
// ============================================================
let currentDetailProjectId = null;

function openProjectDetail(id) {
  currentDetailProjectId = id;
  navigate('project-detail');
}

function renderProjectDetail() {
  const id = currentDetailProjectId;
  if (!id) { navigate('projects'); return; }
  const p = DB.get('projects').find(x => x.id === id);
  if (!p) { navigate('projects'); return; }

  // Reset show-completed checkbox each time a project is opened
  const showDoneChk = document.getElementById('pds-show-completed');
  if (showDoneChk) showDoneChk.checked = false;

  document.getElementById('pds-topbar-title').textContent = p.name;
  const custEl = document.getElementById('pds-customer');
  if (custEl) custEl.textContent = p.customer || '';
  document.getElementById('pds-desc').value = p.desc || '';
  document.getElementById('pds-blocker').value = p.blocker || '';
  document.getElementById('pds-next').value = p.next || '';

  // Status badge
  const statusLabels = {new:'New',inprogress:'In Progress',quoted:'Quoted',done:'Done'};
  const sb = document.getElementById('pds-status-badge');
  sb.textContent = statusLabels[p.status] || p.status;
  sb.className = 'status-badge status-' + p.status;

  // Deadline badge
  const db = document.getElementById('pds-deadline-badge');
  if (p.deadline) {
    const days = daysUntil(p.deadline);
    db.style.display = 'block';
    db.textContent = days < 0 ? 'Overdue' : days + 'd to deadline';
    db.className = 'pds-deadline' + (days <= 7 ? ' urgent' : '');
  } else { db.style.display = 'none'; }

  // Where You Left Off — show last note automatically
  const notes = p.notes || [];
  const wloEl = document.getElementById('pds-wlo-text');
  if (notes.length) {
    const last = notes[notes.length - 1];
    wloEl.textContent = '[' + formatDate(last.date) + '] ' + last.text;
    wloEl.style.color = 'var(--text-dim)';
  } else {
    wloEl.textContent = 'No notes yet. Add your first note below to start tracking progress.';
    wloEl.style.color = 'var(--text-muted)';
  }

  renderMilestones(p);
  renderPDSLinkedTasks(p);
  renderPDSLinkedAccounts(p);
  renderPDSNotesLog(p);
}

function saveSnapshotField(field, value) {
  const projects = DB.get('projects');
  const idx = projects.findIndex(p => p.id === currentDetailProjectId);
  if (idx === -1) return;
  projects[idx][field] = value;
  DB.set('projects', projects);
  showToast('Saved');
}

// ── MILESTONES ──
function renderMilestones(p) {
  const milestones = p.milestones || [];
  const done = milestones.filter(m => m.done).length;
  document.getElementById('pds-milestone-progress').textContent = done + '/' + milestones.length + ' done';

  const list = document.getElementById('pds-milestones-list');
  if (!milestones.length) {
    list.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">No milestones yet. Add key checkpoints for this project.</div>';
    return;
  }
  list.innerHTML = milestones.map((m, i) => `
    <div class="milestone-item">
      <div class="milestone-check ${m.done ? 'done' : ''}" onclick="toggleMilestone(${i})">${m.done ? '✓' : ''}</div>
      <div class="milestone-name ${m.done ? 'done' : ''}">${m.name}</div>
      <button class="milestone-delete" onclick="deleteMilestone(${i})">✕</button>
    </div>`).join('');
}

function addMilestone() {
  const input = document.getElementById('milestone-input');
  const name = input.value.trim();
  if (!name) return;
  const projects = DB.get('projects');
  const idx = projects.findIndex(p => p.id === currentDetailProjectId);
  if (idx === -1) return;
  if (!projects[idx].milestones) projects[idx].milestones = [];
  projects[idx].milestones.push({ name, done: false });
  DB.set('projects', projects);
  input.value = '';
  renderMilestones(projects[idx]);
  showToast('Milestone added');
}

function toggleMilestone(i) {
  const projects = DB.get('projects');
  const idx = projects.findIndex(p => p.id === currentDetailProjectId);
  if (idx === -1) return;
  projects[idx].milestones[i].done = !projects[idx].milestones[i].done;
  DB.set('projects', projects);
  renderMilestones(projects[idx]);
}

function deleteMilestone(i) {
  const projects = DB.get('projects');
  const idx = projects.findIndex(p => p.id === currentDetailProjectId);
  if (idx === -1) return;
  projects[idx].milestones.splice(i, 1);
  DB.set('projects', projects);
  renderMilestones(projects[idx]);
}

// ── LINKED TASKS ──
function renderPDSLinkedTasks(p) {
  if (!p) return;
  const allTasks = DB.get('tasks').filter(t => t.project === p.name);
  const showDoneChk = document.getElementById('pds-show-completed');
  const showCompleted = showDoneChk ? showDoneChk.checked : false;
  const displayTasks = showCompleted ? allTasks : allTasks.filter(t => !t.completed);
  const openCount = allTasks.filter(t => !t.completed).length;
  const doneCount = allTasks.filter(t => t.completed).length;
  const countEl = document.getElementById('pds-task-count');
  if (countEl) countEl.textContent = openCount + ' open' + (doneCount ? ', ' + doneCount + ' done' : '');
  const el = document.getElementById('pds-linked-tasks');
  if (!el) return;
  if (!displayTasks.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">' +
      (allTasks.length && !showCompleted ? 'All tasks done! Check "Show done" to see them.' : 'No tasks linked to this project yet. Add one above.') +
      '</div>';
    return;
  }
  displayTasks.sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (isOverdue(b) && !isOverdue(a)) return 1;
    const o = {high:0,medium:1,low:2};
    return (o[a.urgency]||1) - (o[b.urgency]||1);
  });
  el.innerHTML = displayTasks.map(t => {
    const od = isOverdue(t);
    return `<div class="pds-task-item" style="${t.completed ? 'opacity:0.45' : ''};cursor:pointer" onclick="openTaskModal('${t.id}')">
      <div onclick="togglePDSTask('${t.id}');event.stopPropagation()" style="width:16px;height:16px;border-radius:4px;border:1.5px solid ${t.completed ? 'var(--navy)' : 'var(--border)'};display:flex;align-items:center;justify-content:center;font-size:10px;cursor:pointer;flex-shrink:0;background:${t.completed ? 'var(--navy)' : 'transparent'};color:white">${t.completed ? '✓' : ''}</div>
      <div class="urgency-badge ${t.urgency}">${t.urgency}</div>
      <div class="pds-task-name" style="${t.completed ? 'text-decoration:line-through' : ''}">${t.name}</div>
      ${t.due ? '<div class="pds-task-due ' + (od ? 'overdue' : '') + '">' + (od ? '⚠ ' : '') + formatDate(t.due) + '</div>' : ''}
    </div>`;
  }).join('');
}

function togglePDSTask(id) {
  const tasks = DB.get('tasks');
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return;
  if (tasks[idx].recurrence && tasks[idx].recurrence !== 'none') {
    tasks[idx].due = nextRecurrenceDate(tasks[idx]);
    showToast('Done — next due: ' + formatDate(tasks[idx].due));
  } else {
    tasks[idx].completed = !tasks[idx].completed;
  }
  DB.set('tasks', tasks);
  const p = DB.get('projects').find(x => x.id === currentDetailProjectId);
  renderPDSLinkedTasks(p);
  updateBadges();
}

function addTaskForProject() {
  const p = DB.get('projects').find(x => x.id === currentDetailProjectId);
  openTaskModal();
  setTimeout(() => {
    const sel = document.getElementById('task-project');
    if (sel && p) {
      // First try exact match
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === p.name) { sel.selectedIndex = i; return; }
      }
      // If project name not in dropdown yet, add it dynamically
      const opt = document.createElement('option');
      opt.value = p.name;
      opt.textContent = p.name;
      sel.appendChild(opt);
      sel.value = p.name;
    }
  }, 50);
}

// ── LINKED ACCOUNTS ──
function renderPDSLinkedAccounts(p) {
  const accounts = DB.get('accounts').filter(a =>
    a.project && (a.project === p.name || p.name.toLowerCase().includes(a.project.toLowerCase()) || a.project.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()))
  );
  const el = document.getElementById('pds-linked-accounts');
  if (!accounts.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">No accounts linked. Accounts tagged to this project will appear here.</div>';
    return;
  }
  el.innerHTML = accounts.map(a => `
    <div class="pds-account-item" onclick="openAccountDetail('${a.id}')">
      <div class="pds-account-name">${a.company}</div>
      ${a.contactName ? '<div style="font-size:10px;color:var(--text-muted)">' + a.contactName + '</div>' : ''}
      <span class="pds-account-stage">${a.stage}</span>
    </div>`).join('');
}

// ── NOTES LOG ──
function renderPDSNotesLog(p) {
  const notes = p.notes || [];
  const el = document.getElementById('pds-notes-log');
  if (!notes.length) {
    el.innerHTML = '<div style="font-size:11px;color:var(--text-muted)">No notes yet.</div>';
    return;
  }
  el.innerHTML = [...notes].reverse().map(n => `
    <div class="note-entry">
      <div class="note-date">${formatDate(n.date)}</div>
      ${n.text}
    </div>`).join('');
}

function addPDSNote() {
  const input = document.getElementById('pds-note-input');
  const text = input.value.trim();
  if (!text) return;
  const projects = DB.get('projects');
  const idx = projects.findIndex(p => p.id === currentDetailProjectId);
  if (idx === -1) return;
  if (!projects[idx].notes) projects[idx].notes = [];
  projects[idx].notes.push({ date: today(), text });
  DB.set('projects', projects);
  input.value = '';
  renderPDSNotesLog(projects[idx]);
  // Update WLO
  document.getElementById('pds-wlo-text').textContent = '[' + formatDate(today()) + '] ' + text;
  showToast('Note saved');
}

function saveEmailPaste() {
  const text = document.getElementById('pds-email-paste').value.trim();
  if (!text) return;
  const projects = DB.get('projects');
  const idx = projects.findIndex(p => p.id === currentDetailProjectId);
  if (idx === -1) return;
  if (!projects[idx].notes) projects[idx].notes = [];
  projects[idx].notes.push({ date: today(), text: '[EMAIL] ' + text.substring(0, 500) });
  DB.set('projects', projects);
  document.getElementById('pds-email-paste').value = '';
  renderPDSNotesLog(projects[idx]);
  showToast('Email saved as note');
}

function copyProjectContextFromDetail() {
  copyProjectContext(currentDetailProjectId);
}

async function generateWLOBriefing() {
  const key = getGeminiKey();
  if (!key) { showToast('Set Gemini key in AI Settings first'); return; }
  const p = DB.get('projects').find(x => x.id === currentDetailProjectId);
  if (!p) return;
  const el = document.getElementById('pds-wlo-text');
  el.style.color = 'var(--text-muted)';
  el.textContent = 'Generating briefing...';
  const notes = (p.notes || []).slice(-5).map(n => '[' + n.date + '] ' + n.text).join('\n');
  const prompt = 'Summarize this project in 3-4 sentences for Hunter so he knows exactly where he left off. What happened last, what is still open, what needs to happen today. Project: ' + p.name + '. Customer: ' + (p.customer||'Internal') + '. Status: ' + p.status + '. Blocker: ' + (p.blocker||'None') + '. Next action: ' + (p.next||'None') + '. Recent notes:\n' + (notes||'None');
  try {
    const body = {
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
    };
    const resp = await fetch(GEMINI_ENDPOINT + '?key=' + key, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate briefing.';
    el.textContent = text;
    el.style.color = 'var(--text-dim)';
  } catch(e) {
    el.textContent = 'Error generating briefing. Check your Gemini key.';
  }
}

// Override project card actions to not bubble to detail screen
function editProjectCard(id, event) {
  event.stopPropagation();
  openProjectModal(id);
}
function archiveProjectCard(id, event) {
  event.stopPropagation();
  archiveProject(id);
}
function copyProjectCard(id, event) {
  event.stopPropagation();
  copyProjectContext(id);
}

