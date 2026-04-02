# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hunter Command Center is a personal CRM and productivity management tool — a single-page application combining sales pipeline management, task tracking, project management, KPI monitoring, and AI-assisted workflows.

## Running the App

No build system. Open `index.html` directly in a browser. All data is stored in `localStorage` (prefixed with `hcc_`). There are no npm packages, no build step, and no server required.

## Architecture

The entire application lives in **`index.html`** (~8,700 lines), organized into three sections:

1. **HTML** — Sidebar navigation + 7 page containers + modal overlay system
2. **CSS** — Custom design system with CSS variables (navy/dark theme, custom fonts: Syne, Inter, DM Mono)
3. **JavaScript** — All logic, organized by large comment-delimited sections:
   - `DATA LAYER` — localStorage wrapper (`DB.get`, `DB.set`, `DB.getObj`, `DB.setObj`)
   - `UTILITIES` — `uid()`, `today()`, `daysUntil()`, `daysSince()`, `isOverdue()`, etc.
   - `SEED DATA` — First-run sample data with migration flags (`hcc_seeded_v2`, `hcc_migrated_projnames`)
   - `NAVIGATION` — Single-page routing by toggling `.active` on `page-*` divs
   - Page sections: `HOME`, `CRM`, `TASKS`, `CALENDAR`, `PROJECTS`, `AI ASSISTANT`
   - `GEMINI AI — PHASE 1C` — AI integration

## Data Model

All collections stored as JSON arrays in localStorage:

| Key | Shape |
|-----|-------|
| `hcc_tasks` | `{id, name, urgency, project, due, recurrence, completed, created}` |
| `hcc_accounts` | `{id, company, commodity, stage, notes, tags, lastContacted, priority, ...}` |
| `hcc_projects` | `{id, name, customer, status, color, desc, blocker, next, notes, milestones}` |
| `hcc_interactions` | `{id, accountId, date, type, text}` |
| `hcc_kpis` | `{calls, callsGoal, prospects, prospectsGoal, followups, followupsGoal, callHours, callHoursGoal}` |
| `hcc_lists` | Custom account groupings |

## External API Integrations

- **Gemini AI** (`gemini-2.0-flash`) — Morning briefings, email analysis, task categorization. API key entered via Settings UI, stored in `localStorage`.
- **Google Sheets API v4** — Data export. OAuth Client ID configured in Settings UI.

Both API keys/credentials are entered through the in-app Settings modal (⚙ icon) — never hardcoded.

## Navigation Pattern

Pages are shown/hidden by toggling CSS classes on `#page-home`, `#page-crm`, `#page-tasks`, `#page-calendar`, `#page-projects`, `#page-ai`, `#page-project-detail`. There is no URL routing.

## UI Patterns

- **Modals** — All create/edit operations use overlay modals
- **Toast notifications** — User feedback for save/delete actions
- **Urgency levels** — `high`, `medium`, `low`
- **CRM stages** — Priority → Target → Contacted → Engaged → Warm → Proposal → Negotiating → Onboarded → Dormant
- **Stale accounts** — Visually badged when not contacted in 30+ days (`daysSince()`)
