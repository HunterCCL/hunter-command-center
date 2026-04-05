// ============================================================
// CRM
// ============================================================
let currentStageFilter='Priority';
let currentAccountId=null;

// ── current tags being edited in modal ──
let _editingTags = [];

function filterByStage(btn,stage) {
  document.querySelectorAll('.pipeline-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active'); currentStageFilter=stage; renderAccounts();
}

function togglePriority(e, accountId) {
  e.stopPropagation();
  const accounts=DB.get('accounts');
  const idx=accounts.findIndex(a=>a.id===accountId);
  if(idx===-1) return;
  accounts[idx].priority=!accounts[idx].priority;
  DB.set('accounts',accounts);
  renderAccounts();
  showToast(accounts[idx].priority?'⭐ Marked as priority':'Removed from priority');
}

function renderAccounts() {
  const accounts=DB.get('accounts');
  const search=(document.getElementById('crm-search-input')?.value||'').toLowerCase();

  // Stage counts
  const stages=['All','Target','Contacted','Engaged','Warm','Proposal','Negotiating','Onboarded','Dormant'];
  stages.forEach(s=>{
    const el=document.getElementById('count-'+s);
    if(el) el.textContent=s==='All'?accounts.length:accounts.filter(a=>a.stage===s).length;
  });
  const prioEl=document.getElementById('count-Priority');
  if(prioEl) prioEl.textContent=accounts.filter(a=>a.priority).length;
  const fuCountEl=document.getElementById('count-Followups');
  if(fuCountEl){ const b=getFollowupBuckets(); fuCountEl.textContent=b.overdue.length+b.dueThisWeek.length+b.comingUp.length; }
  if(currentStageFilter==='Followups'){ renderFollowupsInAccounts(); return; }

  // Populate source dropdown
  const sourceSel=document.getElementById('filter-source');
  if(sourceSel){
    const curSrc=sourceSel.value;
    const sources=[...new Set(accounts.map(a=>a.sourceTab||'').filter(Boolean))].sort();
    sourceSel.innerHTML='<option value="">All Sources</option>'+sources.map(s=>`<option${s===curSrc?' selected':''}>${s}</option>`).join('');
  }
  // Populate list dropdown
  const lists=DB.getObj('lists')||[];
  const listSel=document.getElementById('filter-list');
  if(listSel){
    const curList=listSel.value;
    listSel.innerHTML='<option value="">All Lists</option>'+lists.map(l=>`<option value="${l.id}"${l.id===curList?' selected':''}>${l.name}</option>`).join('');
  }
  // Populate tag dropdown
  const allTags=[...new Set(accounts.flatMap(a=>(a.tags||'').split(',').map(t=>t.trim()).filter(Boolean)))].sort();
  const tagSel=document.getElementById('filter-tag');
  if(tagSel){
    const curTag=tagSel.value;
    tagSel.innerHTML='<option value="">All Tags</option>'+allTags.map(t=>`<option${t===curTag?' selected':''}>${t}</option>`).join('');
  }

  // Filter
  let filtered=accounts;
  if(currentStageFilter==='Priority') filtered=filtered.filter(a=>a.priority);
  else if(currentStageFilter!=='All') filtered=filtered.filter(a=>a.stage===currentStageFilter);
  if(search) filtered=filtered.filter(a=>
    (a.company||'').toLowerCase().includes(search)||(a.contactName||'').toLowerCase().includes(search)||
    (a.commodity||'').toLowerCase().includes(search)||(a.notes||'').toLowerCase().includes(search)||
    (a.lane||'').toLowerCase().includes(search)
  );
  const srcFilter=document.getElementById('filter-source')?.value||'';
  if(srcFilter) filtered=filtered.filter(a=>(a.sourceTab||'')===srcFilter);
  const listFilter=document.getElementById('filter-list')?.value||'';
  if(listFilter){
    const lst=lists.find(l=>l.id===listFilter);
    if(lst) filtered=filtered.filter(a=>(lst.accountIds||[]).includes(a.id));
  }
  const tagFilter=document.getElementById('filter-tag')?.value||'';
  if(tagFilter) filtered=filtered.filter(a=>(a.tags||'').split(',').map(t=>t.trim().toLowerCase()).includes(tagFilter.toLowerCase()));

  const list=document.getElementById('accounts-list');
  if(!filtered.length){
    const emptyMsg=currentStageFilter==='Priority'?['⭐','No priority accounts yet','Tap the ⭐ on any account card to mark it as priority.']:['🏢',accounts.length===0?'No accounts yet':'No results',accounts.length===0?'Add your first account to start building the pipeline.':'Try a different search or filter.'];
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">${emptyMsg[0]}</div><h3>${emptyMsg[1]}</h3><p>${emptyMsg[2]}</p></div>`;
    return;
  }

  list.innerHTML=filtered.map(a=>{
    const ds=daysSince(a.lastContacted);
    let staleClass='',staleBadge='';
    if(a.lastContacted){
      if(ds>=14){staleClass='stale-hot';staleBadge=`<span class="stale-badge stale-hot-badge">${ds}d no contact</span>`;}
      else if(ds>=7){staleClass='stale-warn';staleBadge=`<span class="stale-badge stale-warn-badge">${ds}d no contact</span>`;}
    }
    if(a.priority&&!staleClass) staleClass='priority-card';
    const touches=DB.get('interactions').filter(i=>i.accountId===a.id).length;
    const customTags=(a.tags||'').split(',').map(t=>t.trim()).filter(Boolean).map(t=>`<span class="tag tag-custom">${t}</span>`).join('');
    return `<div class="account-card ${staleClass}" onclick="openAccountDetail('${a.id}')">
      <div class="account-card-header">
        <div><div class="account-name">${a.company}</div><div class="account-company">${a.contactName||''}${a.contactTitle?' · '+a.contactTitle:''}</div></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <button class="priority-star ${a.priority?'active':''}" onclick="togglePriority(event,'${a.id}')" title="${a.priority?'Remove priority':'Mark as priority'}">⭐</button>
          ${staleBadge}<div class="account-touches">👆 ${touches} touch${touches!==1?'es':''}</div>
        </div>
      </div>
      <div class="account-meta">
        <span class="tag tag-stage">${a.stage}</span>
        ${a.commodity?`<span class="tag tag-commodity">${a.commodity}</span>`:''}
        ${a.lane?`<span class="tag tag-project">${a.lane}</span>`:''}
        ${a.sourceTab?`<span class="tag tag-source">${a.sourceTab}</span>`:''}
        ${customTags}
      </div>
    </div>`;
  }).join('');
}

function openAccountModal(id=null) {
  const fields=['acc-company','acc-commodity','acc-lane','acc-volume','acc-stage','acc-project','acc-forwarder','acc-referral','acc-contact-name','acc-contact-title','acc-phone','acc-email','acc-linkedin','acc-pref-contact','acc-notes'];
  const lists=DB.getObj('lists')||[];
  if(id){
    const a=DB.get('accounts').find(x=>x.id===id); if(!a)return;
    document.getElementById('account-modal-title').textContent='Edit Account';
    document.getElementById('acc-company').value=a.company||'';
    document.getElementById('acc-commodity').value=a.commodity||'';
    document.getElementById('acc-lane').value=a.lane||'';
    document.getElementById('acc-volume').value=a.volume||'';
    document.getElementById('acc-stage').value=a.stage||'Target';
    document.getElementById('acc-priority').checked=a.priority||false;
    document.getElementById('acc-project').value=a.project||'Crest';
    document.getElementById('acc-forwarder').value=a.forwarder||'';
    document.getElementById('acc-referral').value=a.referral||'';
    document.getElementById('acc-contact-name').value=a.contactName||'';
    document.getElementById('acc-contact-title').value=a.contactTitle||'';
    document.getElementById('acc-phone').value=a.phone||'';
    document.getElementById('acc-email').value=a.email||'';
    document.getElementById('acc-linkedin').value=a.linkedin||'';
    document.getElementById('acc-pref-contact').value=a.prefContact||'';
    document.getElementById('acc-notes').value=a.notes||'';
    document.getElementById('acc-source-display').textContent=a.sourceTab||'Manually added';
    _editingTags=(a.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
    document.getElementById('account-modal').dataset.editId=id;
  } else {
    document.getElementById('account-modal-title').textContent='New Account';
    fields.forEach(f=>{const el=document.getElementById(f);if(el)el.value='';});
    document.getElementById('acc-stage').value='Target';
    document.getElementById('acc-priority').checked=false;
    document.getElementById('acc-project').value='Crest';
    document.getElementById('acc-source-display').textContent='Manually added';
    _editingTags=[];
    delete document.getElementById('account-modal').dataset.editId;
  }
  // Render tags
  renderTagChips();
  // Render lists checkboxes
  const listsCont=document.getElementById('acc-lists-checkboxes');
  const acctId=id||'';
  listsCont.innerHTML=lists.length?lists.map(l=>{
    const checked=(l.accountIds||[]).includes(acctId);
    return `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer"><input type="checkbox" data-list-id="${l.id}" ${checked?'checked':''} style="accent-color:#a29bfe"> ${l.name}</label>`;
  }).join(''):'<span style="font-size:11px;color:var(--text-muted)">No lists yet — create one via ⚙ Lists</span>';
  openModal('account-modal');
}

function renderTagChips() {
  const wrap=document.getElementById('tag-input-wrap');
  if(!wrap) return;
  const input=document.getElementById('tag-text-input');
  wrap.innerHTML='';
  _editingTags.forEach((tag,i)=>{
    const chip=document.createElement('span');
    chip.className='tag-chip';
    chip.innerHTML=`${tag} <span class="tag-chip-remove" onclick="removeTag(${i})">×</span>`;
    wrap.appendChild(chip);
  });
  wrap.appendChild(input);
  input.value='';
}

function handleTagInput(e) {
  if(e.key==='Enter'||e.key===',') {
    e.preventDefault();
    const val=e.target.value.replace(',','').trim().toLowerCase();
    if(val&&!_editingTags.includes(val)) { _editingTags.push(val); renderTagChips(); }
    else e.target.value='';
  }
  if(e.key==='Backspace'&&e.target.value===''&&_editingTags.length) {
    _editingTags.pop(); renderTagChips();
  }
}

function removeTag(i) { _editingTags.splice(i,1); renderTagChips(); }

function saveAccount() {
  const company=document.getElementById('acc-company').value.trim();
  if(!company){showToast('Company name required');return;}
  const editId=document.getElementById('account-modal').dataset.editId;
  const accounts=DB.get('accounts');
  const data={
    company,
    commodity:document.getElementById('acc-commodity').value.trim(),
    lane:document.getElementById('acc-lane').value.trim(),
    volume:document.getElementById('acc-volume').value.trim(),
    stage:document.getElementById('acc-stage').value,
    priority:document.getElementById('acc-priority').checked,
    project:document.getElementById('acc-project').value,
    forwarder:document.getElementById('acc-forwarder').value.trim(),
    referral:document.getElementById('acc-referral').value,
    contactName:document.getElementById('acc-contact-name').value.trim(),
    contactTitle:document.getElementById('acc-contact-title').value.trim(),
    phone:document.getElementById('acc-phone').value.trim(),
    email:document.getElementById('acc-email').value.trim(),
    linkedin:document.getElementById('acc-linkedin').value.trim(),
    prefContact:document.getElementById('acc-pref-contact').value,
    notes:document.getElementById('acc-notes').value.trim(),
    tags:_editingTags.join(','),
  };
  // finish typing any unsaved tag
  const tagInputVal=document.getElementById('tag-text-input')?.value.trim().toLowerCase();
  if(tagInputVal&&!_editingTags.includes(tagInputVal)) data.tags=(_editingTags.concat([tagInputVal])).join(',');

  if(editId){
    const idx=accounts.findIndex(a=>a.id===editId);
    if(idx!==-1) accounts[idx]={...accounts[idx],...data};
    // update list memberships
    const lists=DB.getObj('lists')||[];
    document.querySelectorAll('#acc-lists-checkboxes input[type=checkbox]').forEach(cb=>{
      const lid=cb.dataset.listId;
      const lst=lists.find(l=>l.id===lid);
      if(!lst) return;
      if(!lst.accountIds) lst.accountIds=[];
      if(cb.checked&&!lst.accountIds.includes(editId)) lst.accountIds.push(editId);
      if(!cb.checked) lst.accountIds=lst.accountIds.filter(i=>i!==editId);
    });
    DB.setObj('lists',lists);
  } else {
    data.id=uid(); data.created=today(); data.lastContacted=null;
    accounts.push(data);
    // add to checked lists
    const lists=DB.getObj('lists')||[];
    document.querySelectorAll('#acc-lists-checkboxes input[type=checkbox]').forEach(cb=>{
      if(!cb.checked) return;
      const lst=lists.find(l=>l.id===cb.dataset.listId);
      if(lst){if(!lst.accountIds)lst.accountIds=[];lst.accountIds.push(data.id);}
    });
    DB.setObj('lists',lists);
  }
  DB.set('accounts',accounts); closeModal('account-modal'); renderAccounts(); updateBadges();
  showToast(editId?'Account updated':'Account added');
}

function openAccountDetail(id) {
  const a=DB.get('accounts').find(x=>x.id===id); if(!a)return;
  currentAccountId=id;
  document.getElementById('detail-company-name').textContent=a.company;
  document.getElementById('detail-contact-name').textContent=[a.contactName,a.contactTitle].filter(Boolean).join(' · ');
  document.getElementById('detail-project-tag').textContent=a.project||'Crest';

  // Inline-editable fields
  document.getElementById('detail-lane').value=a.lane||'';
  document.getElementById('detail-volume').value=a.volume||'';
  document.getElementById('detail-phone').value=a.phone||'';
  document.getElementById('detail-email').value=a.email||'';
  document.getElementById('detail-pref').value=a.prefContact||'';
  document.getElementById('detail-forwarder').value=a.forwarder||'';
  document.getElementById('detail-contact-edit').value=a.contactName||'';
  document.getElementById('detail-title-edit').value=a.contactTitle||'';
  document.getElementById('detail-stage-edit').value=a.stage||'Target';
  document.getElementById('detail-commodity-edit').value=a.commodity||'';
  document.getElementById('detail-notes-edit').value=a.notes||'';

  document.getElementById('detail-tags').innerHTML=`
    <span class="tag tag-stage">${a.stage}</span>
    ${a.commodity?`<span class="tag tag-commodity">${a.commodity}`+'</span>':''}
    ${a.project?`<span class="tag tag-project">${a.project}`+'</span>':''}
  `;

  const interactions=DB.get('interactions').filter(i=>i.accountId===id).sort((a,b)=>b.date>a.date?1:-1);
  const tc=interactions.length;
  document.getElementById('detail-touch-count').textContent=tc+' total touch'+(tc!==1?'es':'');

  document.getElementById('detail-interactions').innerHTML=interactions.length===0?
    '<div style="font-size:11px;color:var(--text-muted);padding:8px 0">No interactions logged yet.</div>':
    interactions.slice(0,5).map(i=>`
      <div class="interaction-item">
        <div class="interaction-meta">
          <span class="interaction-date">${formatDate(i.date)}</span>
          <span class="interaction-type">${i.type}</span>
          ${i.followupDate?`<span style="font-size:10px;color:var(--warm)">Follow-up: ${formatDate(i.followupDate)}</span>`:''}
        </div>
        <div class="interaction-text">${i.notes}</div>
      </div>`).join('');

  document.getElementById('new-interaction-text').value='';
  document.getElementById('new-followup-date').value='';

  if(tc<10&&a.stage==='Dormant') showToast('Only '+tc+' touches — too early to mark dormant?');
  openModal('account-detail-modal');
  document.getElementById('account-tasks-section').innerHTML=renderAccountTasks(id);
}

function logInteraction() {
  const notes=document.getElementById('new-interaction-text').value.trim();
  if(!notes){showToast('Add notes first');return;}
  const interactions=DB.get('interactions');
  const followupDate=document.getElementById('new-followup-date').value;
  interactions.push({id:uid(),accountId:currentAccountId,date:today(),type:document.getElementById('new-interaction-type').value,notes,followupDate:followupDate||null});
  DB.set('interactions',interactions);
  const accounts=DB.get('accounts');
  const idx=accounts.findIndex(a=>a.id===currentAccountId);
  if(idx!==-1){
    accounts[idx].lastContacted=today();
    if(followupDate) accounts[idx].followupDate=followupDate;
    DB.set('accounts',accounts);
  }
  if(followupDate){
    syncFollowupTask(currentAccountId,followupDate);
    showToast('Logged + follow-up date set');
  } else { showToast('Interaction logged'); }
  openAccountDetail(currentAccountId); updateBadges(); updateFollowupBadges();
}

function editCurrentAccount() { closeModal('account-detail-modal'); openAccountModal(currentAccountId); }

function saveAccountField(field, value) {
  const accounts = DB.get('accounts');
  const idx = accounts.findIndex(a => a.id === currentAccountId);
  if (idx === -1) return;
  accounts[idx][field] = value;
  DB.set('accounts', accounts);
  // Refresh the header display fields that mirror editable inputs
  const a = accounts[idx];
  document.getElementById('detail-company-name').textContent = a.company;
  document.getElementById('detail-contact-name').textContent = [a.contactName, a.contactTitle].filter(Boolean).join(' · ');
  document.getElementById('detail-tags').innerHTML = `
    <span class="tag tag-stage">${a.stage}</span>
    ${a.commodity ? '<span class="tag tag-commodity">' + a.commodity + '</span>' : ''}
    ${a.project ? '<span class="tag tag-project">' + a.project + '</span>' : ''}
  `;
}

function deleteCurrentAccount() {
  if(!confirm('Delete this account?')) return;
  DB.set('accounts',DB.get('accounts').filter(a=>a.id!==currentAccountId));
  closeModal('account-detail-modal'); renderAccounts(); updateBadges(); showToast('Account deleted');
}

function copyContextToClaude() {
  const a=DB.get('accounts').find(x=>x.id===currentAccountId); if(!a)return;
  const interactions=DB.get('interactions').filter(i=>i.accountId===currentAccountId);
  const context=`ACCOUNT CONTEXT — ${a.company}
Contact: ${a.contactName||'N/A'} (${a.contactTitle||''})
Phone: ${a.phone||'N/A'} | Email: ${a.email||'N/A'}
Stage: ${a.stage} | Project: ${a.project}
Commodity: ${a.commodity||'N/A'} | Lane: ${a.lane||'N/A'}
Volume: ${a.volume?a.volume+' containers/yr':'N/A'}
Current FF: ${a.forwarder||'N/A'}
Preferred Contact: ${a.prefContact||'N/A'}
Total Touches: ${interactions.length}

Notes: ${a.notes||'None'}

Recent Interactions:
${interactions.slice(0,3).map(i=>`[${i.date}] ${i.type}: ${i.notes}`).join('\n')||'None logged'}`;
  navigator.clipboard.writeText(context).then(()=>showToast('Context copied — paste into new Claude chat'));
}


// ============================================================
// LISTS MANAGER
// ============================================================
function openListsManager() {
  renderListsManager();
  openModal('lists-manager-modal');
}

function renderListsManager() {
  const lists=DB.getObj('lists')||[];
  const accounts=DB.get('accounts');
  const cont=document.getElementById('lists-manager-items');
  if(!lists.length){
    cont.innerHTML='<div style="font-size:12px;color:var(--text-muted);text-align:center;padding:20px">No lists yet. Create your first list above.</div>';
    return;
  }
  cont.innerHTML=lists.map(l=>{
    const count=(l.accountIds||[]).length;
    return `<div class="lists-modal-item">
      <label><span style="font-size:16px">📋</span><div><div style="font-weight:500">${l.name}</div><div style="font-size:10px;color:var(--text-muted)">${count} account${count!==1?'s':''}</div></div></label>
      <button class="list-delete-btn" onclick="deleteList('${l.id}')" title="Delete list">✕</button>
    </div>`;
  }).join('');
}

function createList() {
  const name=document.getElementById('new-list-name').value.trim();
  if(!name){showToast('Enter a list name');return;}
  const lists=DB.getObj('lists')||[];
  if(lists.find(l=>l.name.toLowerCase()===name.toLowerCase())){showToast('List already exists');return;}
  lists.push({id:uid(),name,accountIds:[]});
  DB.setObj('lists',lists);
  document.getElementById('new-list-name').value='';
  renderListsManager();
  renderAccounts();
  showToast('List created: '+name);
}

function deleteList(id) {
  const lists=(DB.getObj('lists')||[]).filter(l=>l.id!==id);
  DB.setObj('lists',lists);
  renderListsManager();
  renderAccounts();
  showToast('List deleted');
}

// ============================================================
// CALL PREP
// ============================================================
let callPrepAccountId = null;
let intelChecked = {};
const OBJECTION_SCRIPTS = {
  happy: "That makes total sense — most companies I talk to have someone they trust and I'm not trying to disrupt that. Where we usually end up helping is when there's a rate spike, a documentation issue, or a lane the current FF doesn't cover well. Would you be open to me sending a rate on one lane just as a benchmark? If you're ever in a pinch you'll know who to call.",
  rates: "I appreciate you being straight. What rate are you working with right now? [After they say] Got it — let me go back to our carrier contacts and see if we have a commodity rate that gets us closer. Can I come back with a revised quote by [day]? And is it purely ocean freight or are there other costs I should factor in?",
  info: "Happy to. What would be most useful — rate comparison for your current lane, our company overview, or something specific to your commodity? [After they say] Perfect. What subject line should I use so it doesn't get lost?",
  notinterested: "Completely understand. What's the best way to stay on your radar for when the timing is right?",
  liner: "Not a problem — we can manage your shipments directly on your carrier contracts. You keep your rates and relationship, we handle docs, ISF, customs, and carrier coordination. A lot of clients use us exactly that way — as their logistics team, not a rate provider. Does that change anything?",
  small: "No volume minimums. And the documentation and compliance requirements are the same whether you're moving one container or fifty. Some of our best clients started with one shipment a year. Would it hurt to at least see what a rate looks like?",
  vendors: "That makes total sense. The thing is, when your vendors control the freight, they're optimizing for their costs, not yours. Having your own forwarder means you control the routing, the rates, and the documentation. Would you be completely opposed to me pulling a rate on one lane just so you have a number to compare?",
  change: "Completely understand. What's the best way to stay on your radar for when the timing is right?"
};

function openCallPrep(accountId) {
  const a = DB.get('accounts').find(x => x.id === accountId);
  if (!a) return;
  callPrepAccountId = accountId;
  intelChecked = {};

  const interactions = DB.get('interactions').filter(i => i.accountId === accountId);
  const lastInteraction = interactions.sort((a,b) => b.date > a.date ? 1 : -1)[0];
  const touches = interactions.length;

  document.getElementById('call-prep-company').textContent = a.company;
  document.getElementById('call-prep-meta').textContent =
    [a.contactName, a.stage, touches + ' touches', a.lastContacted ? daysSince(a.lastContacted) + 'd since last contact' : 'No contact logged'].filter(Boolean).join(' · ');

  // Pre-fill intel checklist from account data
  document.getElementById('ic-volume-val').textContent = a.volume ? a.volume + ' containers/yr' : '—';
  document.getElementById('ic-forwarder-val').textContent = a.forwarder || '—';
  document.getElementById('ic-port-val').textContent = a.lane ? a.lane.split(' to ')[0] || '—' : '—';
  document.getElementById('ic-commodity-val').textContent = a.commodity || '—';
  document.getElementById('ic-lasttouch-val').textContent = lastInteraction ? formatDate(lastInteraction.date) + ': ' + lastInteraction.notes.substring(0,40) + '...' : '—';
  document.getElementById('ic-referral-val').textContent = a.referral || '—';

  // Reset all intel checks
  ['ic-volume','ic-forwarder','ic-mode','ic-port','ic-commodity','ic-lasttouch','ic-referral'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('checked');
    el.textContent = '';
  });

  // Populate prep mode
  document.getElementById('prep-summary').innerHTML =
    `<strong>${a.company}</strong> — ${a.stage} stage. ${a.commodity ? 'Commodity: ' + a.commodity + '.' : ''} ${a.lane ? 'Lane: ' + a.lane + '.' : ''} ${touches} total touches. Last contact: ${a.lastContacted ? formatDate(a.lastContacted) + ' (' + daysSince(a.lastContacted) + 'd ago)' : 'never'}. ${a.forwarder ? 'Current FF: ' + a.forwarder + '.' : ''} Preferred contact: ${a.prefContact || 'not set'}.`;

  const talkingPoints = buildTalkingPoints(a, interactions);
  document.getElementById('prep-talking-points').innerHTML = talkingPoints.map(tp =>
    `<div class="talking-point">${tp}</div>`
  ).join('');

  document.getElementById('prep-goal').textContent = buildCallGoal(a, interactions);

  const objections = buildLikelyObjections(a);
  document.getElementById('prep-objections').innerHTML = objections.map(o =>
    `<div style="margin-bottom:8px;padding:8px 10px;background:var(--surface-2);border-radius:6px"><strong style="font-size:11px;color:var(--warm)">${o.label}:</strong> <span style="font-size:11px">${o.response}</span></div>`
  ).join('');

  // Populate live mode
  document.getElementById('live-lane').textContent = a.lane || 'Trade Lane';
  document.getElementById('live-commodity').textContent = a.commodity || 'Commodity';
  document.getElementById('live-questions-list').innerHTML = [
    'How are you currently handling your freight?',
    'Who makes the logistics decisions?',
    'What does your current setup look like — FCL, LCL, or carrier direct?'
  ].map(q => `<div class="live-q-item"><div class="task-check" style="width:15px;height:15px;border-radius:3px;border:1.5px solid var(--text-muted);cursor:pointer" onclick="this.classList.toggle('checked');this.textContent=this.classList.contains('checked')?'✓':''"></div>${q}</div>`).join('');
  document.getElementById('live-value-prop').textContent = buildValueProp(a);
  document.getElementById('objection-response').className = 'objection-response';

  switchPrepMode('intel');
  document.getElementById('call-prep-modal').classList.add('open');
}

function buildTalkingPoints(a, interactions) {
  const pts = [];
  if (a.commodity) pts.push('Reference their specific commodity (' + a.commodity + ') — show you did your research');
  if (a.lane) pts.push('Ask about their ' + a.lane + ' lane specifically — how often, what carrier');
  pts.push('Mention our dedicated team model — they get to know your commodity and needs');
  pts.push('Free time: 10-14 days at origin vs industry standard 5 — use this if rates come up');
  if (a.stage === 'Warm' || a.stage === 'Proposal') pts.push('Reference last conversation — position as follow-through, not checking in');
  if (a.forwarder) pts.push('They use ' + a.forwarder + ' — ask how that relationship is going, not "are you happy"');
  pts.push('Close with: soft ask for 5-minute follow-up or permission to send a rate');
  return pts.slice(0, 5);
}

function buildCallGoal(a, interactions) {
  const stage = a.stage;
  if (stage === 'Target' || stage === 'Contacted') return 'Get a two-way conversation going. Ask open-ended questions. Goal: get permission to send a rate or schedule a follow-up call.';
  if (stage === 'Engaged') return 'Deepen the relationship. Find out their current pain points. Goal: propose sending a quote on a specific lane.';
  if (stage === 'Warm') return 'Move toward a quote. Get specific about their lanes and volume. Goal: send a formal rate quote this week.';
  if (stage === 'Proposal' || stage === 'Negotiating') return 'Follow up on the quote. Address objections directly. Goal: get a verbal commitment or a clear next step with a date.';
  return 'Stay top of mind. Add value — share a relevant rate or trade update. Goal: keep the relationship warm.';
}

function buildLikelyObjections(a) {
  const objs = [];
  if (a.forwarder) objs.push({ label: 'Happy with current forwarder', response: "Most companies I talk to have someone they trust. Where we help is rate spikes or lanes the current FF doesn't cover well. Send a benchmark rate?" });
  objs.push({ label: 'Send me some info', response: 'Happy to. What would be most useful — rate comparison, company overview, or commodity-specific info? What subject line should I use?' });
  if (a.stage === 'Proposal' || a.stage === 'Negotiating') objs.push({ label: 'Rates too high', response: 'What rate are you working with? Let me check commodity rates and come back with a revised quote by [day].' });
  objs.push({ label: "Not looking to change right now", response: "Completely understand. What's the best way to stay on your radar for when timing is right?" });
  return objs.slice(0, 3);
}

function buildValueProp(a) {
  if (a.commodity && a.commodity.toLowerCase().includes('pecan')) {
    return 'NVOCC + licensed CHB. Door-to-door from DFW/Haslet. Santa Teresa NM transloads. Bundled customs + forwarding + drayage. 10-14 days free time at origin.';
  }
  if (a.lane && a.lane.toLowerCase().includes('india')) {
    return 'Deepest India/South Asia lane expertise in Houston. NVOCC + licensed CHB. Dedicated team. 10-14 days free time. Local Houston presence June 1.';
  }
  return 'NVOCC + licensed CHB. Full door-to-door. Dedicated team per account. 10-14 days free time at origin vs industry standard 5. Local Houston presence from June 1.';
}

function closeCallPrep() {
  document.getElementById('call-prep-modal').classList.remove('open');
  callPrepAccountId = null;
}

function switchPrepMode(mode) {
  ['intel','prep','live','log'].forEach(m => {
    document.getElementById('mode-' + m).style.display = m === mode ? 'block' : 'none';
    document.getElementById('tab-' + m).classList.toggle('active', m === mode);
  });
  if (mode === 'live') {
    document.getElementById('mode-live').className = 'live-call-mode active';
  }
}

function toggleIntelCheck(id) {
  const el = document.getElementById(id);
  intelChecked[id] = !intelChecked[id];
  el.classList.toggle('checked', intelChecked[id]);
  el.textContent = intelChecked[id] ? '✓' : '';

  const allChecks = ['ic-volume','ic-forwarder','ic-mode','ic-port','ic-commodity','ic-lasttouch','ic-referral'];
  const allDone = allChecks.every(k => intelChecked[k]);
  const btn = document.getElementById('intel-proceed-btn');
  btn.disabled = !allDone;
  btn.style.opacity = allDone ? '1' : '0.4';
  btn.textContent = allDone ? 'Proceed to Pre-Call Prep →' : (Object.keys(intelChecked).filter(k=>intelChecked[k]).length) + '/7 checked';
}

function proceedFromIntel() {
  switchPrepMode('prep');
}

function showObjection(key) {
  const response = OBJECTION_SCRIPTS[key];
  const el = document.getElementById('objection-response');
  el.textContent = response;
  el.className = 'objection-response show';
  document.querySelectorAll('.objection-btn').forEach(b => b.classList.remove('tapped'));
  event.target.classList.add('tapped');
}

function saveCallLog() {
  const outcome = document.getElementById('log-outcome').value;
  const objection = document.getElementById('log-objection').value;
  const response = document.getElementById('log-response').value.trim();
  const worked = document.getElementById('log-worked').value;
  const notes = document.getElementById('log-notes').value.trim();

  if (!callPrepAccountId) return;

  const a = DB.get('accounts').find(x => x.id === callPrepAccountId);
  const logText = [
    'Outcome: ' + outcome,
    objection ? 'Objection: ' + objection : '',
    response ? 'Response: ' + response : '',
    worked ? 'Worked: ' + worked : '',
    notes ? 'Notes: ' + notes : ''
  ].filter(Boolean).join(' | ');

  const interactions = DB.get('interactions');
  interactions.push({
    id: uid(),
    accountId: callPrepAccountId,
    date: today(),
    type: 'Call',
    notes: logText,
    followupDate: null
  });
  DB.set('interactions', interactions);

  const accounts = DB.get('accounts');
  const idx = accounts.findIndex(a => a.id === callPrepAccountId);
  if (idx !== -1) { accounts[idx].lastContacted = today(); DB.set('accounts', accounts); }

  // Clear form
  document.getElementById('log-notes').value = '';
  document.getElementById('log-response').value = '';

  closeCallPrep();
  showToast('Call logged');
  renderAccounts();
  checkHabitNudge();
}



