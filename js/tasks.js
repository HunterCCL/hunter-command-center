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

  list.innerHTML=tasks.map(t=>{
    const od=isOverdue(t); const dueIn=t.due?daysUntil(t.due):null;
    let dueClass='',dueLabel='';
    if(t.due){
      if(od){dueClass='overdue';dueLabel='⚠️ '+formatDate(t.due)+' (overdue)';}
      else if(dueIn===0){dueClass='today';dueLabel='Today';}
      else if(dueIn===1){dueClass='today';dueLabel='Tomorrow';}
      else{dueLabel=formatDate(t.due);}
    }
    return `<div class="task-item">
      <div class="task-check ${t.completed?'checked':''}" onclick="toggleTask('${t.id}')">${t.completed?'✓':''}</div>
      <div class="task-info">
        <div class="task-title">${t.name}</div>
        <div class="task-meta-row">
          <span class="urgency-badge ${t.urgency}">${t.urgency}</span>
          ${t.project?`<span class="task-meta-item">${t.project}</span>`:''}
          ${t.due?`<span class="task-meta-item ${dueClass}">${dueLabel}</span>`:''}
          ${t.recurrence&&t.recurrence!=='none'?`<span class="recurring-badge">🔄 ${t.recurrence}</span>`:''}
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
  DB.set('tasks',tasks); renderTasks(); renderHome(); updateBadges();
}

function nextRecurrenceDate(task) {
  const base=task.due?new Date(task.due+'T00:00:00'):new Date();
  const now=new Date(); now.setHours(0,0,0,0);
  if(base<=now) base.setTime(now.getTime());
  if(task.recurrence==='daily') base.setDate(base.getDate()+1);
  else if(task.recurrence==='weekly') base.setDate(base.getDate()+7);
  else if(task.recurrence==='mwf'){ do{base.setDate(base.getDate()+1);}while(![1,3,5].includes(base.getDay())); }
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
    }
  } else {
    document.getElementById('task-name-input').value='';
    document.getElementById('task-urgency').value='medium';
    document.getElementById('task-due').value='';
    document.getElementById('task-project').value='';
    document.getElementById('task-recurrence').value='none';
    document.getElementById('custom-recurrence-field').style.display='none';
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
  const data={name,urgency:document.getElementById('task-urgency').value,due:document.getElementById('task-due').value,
    project:document.getElementById('task-project').value,recurrence,
    customDays:parseInt(document.getElementById('task-custom-days').value)||7,
    taskTime,daysOfWeek,completed:false};
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

