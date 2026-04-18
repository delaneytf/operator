# Operator

Solo-operator project management. Tracks projects, tasks, milestones, risks, a weekly calendar, and connects to Jira, Confluence, and Claude AI.

## Quick start

**Requirements:** Node.js 18+

```bash
git clone https://github.com/delaneytf/operator.git
cd operator
npm install
cp .env.example .env   # then fill in your credentials (see below)
npm start
```

Open **http://localhost:3000** in your browser.

Your data saves automatically to `data/data.json` every time you make a change.

---

## Credentials

All credentials live in `.env` at the project root. This file is gitignored — it will never be committed.

### Jira

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**, give it a name, copy the token
3. Fill in `.env`:

```
JIRA_BASE_URL=https://your-org.atlassian.net   # your Atlassian Cloud URL
JIRA_EMAIL=you@yourcompany.com                  # email you log in with
JIRA_API_TOKEN=<paste token here>
```

Then open the **Jira** tab in Operator and click **Sync**. Your projects, sprints, and issues will load.

### Confluence

Confluence uses the same Atlassian account as Jira. The API token is the same one.

```
CONFLUENCE_BASE_URL=https://your-org.atlassian.net   # same as JIRA_BASE_URL
CONFLUENCE_EMAIL=you@yourcompany.com
CONFLUENCE_API_TOKEN=<same token as Jira>
```

Then open the **Confluence** tab and click **Sync**. Your spaces and pages will load.

### Claude AI (Assistant tab)

1. Go to https://console.anthropic.com/settings/api-keys
2. Click **Create Key**, copy it
3. Fill in `.env`:

```
ANTHROPIC_API_KEY=<paste key here>
ANTHROPIC_MODEL=claude-opus-4-7   # optional, defaults to claude-opus-4-7
```

The **Assistant** tab will now answer questions grounded in your Jira issues and Confluence pages.

---

## Data storage

| What | Where |
|------|-------|
| All app data (projects, tasks, etc.) | `data/data.json` |
| API credentials | `.env` (gitignored) |
| Fallback / offline cache | Browser localStorage (`opm.v4`) |

`data/data.json` is **not** gitignored by default — you can commit it to keep your data in version control. To exclude it, uncomment the line in `.gitignore`.

---

## Running in development

```bash
npm run dev   # uses node --watch for auto-restart on file changes
```

---

## Project structure

```
operator/
├── server.js               # Express server — data persistence + API proxies
├── .env                    # Your credentials (gitignored)
├── .env.example            # Template — copy to .env and fill in
├── data/
│   └── data.json           # Your app data (auto-created on first save)
├── src/
│   ├── store.js            # State management
│   ├── seed.js             # Default seed data
│   ├── app.jsx             # App shell + routing
│   ├── today.jsx           # Today / focus view
│   ├── portfolio.jsx       # Portfolio dashboard
│   ├── project.jsx         # Project detail
│   ├── calendar.jsx        # Cross-project Gantt calendar
│   ├── jira.jsx            # Jira viewer (syncs from real Jira)
│   ├── confluence.jsx      # Confluence viewer (syncs from real Confluence)
│   ├── assistant.jsx       # AI assistant (uses Claude API)
│   └── styles.css          # All styles
└── Project Management.html # Entry point (served at /)
```
