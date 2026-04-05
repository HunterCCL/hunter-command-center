// ============================================================
// FOLLOW-UP DASHBOARD
// ============================================================

// ── Local date helper (no UTC shift) ──────────────────────
// Uses local date components, safe in all timezones.
function fuDateOffset(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ── Pure bucket logic ──────────────────────────────────────
// Returns { overdue: [...], dueThisWeek: [...], comingUp: [...] }
// Each item is an account object enriched with a followupReason string.
// Buckets are mutually exclusive — most urgent bucket wins.
// If followupDate is explicitly set, it governs the bucket.
// Cadence-based rules (no-contact thresholds) only fire when no followupDate is set.
function getFollowupBuckets() {
  const accounts = DB.get('accounts');
  const todayStr = fuDateOffset(0);
  const in7     = fuDateOffset(7);
  const in30    = fuDateOffset(30);
  const activeStages = ['Contacted', 'Engaged', 'Warm', 'Proposal', 'Negotiating'];

  const overdue     = [];
  const dueThisWeek = [];
  const comingUp    = [];

  accounts.forEach(a => {
    const fp = a.followupDate || null;
    const ds = daysSince(a.lastContacted); // 999 if never contacted
    let reason = '';
    let bucket = null;

    // ── Overdue ──────────────────────────────────────────
    if (fp && fp < todayStr) {
      const daysAgo = Math.abs(daysUntil(fp));
      reason = daysAgo === 1
        ? 'Follow-up 1 day overdue'
        : 'Follow-up ' + daysAgo + ' days overdue';
      bucket = 'overdue';
    } else if (!fp && a.lastContacted && activeStages.includes(a.stage) && ds >= 14) {
      reason = 'No contact in ' + ds + ' days';
      bucket = 'overdue';
    }

    // ── Due This Week ─────────────────────────────────────
    else if (fp && fp >= todayStr && fp <= in7) {
      const du = daysUntil(fp);
      reason = du === 0
        ? 'Follow-up due today'
        : 'Follow-up in ' + du + ' day' + (du === 1 ? '' : 's');
      bucket = 'dueThisWeek';
    }

    // ── Coming Up ─────────────────────────────────────────
    else if (fp && fp > in7 && fp <= in30) {
      const du = daysUntil(fp);
      reason = 'Follow-up in ' + du + ' days';
      bucket = 'comingUp';
    } else if (!fp && a.lastContacted && ds >= 7 && ds < 14) {
      reason = 'No contact in ' + ds + ' days';
      bucket = 'comingUp';
    }

    if (bucket) {
      const enriched = { ...a, followupReason: reason };
      if (bucket === 'overdue')      overdue.push(enriched);
      else if (bucket === 'dueThisWeek') dueThisWeek.push(enriched);
      else                           comingUp.push(enriched);
    }
  });

  return { overdue, dueThisWeek, comingUp };
}

// ── Convenience count for badges ──────────────────────────
function getFollowupOverdueCount() {
  return getFollowupBuckets().overdue.length;
}

// ── HTML builders (pure — no side effects) ────────────────
function followupBucketHTML(title, accounts, color) {
  return `<div style="margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
      <span style="font-family:var(--font-mono);font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${color}">${title}</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);background:var(--surface-2);border-radius:10px;padding:1px 7px">${accounts.length}</span>
    </div>
    ${accounts.map(followupRowHTML).join('')}
  </div>`;
}

function followupRowHTML(a) {
  const lastContact = a.lastContacted ? formatDate(a.lastContacted) : 'Never';
  return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:8px">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:13px;font-weight:500;color:var(--text)">${a.company}</span>
          ${a.contactName ? `<span style="font-size:11px;color:var(--text-dim)">${a.contactName}</span>` : ''}
          <span style="font-size:9px;font-weight:600;padding:2px 7px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--text-dim);font-family:var(--font-mono)">${a.stage}</span>
        </div>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--text-muted)">Last contact: <strong style="color:var(--text-dim)">${lastContact}</strong></span>
          <span style="font-size:11px;color:var(--text-dim)">${a.followupReason}</span>
        </div>
      </div>
      <div style="display:flex;gap:5px;flex-wrap:wrap;flex-shrink:0;margin-top:2px">
        <button class="btn btn-ghost btn-sm" onclick="openAccountDetail('${a.id}')">Open</button>
        <button class="btn btn-ghost btn-sm" onclick="openAccountDetail('${a.id}')">Log</button>
        <button class="btn btn-ghost btn-sm" onclick="openCallPrep('${a.id}')">Call Prep</button>
        <button class="btn btn-ghost btn-sm" onclick="setFollowupDatePrompt('${a.id}')">Set Date</button>
      </div>
    </div>
  </div>`;
}

function buildFollowupHTML() {
  const { overdue, dueThisWeek, comingUp } = getFollowupBuckets();
  if (!overdue.length && !dueThisWeek.length && !comingUp.length) {
    return '<div class="empty-state"><div class="empty-icon">✅</div><h3>All caught up</h3><p>No follow-ups due right now.</p></div>';
  }
  let html = '';
  if (overdue.length)     html += followupBucketHTML('Overdue',       overdue,     'var(--hot)');
  if (dueThisWeek.length) html += followupBucketHTML('Due This Week', dueThisWeek, 'var(--warm)');
  if (comingUp.length)    html += followupBucketHTML('Coming Up',     comingUp,    'var(--text-dim)');
  return html;
}

// ── Render functions ───────────────────────────────────────
function renderFollowups() {
  const el = document.getElementById('followups-content');
  if (el) el.innerHTML = buildFollowupHTML();
}

function renderFollowupsInAccounts() {
  const el = document.getElementById('accounts-list');
  if (el) el.innerHTML = buildFollowupHTML();
}

// ── Badge sync ────────────────────────────────────────────
function updateFollowupBadges() {
  const count = getFollowupOverdueCount();
  const badge = document.getElementById('followups-badge');
  if (badge) { badge.textContent = count; badge.style.display = count ? '' : 'none'; }
  const tabCount = document.getElementById('count-Followups');
  if (tabCount) {
    const { overdue, dueThisWeek, comingUp } = getFollowupBuckets();
    tabCount.textContent = overdue.length + dueThisWeek.length + comingUp.length;
  }
}

// ── Home screen summary card ──────────────────────────────
function renderFollowupSummaryCard() {
  const container = document.getElementById('followup-summary-container');
  if (!container) return;
  const { overdue, dueThisWeek } = getFollowupBuckets();
  if (overdue.length) {
    const n = overdue.length;
    container.innerHTML = `<div class="habit-nudge" style="background:rgba(255,71,87,0.08);border-color:rgba(255,71,87,0.25)" onclick="navigate('followups')">
      <div class="habit-nudge-icon">🔔</div>
      <div class="habit-nudge-text">
        <strong style="color:var(--hot)">${n} overdue follow-up${n === 1 ? '' : 's'}</strong>
        <span>Tap to open Follow-ups and action them now.</span>
      </div>
      <span style="color:var(--text-muted);font-size:18px">→</span>
    </div>`;
  } else if (dueThisWeek.length) {
    const n = dueThisWeek.length;
    container.innerHTML = `<div class="habit-nudge" onclick="navigate('followups')">
      <div class="habit-nudge-icon">🔔</div>
      <div class="habit-nudge-text">
        <strong>${n} follow-up${n === 1 ? '' : 's'} due this week</strong>
        <span>Tap to review and action them.</span>
      </div>
      <span style="color:var(--text-muted);font-size:18px">→</span>
    </div>`;
  } else {
    container.innerHTML = '';
  }
}

// ── Follow-up date modal ──────────────────────────────────
let _followupAccountId = null;

function setFollowupDatePrompt(accountId) {
  const accounts = DB.get('accounts');
  const a = accounts.find(x => x.id === accountId);
  if (!a) return;
  _followupAccountId = accountId;
  document.getElementById('followup-date-modal-title').textContent = 'Follow-up: ' + a.company;
  document.getElementById('followup-date-input').value = a.followupDate || '';
  openModal('followup-date-modal');
}

function saveFollowupDate() {
  if (!_followupAccountId) return;
  const date = document.getElementById('followup-date-input').value;
  if (!date) { showToast('Select a date'); return; }
  const accounts = DB.get('accounts');
  const idx = accounts.findIndex(x => x.id === _followupAccountId);
  if (idx === -1) return;
  accounts[idx].followupDate = date;
  DB.set('accounts', accounts);
  syncFollowupTask(_followupAccountId, date);
  closeModal('followup-date-modal');
  showToast('Follow-up set: ' + formatDate(date));
  renderFollowups();
  updateFollowupBadges();
}

function clearFollowupDate() {
  if (!_followupAccountId) return;
  const accounts = DB.get('accounts');
  const idx = accounts.findIndex(x => x.id === _followupAccountId);
  if (idx === -1) return;
  accounts[idx].followupDate = null;
  DB.set('accounts', accounts);
  syncFollowupTask(_followupAccountId, null);
  closeModal('followup-date-modal');
  showToast('Follow-up date cleared');
  renderFollowups();
  updateFollowupBadges();
}

// ── Linked task sync ──────────────────────────────────────
// Creates, updates, or deletes the linked follow-up task for an account.
function syncFollowupTask(accountId, newDate) {
  const tasks = DB.get('tasks');
  const existingIdx = tasks.findIndex(t =>
    t.accountId === accountId &&
    (t.tags||'').split(',').map(s=>s.trim()).includes('followup') &&
    !t.completed
  );

  if (newDate) {
    if (existingIdx !== -1) {
      // Update existing linked task's due date
      tasks[existingIdx].due = newDate;
      DB.set('tasks', tasks);
    } else {
      // Create new linked task
      const a = DB.get('accounts').find(x => x.id === accountId);
      if (!a) return;
      const linked = {
        id: uid(),
        name: 'Follow up with ' + a.company,
        urgency: 'medium',
        project: 'Crest Houston Launch',
        due: newDate,
        recurrence: 'none',
        customDays: 7,
        taskTime: '',
        daysOfWeek: [],
        tags: 'followup',
        accountId: accountId,
        completed: false,
        created: today(),
      };
      tasks.unshift(linked);
      DB.set('tasks', tasks);
    }
  } else {
    // Date cleared — remove linked task
    if (existingIdx !== -1) {
      tasks.splice(existingIdx, 1);
      DB.set('tasks', tasks);
    }
  }
  updateBadges();
}

// ── Follow-up task check-off completion ───────────────────
// Called from toggleTask when a linked follow-up task is marked complete.
// Logs the interaction, clears followupDate, deletes the task.
function completeFollowupTask(task) {
  // 1. Log interaction on the account
  const interactions = DB.get('interactions');
  interactions.unshift({ id: uid(), accountId: task.accountId, date: today(), type: 'Note', notes: 'Follow-up completed', followupDate: '' });
  DB.set('interactions', interactions);

  // 2. Clear followupDate on account
  const accounts = DB.get('accounts');
  const aIdx = accounts.findIndex(a => a.id === task.accountId);
  if (aIdx !== -1) { accounts[aIdx].lastContacted = today(); accounts[aIdx].followupDate = null; DB.set('accounts', accounts); }

  // 3. Delete the linked task (already marked complete — remove it entirely)
  DB.set('tasks', DB.get('tasks').filter(t => t.id !== task.id));

  showToast('Follow-up complete — interaction logged');
  renderFollowups();
  updateFollowupBadges();
}
