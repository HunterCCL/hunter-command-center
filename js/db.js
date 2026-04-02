// ============================================================
// DATA LAYER
// ============================================================
const DB = {
  get(k) { try { return JSON.parse(localStorage.getItem('hcc_'+k)) || []; } catch { return []; } },
  set(k,v) { localStorage.setItem('hcc_'+k, JSON.stringify(v)); },
  getObj(k,d={}) { try { return JSON.parse(localStorage.getItem('hcc_'+k)) || d; } catch { return d; } },
  setObj(k,v) { localStorage.setItem('hcc_'+k, JSON.stringify(v)); }
};

// ============================================================
// UTILITIES
// ============================================================
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function today() { return new Date().toISOString().split('T')[0]; }
function getWeekStart() {
  const d=new Date(); const day=d.getDay(); const diff=d.getDate()-day+(day===0?-6:1);
  return new Date(d.setDate(diff)).toISOString().split('T')[0];
}
function nextWeekday(offset=0) { const d=new Date(); d.setDate(d.getDate()+offset); return d.toISOString().split('T')[0]; }
function nextMWF() {
  const d=new Date(); const day=d.getDay();
  let add=1;
  if(day===1||day===3||day===5) add=0;
  else if(day===2||day===4) add=1;
  else if(day===6) add=2;
  else add=1;
  if(add===0) { const now=new Date(); if(d<=now) add=2; }
  d.setDate(d.getDate()+add);
  return d.toISOString().split('T')[0];
}
function formatDate(s) {
  if(!s) return '';
  const d=new Date(s+'T00:00:00');
  return d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function daysUntil(s) { if(!s) return null; const d=new Date(s+'T00:00:00'); const n=new Date(); n.setHours(0,0,0,0); return Math.round((d-n)/86400000); }
function daysSince(s) { if(!s) return 999; const d=new Date(s+'T00:00:00'); const n=new Date(); n.setHours(0,0,0,0); return Math.round((n-d)/86400000); }
function isOverdue(t) { if(!t.due||t.completed) return false; return daysUntil(t.due)<0; }
function showToast(msg) { const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2500); }


// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(overlay=>{
  overlay.addEventListener('click',function(e){if(e.target===this)closeModal(this.id);});
});

// ============================================================
// GOOGLE SHEETS SYNC
// ============================================================
const SHEETS_CONFIG = {
  CLIENT_ID: localStorage.getItem('hcc_goog_client_id') || '',
  SHEET_ID: '1GbfvlwEcSOt1Eqw-IPAQ1zFt4irNRy5iA23PmDf7Hyk',
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
};

let gapiReady = false;
let gisReady = false;
let tokenClient = null;
let syncStatus = 'disconnected'; // disconnected | connected | syncing | error
let syncDebounceTimer = null;

function setSyncStatus(status, msg) {
  syncStatus = status;
  const btn = document.getElementById('sync-btn');
  const dot = document.getElementById('sync-dot');
  const label = document.getElementById('sync-btn-label');
  const statusText = document.getElementById('sync-status-text');
  const disconnect = document.getElementById('sync-disconnect');
  const restoreBtn = document.getElementById('restore-btn');

  btn.className = 'sync-btn';
  dot.className = 'sync-dot';

  if (status === 'disconnected') {
    dot.classList.add('blue'); label.textContent = 'Connect Google';
    statusText.textContent = msg || 'Data stored locally';
    disconnect.style.display = 'none';
    restoreBtn.style.display = 'none';
  } else if (status === 'connected') {
    btn.classList.add('connected'); dot.classList.add('green');
    label.textContent = 'Sheets Synced';
    statusText.textContent = msg || 'Last sync: just now';
    disconnect.style.display = 'block';
    restoreBtn.style.display = 'block';
  } else if (status === 'syncing') {
    btn.classList.add('syncing'); dot.classList.add('amber');
    label.textContent = 'Syncing...';
    statusText.textContent = msg || 'Writing to Sheets...';
    disconnect.style.display = 'block';
    restoreBtn.style.display = 'block';
  } else if (status === 'error') {
    btn.classList.add('error'); dot.classList.add('red');
    label.textContent = 'Sync Error';
    statusText.textContent = msg || 'Check connection';
    disconnect.style.display = 'block';
    restoreBtn.style.display = 'block';
  }
}

function loadGoogleLibs() {
  // Load GAPI
  const gapiScript = document.createElement('script');
  gapiScript.src = 'https://apis.google.com/js/api.js';
  gapiScript.onload = () => {
    gapi.load('client', async () => {
      await gapi.client.init({
        discoveryDocs: [SHEETS_CONFIG.DISCOVERY_DOC],
      });
      gapiReady = true;
      checkLibsReady();
    });
  };
  document.head.appendChild(gapiScript);

  // Load GIS
  const gisScript = document.createElement('script');
  gisScript.src = 'https://accounts.google.com/gsi/client';
  gisScript.onload = () => {
    gisReady = true;
    checkLibsReady();
  };
  document.head.appendChild(gisScript);
}

function checkLibsReady() {
  if (!gapiReady || !gisReady) return;
  const clientId = localStorage.getItem('hcc_goog_client_id');
  if (!clientId) {
    // Prompt for client ID on first use
    return;
  }
  initTokenClient(clientId);
  // Auto-reconnect if we have a saved token
  const savedToken = localStorage.getItem('hcc_goog_token');
  if (savedToken) {
    try {
      const token = JSON.parse(savedToken);
      gapi.client.setToken(token);
      setSyncStatus('connected', 'Reconnected');
      syncAllToSheets();
    } catch(e) {
      localStorage.removeItem('hcc_goog_token');
    }
  }
}

function initTokenClient(clientId) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SHEETS_CONFIG.SCOPES,
    callback: async (resp) => {
      if (resp.error) {
        setSyncStatus('error', resp.error);
        return;
      }
      localStorage.setItem('hcc_goog_token', JSON.stringify(gapi.client.getToken()));
      setSyncStatus('connected', 'Connected');
      showToast('Google Sheets connected');
      await syncAllToSheets();
    },
  });
}

function handleSyncClick() {
  if (syncStatus === 'connected' || syncStatus === 'syncing') {
    syncAllToSheets();
    return;
  }
  // First time — ask for client ID if not saved
  let clientId = localStorage.getItem('hcc_goog_client_id');
  if (!clientId) {
    clientId = prompt('Paste your Google OAuth Client ID:');
    if (!clientId) return;
    localStorage.setItem('hcc_goog_client_id', clientId.trim());
    initTokenClient(clientId.trim());
  }
  if (!tokenClient) { initTokenClient(clientId); }
  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  } else {
    tokenClient.requestAccessToken({ prompt: '' });
  }
}

function disconnectGoogle() {
  const token = gapi.client.getToken();
  if (token) google.accounts.oauth2.revoke(token.access_token, ()=>{});
  gapi.client.setToken('');
  localStorage.removeItem('hcc_goog_token');
  setSyncStatus('disconnected', 'Disconnected');
  showToast('Google disconnected');
}

// Debounced sync — waits 1.5s after last change before writing
function scheduleSyncToSheets() {
  if (syncStatus !== 'connected' && syncStatus !== 'syncing') return;
  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => syncAllToSheets(), 1500);
}

async function syncAllToSheets() {
  if (!gapiReady || !gapi.client.getToken()) return;
  setSyncStatus('syncing', 'Writing to Sheets...');
  try {
    const accounts = DB.get('accounts');
    const interactions = DB.get('interactions');
    const tasks = DB.get('tasks');
    const projects = DB.get('projects');
    const kpis = DB.getObj('kpis');

    await writeSheet('Contacts', [
      ['id','company','contactName','contactTitle','phone','email','linkedin','prefContact','stage','commodity','lane','volume','project','forwarder','referral','notes','lastContacted','created'],
      ...accounts.map(a=>[a.id,a.company,a.contactName||'',a.contactTitle||'',a.phone||'',a.email||'',a.linkedin||'',a.prefContact||'',a.stage,a.commodity||'',a.lane||'',a.volume||'',a.project||'',a.forwarder||'',a.referral||'',a.notes||'',a.lastContacted||'',a.created||''])
    ]);

    await writeSheet('Interactions', [
      ['id','accountId','date','type','notes','followupDate'],
      ...interactions.map(i=>[i.id,i.accountId,i.date,i.type,i.notes,i.followupDate||''])
    ]);

    await writeSheet('Tasks', [
      ['id','name','urgency','project','due','recurrence','customDays','completed','created'],
      ...tasks.map(t=>[t.id,t.name,t.urgency,t.project||'',t.due||'',t.recurrence||'none',t.customDays||'',t.completed?'TRUE':'FALSE',t.created||''])
    ]);

    await writeSheet('Projects', [
      ['id','name','customer','status','color','desc','blocker','next','notes','created'],
      ...projects.map(p=>[p.id,p.name,p.customer||'',p.status,p.color,p.desc||'',p.blocker||'',p.next||'',JSON.stringify(p.notes||[]),p.created||''])
    ]);

    await writeSheet('KPIs', [
      ['key','value'],
      ['calls', kpis.calls||0],
      ['callsGoal', kpis.callsGoal||25],
      ['prospects', kpis.prospects||0],
      ['prospectsGoal', kpis.prospectsGoal||5],
      ['followups', kpis.followups||0],
      ['followupsGoal', kpis.followupsGoal||10],
      ['callHours', kpis.callHours||0],
      ['callHoursGoal', kpis.callHoursGoal||2],
      ['weekStart', kpis.weekStart||''],
    ]);

    const now = new Date().toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    setSyncStatus('connected', 'Last sync: '+now);
    localStorage.setItem('hcc_goog_token', JSON.stringify(gapi.client.getToken()));
  } catch(e) {
    console.error('Sync error:', e);
    if (e.status === 401) {
      localStorage.removeItem('hcc_goog_token');
      setSyncStatus('disconnected', 'Session expired — reconnect');
    } else {
      setSyncStatus('error', 'Sync failed — will retry');
      setTimeout(()=>syncAllToSheets(), 5000);
    }
  }
}

async function writeSheet(tabName, rows) {
  // Clear then write
  await gapi.client.sheets.spreadsheets.values.clear({
    spreadsheetId: SHEETS_CONFIG.SHEET_ID,
    range: tabName,
  });
  if (rows.length <= 1) return; // header only, nothing to write
  await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_CONFIG.SHEET_ID,
    range: tabName + '!A1',
    valueInputOption: 'RAW',
    resource: { values: rows },
  });
}

// Patch DB.set to trigger sync after every write
const _originalSet = DB.set.bind(DB);
DB.set = function(k, v) {
  _originalSet(k, v);
  scheduleSyncToSheets();
};

async function restoreFromSheets() {
  if (!gapiReady || !gapi.client.getToken()) {
    showToast('Connect to Google Sheets first');
    return;
  }
  if (!confirm('RESTORE FROM SHEETS\n\nThis will replace all local data (accounts, interactions, tasks, projects) with data from Google Sheets.\n\nNote: priority flags, tags, and sourceTab are not stored in Sheets and will not be restored.\n\nThis cannot be undone. Continue?')) return;

  const btn = document.getElementById('restore-btn');
  btn.disabled = true;
  btn.textContent = 'Restoring...';
  setSyncStatus('syncing', 'Restoring from Sheets...');

  try {
    const readTab = async (tab) => {
      const resp = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SHEETS_CONFIG.SHEET_ID,
        range: tab,
      });
      return resp.result.values || [];
    };

    const rowsToObjects = (rows) => {
      if (rows.length < 2) return [];
      const headers = rows[0];
      return rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
        return obj;
      });
    };

    const [contactRows, interactionRows, taskRows, projectRows] = await Promise.all([
      readTab('Contacts'),
      readTab('Interactions'),
      readTab('Tasks'),
      readTab('Projects'),
    ]);

    const accounts = rowsToObjects(contactRows);

    const interactions = rowsToObjects(interactionRows);

    const tasks = rowsToObjects(taskRows).map(t => ({
      ...t,
      completed: t.completed === 'TRUE',
    }));

    const projects = rowsToObjects(projectRows).map(p => ({
      ...p,
      notes: (() => { try { return JSON.parse(p.notes); } catch(e) { return []; } })(),
      milestones: [],
    }));

    // Write directly via _originalSet — bypasses the sync patch so we don't
    // immediately write back to Sheets and undo the restore.
    _originalSet('accounts', accounts);
    _originalSet('interactions', interactions);
    _originalSet('tasks', tasks);
    _originalSet('projects', projects);

    const counts = `${accounts.length} accounts, ${interactions.length} interactions, ${tasks.length} tasks, ${projects.length} projects`;
    console.log('Restore complete:', counts);
    showToast('Restored ' + counts + ' — reloading...');
    setTimeout(() => window.location.reload(), 1500);
  } catch(e) {
    console.error('Restore error:', e);
    setSyncStatus('error', 'Restore failed — check console');
    showToast('Restore failed');
    btn.disabled = false;
    btn.textContent = 'Restore from Sheets';
  }
}


