// ============================================================
// CALENDAR
// ============================================================
let calView = 'day';
let calDate = new Date();
let selectedMonthDay = null;

function switchCalView(view) {
  calView = view;
  ['day','week','month'].forEach(v => {
    document.getElementById('cal-tab-' + v).classList.toggle('active', v === view);
    document.getElementById('cal-view-' + v).style.display = v === view ? 'block' : 'none';
  });
  renderCalendar();
}

function initCalendar() {
  calDate = new Date();
  switchCalView('day');
}

function calNavPrev() {
  if (calView === 'day') calDate.setDate(calDate.getDate() - 1);
  else if (calView === 'week') calDate.setDate(calDate.getDate() - 7);
  else calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar();
}

function calNavNext() {
  if (calView === 'day') calDate.setDate(calDate.getDate() + 1);
  else if (calView === 'week') calDate.setDate(calDate.getDate() + 7);
  else calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar();
}

function calGoToday() { calDate = new Date(); renderCalendar(); }

function renderCalendar() {
  if (calView === 'day') renderDayView();
  else if (calView === 'week') renderWeekView();
  else renderMonthView();
}

function getTasksForDate(dateStr) {
  const tasks = DB.get('tasks').filter(t => !t.completed);
  return tasks.filter(t => {
    if (t.due === dateStr) return true;
    if (t.recurrence === 'daily') return t.due ? dateStr >= t.due : true;
    if (t.recurrence === 'mwf') {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      return [1,3,5].includes(dow) && (!t.due || dateStr >= t.due);
    }
    if (t.recurrence === 'days' && t.daysOfWeek && t.daysOfWeek.length) {
      const dow = new Date(dateStr + 'T00:00:00').getDay();
      return t.daysOfWeek.includes(dow) && (!t.due || dateStr >= t.due);
    }
    if (t.recurrence === 'weekly' && t.due) {
      // Show on same day of week going forward
      const taskDow = new Date(t.due + 'T00:00:00').getDay();
      const thisDow = new Date(dateStr + 'T00:00:00').getDay();
      return taskDow === thisDow && dateStr >= t.due;
    }
    return false;
  });
}

function renderDayView() {
  const d = calDate;
  const dateStr = d.toISOString().split('T')[0];
  const isToday = dateStr === today();

  document.getElementById('cal-nav-title').textContent = d.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric', year:'numeric'});

  const tasks = getTasksForDate(dateStr);
  const timed = tasks.filter(t => t.taskTime).sort((a,b) => a.taskTime > b.taskTime ? 1 : -1);
  const untimed = tasks.filter(t => !t.taskTime);

  let html = '';
  if (isToday) html += '<div style="font-family:var(--font-mono);font-size:10px;color:#4a90d9;margin-bottom:12px;letter-spacing:1px">TODAY</div>';

  if (timed.length) {
    html += '<div class="day-section-label">Scheduled</div>';
    html += timed.map(t => renderDayTask(t)).join('');
  }

  if (untimed.length) {
    html += '<div class="day-section-label">Unscheduled</div>';
    html += untimed.map(t => renderDayTask(t)).join('');
  }

  if (!tasks.length) {
    html += '<div class="empty-state"><div class="empty-icon">📅</div><h3>Nothing scheduled</h3><p>Add tasks or set due dates to see them here.</p></div>';
  }

  document.getElementById('cal-view-day').innerHTML = html;
}

function calToggleTask(id) {
  toggleTask(id);
  renderCalendar();
}

function renderDayTask(t) {
  const od = isOverdue(t);
  return `<div class="day-task-item">
    <div class="task-check" onclick="calToggleTask('${t.id}')"></div>
    ${t.taskTime ? '<div class="day-task-time">' + fmtTime(t.taskTime) + '</div>' : '<div class="day-task-time" style="color:var(--text-muted)">--:--</div>'}
    <div class="day-task-info" onclick="openTaskModal('${t.id}')" style="flex:1;cursor:pointer">
      <div class="day-task-name">${t.name}</div>
      <div class="day-task-meta">
        <span class="urgency-badge ${t.urgency}">${t.urgency}</span>
        ${t.project ? '<span class="task-meta-item">' + t.project + '</span>' : ''}
        ${t.recurrence && t.recurrence !== 'none' ? '<span class="recurring-badge">🔄</span>' : ''}
      </div>
    </div>
    ${od ? '<span style="color:var(--hot);font-size:11px">Overdue</span>' : ''}
  </div>`;
}

function fmtTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return h12 + ':' + String(m).padStart(2,'0') + ' ' + ampm;
}

function renderWeekView() {
  const d = new Date(calDate);
  const dow = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }

  const startStr = days[0].toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const endStr = days[6].toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  document.getElementById('cal-nav-title').textContent = startStr + ' – ' + endStr;

  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let html = '<div class="week-grid">';
  days.forEach((day, i) => {
    const dateStr = day.toISOString().split('T')[0];
    const isToday = dateStr === today();
    const tasks = getTasksForDate(dateStr).slice(0, 5);
    const extra = getTasksForDate(dateStr).length - 5;
    html += `<div class="week-day-col ${isToday ? 'today-col' : ''}">
      <div class="week-day-header">${dayNames[i]}</div>
      <div class="week-day-num ${isToday ? 'today-num' : ''}">${day.getDate()}</div>
      ${tasks.map(t => `<div class="week-task-chip ${t.urgency}" onclick="openTaskModal('${t.id}')" title="${t.name}">${t.taskTime ? fmtTime(t.taskTime) + ' ' : ''}${t.name.length > 18 ? t.name.substring(0,18)+'...' : t.name}</div>`).join('')}
      ${extra > 0 ? '<div class="week-more">+' + extra + ' more</div>' : ''}
    </div>`;
  });
  html += '</div>';
  document.getElementById('cal-view-week').innerHTML = html;
}

function renderMonthView() {
  const year = calDate.getFullYear();
  const month = calDate.getMonth();
  document.getElementById('cal-nav-title').textContent = new Date(year, month).toLocaleDateString('en-US',{month:'long',year:'numeric'});

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  // Start grid on Monday
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1;

  const dayHeaders = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let html = '<div class="month-view-layout"><div>';
  html += '<div class="month-grid">';
  html += dayHeaders.map(d => `<div class="month-day-header">${d}</div>`).join('');

  // Blank cells before month start
  for (let i = 0; i < startDow; i++) {
    html += '<div class="month-day-cell other-month"></div>';
  }

  const todayStr = today();
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const dateStr = year + '-' + String(month+1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    const isToday = dateStr === todayStr;
    const isSelected = selectedMonthDay === dateStr;
    const tasks = getTasksForDate(dateStr);
    const hasHigh = tasks.some(t => t.urgency === 'high');
    const hasMed = tasks.some(t => t.urgency === 'medium');
    const hasLow = tasks.some(t => t.urgency === 'low');
    html += `<div class="month-day-cell ${isToday?'today-cell':''} ${isSelected?'selected-cell':''}" onclick="selectMonthDay('${dateStr}')">
      <div class="month-day-num ${isToday?'today-num':''}">${day}</div>
      <div class="month-dot-row">
        ${hasHigh ? '<div class="month-dot" style="background:var(--hot)"></div>' : ''}
        ${hasMed ? '<div class="month-dot" style="background:var(--medium)"></div>' : ''}
        ${hasLow ? '<div class="month-dot" style="background:var(--low)"></div>' : ''}
      </div>
    </div>`;
  }
  html += '</div></div>';

  // Side panel
  const panelDate = selectedMonthDay || todayStr;
  const panelTasks = getTasksForDate(panelDate);
  html += `<div class="month-side-panel">
    <h4>${new Date(panelDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</h4>
    ${panelTasks.length
      ? panelTasks.map(t => `<div class="pds-task-item" style="margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <div class="task-check" onclick="calToggleTask('${t.id}')"></div>
          <div class="urgency-badge ${t.urgency}" style="font-size:8px">${t.urgency[0].toUpperCase()}</div>
          <div class="pds-task-name" style="font-size:11px;cursor:pointer" onclick="openTaskModal('${t.id}')">${t.name}</div>
        </div>`).join('')
      : '<div style="font-size:11px;color:var(--text-muted)">Nothing scheduled</div>'
    }
  </div>`;

  html += '</div>';
  document.getElementById('cal-view-month').innerHTML = html;
}

function selectMonthDay(dateStr) {
  selectedMonthDay = dateStr;
  renderMonthView();
}

// ── TASK RECURRENCE FIELDS ──
function toggleRecurrenceFields() {
  const val = document.getElementById('task-recurrence').value;
  document.getElementById('days-of-week-field').style.display = val === 'days' ? 'block' : 'none';
  document.getElementById('custom-recurrence-field').style.display = val === 'custom' ? 'block' : 'none';
}

// Patch saveTask to include time + daysOfWeek
const _origSaveTask = saveTask;
saveTask = function() {
  const name = document.getElementById('task-name-input').value.trim();
  if (!name) { showToast('Task name required'); return; }
  const tasks = DB.get('tasks');
  const recurrence = document.getElementById('task-recurrence').value;
  const taskTime = document.getElementById('task-time').value || '';
  const daysOfWeek = recurrence === 'days'
    ? [0,1,2,3,4,5,6].filter(d => document.getElementById(['dow-sun','dow-mon','dow-tue','dow-wed','dow-thu','dow-fri','dow-sat'][d])?.checked)
    : [];
  const data = {
    name,
    urgency: document.getElementById('task-urgency').value,
    due: document.getElementById('task-due').value,
    project: document.getElementById('task-project').value,
    recurrence,
    customDays: parseInt(document.getElementById('task-custom-days').value) || 7,
    taskTime,
    daysOfWeek,
    completed: false
  };
  if (editTaskId) {
    const idx = tasks.findIndex(t => t.id === editTaskId);
    if (idx !== -1) tasks[idx] = { ...tasks[idx], ...data };
  } else {
    tasks.unshift({ id: uid(), created: today(), ...data });
  }
  DB.set('tasks', tasks);
  closeModal('task-modal');
  renderTasks();
  renderHome();
  updateBadges();
  if (currentPage === 'calendar') renderCalendar();
  if (currentPage === 'project-detail') renderProjectDetail();
  showToast(editTaskId ? 'Task updated' : 'Task added');
};

// Patch openTaskModal to populate time + days
const _origOpenTaskModal = openTaskModal;
openTaskModal = function(id = null) {
  // Dynamically populate project dropdown from DB
  const sel = document.getElementById('task-project');
  if (sel) {
    const projects = DB.get('projects');
    const fixed = ['', 'Personal'];
    // Keep fixed options, add any DB projects not already listed
    const existing = Array.from(sel.options).map(o => o.value);
    projects.forEach(p => {
      if (!existing.includes(p.name)) {
        const opt = document.createElement('option');
        opt.value = p.name; opt.textContent = p.name;
        sel.appendChild(opt);
      }
    });
  }
  _origOpenTaskModal(id);
  if (id) {
    const t = DB.get('tasks').find(x => x.id === id);
    if (t) {
      document.getElementById('task-time').value = t.taskTime || '';
      if (t.recurrence === 'days' && t.daysOfWeek) {
        const names = ['dow-sun','dow-mon','dow-tue','dow-wed','dow-thu','dow-fri','dow-sat'];
        names.forEach((n, i) => {
          const el = document.getElementById(n);
          if (el) el.checked = t.daysOfWeek.includes(i);
        });
      }
      toggleRecurrenceFields();
    }
  } else {
    document.getElementById('task-time').value = '';
    document.getElementById('task-recurrence').value = 'none';
    toggleRecurrenceFields();
    ['dow-sun','dow-mon','dow-tue','dow-wed','dow-thu','dow-fri','dow-sat'].forEach(n => {
      const el = document.getElementById(n); if (el) el.checked = false;
    });
  }
};

// Also update project task options to include project names from DB
const _origOpenTaskModal2 = openTaskModal;

