require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// Ensure data directory exists
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });

// ── Serve app ─────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'Project Management.html'));
});

// ── Data persistence ──────────────────────────────────────────────────────────

app.get('/api/data', (req, res) => {
  try {
    if (!fs.existsSync(DATA_FILE)) return res.json(null);
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (e) {
    console.error('[data] read error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    console.error('[data] write error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Jira sync ─────────────────────────────────────────────────────────────────

app.post('/api/jira/sync', async (req, res) => {
  const { JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    return res.status(400).json({ error: 'Jira credentials not set in .env (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN)' });
  }

  const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const base = JIRA_BASE_URL.replace(/\/$/, '');

  try {
    // Fetch projects
    const projRes = await fetch(`${base}/rest/api/3/project/search?maxResults=50`, { headers });
    if (!projRes.ok) throw new Error(`Jira projects: ${projRes.status} ${await projRes.text()}`);
    const projData = await projRes.json();
    const jiraProjects = (projData.values || []).map((p) => ({
      id: `jp-${p.id}`,
      key: p.key,
      name: p.name,
      boardId: `b-${p.id}`,
    }));

    // Fetch issues (up to 200, ordered by updated)
    const issuesRes = await fetch(
      `${base}/rest/api/3/search?jql=order+by+updated+DESC&maxResults=200&fields=summary,status,priority,assignee,reporter,issuetype,customfield_10016,customfield_10028,labels,description,updated,project`,
      { headers }
    );
    if (!issuesRes.ok) throw new Error(`Jira issues: ${issuesRes.status} ${await issuesRes.text()}`);
    const issuesData = await issuesRes.json();

    const jiraIssues = (issuesData.issues || []).map((i) => {
      const f = i.fields;
      const desc = extractText(f.description);
      return {
        id: `j-${i.id}`,
        key: i.key,
        projectKey: f.project?.key || i.key.split('-')[0],
        sprintId: extractSprintId(f.customfield_10028),
        type: f.issuetype?.name || 'Task',
        status: f.status?.name || 'To Do',
        priority: f.priority?.name || 'Medium',
        assignee: f.assignee?.displayName || 'Unassigned',
        reporter: f.reporter?.displayName || '',
        summary: f.summary || '',
        storyPoints: f.customfield_10016 || f.customfield_10028?.storyPoints || 0,
        labels: f.labels || [],
        updated: (f.updated || '').slice(0, 10),
        description: desc.slice(0, 500),
      };
    });

    // Fetch boards to get sprints
    const boardsRes = await fetch(`${base}/rest/agile/1.0/board?maxResults=50`, { headers });
    let sprints = [];
    if (boardsRes.ok) {
      const boardsData = await boardsRes.json();
      const boards = boardsData.values || [];
      const sprintFetches = boards.slice(0, 5).map((b) =>
        fetch(`${base}/rest/agile/1.0/board/${b.id}/sprint?state=active,future,closed&maxResults=20`, { headers })
          .then((r) => r.ok ? r.json() : { values: [] })
          .then((d) => (d.values || []).map((s) => ({
            id: `sp-${s.id}`,
            name: s.name,
            jiraProjectId: `jp-${b.location?.projectId || b.id}`,
            state: s.state,
            start: (s.startDate || '').slice(0, 10),
            end: (s.endDate || '').slice(0, 10),
            goal: s.goal || '',
          })))
          .catch(() => [])
      );
      const sprintArrays = await Promise.all(sprintFetches);
      sprints = sprintArrays.flat();
    }

    // Update sprint IDs on issues now that we know sprint mapping
    const sprintNameMap = {};
    sprints.forEach((s) => { sprintNameMap[s.name] = s.id; });
    jiraIssues.forEach((i) => {
      if (i._sprintName) i.sprintId = sprintNameMap[i._sprintName] || i.sprintId;
      delete i._sprintName;
    });

    res.json({ jiraProjects, jiraIssues, sprints });
  } catch (e) {
    console.error('[jira] sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Confluence sync ───────────────────────────────────────────────────────────

app.post('/api/confluence/sync', async (req, res) => {
  const { CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN } = process.env;
  if (!CONFLUENCE_BASE_URL || !CONFLUENCE_EMAIL || !CONFLUENCE_API_TOKEN) {
    return res.status(400).json({ error: 'Confluence credentials not set in .env (CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN)' });
  }

  const auth = Buffer.from(`${CONFLUENCE_EMAIL}:${CONFLUENCE_API_TOKEN}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' };
  const base = CONFLUENCE_BASE_URL.replace(/\/$/, '');

  try {
    // Fetch spaces
    const spacesRes = await fetch(`${base}/wiki/rest/api/space?limit=50&type=global`, { headers });
    if (!spacesRes.ok) throw new Error(`Confluence spaces: ${spacesRes.status} ${await spacesRes.text()}`);
    const spacesData = await spacesRes.json();
    const confluenceSpaces = (spacesData.results || []).map((s) => ({
      id: `cs-${s.id}`,
      key: s.key,
      name: s.name,
    }));

    // Fetch pages with body content
    const pagesRes = await fetch(
      `${base}/wiki/rest/api/content?type=page&limit=100&expand=body.storage,metadata.labels,version,ancestors,space`,
      { headers }
    );
    if (!pagesRes.ok) throw new Error(`Confluence pages: ${pagesRes.status} ${await pagesRes.text()}`);
    const pagesData = await pagesRes.json();

    const spaceKeyToId = {};
    confluenceSpaces.forEach((s) => { spaceKeyToId[s.key] = s.id; });

    const confluencePages = (pagesData.results || []).map((p) => {
      const rawBody = p.body?.storage?.value || '';
      const plainBody = stripHtml(rawBody).slice(0, 2000);
      const tags = (p.metadata?.labels?.results || []).map((l) => l.name);
      const spaceKey = p.space?.key || '';
      const parentId = p.ancestors?.length ? `cp-${p.ancestors[p.ancestors.length - 1].id}` : null;
      return {
        id: `cp-${p.id}`,
        spaceId: spaceKeyToId[spaceKey] || `cs-${spaceKey}`,
        title: p.title || '',
        author: p.version?.by?.displayName || '',
        updated: (p.version?.when || '').slice(0, 10),
        body: plainBody,
        tags,
        parentId,
      };
    });

    res.json({ confluenceSpaces, confluencePages });
  } catch (e) {
    console.error('[confluence] sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── AI chat ───────────────────────────────────────────────────────────────────

app.post('/api/ai/chat', async (req, res) => {
  const { ANTHROPIC_API_KEY, ANTHROPIC_MODEL } = process.env;
  if (!ANTHROPIC_API_KEY) {
    return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set in .env' });
  }

  const { system, messages } = req.body;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL || 'claude-opus-4-7',
        max_tokens: 1024,
        system: system || 'You are a helpful project management assistant.',
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || `Anthropic API error ${response.status}`);
    res.json({ text: data.content[0].text });
  } catch (e) {
    console.error('[ai] chat error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extract plain text from Atlassian Document Format (ADF) or plain strings
function extractText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (node.content) return node.content.map(extractText).join(' ');
  return '';
}

function extractSprintId(sprintField) {
  if (!sprintField) return null;
  if (Array.isArray(sprintField) && sprintField.length) return `sp-${sprintField[0].id}`;
  if (typeof sprintField === 'object' && sprintField.id) return `sp-${sprintField.id}`;
  return null;
}

// Strip HTML tags from Confluence storage format
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n  Operator running at http://localhost:${PORT}\n`);
  const missing = [];
  if (!process.env.JIRA_API_TOKEN) missing.push('JIRA_API_TOKEN');
  if (!process.env.CONFLUENCE_API_TOKEN) missing.push('CONFLUENCE_API_TOKEN');
  if (!process.env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (missing.length) {
    console.log(`  ⚠  Not configured (add to .env): ${missing.join(', ')}\n`);
  } else {
    console.log(`  ✓  All integrations configured\n`);
  }
});
