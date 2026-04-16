// ============================================================
// NAVIGATION
// ============================================================
let currentPage='home';
let lastProjectId=null;

function navigate(page) {
  if(currentPage==='projects'&&page!=='projects'&&lastProjectId) showClosingNote(lastProjectId);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  const navItem=document.querySelector('.nav-item[data-page="'+page+'"]');
  if(navItem) navItem.classList.add('active');
  currentPage=page;
  if(page==='home') renderHome();
  if(page==='crm') renderAccounts();
  if(page==='tasks') renderTasks();
  if(page==='projects') renderProjects();
  if(page==='calendar') initCalendar();
  if(page==='project-detail') renderProjectDetail();
  if(page==='ai') initAIPage();
  if(page==='followups') renderFollowups();
  updateBadges();
}

document.querySelectorAll('.nav-item').forEach(item=>{
  item.addEventListener('click',()=>navigate(item.dataset.page));
});

// ============================================================
// MOBILE NAV
// ============================================================

function toggleMobileNav() {
  document.getElementById('mobile-nav-dropdown').classList.toggle('open');
}
function closeMobileNav() {
  document.getElementById('mobile-nav-dropdown').classList.remove('open');
}
function mobileNavigate(page) {
  closeMobileNav();
  navigate(page);
}

// ============================================================
// MOBILE SYNC POPUP
// ============================================================

function toggleMobileSyncPopup() {
  document.getElementById('mobile-sync-popup').classList.toggle('open');
}
function closeMobileSyncPopup() {
  document.getElementById('mobile-sync-popup').classList.remove('open');
}

// Outside-tap closes both mobile nav dropdown and sync popup
document.addEventListener('click', function(e) {
  const dd = document.getElementById('mobile-nav-dropdown');
  const bar = document.getElementById('mobile-top-bar');
  if (dd && dd.classList.contains('open') && !dd.contains(e.target) && bar && !bar.contains(e.target)) {
    closeMobileNav();
  }
  const popup = document.getElementById('mobile-sync-popup');
  const fab = document.getElementById('mobile-sync-fab');
  if (popup && popup.classList.contains('open') && !popup.contains(e.target) && fab && !fab.contains(e.target)) {
    closeMobileSyncPopup();
  }
});

function updateBadges() {
  const tasks=DB.get('tasks').filter(t=>!t.completed&&(t.urgency==='high'||isOverdue(t)));
  const tb=document.getElementById('tasks-badge');
  tb.textContent=tasks.length; tb.style.display=tasks.length?'':'none';
  const accounts=DB.get('accounts');
  document.getElementById('crm-badge').textContent=accounts.length;
  const projects=DB.get('projects').filter(p=>p.status!=='done');
  document.getElementById('projects-badge').textContent=projects.length;
  updateFollowupBadges();
}

function updateCountdown() {
  const launch=new Date('2026-06-01T00:00:00');
  const days=Math.ceil((launch-new Date())/86400000);
  document.getElementById('countdown-days').textContent=days>0?days:'Live';
}

function updateDateDisplay() {
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
}

// ============================================================
// HOME
// ============================================================
function renderHome() { renderTop3(); renderKPIs(); renderHomeTasks(); checkHabitNudge(); renderFollowupSummaryCard(); }

function renderTop3() {
  const grid=document.getElementById('top3-grid');
  const tasks=DB.get('tasks').filter(t=>!t.completed);
  const accounts=DB.get('accounts');
  const priorities=[];

  tasks.filter(t=>t.urgency==='high'&&isOverdue(t)).forEach(t=>{
    priorities.push({action:t.name,why:'Overdue — handle today',id:t.id,type:'task'});
  });
  accounts.filter(a=>a.lastContacted&&daysSince(a.lastContacted)>=14).slice(0,2).forEach(a=>{
    priorities.push({action:'Follow up: '+a.company,why:daysSince(a.lastContacted)+'d since last contact',type:'account'});
  });
  tasks.filter(t=>t.urgency==='high'&&!isOverdue(t)&&t.due&&daysUntil(t.due)<=1).forEach(t=>{
    priorities.push({action:t.name,why:t.due?'Due '+formatDate(t.due):'High urgency',id:t.id,type:'task'});
  });
  tasks.filter(t=>t.urgency==='high').forEach(t=>{
    priorities.push({action:t.name,why:'High urgency',id:t.id,type:'task'});
  });

  const seen=new Set(); const top3=[];
  for(const p of priorities) { if(!seen.has(p.action)&&top3.length<3){seen.add(p.action);top3.push(p);} }

  if(top3.length===0){
    grid.innerHTML='<div style="grid-column:1/-1" class="empty-state"><div class="empty-icon">🎯</div><h3>No urgent priorities</h3><p>Add tasks or accounts to populate your Top 3.</p></div>';
    return;
  }

  const colors=['priority-1','priority-2','priority-3'];
  const nums=['01','02','03'];
  grid.innerHTML=top3.map((p,i)=>`
    <div class="top3-card ${colors[i]}">
      <div class="top3-number">#${nums[i]}</div>
      <div class="top3-action">${p.action}</div>
      <div class="top3-why">${p.why}</div>
      <button class="btn btn-ghost btn-sm full-width" onclick="markDoneFromHome('${p.action.replace(/'/g,"\\'")}')">✓ Mark Done</button>
    </div>`).join('');
}

function markDoneFromHome(taskName) {
  const tasks=DB.get('tasks');
  const idx=tasks.findIndex(t=>t.name===taskName);
  if(idx!==-1){
    if(tasks[idx].recurrence&&tasks[idx].recurrence!=='none'){
      tasks[idx].due=nextRecurrenceDate(tasks[idx]);
    } else { tasks[idx].completed=true; }
    DB.set('tasks',tasks); showToast('Done ✓'); renderHome(); updateBadges();
  }
}

function renderKPIs() {
  const kpis=DB.getObj('kpis',{calls:0,callsGoal:25,prospects:0,prospectsGoal:5,followups:0,followupsGoal:10,callHours:0,callHoursGoal:2,weekStart:getWeekStart()});
  const ws=getWeekStart();
  if(kpis.weekStart!==ws){kpis.calls=0;kpis.prospects=0;kpis.followups=0;kpis.callHours=0;kpis.weekStart=ws;DB.setObj('kpis',kpis);}

  const daysLeft=Math.ceil((new Date('2026-06-01')-new Date())/86400000);
  const todayInt=DB.get('interactions').filter(i=>i.date===today()).length;

  const items=[
    {key:'calls',label:'Calls (session)',goal:'callsGoal'},
    {key:'prospects',label:'New Prospects',goal:'prospectsGoal'},
    {key:'followups',label:'Follow-ups',goal:'followupsGoal'},
    {key:'callHours',label:'Call Hours',goal:'callHoursGoal'},
  ];

  const grid=document.getElementById('kpi-grid');
  grid.innerHTML=items.map(item=>{
    const val=kpis[item.key]||0; const goal=kpis[item.goal]||1;
    const pct=Math.min(100,Math.round(val/goal*100));
    return `<div class="kpi-item">
      <div class="kpi-header"><span class="kpi-label">${item.label}</span><span class="kpi-value">${val}/${goal}</span></div>
      <div class="kpi-bar-track"><div class="kpi-bar-fill" style="width:${pct}%;${pct>=100?'background:var(--cold)':''}"></div></div>
      <div class="kpi-controls">
        <button class="kpi-btn" onclick="adjustKPI('${item.key}',-1)">−</button>
        <button class="kpi-btn" onclick="adjustKPI('${item.key}',1)">+</button>
        <span style="font-size:10px;color:var(--text-muted);margin-left:4px">${pct}%</span>
      </div>
    </div>`;
  }).join('')
  + `<div class="kpi-item"><div class="kpi-header"><span class="kpi-label">Houston Launch</span></div><div style="font-family:var(--font-mono);font-size:22px;color:#4a90d9;font-weight:500">${daysLeft}</div><div style="font-size:10px;color:var(--text-muted)">days remaining</div></div>`
  + `<div class="kpi-item"><div class="kpi-header"><span class="kpi-label">Interactions Today</span></div><div style="font-family:var(--font-mono);font-size:22px;color:#4a90d9;font-weight:500">${todayInt}</div><div style="font-size:10px;color:var(--text-muted)">logged today</div></div>`;
}

function adjustKPI(key,delta) {
  const kpis=DB.getObj('kpis'); kpis[key]=Math.max(0,(kpis[key]||0)+delta);
  DB.setObj('kpis',kpis); renderKPIs();
}

function resetKPIs() {
  const kpis=DB.getObj('kpis'); kpis.calls=0;kpis.prospects=0;kpis.followups=0;kpis.callHours=0;
  DB.setObj('kpis',kpis); renderKPIs(); showToast('KPIs reset');
}

function renderHomeTasks() {
  const tasks=DB.get('tasks').filter(t=>!t.completed&&(t.urgency==='high'||t.urgency==='medium'))
    .sort((a,b)=>{
      if(isOverdue(a)&&!isOverdue(b))return -1; if(isOverdue(b)&&!isOverdue(a))return 1;
      const o={high:0,medium:1,low:2}; return (o[a.urgency]||1)-(o[b.urgency]||1);
    }).slice(0,5);

  const el=document.getElementById('home-tasks-list');
  if(!tasks.length){el.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:10px 0">No urgent tasks right now.</div>';return;}
  el.innerHTML=tasks.map(t=>{
    const od=isOverdue(t); const due=t.due?formatDate(t.due):'';
    return `<div class="task-row">
      <div class="task-urgency-dot urgency-${t.urgency}"></div>
      <div class="task-name">${t.name}</div>
      ${due?`<div class="task-due ${od?'task-overdue':''}">${od?'⚠️ ':''} ${due}</div>`:''}
    </div>`;
  }).join('');
}


// ============================================================
// HABIT NUDGE
// ============================================================
function checkHabitNudge() {
  const container = document.getElementById('habit-nudge-container');
  if (!container) return;

  // Weekdays only
  const dayOfWeek = new Date().getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { container.innerHTML = ''; return; }

  const interactions = DB.get('interactions');
  if (!interactions.length) { container.innerHTML = ''; return; }

  // Find last call or email interaction
  const callTypes = ['Call', 'Email', 'Meeting'];
  const lastCall = interactions
    .filter(i => callTypes.includes(i.type))
    .sort((a, b) => b.date > a.date ? 1 : -1)[0];

  if (!lastCall) { container.innerHTML = ''; return; }

  const days = daysSince(lastCall.date);
  if (days >= 2) {
    container.innerHTML = `<div class="habit-nudge" onclick="navigate('crm')">
      <div class="habit-nudge-icon">📵</div>
      <div class="habit-nudge-text">
        <strong>You have not logged a call in ${days} day${days !== 1 ? 's' : ''}</strong>
        <span>How did your last session go? Tap to open Accounts and log one.</span>
      </div>
      <span style="color:var(--text-muted);font-size:18px">→</span>
    </div>`;
  } else {
    container.innerHTML = '';
  }
}


// ============================================================
// INIT
// ============================================================
function rolloverOverdueTasks() {
  const todayStr = today();
  const tasks = DB.get('tasks');
  let changed = false;
  tasks.forEach(t => {
    if (!t.completed && t.due && t.due < todayStr && (!t.recurrence || t.recurrence === 'none')) {
      t.due = todayStr;
      changed = true;
    }
  });
  if (changed) DB.set('tasks', tasks);
}

function init() {
  migrateTaskProjectNames();
  migrateAddMasterTasks();
  migrateLeadsV2();
  seedIfEmpty();
  rolloverOverdueTasks();
  updateCountdown();
  updateDateDisplay();
  renderHome();
  checkHabitNudge();
  updateBadges();
  setInterval(updateCountdown,60000);
  if (localStorage.getItem('hcc_goog_token') && localStorage.getItem('hcc_goog_client_id')) {
    setSyncStatus('connected', 'Reconnecting...');
  }
  loadGoogleLibs();
}

init();
