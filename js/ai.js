// ============================================================
// GEMINI AI — PHASE 1C
// ============================================================
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent';

function getGeminiKey() { return localStorage.getItem('hcc_gemini_key') || ''; }

function saveGeminiKey() {
  const key = document.getElementById('gemini-key-input').value.trim();
  if (!key) { showToast('Paste your API key first'); return; }
  localStorage.setItem('hcc_gemini_key', key);
  document.getElementById('ai-setup-banner').style.display = 'none';
  showToast('Gemini key saved');
}

function saveGeminiKeyFromSettings() {
  const key = document.getElementById('settings-gemini-key').value.trim();
  if (!key) { showToast('Paste your API key first'); return; }
  localStorage.setItem('hcc_gemini_key', key);
  document.getElementById('settings-gemini-key').value = '';
  closeModal('ai-settings-modal');
  showToast('Gemini key updated');
}

function openAISettings() {
  openModal('ai-settings-modal');
}

function initAIPage() {
  const key = getGeminiKey();
  const banner = document.getElementById('ai-setup-banner');
  if (!key) {
    banner.style.display = 'block';
  } else {
    banner.style.display = 'none';
  }
}

function buildSystemPrompt() {
  const accounts = DB.get('accounts');
  const tasks = DB.get('tasks').filter(t => !t.completed);
  const interactions = DB.get('interactions');
  const kpis = DB.getObj('kpis');
  const projects = DB.get('projects');

  const urgentTasks = tasks.filter(t => t.urgency === 'high' || isOverdue(t)).slice(0, 5);
  const staleAccounts = accounts.filter(a => a.lastContacted && daysSince(a.lastContacted) >= 7).slice(0, 5);
  const hotAccounts = accounts.filter(a => a.stage === 'Proposal' || a.stage === 'Negotiating').slice(0, 5);
  const todayInteractions = interactions.filter(i => i.date === today()).length;

  return `You are Hunter's personal sales coach, productivity mentor, and logistics expert built into his Command Center app. You know Hunter Danz personally.

HUNTER'S SITUATION:
- 24 years old, Route Development Manager at Crest Container Lines
- Opening a solo Houston TX office June 1, 2026 — building from zero, no team, no existing relationships
- Also developing US sales for Palletech (bio-pallets) with Christian

BRAIN TYPE — CRITICAL:
- Vata: motivation spikes and crashes. Sprinter not marathoner.
- Avoidance-paralysis under stress — racing thoughts, stares at screen, doesn't start
- Responds to: ONE clear priority, drastic change, external accountability
- Does NOT respond to: lists of 10 things, slow habit stacking
- Building systems instead of using them is a known trap — call it out
- NEVER show more than 3 priorities at once

COMPANY VALUE PROP (know this cold):
- NVOCC and licensed Customs Broker — full door-to-door, one point of contact
- Dedicated team per account — they learn your commodity and needs
- 10-14 days free time at origin vs industry standard 5 days
- Deep India/South Asia lane expertise (India, Sri Lanka, Bangladesh, Pakistan)
- Local Houston presence starting June 1 — competitors (Helvetia, Transworld, ALPI) do not have this
- FDA Prior Notice, ISF filing, food HS code expertise for pecan and food exporters

SALES PHILOSOPHY (enforce these):
- Never yes/no questions — always open-ended
- Every follow-up must have a concrete action step — never "checking in"
- Ask preferred contact method at end of every call
- Downspeak — voice tone DOWN at end of sentences
- Position as consultant, not salesperson
- Water on stone — persistence over time beats intensity in the moment
- Silence is okay — let them break it first
- No em dashes in any output ever
- Never say "hope business is going well"
- Never say "hope this helps" or "great question"

LIVE PIPELINE DATA:
Total accounts: ${accounts.length}
By stage: ${['Target','Contacted','Engaged','Warm','Proposal','Negotiating','Onboarded','Dormant'].map(s => s+': '+accounts.filter(a=>a.stage===s).length).join(', ')}
Stale accounts (7+ days no contact): ${staleAccounts.map(a => a.company).join(', ') || 'None'}
Hot accounts (Proposal/Negotiating): ${hotAccounts.map(a => a.company + ' ('+a.stage+')').join(', ') || 'None'}
High urgency tasks: ${urgentTasks.map(t => t.name).join(', ') || 'None'}
Interactions logged today: ${todayInteractions}
Weekly KPIs: Calls ${kpis.calls||0}/${kpis.callsGoal||25}, Prospects ${kpis.prospects||0}/${kpis.prospectsGoal||5}, Follow-ups ${kpis.followups||0}/${kpis.followupsGoal||10}
Active projects: ${projects.filter(p=>p.status!=='done').map(p=>p.name).join(', ')}

RULES:
- Be direct. Tell the truth even when uncomfortable.
- Push back when he is avoiding something.
- One clear next action when overwhelmed — never a list.
- Know logistics terms: FCL, LCL, ISF, POA, NVOCC, CHB, drayage, B/L, CIF, FOB, DDP, free time, demurrage, detention.
- No em dashes ever. Not one. Use commas or periods instead.
- Never say hope business is going well, hope this helps, or great question.`;
}

// Chat history
let chatHistory = [];

async function callGemini(userMessage) {
  const key = getGeminiKey();
  if (!key) {
    return 'No Gemini API key set. Go to AI Settings (top right) and paste your key from aistudio.google.com.';
  }

  const systemPrompt = buildSystemPrompt();

  // Build messages array with history
  const messages = chatHistory.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  messages.push({ role: 'user', parts: [{ text: userMessage }] });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: messages,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    }
  };

  const resp = await fetch(GEMINI_ENDPOINT + '?key=' + key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 400) return 'API error — check your Gemini key in Settings.';
    if (resp.status === 429) return 'Rate limit hit — wait a moment and try again.';
    return 'Gemini error: ' + (err.error?.message || resp.status);
  }

  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
}

function appendChatMessage(role, text, isThinking=false) {
  const messages = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = 'chat-message ' + role;
  const avatar = role === 'user' ? '<div class="chat-avatar user-av">H</div>' : '<div class="chat-avatar ai-av">🤖</div>';
  const bubbleClass = isThinking ? 'chat-bubble thinking' : 'chat-bubble';
  // Convert **bold** to <strong>, preserve line breaks
  const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>').replace(/\n/g, '<br>').split('\n').join('<br>');
  div.innerHTML = avatar + '<div class="' + bubbleClass + '">' + text.replace(/\n/g, '<br>') + '</div>';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
  return div;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const btn = document.getElementById('chat-send-btn');
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage('user', text);
  chatHistory.push({ role: 'user', content: text });
  input.value = '';
  input.style.height = 'auto';
  btn.disabled = true;

  const thinkingDiv = appendChatMessage('assistant', 'Thinking...', true);

  try {
    const response = await callGemini(text);
    thinkingDiv.querySelector('.chat-bubble').textContent = '';
    thinkingDiv.querySelector('.chat-bubble').classList.remove('thinking');
    thinkingDiv.querySelector('.chat-bubble').innerHTML = response.replace(/\n/g, '<br>');
    chatHistory.push({ role: 'assistant', content: response });
    // Trim history to last 20 messages
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
  } catch(e) {
    thinkingDiv.querySelector('.chat-bubble').textContent = 'Error: ' + e.message;
    thinkingDiv.querySelector('.chat-bubble').classList.remove('thinking');
  }
  btn.disabled = false;
}

function sendQuickPrompt(text) {
  document.getElementById('chat-input').value = text;
  sendChat();
}

function clearChat() {
  chatHistory = [];
  document.getElementById('chat-messages').innerHTML = '<div class="chat-message assistant"><div class="chat-avatar ai-av">🤖</div><div class="chat-bubble">Chat cleared. What do you need?</div></div>';
}

// ============================================================
// MORNING BRIEFING
// ============================================================
async function generateBriefing() {
  const btn = document.getElementById('briefing-btn');
  const text = document.getElementById('briefing-text');
  const key = getGeminiKey();

  if (!key) {
    navigate('ai');
    showToast('Set your Gemini key in AI Settings first');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Generating...';
  text.className = 'briefing-text loading';
  text.textContent = 'Reading your pipeline and tasks...';

  const accounts = DB.get('accounts');
  const tasks = DB.get('tasks').filter(t => !t.completed);
  const interactions = DB.get('interactions');

  // Build briefing context
  const expiringQuotes = tasks.filter(t => t.due && daysUntil(t.due) <= 7 && daysUntil(t.due) >= 0).slice(0,3);
  const hotStale = accounts.filter(a => (a.stage === 'Proposal' || a.stage === 'Negotiating') && a.lastContacted && daysSince(a.lastContacted) >= 3);
  const overdueHigh = tasks.filter(t => t.urgency === 'high' && isOverdue(t)).slice(0,3);
  const staleAccounts = accounts.filter(a => a.lastContacted && daysSince(a.lastContacted) >= 7).slice(0,3);

  const thinStages = [];
  if (accounts.filter(a => a.stage === 'Target').length < 3) thinStages.push('Target');
  if (accounts.filter(a => a.stage === 'Contacted').length < 3) thinStages.push('Contacted');

  const briefingPrompt = `Generate a morning briefing for Hunter. It should be 3-5 sentences, written directly to him by name, conversational and direct — not a bullet list. Reference specific account names and tasks. Priority order:
1. Quotes or tasks expiring within 7 days: ${expiringQuotes.map(t=>t.name).join(', ') || 'None'}
2. Hot accounts (Proposal/Negotiating) with no activity in 3+ days: ${hotStale.map(a=>a.company+' ('+daysSince(a.lastContacted)+'d)').join(', ') || 'None'}
3. Overdue high-urgency tasks: ${overdueHigh.map(t=>t.name).join(', ') || 'None'}
4. Stale accounts (7+ days no contact): ${staleAccounts.map(a=>a.company+' ('+daysSince(a.lastContacted)+'d)').join(', ') || 'None'}
5. Funnel health — thin stages: ${thinStages.length ? thinStages.join(', ') + ' stage is thin — add new targets' : 'Funnel looks healthy'}

Today is ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}.
Be specific. Name names. Tell him what to do first. No em dashes. No "hope this helps".`;

  try {
    const key2 = getGeminiKey();
    const body = {
      system_instruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ role: 'user', parts: [{ text: briefingPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 400 }
    };
    const resp = await fetch(GEMINI_ENDPOINT + '?key=' + key2, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) throw new Error('API error ' + resp.status);
    const data = await resp.json();
    const briefing = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate briefing.';
    text.className = 'briefing-text';
    text.innerHTML = briefing.replace(/\n/g, '<br>');
  } catch(e) {
    text.className = 'briefing-text loading';
    text.textContent = 'Could not generate briefing — check your Gemini key in AI Settings.';
  }
  btn.disabled = false;
  btn.textContent = 'Regenerate';
}
