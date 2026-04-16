// ============================================================
// FIRE MODAL
// ============================================================
function openFireModal() { document.getElementById('fire-text').value=''; openModal('fire-modal'); }

function categorizeFire() {
  const text=document.getElementById('fire-text').value.trim(); if(!text)return;
  const lower=text.toLowerCase();
  let urgency='medium'; let due=today();
  if(lower.includes('today')||lower.includes('asap')||lower.includes('urgent')||lower.includes('now')) urgency='high';
  else if(lower.includes('week')||lower.includes('follow')) urgency='medium';
  else { urgency='low'; due=''; }
  const tasks=DB.get('tasks');
  tasks.unshift({id:uid(),name:'🔥 '+text,urgency,project:'Crest',due,recurrence:'none',completed:false,created:today()});
  DB.set('tasks',tasks); closeModal('fire-modal'); renderHome(); updateBadges();
  showToast('Logged as '+urgency+' urgency');
}


// ============================================================
// TASKS
// ============================================================
let taskFilter='all';
let editTaskId=null;

function filterTasks(btn,filter) {
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); taskFilter=filter; renderTasks();
}

function renderTasks() {
  let tasks=DB.get('tasks');
  if(taskFilter==='high') tasks=tasks.filter(t=>t.urgency==='high'&&!t.completed);
  else if(taskFilter==='medium') tasks=tasks.filter(t=>t.urgency==='medium'&&!t.completed);
  else if(taskFilter==='low') tasks=tasks.filter(t=>t.urgency==='low'&&!t.completed);
  else if(taskFilter==='recurring') tasks=tasks.filter(t=>t.recurrence&&t.recurrence!=='none');
  else if(taskFilter==='overdue') tasks=tasks.filter(t=>isOverdue(t)&&!t.completed);
  else tasks=tasks.filter(t=>!t.completed);

  // Apply project dropdown filter
  const projSel=document.getElementById('task-filter-project');
  if(projSel&&projSel.value) tasks=tasks.filter(t=>(t.project||'')===projSel.value);

  // Apply due date dropdown filter
  const dueSel=document.getElementById('task-filter-due');
  if(dueSel&&dueSel.value) {
    const todayStr=today();
    const weekEnd=new Date(); weekEnd.setDate(weekEnd.getDate()+7);
    const weekStr=weekEnd.toISOString().split('T')[0];
    if(dueSel.value==='today') tasks=tasks.filter(t=>t.due&&t.due<=todayStr);
    else if(dueSel.value==='week') tasks=tasks.filter(t=>t.due&&t.due<=weekStr);
    else if(dueSel.value==='none') tasks=tasks.filter(t=>!t.due);
  }

  tasks.sort((a,b)=>{
    if(isOverdue(a)&&!isOverdue(b))return -1; if(isOverdue(b)&&!isOverdue(a))return 1;
    const o={high:0,medium:1,low:2}; return(o[a.urgency]||1)-(o[b.urgency]||1);
  });

  const list=document.getElementById('tasks-list');
  if(!tasks.length){list.innerHTML=`<div class="empty-state"><div class="empty-icon">✓</div><h3>No tasks here</h3><p>All clear or change the filter.</p></div>`;return;}

  const accountMap=DB.get('accounts').reduce((m,a)=>{m[a.id]=a.company;return m;},{});

  list.innerHTML=tasks.map(t=>{
    const od=isOverdue(t); const dueIn=t.due?daysUntil(t.due):null;
    let dueClass='',dueLabel='';
    if(t.due){
      if(od){dueClass='overdue';dueLabel='⚠️ '+formatDate(t.due)+' (overdue)';}
      else if(dueIn===0){dueClass='today';dueLabel='Today';}
      else if(dueIn===1){dueClass='today';dueLabel='Tomorrow';}
      else{dueLabel=formatDate(t.due);}
    }
    const acctName=t.accountId&&accountMap[t.accountId]?accountMap[t.accountId]:null;
    return `<div class="task-item">
      <div class="task-check ${t.completed?'checked':''}" onclick="toggleTask('${t.id}')">${t.completed?'✓':''}</div>
      <div class="task-info">
        <div class="task-title">${t.name}</div>
        <div class="task-meta-row">
          <span class="urgency-badge ${t.urgency}">${t.urgency}</span>
          ${t.project?`<span class="task-meta-item">${t.project}</span>`:''}
          ${t.due?`<span class="task-meta-item ${dueClass}">${dueLabel}</span>`:''}
          ${t.recurrence&&t.recurrence!=='none'?`<span class="recurring-badge">🔄 ${t.recurrence}</span>`:''}
          ${(t.tags||'').split(',').map(s=>s.trim()).includes('followup')?`<span class="followup-badge">followup</span>`:''}
          ${acctName?`<span class="task-meta-item" style="color:var(--text-dim);font-style:italic">${acctName}</span>`:''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" onclick="openTaskModal('${t.id}');event.stopPropagation()">✏</button>
        <button class="task-action-btn delete" onclick="deleteTask('${t.id}');event.stopPropagation()">✕</button>
      </div>
    </div>`;
  }).join('');
}

function toggleTask(id) {
  const tasks=DB.get('tasks'); const idx=tasks.findIndex(t=>t.id===id); if(idx===-1)return;
  if(tasks[idx].recurrence&&tasks[idx].recurrence!=='none'){
    tasks[idx].due=nextRecurrenceDate(tasks[idx]);
    showToast('Done — next due: '+formatDate(tasks[idx].due));
  } else { tasks[idx].completed=!tasks[idx].completed; }
  DB.set('tasks',tasks);
  // Additive: linked follow-up task completion — only fires when accountId + followup tag present
  if(tasks[idx].completed && tasks[idx].accountId && (tasks[idx].tags||'').split(',').map(s=>s.trim()).includes('followup')){
    completeFollowupTask(tasks[idx]);
  }
  renderTasks(); renderHome(); updateBadges();
}

function nextRecurrenceDate(task) {
  const base=task.due?new Date(task.due+'T00:00:00'):new Date();
  const now=new Date(); now.setHours(0,0,0,0);
  if(base<=now) base.setTime(now.getTime());
  if(task.recurrence==='daily') base.setDate(base.getDate()+1);
  else if(task.recurrence==='weekly') base.setDate(base.getDate()+7);
  else if(task.recurrence==='mwf'){ do{base.setDate(base.getDate()+1);}while(![1,3,5].includes(base.getDay())); }
  else if(task.recurrence==='days'){
    const dow=(task.daysOfWeek||[]).map(Number);
    if(dow.length){ do{base.setDate(base.getDate()+1);}while(!dow.includes(base.getDay())); }
    else { base.setDate(base.getDate()+1); }
  }
  else if(task.recurrence==='custom') base.setDate(base.getDate()+(task.customDays||7));
  return base.toISOString().split('T')[0];
}

function quickAddTask() {
  const input=document.getElementById('quick-task-input'); const name=input.value.trim(); if(!name)return;
  const tasks=DB.get('tasks');
  tasks.unshift({id:uid(),name,urgency:'medium',project:'',due:'',recurrence:'none',completed:false,created:today()});
  DB.set('tasks',tasks); input.value=''; renderTasks(); updateBadges(); showToast('Task added');
}

function openTaskModal(id=null) {
  editTaskId=id;
  document.getElementById('task-modal-title').textContent=id?'Edit Task':'New Task';
  if(id){
    const t=DB.get('tasks').find(x=>x.id===id); if(t){
      document.getElementById('task-name-input').value=t.name;
      document.getElementById('task-urgency').value=t.urgency;
      document.getElementById('task-due').value=t.due||'';
      document.getElementById('task-project').value=t.project||'';
      document.getElementById('task-recurrence').value=t.recurrence||'none';
      if(t.accountId){
        const acc=DB.get('accounts').find(a=>a.id===t.accountId);
        if(acc) selectTaskAccount(t.accountId,acc.company); else clearTaskAccount();
      } else { clearTaskAccount(); }
    }
  } else {
    document.getElementById('task-name-input').value='';
    document.getElementById('task-urgency').value='medium';
    document.getElementById('task-due').value='';
    document.getElementById('task-project').value='';
    document.getElementById('task-recurrence').value='none';
    document.getElementById('custom-recurrence-field').style.display='none';
    clearTaskAccount();
  }
  openModal('task-modal');
}

function saveTask() {
  const name=document.getElementById('task-name-input').value.trim(); if(!name){showToast('Task name required');return;}
  const tasks=DB.get('tasks');
  const recurrence=document.getElementById('task-recurrence').value;
  const taskTime=document.getElementById('task-time')?document.getElementById('task-time').value||'':'';
  const daysOfWeek=recurrence==='days'
    ?[0,1,2,3,4,5,6].filter(d=>document.getElementById(['dow-sun','dow-mon','dow-tue','dow-wed','dow-thu','dow-fri','dow-sat'][d])?.checked)
    :[];
  const accountId=document.getElementById('task-account-chip').dataset.accountId||'';
  const data={name,urgency:document.getElementById('task-urgency').value,due:document.getElementById('task-due').value,
    project:document.getElementById('task-project').value,recurrence,
    customDays:parseInt(document.getElementById('task-custom-days').value)||7,
    taskTime,daysOfWeek,accountId,completed:false};
  console.log('[saveTask] data object:', JSON.stringify(data));
  if(editTaskId){
    const idx=tasks.findIndex(t=>t.id===editTaskId); if(idx!==-1)tasks[idx]={...tasks[idx],...data};
  } else { tasks.unshift({id:uid(),created:today(),...data}); }
  DB.set('tasks',tasks); closeModal('task-modal'); renderTasks(); renderHome(); updateBadges();
  if(currentPage==='project-detail') renderProjectDetail();
  if(currentPage==='calendar') renderCalendar();
  showToast(editTaskId?'Task updated':'Task added');
}

function deleteTask(id) {
  DB.set('tasks',DB.get('tasks').filter(t=>t.id!==id));
  renderTasks(); renderHome(); updateBadges();
}

// ============================================================
// MOBILE QUICK-ADD
// ============================================================

function openMobileTaskModal() {
  document.getElementById('mobile-task-name').value='';
  document.getElementById('mobile-task-urgency').value='medium';
  document.getElementById('mobile-task-due').value='';
  document.getElementById('mobile-task-modal').classList.add('open');
}

function saveMobileTask() {
  const name=document.getElementById('mobile-task-name').value.trim();
  if(!name){showToast('Task name required');return;}
  const tasks=DB.get('tasks');
  tasks.unshift({
    id:uid(),created:today(),name,
    urgency:document.getElementById('mobile-task-urgency').value,
    due:document.getElementById('mobile-task-due').value,
    project:'',recurrence:'none',customDays:7,daysOfWeek:[],taskTime:'',tags:'',accountId:'',completed:false
  });
  DB.set('tasks',tasks);
  closeModal('mobile-task-modal');
  renderTasks();
  renderHome();
  updateBadges();
  showToast('Task added');
}


// ============================================================
// ACCOUNT-LINKED TASKS
// ============================================================

// Logic — pure functions, no HTML
function getAccountMatches(query) {
  if(!query||query.length<3) return [];
  const q=query.toLowerCase();
  return DB.get('accounts').filter(a=>a.company&&a.company.toLowerCase().includes(q)).slice(0,6);
}

function getTasksForAccount(accountId) {
  const all=DB.get('tasks');
  console.log('[getTasksForAccount] searching for accountId:', accountId);
  console.log('[getTasksForAccount] first 5 tasks accountId values:', all.slice(0,5).map(t=>({id:t.id,name:t.name,accountId:t.accountId})));
  return all.filter(t=>
    t.accountId===accountId &&
    !t.completed &&
    !(t.tags||'').split(',').map(s=>s.trim()).includes('followup')
  );
}

// Render — returns HTML string only
function renderAccountTasks(accountId) {
  const tasks=getTasksForAccount(accountId);
  const rows=tasks.length===0
    ?'<div style="font-size:11px;color:var(--text-muted);padding:6px 0">No tasks linked to this account.</div>'
    :tasks.map(t=>{
        const due=t.due?formatDate(t.due):'No due date';
        return `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">
          <div class="task-check ${t.completed?'checked':''}" onclick="toggleTask('${t.id}');document.getElementById('account-tasks-section').innerHTML=renderAccountTasks('${accountId}')" style="width:16px;height:16px;min-width:16px;font-size:9px">${t.completed?'✓':''}</div>
          <div style="flex:1">
            <div style="font-size:12px;color:var(--text)">${t.name}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
              <span class="urgency-badge ${t.urgency}" style="font-size:9px;padding:1px 6px">${t.urgency}</span>
              <span style="font-size:10px;color:var(--text-muted)">${due}</span>
            </div>
          </div>
        </div>`;
      }).join('');
  const safeId=accountId.replace(/'/g,"\\'");
  return `${rows}
    <div style="display:flex;gap:6px;margin-top:10px">
      <input type="text" id="account-task-quick-input" placeholder="Add a task..." style="flex:1;font-size:12px;background:var(--accent);border:1px solid var(--border);border-radius:6px;padding:5px 8px;color:var(--text);font-family:var(--font-body);outline:none" onkeydown="if(event.key==='Enter')quickAddAccountTask('${safeId}')">
      <button class="btn btn-primary btn-sm" onclick="quickAddAccountTask('${safeId}')">Add</button>
    </div>`;
}

function quickAddAccountTask(accountId) {
  const input=document.getElementById('account-task-quick-input');
  const name=input.value.trim(); if(!name)return;
  const tasks=DB.get('tasks');
  tasks.unshift({id:uid(),name,urgency:'medium',project:'',due:'',recurrence:'none',tags:'',accountId,completed:false,created:today()});
  DB.set('tasks',tasks);
  document.getElementById('account-tasks-section').innerHTML=renderAccountTasks(accountId);
  updateBadges(); showToast('Task added');
}

// Task modal — account typeahead
function onAccountTypeahead() {
  const input=document.getElementById('task-account-input');
  const dropdown=document.getElementById('task-account-dropdown');
  const matches=getAccountMatches(input.value);
  if(!matches.length){dropdown.style.display='none';return;}
  dropdown.innerHTML=matches.map(a=>{
    const safe=a.company.replace(/'/g,"&#39;").replace(/"/g,'&quot;');
    return `<div style="padding:8px 12px;cursor:pointer;font-size:12px;color:var(--text);border-bottom:1px solid var(--border)" onmousedown="selectTaskAccount('${a.id}','${safe}')" onmouseover="this.style.background='var(--accent-2)'" onmouseout="this.style.background=''"> ${a.company}</div>`;
  }).join('');
  dropdown.style.display='block';
}

function selectTaskAccount(id,company) {
  const input=document.getElementById('task-account-input');
  const chip=document.getElementById('task-account-chip');
  const dropdown=document.getElementById('task-account-dropdown');
  input.style.display='none';
  dropdown.style.display='none';
  chip.innerHTML=`<span style="display:inline-flex;align-items:center;gap:6px;background:var(--accent-2);border-radius:4px;padding:3px 8px;font-size:11px;color:var(--text);font-family:var(--font-mono)">${company}<span onclick="clearTaskAccount()" style="cursor:pointer;color:var(--text-dim)">✕</span></span>`;
  chip.dataset.accountId=id;
  chip.style.display='block';
}

function clearTaskAccount() {
  const input=document.getElementById('task-account-input');
  const chip=document.getElementById('task-account-chip');
  input.value=''; input.style.display='';
  chip.innerHTML=''; chip.dataset.accountId=''; chip.style.display='none';
  document.getElementById('task-account-dropdown').style.display='none';
}

