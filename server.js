require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
// In packaged Electron app, OPERATOR_DATA_DIR points to writable userData.
// In dev, falls back to ./data/ in the project root.
const DATA_DIR    = process.env.OPERATOR_DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE   = path.join(DATA_DIR, 'data.json');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

// Ensure data directory exists (uses writable userData in packaged app)
fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Token store helpers ───────────────────────────────────────────────────────

function readTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return {};
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch { return {}; }
}

function writeTokens(data) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
}

function getToken(provider) {
  return readTokens()[provider] || null;
}

function setToken(provider, credentials) {
  const tokens = readTokens();
  tokens[provider] = { ...credentials, savedAt: new Date().toISOString() };
  writeTokens(tokens);
}

function deleteToken(provider) {
  const tokens = readTokens();
  delete tokens[provider];
  writeTokens(tokens);
}

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

// ── Auth: credential storage ──────────────────────────────────────────────────

app.get('/api/auth/status', (req, res) => {
  const tokens = readTokens();
  const env = process.env;
  const status = {};

  const providers = ['jira', 'confluence', 'slack', 'teams', 'outlook', 'metabase', 'claude', 'openai', 'gemini'];
  providers.forEach((p) => {
    const t = tokens[p];
    status[p] = { connected: !!t, savedAt: t?.savedAt || null };
    if (t?.email) status[p].email = t.email;
    if (t?.site)  status[p].site  = t.site;
    if (t?.user)  status[p].user  = t.user;
  });

  // Also check env fallbacks for Jira / Confluence / Claude
  if (!status.jira.connected && env.JIRA_API_TOKEN)        status.jira        = { connected: true, source: 'env' };
  if (!status.confluence.connected && env.CONFLUENCE_API_TOKEN) status.confluence = { connected: true, source: 'env' };
  if (!status.claude.connected && env.ANTHROPIC_API_KEY)   status.claude      = { connected: true, source: 'env' };
  if (!status.gemini.connected && env.GEMINI_API_KEY)      status.gemini      = { connected: true, source: 'env' };

  res.json(status);
});

app.post('/api/auth/credentials', (req, res) => {
  const { provider, credentials } = req.body;
  if (!provider || !credentials) return res.status(400).json({ error: 'provider and credentials required' });
  const allowed = ['jira', 'confluence', 'slack', 'teams', 'outlook', 'metabase', 'claude', 'openai'];
  if (!allowed.includes(provider)) return res.status(400).json({ error: 'unknown provider' });
  setToken(provider, credentials);
  res.json({ ok: true });
});

app.delete('/api/auth/:provider', (req, res) => {
  deleteToken(req.params.provider);
  res.json({ ok: true });
});

// ── Jira sync ─────────────────────────────────────────────────────────────────

app.post('/api/jira/sync', async (req, res) => {
  const t = getToken('jira');
  const email    = t?.email    || process.env.JIRA_EMAIL;
  const token    = t?.token    || process.env.JIRA_API_TOKEN;
  const baseUrl  = t?.site     || process.env.JIRA_BASE_URL;

  if (!baseUrl || !email || !token) {
    return res.status(400).json({ error: 'Jira credentials not configured. Set them in Integrations or add JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to .env' });
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json', 'Content-Type': 'application/json' };
  const base = baseUrl.replace(/\/$/, '');

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
  const t = getToken('confluence');
  const email   = t?.email   || process.env.CONFLUENCE_EMAIL;
  const token   = t?.token   || process.env.CONFLUENCE_API_TOKEN;
  const baseUrl = t?.site    || process.env.CONFLUENCE_BASE_URL;

  if (!baseUrl || !email || !token) {
    return res.status(400).json({ error: 'Confluence credentials not configured. Set them in Integrations or add CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN to .env' });
  }

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, Accept: 'application/json' };
  const base = baseUrl.replace(/\/$/, '');

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

// ── Slack sync ────────────────────────────────────────────────────────────────

app.post('/api/slack/sync', async (req, res) => {
  const t = getToken('slack');
  const botToken = t?.token || process.env.SLACK_BOT_TOKEN;
  if (!botToken) return res.status(400).json({ error: 'Slack bot token not configured. Set it in Integrations.' });

  const headers = { Authorization: `Bearer ${botToken}`, 'Content-Type': 'application/json' };

  try {
    // Fetch public channels
    const chanRes = await fetch('https://slack.com/api/conversations.list?limit=200&exclude_archived=true&types=public_channel', { headers });
    const chanData = await chanRes.json();
    if (!chanData.ok) throw new Error(`Slack channels: ${chanData.error}`);

    const channels = (chanData.channels || []).map((c) => ({
      id: c.id,
      name: c.name,
      topic: c.topic?.value || '',
      memberCount: c.num_members || 0,
      isPrivate: c.is_private || false,
    }));

    // Fetch recent messages from the first 5 channels
    const msgFetches = channels.slice(0, 5).map((ch) =>
      fetch(`https://slack.com/api/conversations.history?channel=${ch.id}&limit=20`, { headers })
        .then((r) => r.json())
        .then((d) => (d.messages || []).filter((m) => m.type === 'message' && m.text).map((m) => ({
          channelId: ch.id,
          channelName: ch.name,
          ts: m.ts,
          text: m.text.slice(0, 500),
          user: m.user || '',
        })))
        .catch(() => [])
    );
    const msgArrays = await Promise.all(msgFetches);
    const messages = msgArrays.flat().sort((a, b) => parseFloat(b.ts) - parseFloat(a.ts)).slice(0, 100);

    res.json({ slackChannels: channels, slackMessages: messages });
  } catch (e) {
    console.error('[slack] sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Microsoft Graph sync ──────────────────────────────────────────────────────

app.post('/api/microsoft/sync', async (req, res) => {
  const t = getToken('teams') || getToken('outlook');
  const accessToken = t?.accessToken || process.env.MICROSOFT_ACCESS_TOKEN;
  if (!accessToken) return res.status(400).json({ error: 'Microsoft access token not configured. Connect via Integrations.' });

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 86400000).toISOString();

  try {
    // Calendar events
    const eventsRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now}&endDateTime=${future}&$top=50&$select=subject,start,end,organizer,attendees,bodyPreview,isOnlineMeeting`,
      { headers }
    );
    const eventsData = await eventsRes.json();
    if (eventsData.error) throw new Error(`Graph calendar: ${eventsData.error.message}`);

    const calendarEvents = (eventsData.value || []).map((e) => ({
      id: `ms-${e.id?.slice(0, 20) || Math.random()}`,
      title: e.subject || '',
      start: e.start?.dateTime?.slice(0, 16) || '',
      end:   e.end?.dateTime?.slice(0, 16) || '',
      organizer: e.organizer?.emailAddress?.name || '',
      attendees: (e.attendees || []).map((a) => a.emailAddress?.name || '').filter(Boolean),
      body: e.bodyPreview?.slice(0, 300) || '',
      isOnline: e.isOnlineMeeting || false,
    }));

    // Recent emails
    const mailRes = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=30&$select=subject,from,receivedDateTime,bodyPreview,isRead&$orderby=receivedDateTime desc',
      { headers }
    );
    const mailData = await mailRes.json();
    const emails = (mailData.value || []).map((m) => ({
      id: `ml-${m.id?.slice(0, 20) || Math.random()}`,
      subject: m.subject || '',
      from: m.from?.emailAddress?.name || '',
      received: (m.receivedDateTime || '').slice(0, 10),
      preview: m.bodyPreview?.slice(0, 200) || '',
      isRead: m.isRead || false,
    }));

    res.json({ calendarEvents, emails });
  } catch (e) {
    console.error('[microsoft] sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── AI chat ───────────────────────────────────────────────────────────────────

// ── Jira project list (for scope picker) ─────────────────────────────────────

app.get('/api/jira/projects', async (req, res) => {
  const t = getToken('jira');
  const email   = t?.email   || process.env.JIRA_EMAIL;
  const token   = t?.token   || process.env.JIRA_API_TOKEN;
  const baseUrl = t?.site    || process.env.JIRA_BASE_URL;
  if (!baseUrl || !email || !token) return res.status(400).json({ error: 'Jira not configured' });

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const base = baseUrl.replace(/\/$/, '');
  try {
    const r = await fetch(`${base}/rest/api/3/project/search?maxResults=100&orderBy=NAME`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const data = await r.json();
    res.json((data.values || []).map((p) => ({ key: p.key, name: p.name })));
  } catch (e) {
    console.error('[jira] projects error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Confluence space list (for scope picker) ──────────────────────────────────

app.get('/api/confluence/spaces', async (req, res) => {
  const t = getToken('confluence');
  const email   = t?.email   || process.env.CONFLUENCE_EMAIL;
  const token   = t?.token   || process.env.CONFLUENCE_API_TOKEN;
  const baseUrl = t?.site    || process.env.CONFLUENCE_BASE_URL;
  if (!baseUrl || !email || !token) return res.status(400).json({ error: 'Confluence not configured' });

  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const base = baseUrl.replace(/\/$/, '');
  try {
    const r = await fetch(`${base}/wiki/rest/api/space?limit=100&type=global`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const data = await r.json();
    res.json((data.results || []).map((s) => ({ key: s.key, name: s.name })));
  } catch (e) {
    console.error('[confluence] spaces error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── AI chat ───────────────────────────────────────────────────────────────────

app.post('/api/ai/chat', async (req, res) => {
  const { system, messages, provider: reqProvider } = req.body;

  const claudeToken = getToken('claude');
  const openaiToken = getToken('openai');
  const geminiToken = getToken('gemini');
  const anthropicKey = claudeToken?.apiKey || process.env.ANTHROPIC_API_KEY;
  const openaiKey    = openaiToken?.apiKey || process.env.OPENAI_API_KEY;
  const geminiKey    = geminiToken?.apiKey || process.env.GEMINI_API_KEY;

  const provider = reqProvider || (anthropicKey ? 'claude' : openaiKey ? 'openai' : geminiKey ? 'gemini' : null);
  if (!provider) return res.status(400).json({ error: 'No AI provider configured. Connect Claude, OpenAI, or Gemini in Integrations.' });

  try {
    if (provider === 'openai') {
      if (!openaiKey) return res.status(400).json({ error: 'OpenAI API key not configured.' });
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: openaiToken?.model || process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: system || 'You are a helpful project management assistant.' },
            ...messages,
          ],
          max_tokens: 1024,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `OpenAI error ${response.status}`);
      res.json({ text: data.choices[0].message.content, provider: 'openai' });

    } else if (provider === 'gemini') {
      if (!geminiKey) return res.status(400).json({ error: 'Gemini API key not configured.' });
      const model = geminiToken?.model || process.env.GEMINI_MODEL || 'gemini-1.5-pro';
      // Gemini uses a different message format; inject system prompt as leading turn
      const contents = [];
      if (system) {
        contents.push({ role: 'user', parts: [{ text: system }] });
        contents.push({ role: 'model', parts: [{ text: 'Understood.' }] });
      }
      messages.forEach((m) => contents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents }) }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Gemini error ${response.status}`);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      res.json({ text, provider: 'gemini' });

    } else {
      if (!anthropicKey) return res.status(400).json({ error: 'Anthropic API key not configured.' });
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: claudeToken?.model || process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
          max_tokens: 1024,
          system: system || 'You are a helpful project management assistant.',
          messages,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Anthropic API error ${response.status}`);
      res.json({ text: data.content[0].text, provider: 'claude' });
    }
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
  const tokens = readTokens();
  const check = (envKey, tokenProvider, label) => {
    if (process.env[envKey] || tokens[tokenProvider]) console.log(`  ✓  ${label}`);
    else console.log(`  ·  ${label} (not configured)`);
  };
  check('ANTHROPIC_API_KEY', 'claude',      'Claude AI');
  check('OPENAI_API_KEY',    'openai',      'OpenAI');
  check('JIRA_API_TOKEN',    'jira',        'Jira');
  check('CONFLUENCE_API_TOKEN', 'confluence', 'Confluence');
  check('SLACK_BOT_TOKEN',   'slack',       'Slack');
  check('MICROSOFT_ACCESS_TOKEN', 'teams',  'Microsoft (Teams/Outlook)');
  console.log('');
});
