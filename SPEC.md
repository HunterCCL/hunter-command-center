# HUNTER'S COMMAND CENTER — SPEC v6.2
*Last updated: April 5, 2026*
*This is the single source of truth for the app. Claude reads this at the start of every session before touching any code.*

---

## HOW TO USE THIS DOC

**For build sessions with Claude Code:**
Claude Code reads this file directly from the repo. No pasting needed.

**For build sessions in Claude.ai:**
Paste this doc at the start of the conversation and say: "Read this spec, confirm understanding, then we will begin."

---

## BUILD RULES — NON-NEGOTIABLE

These govern every session. Claude confirms all five before touching anything.

1. **CONSENT BEFORE CODE** — Claude explains what it is about to do and gets explicit confirmation before writing or modifying any code. Must say "Here is what I am going to do — confirm and I will proceed."
2. **SPEC BEFORE CODE** — Spec is updated and confirmed before any code changes. Spec is always the source of truth.
3. **SNAPSHOT BEFORE CHANGES** — Claude asks "Has today's snapshot been saved?" before any build session begins.
4. **CONFIRM UNDERSTANDING FIRST** — Claude reads this full spec and summarises its understanding before doing anything. Hunter confirms or corrects.
5. **NEVER SILENTLY FAIL** — Any error or failure is surfaced immediately. Nothing fails quietly.

---

## ARCHITECTURE RULES — NON-NEGOTIABLE

These five rules exist for one reason: to make future migrations (React, Supabase, mobile, etc.) as easy as possible. Violating any of them now creates debt that costs 10x later. Claude enforces these on every session without being asked.

### Rule 1 — db.js is the ONLY file that touches storage. Ever.

No module, render function, or event handler ever calls `localStorage` directly. No module ever calls the Google Sheets API directly. Everything goes through `DB.get()` and `DB.set()`. When we migrate to Supabase, only `db.js` changes. Every other file stays identical.

**Violation examples — never do these:**
- `localStorage.getItem('accounts')` inside `crm.js`
- `localStorage.setItem('tasks', ...)` inside `tasks.js`
- Any Sheets API call outside of `db.js`

**Correct pattern:**
- `DB.get('accounts')` from any module
- `DB.set('tasks', tasks)` from any module
- `DB.sync()` triggers the Sheets write inside `db.js` only

### Rule 2 — Render functions only build HTML. Nothing else.

A render function's only job is to take data and return or insert HTML. It never calculates, filters, sorts, or makes decisions. Those happen in separate logic functions that are called before the render.

**Violation examples — never do these:**
- Filtering an array inside `renderAccounts()`
- Calculating days overdue inside `renderTasks()`
- Making a DB write inside a render function

**Correct pattern:**
```javascript
// Logic function — pure, testable, no HTML
function getOverdueTasks() {
  return DB.get('tasks').filter(t => !t.completed && isOverdue(t));
}

// Render function — only builds HTML
function renderOverdueTasks() {
  const tasks = getOverdueTasks();
  document.getElementById('overdue-list').innerHTML = tasks.map(taskCard).join('');
}
```

### Rule 3 — Business logic lives in pure functions.

Any function that calculates, filters, sorts, or makes a decision must be a pure function: same input always produces same output, no side effects. Pure functions are trivially testable and copy directly into React components with zero changes.

### Rule 4 — CSS variables only. No hardcoded values anywhere.

No hex codes, no pixel values, no font names in JavaScript or inline styles. Everything references a CSS variable from `app.css`. When we redesign or go mobile, one file changes.

**Violation examples — never do these:**
- `style="color: #1B3A6B"` in JS-generated HTML
- `style="font-size: 12px"` hardcoded in a render function
- Any color or spacing value not defined as a CSS variable

**Correct pattern:**
- `style="color: var(--navy)"`
- `style="font-size: var(--text-sm)"`

**Exception:** Inline styles already in the HTML shell (`index.html`) from before this rule was established. Fix opportunistically, not all at once.

### Rule 5 — Data models are documented in the spec before any new field is added.

Before adding any new field to accounts, tasks, projects, interactions, or any future data model — update Section 3 of this spec first. No undocumented fields. This keeps migrations clean and prevents data archaeology later.

---

## SECTION 1 — WHO IS HUNTER

### 1.1 Identity

| Field | Detail |
|---|---|
| Full name | Hunter Danz |
| Age | 24, birthday November 12, 2026 |
| Location | Auburn/Federal Way WA — relocating Houston TX June 1, 2026 |
| Email | Hunter@crestcontainers-us.com |
| Role | Route Development Manager, Crest Container Lines |
| Mission | Solo operator opening Crest's Houston office from scratch |
| Relationship | Girlfriend Alexa |
| Therapy | Weekly sessions |

### 1.2 Brain & Work Style — CRITICAL

The AI must understand how Hunter's brain works. This changes how every response is framed.

- Vata type: motivation spikes and crashes. Sprinter not marathoner.
- Avoidance-paralysis pattern under stress: racing thoughts, staring at screen, not starting.
- Responds to: drastic change, re-excitement, ONE clear priority, external accountability.
- Does NOT respond to: overwhelming lists, slow habit stacking, rigid schedules.
- Building systems instead of using them is a known trap — call it out when it happens.
- Root issue under most productivity problems is nervous system regulation, not lack of tools.

**AI RULE:** Never show Hunter a list of 10 things. Show him ONE thing. The most important thing. Everything else is secondary until that is done.

### 1.3 Company Overview

| Field | Detail |
|---|---|
| Company | Crest Container Lines Inc. / CCL Customs Brokers Inc. |
| HQ | Federal Way, WA |
| Services | Ocean freight forwarding, customs brokerage (licensed CHB), trucking/drayage, NVOCC, air freight, warehousing, ISF filing, FDA prior notice |
| Trade lanes | India, Sri Lanka, Bangladesh, Pakistan, Vietnam, West Africa — strongest on South Asia |
| Houston focus | Exports first. Pecans, food products, whiskey exports, industrial manufacturers |
| Territory | Houston, Dallas, Fort Worth, Austin and surrounding areas |
| Key differentiator | Full door-to-door, dedicated team per account, 10-14 days free time at origin vs industry standard 5 days, local Houston presence from June 1 |

### 1.4 Key People

| Name | Role |
|---|---|
| Terri L. Tederman | President, Crest Container Lines US |
| Fouze | CEO |
| Akheel | Hunter's mentor, North American VP/Director |
| Faran | Director, Dubai — Next Gen group |
| Shailly | Director, UK — Next Gen group |
| JC | Ops/Trucking |
| Jagath | Flagged domestic trucking as strategic priority |
| Christian | Palletech Partnership collaborator |
| Shadwell | Mabroc Teas account updates |
| Ashen | Joint Agri / True Organics |
| Erin | Customs broker |
| Maryam | Rates |

### 1.5 Financial Snapshot

| Field | Value |
|---|---|
| Robinhood portfolio | ~$40,000 |
| Uninvested cash | ~$20,000 |
| Total net worth | ~$60,000 |
| 2026 goal | $75,000 |
| 2027 goal | $100,000 |
| Long-term goal | $1,000,000 / $10,000/month combined take-home |
| Savings rate | ~$590/paycheck |

### 1.6 Active Tracks

- **Houston Launch** — solo office opens June 1, 2026. Primary track.
- **Sales & Business Development** — 5 new prospects/week, 10 outreach, 25 follow-ups, 2hrs calls
- **CHB Exam** — October 2026. Study Mon/Wed/Fri. Feynman technique. 24 topics.
- **Palletech Partnership** — bio-pallets US sales with Christian. Weekly touchpoint minimum.
- **Real Estate Houston** — duplex owner-occupied, house hack, BRRR. Planning phase.
- **Next Gen Group** — weekly Sunday meetings. Hunter preps Saturdays.
- **Karamtara** — separate conversation, do not mix in.

---

## SECTION 2 — ARCHITECTURE

### 2.1 Overview

The app is a personal CRM and life operating system hosted on GitHub Pages. Fully free. Single-page app with modular JavaScript files. All data flows through a shared data layer — modules never talk to each other directly.

The app is designed from day one to migrate cleanly to React + Supabase when the time comes. The Architecture Rules above are the mechanism that makes that migration manageable.

### 2.2 File Structure

```
hunter-command-center/
├── SPEC.md                  ← this file — Claude reads first every session
├── CHANGELOG.md             ← log of every change
├── index.html               ← shell only, navigation and layout, ~100 lines
├── css/
│   └── app.css              ← all styles, all CSS variables, all media queries
├── js/
│   ├── db.js                ← data layer ONLY — localStorage + Sheets. No other file touches storage.
│   ├── crm.js               ← accounts, pipeline, tags, lists
│   ├── tasks.js             ← tasks, recurring, urgency, filters
│   ├── projects.js          ← projects, milestones, project detail
│   ├── calendar.js          ← day/week/month views
│   ├── followups.js         ← follow-up dashboard, linked task sync, bucket logic
│   ├── ai.js                ← Gemini, briefings, call prep
│   └── init.js              ← boot sequence, migrations, seeds
└── data/
    └── seeds.js             ← seed data — delete after confirmed running on all devices
```

**STATUS: Refactor not yet done.** Currently still a single `index.html` file (~576k chars). Refactor into this structure is the immediate next session.

### 2.3 Data Layer — db.js

Every module reads and writes through `db.js`. No module imports another module. `db.js` is the only file that changes when backends change. This is enforced by Architecture Rule 1.

**Current backends:**
- `localStorage` — primary, instant reads, works offline
- **Google Sheets** — free, unlimited rows, OAuth 2.0, auto-syncs on every change. Sheet ID: `1GbfvlwEcSOt1Eqw-IPAQ1zFt4irNRy5iA23PmDf7Hyk`

**Future backends:**
- **Supabase** — PostgreSQL, real-time sync, works across all devices simultaneously, built-in auth. Replaces localStorage AND Google Sheets in one session. Trigger: when mobile is needed, or when data must sync across multiple devices in real time, or when account count meaningfully exceeds 1,000.
- **Airtable** — simpler relational layer, free tier 1,000 rows. Secondary option if Supabase feels like overkill at the time.

**Migration promise:** Because Rule 1 is enforced, migrating to any new backend is one session — rewrite `db.js` only. Every other file stays identical.

### 2.4 External APIs

| API | Purpose | Status |
|---|---|---|
| Gemini API | AI features — briefings, call prep, chat | Live. Key in localStorage. Free tier. Rate limit issue being investigated. |
| Google Sheets | Data persistence and backup | Live. OAuth connected. |
| Gmail | Email integration | Connected via MCP |
| Google Calendar | Calendar integration | Connected via MCP |

**API key storage:** All keys stored in browser localStorage. Never hardcoded. Note: client-side key storage is acceptable for a single-user personal tool. When multi-user or security becomes a concern, move API calls to Vercel serverless functions.

### 2.5 Deployment & Dev Workflow

| Tool | Purpose | Status |
|---|---|---|
| GitHub Pages | Free hosting, auto-deploys on push | Live |
| GitHub Desktop | Local repo management, one-click commit and push | To install next |
| Claude Code | AI-assisted surgical edits directly to repo files | To install after GitHub Desktop |
| Vercel | Upgrade from GitHub Pages when serverless functions needed | Future |

**Current deploy method:** GitHub web editor (being replaced)
**Target deploy method:** Claude Code edits files in local repo → GitHub Desktop pushes → GitHub Pages auto-deploys

### 2.6 Design System

All values defined as CSS variables in `app.css`. No hardcoded values anywhere (Architecture Rule 4).

| Variable | Value | Use |
|---|---|---|
| `--navy` | `#1B3A6B` | Primary color |
| `--navy-dark` | `#1A1A2E` | Background |
| `--surface` | `#16213E` | Card/panel background |
| `--surface-2` | `#1e2d4a` | Secondary surface |
| `--accent` | `#0F3460` | Accent/input background |
| `--accent-2` | `#2a4a7f` | Hover accent |
| `--text` | `#e8edf5` | Primary text |
| `--text-dim` | `#8a9bb5` | Secondary text |
| `--text-muted` | `#4a5a72` | Muted/label text |
| `--hot` | `#ff4757` | High urgency / danger |
| `--warm` | `#ffa502` | Medium / warning |
| `--cold` | `#2ed573` | Low / success |
| `--border` | `rgba(255,255,255,0.06)` | Default border |
| `--border-hover` | `rgba(255,255,255,0.12)` | Hover border |
| `--font-display` | Syne | Headers |
| `--font-body` | Inter | Body text |
| `--font-mono` | DM Mono | Labels, badges, meta |

**No em dashes anywhere in the UI or in any drafts.**

### 2.7 Future Stack (when triggered)

The app is architected to migrate cleanly to this stack when needed:

| Layer | Current | Future |
|---|---|---|
| Frontend | Vanilla JS + HTML | React |
| Backend | localStorage + Google Sheets | Supabase (PostgreSQL, real-time) |
| Hosting | GitHub Pages | Vercel (serverless functions) |
| AI | Gemini API (client-side) | Anthropic API (server-side, key protected) |
| Mobile | Responsive CSS | React Native or PWA |
| Dev workflow | Claude Code + GitHub Desktop | Same |

**Migration effort if Architecture Rules are followed:** approximately 1 focused week.
**Migration effort if rules are violated:** 3-4 weeks, high breakage risk.

---

## SECTION 3 — CURRENT BUILD STATE

### 3.1 What Is Built and Working

| Module | Status | Notes |
|---|---|---|
| Home / Command Center | Working | Today's Top 3, weekly KPI tracker, urgent tasks, fire button |
| Accounts CRM | Working | 9 pipeline stage tabs, search, stale deal highlighting, account detail modal with inline editing, interaction log, copy context to Claude |
| Tasks | Working | Quick-add, urgency filters, project filter, due date filter, recurring tasks, specific day-of-week support, auto-rollover of overdue tasks to today |
| Projects | Working | 4 seed projects, milestones, linked tasks with check-off, notes log, email drop, deadline countdown, full-screen detail view |
| Calendar | Working | Day/week/month views, prev/next nav, today button, task time field |
| AI Assistant | Working | Gemini chat with Hunter context as system prompt, quick prompt buttons |
| Morning Briefing | Working | AI-generated paragraph on home screen |
| Call Prep | Partially built | Intel Gate, Pre-Call, Live Call, Post-Call tabs exist but modal has stacking bug. AI generation not yet wired to Gemini. |
| Google Sheets sync | Working | OAuth 2.0, auto-syncs every change, green/amber/red dot indicator |
| Priority flagging | Working | Star on every account card, Priority tab as default view |
| Source tab display | Working | Grey chip on every imported account showing which spreadsheet tab it came from |
| Tags | Working | Free-form tags on accounts, shown as purple chips, filterable |
| Lists | Working | Named lists, create/delete, assign accounts via edit modal, filter by list |
| Filter row | Working | Source, List, and Tag dropdowns below pipeline tabs |
| Follow-up Dashboard | Not built | See Section 8.1 for full spec |
| Account-Linked Tasks | Not built | See Section 8.6 for full spec |

### 3.2 Migration State

| Key | Status | Notes |
|---|---|---|
| `hcc_seeded_v2` | Active | First-load seed data for projects and tasks |
| `hcc_migrated_projnames` | Active | Fixes old short project names in task data |
| `hcc_tasks_v3` | Active | Added 49 master todo tasks |
| `hcc_leads_v1` | Superseded | Replaced by v2 |
| `hcc_leads_v2` | Active | 354 clean accounts + 561 interactions from Excel master leads file |

**Migration key rule:** Every migration function uses a versioned localStorage key to prevent re-running. Never remove a key check. To re-run a migration, bump the version number.

### 3.3 Account Data Model

```javascript
{
  id: uid(),
  company: '',
  contactName: '',
  contactTitle: '',
  phone: '',
  email: '',
  linkedin: '',
  commodity: '',
  lane: '',
  location: '',
  volume: '',
  forwarder: '',
  referral: '',        // Cold Call | LinkedIn | Industry Event | Internal Referral | Named Referrer | Datamyne
  sourceTab: '',       // which Excel tab the account was imported from
  tags: '',            // comma-separated free-form tags
  stage: '',           // Target | Contacted | Engaged | Warm | Proposal | Negotiating | Onboarded | Dormant
  priority: false,     // star flag
  project: '',         // Crest Houston Launch | Palletech Partnership | CHB Exam Prep | Real Estate Houston | Personal
  prefContact: '',     // Phone | Email | LinkedIn | Text
  notes: '',
  lastContacted: null, // YYYY-MM-DD
  followupDate: null,  // YYYY-MM-DD — explicit follow-up date; when set, auto-creates a linked task tagged 'followup'
  created: '',         // YYYY-MM-DD
}
```

### 3.4 Task Data Model

```javascript
{
  id: uid(),
  name: '',
  urgency: '',         // high | medium | low
  project: '',         // must exactly match project name strings in Section 3.5
  due: '',             // YYYY-MM-DD
  recurrence: '',      // none | daily | weekly | mwf | days | custom
  customDays: '',      // integer, used when recurrence = custom
  daysOfWeek: [],      // array of integers 0-6, used when recurrence = days
  taskTime: '',        // HH:MM optional
  tags: '',            // comma-separated tags e.g. 'followup'
  accountId: '',       // references account.id — set when task is auto-created from a follow-up date
  completed: false,
  created: '',         // YYYY-MM-DD
}
```

### 3.5 Task Project Field Values

Task `project` field must exactly match these strings or linked task display breaks:
- `Crest Houston Launch`
- `Palletech Partnership`
- `CHB Exam Prep`
- `Real Estate Houston`
- `Personal`

### 3.6 Interaction Data Model

```javascript
{
  id: uid(),
  accountId: '',       // references account.id
  date: '',            // YYYY-MM-DD
  type: '',            // Call | Email | LinkedIn | Meeting | Note
  notes: '',
  followupDate: '',    // YYYY-MM-DD or null
}
```

### 3.7 Project Data Model

```javascript
{
  id: uid(),
  name: '',
  customer: '',
  status: '',          // new | inprogress | quoted | done
  color: '',           // hex value from design system
  desc: '',            // one-sentence description of what they need
  blocker: '',
  next: '',            // next action
  deadline: '',        // YYYY-MM-DD or null
  milestones: [],      // array of { name: '', done: false }
  notes: [],           // array of { date: 'YYYY-MM-DD', text: '' }
  created: '',         // YYYY-MM-DD
}
```

### 3.8 Known Issues / Pending

- **Call Prep modal stacking bug** — `openCallPrep()` does not close the account detail modal first. Fix: add `closeModal('account-detail-modal')` at start of `openCallPrep()`.
- **Call Prep AI generation** — Pre-Call Prep tab uses static logic, not Gemini. "Generate with AI" button not yet built.
- **Gemini rate limit** — First use sometimes returns rate limit error. Workaround: wait 60 seconds and retry. Fix: generate fresh key at aistudio.google.com if persists.
- **Restore-from-Sheets** — If localStorage is cleared, data is safe in Sheets but manual restore function not yet built.
- **Architecture Rule 4 violations** — Inline hardcoded colors and sizes exist throughout JS-generated HTML from before this rule was established. Fix opportunistically during refactor.
- **File size** — Currently ~576k chars as a single HTML file. Refactor to multi-file is the immediate next session.

---

## SECTION 4 — FEATURES SPEC

### 4.1 Call Prep Generator — Full Spec

Accessed via "Prep for Call" button on account detail modal. Four tabs:

**Tab 1 — Intel Gate (mandatory)**
7-field checklist before proceeding. Each field can be marked known or unknown. All 7 must be checked before proceeding.
Fields: estimated volume, current forwarder, FCL/LCL, primary origin port, commodity + special requirements, last touch date, referral source.
Pre-fills from account data where available.

**Tab 2 — Pre-Call Prep**
Static section (always shown): downspeak reminder, slow down, silence is okay, stand up, box breathing 4-4-4.
AI section (requires Gemini key): "Generate with AI" button calls Gemini with full account context and returns 3-5 personalized talking points, tailored call goal, and 2-3 likely objections with specific responses.
Falls back to static logic if no Gemini key set.

**Tab 3 — Live Call**
Zero friction. Four elements only:
- Commodity + trade lane in large text at top
- 3 questions with checkboxes (stage-aware, not hardcoded)
- 8 large tappable objection buttons — tap to reveal handler text instantly
- One-line value prop specific to this account

Objection buttons: Happy with forwarder / Rates too high / Send me info / Not interested / Ship on liner BL / We're too small / Vendors handle shipping / Not looking to change

**Tab 4 — Post-Call Log**
Structured fields: Outcome dropdown, Objection raised dropdown, How Hunter responded (text), Did it work (Yes/No/Unsure), General notes.
On save: logs as interaction, updates lastContacted, closes modal.

### 4.2 CRM Pipeline Stages

Target → Contacted → Engaged → Warm → Proposal → Negotiating → Onboarded → Dormant

**Priority tab** is the default view when opening Accounts. Shows only accounts with `priority: true`.

### 4.3 Sales Philosophy — AI Coaching Rules

The AI enforces these in every sales-related interaction:

- Always ask "Is this a good time?" before launching into any pitch
- Lead with LinkedIn before cold call
- Never yes/no questions — always open-ended
- Every follow-up must have a concrete action step — never "just checking in"
- Ask preferred contact method at end of every call, log it
- Downspeak — voice tone goes DOWN at end of sentences, not up
- Stand up during call blocks. Box breathing 4-4-4 before starting.
- Set frame at start of every meeting: "So the purpose of this meeting is X"
- Close every meeting: "Do me a favor..." + light CTA
- Position as consultant not salesperson

**AI flag rule:** When reviewing any draft, flag: (1) yes/no questions, (2) checking-in language, (3) missing CTA, (4) apologetic language like "hope you don't mind".

### 4.4 Value Proposition — What the AI Knows Cold

- NVOCC + licensed CHB — full door-to-door, one point of contact
- Dedicated team per account — learns your commodity, customers, requirements
- Free time: 10-14 days combined at origin vs industry standard 5
- Deepest South Asia lane in Houston — India, Sri Lanka, Bangladesh, Pakistan
- Local Houston presence from June 1, 2026 — Helvetia (VA), Transworld (CA), ALPI (NY) do not have this
- FDA Prior Notice, ISF filing, food HS code expertise
- For pecan exporters: Santa Teresa NM transloads, DFW/Haslet origin pickups, bundled customs + forwarding + drayage
- Palletech bio-pallets: sustainable pallet supply (separate pitch, same contact can overlap)

### 4.5 Writing Rules — Apply Everywhere

- No em dashes anywhere
- Never say "hope business is going well"
- Formal contacts: Dear [Name], Greetings!
- Casual contacts: Hi [Name], Hope you are doing well!
- No apologetic openers

---

## SECTION 5 — ROADMAP

### 5.1 Immediate Next Sessions

**Session 1 — GitHub Desktop + Claude Code setup**
Install GitHub Desktop. Clone repo locally. Install Claude Code. Point Claude Code at the local repo. After this session, all future builds are Claude Code edits committed via GitHub Desktop. No more file downloads.

**Session 2 — Refactor to multi-file structure**
Split the current single `index.html` into the file structure in Section 2.2. Nothing new gets added — everything just gets reorganized. Enforce Architecture Rules throughout. After this session, all future builds are surgical edits to individual files.

**Session 3 — Follow-up Dashboard (Section 8.1)**
Highest ROI feature. Three buckets: Overdue, Due This Week, Coming Up. Quick action buttons inline. Home screen summary card. Cross-module sync: setting a follow-up date auto-creates a linked calendar task; checking it off logs the interaction and clears the date. This is what turns 354 accounts from a list into a sales engine.

**Session 4 — Call Prep fixes (Section 8.3)**
Fix modal stacking bug. Wire AI generation to Gemini. Make Live Call questions stage-aware.

**Session 5 — Strip migration dead code**
Once migration v2 is confirmed running on all devices, delete seed/migration functions and data files. Cuts significant dead weight from the codebase.

### 5.2 Module Roadmap

Modules are added one at a time. Each is a new `.js` file. Nothing existing breaks.

**Near term (next 1-3 months)**
- `habits.js` — daily non-negotiables, streaks, nudges. Tracks: Karamtara check, habit tracker update, warehousing monitoring, JA monitoring.
- `goals.js` — 25 Before 25 tracker, progress vs deadline, connects daily actions to outcomes.
- `chb.js` — CHB exam prep, Feynman notes, topic tracker, October 2026 countdown.

**Medium term (3-6 months)**
- `knowledge.js` — second brain, book notes, surfaces relevant learnings at right moment
- `finance.js` — net worth tracker ($75K → $100K → $1M), income vs activity correlation
- `weekly_review.js` — 15-minute structured prompt, wins/gaps/next week
- `newsletter.js` — contact list, draft history, send log, Streak integration

**Longer term**
- `real_estate.js` — Houston duplex tracker, BRRR calculator
- `sales_coaching.js` — pattern analysis across call logs, close rate by account type
- `intel.js` — Houston market intel, competitor notes, rate reference
- `linkedin.js` — post drafting in Hunter's voice from industry news

### 5.3 Backend & Infrastructure Roadmap

| Trigger | Action |
|---|---|
| Now | GitHub Desktop + Claude Code setup |
| After refactor | All future builds via Claude Code |
| Mobile needed OR multi-device sync needed OR accounts exceed ~1,000 | Migrate to Supabase — rewrite db.js only |
| Serverless functions needed (scheduled jobs, protected API keys) | Migrate hosting to Vercel |
| Newsletter list exceeds ~500 contacts | Replace Streak with Mailchimp |
| Complex relational queries needed before Supabase trigger | Consider Airtable as interim (1,000 row free tier) |

### 5.4 Full Tool Stack (complete picture)

| Tool | Purpose | Status |
|---|---|---|
| GitHub Pages | Hosting | Live |
| GitHub Desktop | Local repo management | To install |
| Claude Code | AI-assisted development directly in repo | To install |
| Google Sheets | Data backup + sync | Live |
| Gemini API | AI features | Live |
| Gmail MCP | Email integration | Connected |
| Google Calendar MCP | Calendar sync | Connected |
| Streak | Newsletter bulk send (Gmail extension) | Pending setup |
| Google Postmaster Tools | Email deliverability monitoring | Pending setup |
| Supabase | Future backend (PostgreSQL, real-time) | Future |
| Vercel | Future hosting with serverless functions | Future |
| React | Future frontend framework | Future |
| Anthropic API | Future AI (server-side, key protected) | Future |
| Mailchimp | Future newsletter platform at scale | Future |
| Twilio | Future click-to-call from account detail | Future |

---

## SECTION 6 — SESSION START CHECKLIST

At the start of every build session Claude must:

1. Read this SPEC.md fully
2. Ask "Has today's snapshot been saved?"
3. Confirm understanding of current build state (Section 3)
4. Confirm the 5 Architecture Rules are understood and will be enforced
5. State exactly what it is going to do before writing any code
6. Wait for explicit confirmation before proceeding

At the end of every build session Claude must:
1. Update CHANGELOG.md with what changed
2. Flag any new known issues
3. Note if SPEC.md needs updating
4. Flag any Architecture Rule violations introduced or fixed

---

## SECTION 7 — NICHES & SALES STRATEGY

### 7.1 The Three Niches

All three niches share the same positioning: **Houston's food logistics specialist.** All dry containerized freight. All US-Europe and US-ISC/Far East Asia lanes.

| # | Niche | Description | Key Lanes |
|---|---|---|---|
| 1 | **Food Imports** | Ethnic and specialty food importers in Houston and DFW bringing in dry food products | From: India, Vietnam, Thailand, Italy, Spain, Greece, Turkey, UK, France, Belgium, Germany → Houston/DFW |
| 2 | **Pecan Exports** | Texas pecan shellers and processors exporting pecans | Houston/Central TX/DFW → Europe, India, Middle East |
| 3 | **CPG Food Exports** | Houston-based companies exporting American consumer branded goods (food and non-food) | Houston → Middle East, India, UK, Europe |

### 7.2 Positioning Statement

"Houston's food logistics specialist." Use this framing in every introduction, every LinkedIn post, every cold call opener. Not a generalist forwarder — a specialist who knows food lanes, food commodities, food compliance, and the Houston port.

### 7.3 Niche-Specific Differentiators

**Food Imports:**
- Deep India, Vietnam, Thailand lane expertise — strongest South Asia network in Houston
- Integrated customs brokerage — FDA Prior Notice, ISF filing, food HS code expertise, one invoice
- Local Houston presence from June 1 — no competitor has this
- Harwin corridor focus — dense cluster of ethnic food importers, in-person relationship building

**Pecan Exports:**
- Houston handles 60% of all US pecan exports
- No top competitor has a Houston office
- Santa Teresa NM transload capability, DFW/Haslet origin pickups
- Bundled customs + forwarding + drayage — one contact, one invoice
- TPGA conference relationship building (annual, July)
- Peak season: March-June — build relationships October-February

**CPG Food Exports:**
- Middle East and India lane depth unmatched in Houston
- NVOCC license — competitive rates and flexibility pure forwarders can't match
- Integrated customs brokerage — export docs, compliance, EEI filing
- Free time: 10-14 days combined at origin vs industry standard 5

### 7.4 The Sales Funnel — 10 Steps

| Step | Name | What to do |
|---|---|---|
| 1 | Niche definition | Confirm commodity, lane, location, volume threshold. Know exactly who you're targeting before any outreach. |
| 2 | Lead acquisition | Datamyne (verified shipment data), LinkedIn, Apollo.io, trade shows, CSCMP directory. Target: 10 new leads/week. |
| 3 | AI pre-qualification | Run batches through AI before investing research time. Output: Tier 1 (deep research), Tier 2 (light touch), Park (not worth time now). |
| 4 | Research | Tier 1 (30-60 min): key contacts, LinkedIn, commodity/lanes/volume, current forwarder, carriers, trade shows, pain points. Tier 2 (5-10 min): confirm commodity/lane, find contact name, 1-2 personalizing details. |
| 5 | Contact 1 | LinkedIn preferred. Email if LinkedIn not available or no response after 3 days. Personalized — reference specific research. Goal: get on radar, get a response. NOT a pitch. Target: 5/week. |
| 6 | Contact 2 | Escalate the channel. Phone preferred. LinkedIn/email if phone not possible. Within 7 days of Contact 1. Goal: start a real conversation. Target: 5/week. |
| 7 | Contact 3 | Phone strongly preferred. Within 7 days of Contact 2 (14 days total from C1). Goal: if no conversation yet — ask directly for call or meeting. If conversation started — move toward scheduled call or in-person. Target: 5/week. |
| 8 | In-person meeting | Ask for a TRIAL SHIPMENT only — not all their business. Come prepared with full account intel. Target: 1/week post-launch. |
| 9 | Trial shipment | Execute flawlessly. Proactive updates at every milestone. This is the audition. |
| 10 | Ongoing relationship | Follow up in their preferred medium. Build toward primary or backup forwarder status. Ask for referrals once trust established. |

**Follow-ups on requests — NON-NEGOTIABLE:** Same day. 24 hours absolute maximum. Overrides everything else.

### 7.5 Contact Cadence

| Rule | Detail |
|---|---|
| Contacts 1 and 2 | Within 7 days of each other |
| Contact 3 (phone) | Within 7 days of C2 — 14 days total from first touch |
| Contacts 4, 5, 6 | Every 2-3 weeks (slow burn) |
| After 6 touches, no response | Move to quarterly check-in — light touch, stay on radar |
| Tier 1 active accounts | Check-in minimum once per week |
| Tier 2 active accounts | Check-in once every 2 weeks |

### 7.6 Account Tiers

| Tier | Who qualifies | Cadence |
|---|---|---|
| Tier 1 | Had in-person meeting, requested quote/rate sheet, genuinely engaged, highest ROI potential | Weekly check-in |
| Tier 2 | Engaged but not yet at meeting stage, quoted but no response, warm but slow-moving | Every 2 weeks |
| Slow burn | Contacts 4-6 with no response yet, interested but no urgency | Every 2-3 weeks |
| Quarterly | 6 touches with zero response, long-term radar only | Quarterly |

### 7.7 Weekly KPI Targets

| Activity | Weekly Target | Notes |
|---|---|---|
| New leads added to CRM | 10 | Datamyne, LinkedIn, Apollo, trade shows |
| Contact 1s sent | 5 | LinkedIn preferred, email if needed |
| Contact 2s sent | 5 | Phone preferred, LI/email if needed. Within 7 days of C1 |
| Contact 3s (phone preferred) | 5 | Within 7 days of C2. Ask for call or meeting |
| Follow-ups on customer requests | Same day — non-negotiable | Quotes, rate sheets, profiles. 24hrs absolute max |
| Quotes/rate sheets issued | Within 24hrs of request | Never delay a quote. Speed = trust |
| Tier 1 account check-ins | 1 per account per week | High potential / engaged / meeting stage |
| Tier 2 account check-ins | 1 per account every 2 weeks | Warm but slower moving |
| In-person meetings (post-launch) | 1 per week minimum | Ask for trial shipment, not full account |
| Association events (post-launch) | 2 per month | Transportation Club of Houston is highest priority |

---

## SECTION 8 — PLANNED FEATURES (not yet built)

### 8.1 Follow-up Dashboard — Full Spec

#### Where it lives

- **Sidebar nav item** between Projects and AI Assistant: label "Follow-ups", red badge showing total overdue count
- **Tab inside the Accounts page** alongside Priority, All, Target, etc. — label "Follow-ups"
- **Summary card on the home Command Center screen** showing overdue count + link to the dashboard

#### Three buckets

1. **Overdue** — follow-up date is past, OR no contact in 14+ days and stage is Target / Contacted / Engaged / Warm
2. **Due This Week** — follow-up date falls within the next 7 days
3. **Coming Up** — follow-up date is 8-30 days out, OR no contact in 7-14 days

#### Each account row shows

- Company name + contact name
- Stage chip
- Last contacted date (or "Never")
- Reason it appears ("Follow-up due" or "No contact in X days")
- Four inline action buttons: Open Detail / Log Interaction / Call Prep / Set Follow-up Date

#### Cross-module sync rules

When a follow-up date is set on an account (from any screen):
- Auto-create a linked task: name = "Follow up with [Company]", due = followupDate, urgency = Medium, project = "Crest Houston Launch", tags = "followup", accountId = account.id
- That task appears on the calendar day view and week view like any other task
- That task appears in Urgent Tasks on the home Command Center

When the linked task is checked off:
- Log an interaction on the account: type = Note, notes = "Follow-up completed", date = today
- Clear account.followupDate (set to null)
- Delete the linked task

When followupDate is updated on the account:
- Find the existing linked task (query by accountId + tags containing "followup")
- Update its due date to match the new followupDate

Tasks tagged "followup" are visually distinct: small "followup" chip displayed on the task row in all views.

#### Architecture constraints

- `db.js` is the only file that touches storage — all follow-up logic calls `DB.get()` / `DB.set()` only
- Render functions only build HTML — bucket logic lives in pure functions in `followups.js`
- `followupDate` on accounts is documented in Section 3.3 (done)
- `tags` and `accountId` on tasks are documented in Section 3.4 (done)
- The linked task relationship is queryable in both directions: account.followupDate links out, task.accountId links back

### 8.2 Smart Next Move on Account Detail

When any account is opened, a "Next Move" section appears at the top of the detail modal, above the interaction log.

Shows:
- Which of the 10 funnel steps this account is currently on
- The manually set next action (what Hunter wrote when last logging a touch)
- AI-generated context: what to reference from past interaction notes, what to bring up, talking points specific to this account's commodity and history
- Suggested contact method with reason based on interaction history (reads last 3-5 interactions)
- One-tap "Prep for Call" or "Draft Email" button depending on suggestion

Falls back to manual next action only if no Gemini key is set.

### 8.3 Call Prep Fixes (existing feature, needs repair)

Three specific fixes needed:
1. **Modal stacking bug** — `openCallPrep()` must close `account-detail-modal` before opening call prep overlay
2. **AI generation** — Add "Generate with AI" button to Pre-Call Prep tab. Calls Gemini with full account context. Returns personalized talking points, call goal, objections with responses.
3. **Live Call questions** — Make the 3 questions stage-aware rather than hardcoded generic questions

### 8.4 Niche Playbooks

A "Playbooks" section in the app. Three playbooks pre-loaded from the Houston Roadmap.

Each playbook shows:
- The 10-step funnel adapted with niche-specific tactics and talking points
- Niche-specific differentiators to use in outreach
- Key accounts and targets for that niche
- Seasonal timing notes (especially relevant for Pecan exports)
- A progress bar showing how many accounts in that niche are at each funnel stage
- "What to do this week" section pulled from roadmap phases based on current date

### 8.5 Auto-Generated Outreach Sequences

When an account is added or moved to a new pipeline stage, tasks are auto-generated based on cadence rules.

Logic:
- Account added as Target → Task: Send LinkedIn request (due today)
- Account moved to Contacted → Task: Contact 2 — phone call (due in 7 days)
- Account moved to Engaged → Task: Contact 3 — phone call (due in 7 days)
- Account at Engaged with last touch = call → suggest email for next touch
- Account at Engaged with last touch = email → suggest call for next touch
- After 6 touches no stage change → Task: Move to quarterly check-in

Tasks are created automatically but Hunter can edit or delete them.

### 8.6 Account-Linked Tasks

Allows tasks to be manually linked to accounts from the task modal, and shows those tasks directly on the account detail modal.

`task.accountId` already exists in the data model (Section 3.4). No new fields are needed.

#### Task Modal — Account Typeahead Field

A new optional "Account" field is added to the task create/edit form in `index.html` and wired up in `tasks.js`.

**Behavior:**
- Field is blank by default. It is optional on all tasks.
- User types 3 or more characters into the input. A dropdown appears showing up to 6 matching accounts, matched against `account.company` (case-insensitive substring match).
- If fewer than 3 characters are typed, no dropdown appears.
- User clicks a result to select it. The input is replaced by a removable chip showing the company name. `task.accountId` is set to that account's `id`.
- The chip has an X button. Clicking X clears the selection and restores the empty input. `task.accountId` is set back to `''`.
- When editing an existing task that already has an `accountId`, the chip is pre-populated with the linked account's company name.

**Architecture:**
- Account lookup is a pure logic function in `tasks.js`: `getAccountMatches(query)` — takes a string, returns up to 6 accounts from `DB.get('accounts')` matching the company name. No HTML. No side effects.
- The typeahead dropdown and chip are rendered by a dedicated render function. No filtering or matching happens inside a render function.

#### Account Detail Modal — Tasks Section

A Tasks section is added to the account detail modal in `index.html` (markup) and `crm.js` (wiring), below the interaction log.

**What it shows:**
- All tasks where `task.accountId === account.id`, excluding any task where `task.tags` contains `'followup'`.
- If no matching tasks, shows a single line: "No tasks linked to this account."
- Each task row shows:
  - Task name
  - Due date (formatted as `MMM D` e.g. "Apr 12", or "No due date" if blank)
  - Urgency chip (`--hot` / `--warm` / `--cold` per urgency level)
  - Checkbox — checking it calls `toggleTask(task.id)` then re-renders only the tasks section inline (does not close or re-open the modal)

**Quick-add field (below the task list):**
- A single-line input for task name and an "Add" button.
- Pressing Add or Enter creates a new task with: `urgency = 'medium'`, `accountId = account.id`, `due = ''`, `tags = ''`, `recurrence = 'none'`, `name = input value`. Does not open the task modal.
- After creation, the tasks section re-renders inline. The input clears.
- Empty task name input is a no-op (no task created, no error).
- All task creation goes through `DB.get` / `DB.set` per Architecture Rule 1. No direct localStorage access.

#### tasks.js — renderAccountTasks(accountId)

A pure render function added to `tasks.js`.

**Signature:** `renderAccountTasks(accountId)` — returns an HTML string.

**Rules:**
- Calls a separate logic function (e.g. `getTasksForAccount(accountId)`) that does the filtering: `DB.get('tasks').filter(t => t.accountId === accountId && !t.completed && !t.tags.split(',').map(s => s.trim()).includes('followup'))`.
- `renderAccountTasks` only builds and returns HTML. No filtering, no DB calls inside the render function itself.
- Checkbox `onclick` calls `toggleTask(task.id)` then re-renders the section: `document.getElementById('account-tasks-section').innerHTML = renderAccountTasks(accountId)`.

#### Re-render behavior

When a task is checked off from the account detail tasks section:
- `toggleTask(task.id)` is called (existing function, marks task completed and saves via `DB.set`).
- The tasks section div (`#account-tasks-section`) re-renders inline by calling `renderAccountTasks(accountId)` and updating `innerHTML`.
- The account detail modal stays open. Nothing else closes or refreshes.

#### Architecture constraints

- `db.js` only — no `localStorage` calls in `tasks.js` or `crm.js`.
- `renderAccountTasks` returns HTML only. All logic (filtering, sorting) is in separate pure functions called before it.
- CSS variables only — urgency chips use `var(--hot)`, `var(--warm)`, `var(--cold)`. No hardcoded hex values.
- No new data fields. `accountId` and `tags` are already documented in Section 3.4.

---

## CHANGELOG

### April 5, 2026 — Spec v6.2
- Added Section 8.6: Account-Linked Tasks — full spec for task modal typeahead, account detail tasks section, renderAccountTasks(), and inline re-render behavior
- Added "Account-Linked Tasks — Not built" to Section 3.1 build state table
- No data model changes — accountId and tags already documented in Section 3.4

### April 4, 2026 — Spec v6.1
- Added `followupDate` field to Account Data Model (Section 3.3)
- Added `tags` and `accountId` fields to Task Data Model (Section 3.4)
- Added `followups.js` to file structure (Section 2.2)
- Added Follow-up Dashboard to build state table (Section 3.1) as Not Built
- Replaced Section 8.1 placeholder with full Follow-up Dashboard spec including three buckets, row fields, cross-module sync rules, and architecture constraints
- Updated Session 3 roadmap description to reflect full spec scope

### April 4, 2026 — Bug fixes
- Fixed priority, tags, sourceTab missing from Google Sheets sync (db.js)
- Fixed taskTime and daysOfWeek missing from Google Sheets Tasks sync (db.js)
- Fixed nextRecurrenceDate for recurrence type 'days' not advancing due date (tasks.js)
- Fixed recurring 'days' tasks rendering one day early in calendar day/week views due to toISOString() UTC shift (calendar.js)

### April 1, 2026 — Spec v6.0
- Added Architecture Rules section (5 non-negotiable rules governing all future development)
- Added Section 2.7: Future Stack overview
- Added Section 5.4: Full tool stack table
- Expanded Section 2.5: Deployment and dev workflow with full tool table
- Expanded Section 2.6: Design system with full variable reference table
- Added Supabase to backend roadmap, repositioned as primary future backend over Airtable
- Added task and interaction data models to Section 3 (previously undocumented)
- Updated Section 5.1: Roadmap reordered — GitHub Desktop + Claude Code setup is now Session 1
- Updated Section 3.1: Build state reflects all fixes from April 1, 2026 session
- Updated file size reference to ~576k chars
- Spec version bumped to v6.0

### March 31, 2026 — Spec v5.0 (Session 2)
- Added Section 7: Niches and Sales Strategy
- Added Section 8: Planned Features spec

### March 31, 2026 — Spec v5.0 (Session 1)
- Imported 354 accounts + 561 interactions from Master Leads Excel file
- Added priority flagging, source tab display, tags, lists, filter row
- Migrated from Netlify to GitHub Pages

### March 28, 2026
- Google Sheets OAuth sync, project detail screen, calendar, AI assistant
- Fixed invalid_client OAuth error, added 49 master todo tasks

### Prior sessions
- Home screen, KPI tracker, fire button
- Accounts CRM with 9 pipeline stage tabs
- Tasks with urgency filters and recurring support
- Projects module with milestones and linked tasks
- Call Prep modal (partially complete)
