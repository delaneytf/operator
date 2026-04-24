require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const REDIRECT_BASE = process.env.OAUTH_REDIRECT_BASE || `http://localhost:${PORT}`;
const oauthStates = {}; // nonce → { provider, codeVerifier? }
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
    status[p] = { connected: !!t, savedAt: t?.savedAt || null, authType: t?.authType || 'apikey' };
    if (t?.email)    status[p].email = t.email;
    if (t?.site || t?.siteName) status[p].site = t.siteName || t.site;
    if (t?.user)     status[p].user  = t.user;
  });

  // Also check env fallbacks for Jira / Confluence / Claude
  if (!status.jira.connected && env.JIRA_API_TOKEN)        status.jira        = { connected: true, source: 'env' };
  if (!status.confluence.connected && env.CONFLUENCE_API_TOKEN) status.confluence = { connected: true, source: 'env' };
  if (!status.claude.connected && env.ANTHROPIC_API_KEY)   status.claude      = { connected: true, source: 'env' };
  if (!status.gemini.connected && env.GEMINI_API_KEY)      status.gemini      = { connected: true, source: 'env' };

  res.json(status);
});

// ── Export workspace data as XLSX ─────────────────────────────────────────────
app.post('/api/export-xlsx', async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const state = req.body;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Operator';

    const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
    const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const BORDER = {
      top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
      right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };

    // Build ref ID maps
    const programs = state.programs || [];
    const projects = state.projects || [];
    const tasks = state.tasks || [];
    const milestones = state.milestones || [];
    const meetings = state.meetings || [];
    const notes = state.notes || [];
    const risks = state.risks || [];
    const blockers = state.blockers || [];
    const reminders = state.reminders || [];

    const pgRef = {}; programs.forEach((p, i) => { pgRef[p.id] = `pg-${i + 1}`; });
    const pRef = {}; projects.forEach((p, i) => { pRef[p.id] = `p-${i + 1}`; });
    const tRef = {}; tasks.forEach((t, i) => { tRef[t.id] = `t-${i + 1}`; });
    const msRef = {}; milestones.forEach((m, i) => { msRef[m.id] = `ms-${i + 1}`; });
    const mtRef = {}; meetings.forEach((m, i) => { mtRef[m.id] = `mt-${i + 1}`; });

    function addSheet(name, columns, dataRows) {
      const ws = wb.addWorksheet(name);
      const headerRow = ws.getRow(1);
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.fill = HEADER_FILL;
        cell.font = HEADER_FONT;
        cell.border = BORDER;
        cell.alignment = { vertical: 'middle' };
      });
      headerRow.height = 22;
      ws.columns = columns.map((col) => ({ width: col.width || 18 }));

      // Data validation
      columns.forEach((col, i) => {
        if (col.validation) {
          const end = Math.max(dataRows.length + 2, 100);
          for (let r = 2; r <= end; r++) {
            ws.getCell(r, i + 1).dataValidation = {
              type: 'list', allowBlank: true,
              formulae: [`"${col.validation.join(',')}"`],
            };
          }
        }
      });

      dataRows.forEach((row, ri) => {
        const r = ws.getRow(2 + ri);
        row.forEach((val, ci) => {
          const cell = r.getCell(ci + 1);
          cell.value = val != null ? String(val) : '';
          cell.border = BORDER;
        });
      });
      return ws;
    }

    // Helper
    const v = (x) => (x != null && x !== undefined) ? String(x) : '';
    const pipeJoin = (arr) => (Array.isArray(arr) ? arr.join('|') : v(arr));
    const refMap = (arr, map) => (Array.isArray(arr) ? arr.map(id => map[id] || id).join('|') : '');

    // ── PROGRAMS ──
    addSheet('Programs', [
      { header: 'ref_id', width: 12 },
      { header: 'name', width: 30 },
      { header: 'status', width: 12, validation: ['planned', 'active', 'on-track', 'at-risk', 'blocked', 'done', 'closed'] },
      { header: 'description', width: 45 },
      { header: 'deliverable', width: 35 },
    ], programs.map(p => [pgRef[p.id], v(p.name), v(p.status), v(p.description), v(p.deliverable)]));

    // ── PROJECTS ──
    addSheet('Projects', [
      { header: 'ref_id', width: 10 },
      { header: 'program_ref', width: 12 },
      { header: 'code', width: 10 },
      { header: 'name', width: 30 },
      { header: 'objective', width: 35 },
      { header: 'description', width: 35 },
      { header: 'deliverable', width: 30 },
      { header: 'status', width: 12, validation: ['planned', 'on-track', 'at-risk', 'blocked', 'done', 'closed'] },
      { header: 'priority', width: 12, validation: ['critical', 'high', 'medium', 'low'] },
      { header: 'color', width: 10, validation: ['amber', 'rose', 'sky', 'violet', 'emerald'] },
      { header: 'owner', width: 16 },
      { header: 'team (pipe-separated)', width: 22 },
      { header: 'start_date', width: 14 },
      { header: 'due_date', width: 14 },
      { header: 'depends_on (pipe-separated)', width: 22 },
    ], projects.map(p => [
      pRef[p.id], pgRef[p.programId] || '', v(p.code), v(p.name), v(p.objective),
      v(p.description), v(p.deliverable), v(p.status), v(p.priority), v(p.color),
      v(p.owner), pipeJoin(p.team), v(p.startDate), v(p.dueDate),
      refMap(p.dependsOn, pRef),
    ]));

    // ── SUCCESS CRITERIA ──
    const scRows = [];
    projects.forEach(p => {
      (p.successCriteria || []).forEach(sc => {
        scRows.push([
          pRef[p.id], v(sc.type || 'metric'), v(sc.text),
          v(sc.current), v(sc.target), v(sc.final), v(sc.finalResult),
          sc.type === 'binary' ? (sc.done ? 'yes' : 'no') : '',
        ]);
      });
    });
    addSheet('Success Criteria', [
      { header: 'project_ref', width: 12 },
      { header: 'type', width: 10, validation: ['metric', 'binary'] },
      { header: 'text', width: 40 },
      { header: 'baseline', width: 20 },
      { header: 'target', width: 20 },
      { header: 'final', width: 20 },
      { header: 'final_result', width: 12, validation: ['hit', 'missed'] },
      { header: 'done', width: 8, validation: ['yes', 'no'] },
    ], scRows);

    // ── MILESTONES ──
    addSheet('Milestones', [
      { header: 'project_ref', width: 12 },
      { header: 'name', width: 30 },
      { header: 'description', width: 35 },
      { header: 'deliverable', width: 30 },
      { header: 'date', width: 14 },
      { header: 'status', width: 14, validation: ['planned', 'in-progress', 'blocked', 'done', 'cancelled'] },
    ], milestones.map(m => [
      pRef[m.projectId] || '', v(m.name), v(m.description), v(m.deliverable), v(m.date), v(m.status),
    ]));

    // ── TASKS ──
    addSheet('Tasks', [
      { header: 'ref_id', width: 10 },
      { header: 'project_ref', width: 12 },
      { header: 'milestone_ref', width: 12 },
      { header: 'title', width: 35 },
      { header: 'status', width: 14, validation: ['todo', 'in-progress', 'blocked', 'done', 'cancelled'] },
      { header: 'priority', width: 12, validation: ['critical', 'high', 'medium', 'low'] },
      { header: 'due_date', width: 14 },
      { header: 'estimate (days)', width: 14 },
      { header: 'source', width: 12, validation: ['planned', 'reactive'] },
      { header: 'description', width: 40 },
      { header: 'depends_on (pipe-separated)', width: 22 },
    ], tasks.map(t => [
      tRef[t.id], pRef[t.projectId] || '', msRef[t.milestoneId] || '',
      v(t.title), v(t.status), v(t.priority), v(t.dueDate),
      v(t.estimate), v(t.source), v(t.description),
      refMap(t.dependsOn, tRef),
    ]));

    // ── BLOCKERS ──
    addSheet('Blockers', [
      { header: 'task_ref', width: 12 },
      { header: 'project_ref', width: 12 },
      { header: 'reason', width: 45 },
      { header: 'since', width: 14 },
    ], blockers.map(b => [
      tRef[b.taskId] || '', pRef[b.projectId] || '', v(b.reason || b.description), v(b.since),
    ]));

    // ── RISKS ──
    addSheet('Risks', [
      { header: 'project_ref', width: 12 },
      { header: 'title', width: 30 },
      { header: 'description', width: 35 },
      { header: 'severity (1-5)', width: 12, validation: ['1', '2', '3', '4', '5'] },
      { header: 'likelihood (1-5)', width: 12, validation: ['1', '2', '3', '4', '5'] },
      { header: 'category', width: 14, validation: ['Technical', 'Financial', 'Schedule', 'Resource', 'External', 'Compliance'] },
      { header: 'response', width: 12, validation: ['Reduce', 'Avoid', 'Accept', 'Transfer'] },
      { header: 'mitigation', width: 35 },
      { header: 'impact', width: 30 },
      { header: 'trigger', width: 25 },
      { header: 'contingency', width: 30 },
      { header: 'status', width: 12, validation: ['open', 'monitoring', 'closed', 'cancelled'] },
      { header: 'owner', width: 14 },
      { header: 'due_date', width: 14 },
      { header: 'review_date', width: 14 },
    ], risks.map(r => [
      pRef[r.projectId] || '', v(r.title), v(r.description),
      v(r.severity), v(r.likelihood), v(r.category), v(r.response),
      v(r.mitigation), v(r.impact), v(r.trigger), v(r.contingency),
      v(r.status), v(r.owner), v(r.dueDate), v(r.reviewDate),
    ]));

    // ── DECISIONS ──
    const decisions = notes.filter(n => n.kind === 'decision' && !n.cancelled);
    addSheet('Decisions', [
      { header: 'project_ref', width: 12 },
      { header: 'meeting_ref', width: 12 },
      { header: 'title', width: 30 },
      { header: 'body', width: 40 },
      { header: 'context', width: 35 },
      { header: 'options_considered', width: 35 },
      { header: 'reversibility', width: 14, validation: ['reversible', 'irreversible'] },
      { header: 'date', width: 14 },
      { header: 'tags (pipe-separated)', width: 22 },
    ], decisions.map(d => [
      pRef[d.projectId] || '', mtRef[d.meetingId] || '',
      v(d.title), v(d.body), v(d.context), v(d.optionsConsidered),
      v(d.reversibility), v(d.date), pipeJoin(d.tags),
    ]));

    // ── QUESTIONS ──
    const questions = notes.filter(n => n.kind === 'question' && !n.cancelled);
    addSheet('Questions', [
      { header: 'project_ref (pipe-separated)', width: 22 },
      { header: 'meeting_ref', width: 12 },
      { header: 'title', width: 35 },
      { header: 'body', width: 40 },
      { header: 'resolution', width: 35 },
      { header: 'resolved', width: 10, validation: ['true', 'false'] },
      { header: 'date', width: 14 },
      { header: 'tags (pipe-separated)', width: 22 },
    ], questions.map(q => {
      const projRefs = q.projectIds ? q.projectIds.map(id => pRef[id] || id).join('|') : (pRef[q.projectId] || '');
      return [
        projRefs, mtRef[q.meetingId] || '',
        v(q.title), v(q.body), v(q.resolution),
        q.resolved ? 'true' : 'false', v(q.date), pipeJoin(q.tags),
      ];
    }));

    // ── MEETINGS ──
    addSheet('Meetings', [
      { header: 'ref_id', width: 10 },
      { header: 'title', width: 30 },
      { header: 'date', width: 14 },
      { header: 'attendees (pipe-separated)', width: 25 },
      { header: 'notes', width: 45 },
      { header: 'project_refs (pipe-separated)', width: 22 },
      { header: 'recurrence', width: 12, validation: ['none', 'weekly', 'biweekly', 'monthly', 'quarterly'] },
    ], meetings.map(m => [
      mtRef[m.id], v(m.title), v(m.date), v(m.attendees), v(m.notes),
      refMap(m.projectIds, pRef), v(m.recurrence),
    ]));

    // ── REMINDERS ──
    addSheet('Reminders', [
      { header: 'date', width: 14 },
      { header: 'title', width: 30 },
      { header: 'note', width: 45 },
    ], reminders.map(r => [v(r.date), v(r.title), v(r.note)]));

    // Write to buffer and send
    const buffer = await wb.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="operator-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    });
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[export-xlsx]', err.message);
    res.status(500).json({ error: 'Export failed: ' + err.message });
  }
});

// ── Parse XLSX to JSON ──────────────────────────────────────────────────────
app.post('/api/parse-xlsx', express.raw({ type: 'application/octet-stream', limit: '2mb' }), async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.body);
    const result = {};
    wb.eachSheet((ws) => {
      if (ws.name === 'Instructions') return;
      const rows = [];
      let headers = null;
      ws.eachRow((row, rowNum) => {
        const vals = [];
        row.eachCell({ includeEmpty: true }, (cell, colNum) => { vals[colNum - 1] = cell.value != null ? String(cell.value).trim() : ''; });
        // Skip instruction row (first row if it spans full width and isn't a header)
        if (!headers) {
          // Check if this looks like a header row (multiple non-empty cells)
          const nonEmpty = vals.filter(v => v).length;
          if (nonEmpty >= 2 && vals[0] && !vals[0].startsWith('Enter') && !vals[0].startsWith('project_ref should')) {
            headers = vals.map(v => v.replace(/\s*\(.*?\)\s*$/, '').trim());
          }
          return;
        }
        if (vals.every(v => !v)) return; // skip empty rows
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = vals[i] || ''; });
        rows.push(obj);
      });
      if (headers && rows.length > 0) result[ws.name] = rows;
    });
    res.json(result);
  } catch (err) {
    console.error('[parse-xlsx]', err.message);
    res.status(400).json({ error: 'Could not parse XLSX file' });
  }
});

app.post('/api/auth/credentials', (req, res) => {
  const { provider, credentials } = req.body;
  if (!provider || !credentials) return res.status(400).json({ error: 'provider and credentials required' });
  const allowed = ['jira', 'confluence', 'slack', 'teams', 'outlook', 'metabase', 'claude', 'openai', 'gemini'];
  if (!allowed.includes(provider)) return res.status(400).json({ error: 'unknown provider' });
  setToken(provider, credentials);
  res.json({ ok: true });
});

app.delete('/api/auth/:provider', (req, res) => {
  deleteToken(req.params.provider);
  res.json({ ok: true });
});

// ── OAuth 2.0 connect + callback ──────────────────────────────────────────────

app.get('/auth/connect/:provider', (req, res) => {
  const { provider } = req.params;
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${REDIRECT_BASE}/auth/callback/${provider}`;

  if (provider === 'atlassian') {
    if (!process.env.ATLASSIAN_CLIENT_ID)
      return res.status(400).send('ATLASSIAN_CLIENT_ID not set in .env — register an OAuth app at developer.atlassian.com');
    oauthStates[state] = { provider };
    return res.redirect(`https://auth.atlassian.com/authorize?` + new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      scope: 'read:jira-work write:jira-work manage:jira-project read:confluence-space.summary read:confluence-content.all write:confluence-content offline_access',
      redirect_uri: redirectUri,
      state,
      response_type: 'code',
      prompt: 'consent',
    }));
  }

  if (provider === 'slack') {
    if (!process.env.SLACK_CLIENT_ID)
      return res.status(400).send('SLACK_CLIENT_ID not set in .env — register an OAuth app at api.slack.com/apps');
    oauthStates[state] = { provider };
    return res.redirect(`https://slack.com/oauth/v2/authorize?` + new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID,
      scope: 'channels:read,channels:history,chat:write,users:read',
      redirect_uri: redirectUri,
      state,
    }));
  }

  if (provider === 'microsoft') {
    if (!process.env.MICROSOFT_CLIENT_ID)
      return res.status(400).send('MICROSOFT_CLIENT_ID not set in .env — register an app at portal.azure.com');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    oauthStates[state] = { provider, codeVerifier };
    return res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` + new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'User.Read Calendars.Read Mail.Read offline_access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }));
  }

  res.status(400).send('Unknown OAuth provider');
});

app.get('/auth/callback/:provider', async (req, res) => {
  const { provider } = req.params;
  const { code, state, error } = req.query;

  if (error) return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);

  const stateData = oauthStates[state];
  if (!stateData) return res.redirect('/?auth_error=invalid_state');
  delete oauthStates[state];

  const redirectUri = `${REDIRECT_BASE}/auth/callback/${provider}`;

  try {
    if (provider === 'atlassian') {
      const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: process.env.ATLASSIAN_CLIENT_ID,
          client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');

      const sitesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
        headers: { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json' },
      });
      const sites = await sitesRes.json();
      const primary = sites[0];

      const record = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        cloudId: primary?.id,
        site: primary?.url,
        siteName: primary?.name,
        allSites: sites.map((s) => ({ id: s.id, url: s.url, name: s.name })),
        authType: 'oauth',
      };
      setToken('jira', record);
      setToken('confluence', record);
      return res.redirect('/?connected=atlassian');
    }

    if (provider === 'slack') {
      const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code,
          redirect_uri: redirectUri,
        }),
      });
      const data = await tokenRes.json();
      if (!data.ok) throw new Error(data.error || 'Slack token exchange failed');
      setToken('slack', {
        accessToken: data.access_token,
        teamId: data.team?.id,
        siteName: data.team?.name,
        authType: 'oauth',
      });
      return res.redirect('/?connected=slack');
    }

    if (provider === 'microsoft') {
      const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: stateData.codeVerifier,
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.error) throw new Error(tokens.error_description || tokens.error || 'Token exchange failed');

      const profileRes = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await profileRes.json();

      const record = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: profile.displayName,
        email: profile.mail || profile.userPrincipalName,
        authType: 'oauth',
      };
      setToken('microsoft', record);
      setToken('teams', record);
      setToken('outlook', record);
      return res.redirect('/?connected=microsoft');
    }

    res.redirect('/?auth_error=unknown_provider');
  } catch (e) {
    console.error(`[oauth] ${provider} callback error:`, e.message);
    res.redirect(`/?auth_error=${encodeURIComponent(e.message)}`);
  }
});

// ── Atlassian auth helper (OAuth or API key) ──────────────────────────────────

function getAtlassianAuth(provider) {
  const t = getToken(provider);
  if (t?.authType === 'oauth' && t?.accessToken && t?.cloudId) {
    const base = provider === 'jira'
      ? `https://api.atlassian.com/ex/jira/${t.cloudId}`
      : `https://api.atlassian.com/ex/confluence/${t.cloudId}`;
    return { headers: { Authorization: `Bearer ${t.accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json' }, base };
  }
  const email    = t?.email || process.env[provider === 'jira' ? 'JIRA_EMAIL' : 'CONFLUENCE_EMAIL'];
  const apiToken = t?.token || process.env[provider === 'jira' ? 'JIRA_API_TOKEN' : 'CONFLUENCE_API_TOKEN'];
  const baseUrl  = t?.site  || process.env[provider === 'jira' ? 'JIRA_BASE_URL' : 'CONFLUENCE_BASE_URL'];
  if (!email || !apiToken || !baseUrl) return null;
  // Normalize: strip trailing slash, and strip /rest/... suffix if someone pasted a full API URL
  const cleaned = baseUrl.replace(/\/+$/, '').replace(/\/rest\/.*$/, '');
  return {
    headers: { Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    base: cleaned,
  };
}

// Confluence Cloud uses /wiki/rest/api/; self-hosted Server/DC uses /rest/api/ directly
function confluenceApiBase(base) {
  return base.includes('.atlassian.net') ? `${base}/wiki` : base;
}

// ── Jira sync ─────────────────────────────────────────────────────────────────

app.post('/api/jira/sync', async (req, res) => {
  const jiraAuth = getAtlassianAuth('jira');
  if (!jiraAuth) {
    return res.status(400).json({ error: 'Jira not connected. Sign in via Integrations or add JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN to .env' });
  }
  const { headers, base } = jiraAuth;
  const projectKeys = Array.isArray(req.body?.projectKeys) ? req.body.projectKeys.filter(k => /^[A-Z0-9_]+$/i.test(k)) : [];
  const projectJql = projectKeys.length ? `project in (${projectKeys.join(', ')}) AND ` : '';

  try {
    // Fetch projects — try v3 (Cloud) then fall back to v2 (Server/DC)
    let projRes = await fetch(`${base}/rest/api/3/project?maxResults=100`, { headers });
    if (!projRes.ok && projRes.status >= 400 && projRes.status < 500) {
      projRes = await fetch(`${base}/rest/api/2/project?maxResults=100`, { headers });
    }
    if (!projRes.ok) throw new Error(`Jira projects: ${projRes.status} ${await projRes.text()}`);
    const projData = await projRes.json();
    // Cloud returns { values: [...] }, Server returns [...] directly
    const projList = Array.isArray(projData) ? projData : (projData.values || []);
    const jiraProjects = projList.map((p) => ({
      id: `jp-${p.id}`,
      key: p.key,
      name: p.name,
      boardId: `b-${p.id}`,
    }));

    // Fetch issues ordered by updated — scoped to selected projects if any
    const isCloud = base.includes('atlassian.net') || base.includes('api.atlassian.com');
    const maxPages = projectKeys.length ? 10 : 5;
    let allIssuesRaw = [];
    if (isCloud) {
      // Cloud: use POST /rest/api/3/search/jql with cursor pagination
      let nextPageToken = null;
      const searchFields = ['summary', 'status', 'priority', 'assignee', 'reporter', 'issuetype', 'customfield_10016', 'customfield_10020', 'customfield_10026', 'labels', 'description', 'updated', 'project', 'parent'];
      for (let page = 0; page < maxPages; page++) {
        const body = {
          jql: `${projectJql}updated >= -90d order by updated DESC`,
          maxResults: 100,
          fields: searchFields,
        };
        if (nextPageToken) body.nextPageToken = nextPageToken;
        const issuesRes = await fetch(`${base}/rest/api/3/search/jql`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!issuesRes.ok) {
          const errText = await issuesRes.text();
          console.error('[jira] v3 search/jql failed:', issuesRes.status, errText);
          throw new Error(`Jira issues: ${issuesRes.status} ${errText}`);
        }
        const page_data = await issuesRes.json();
        allIssuesRaw.push(...(page_data.issues || []));
        if (page_data.isLast || !page_data.nextPageToken) break;
        nextPageToken = page_data.nextPageToken;
      }
    } else {
      // Server/Data Center: use GET /rest/api/2/search
      const v2Jql = encodeURIComponent(`${projectJql}order by updated DESC`);
      const issuesRes = await fetch(
        `${base}/rest/api/2/search?jql=${v2Jql}&maxResults=200&fields=summary,status,priority,assignee,reporter,issuetype,customfield_10016,customfield_10020,customfield_10026,labels,description,updated,project,parent`,
        { headers }
      );
      if (!issuesRes.ok) throw new Error(`Jira issues: ${issuesRes.status} ${await issuesRes.text()}`);
      const issuesData = await issuesRes.json();
      allIssuesRaw = issuesData.issues || [];
    }

    // Extract sprints from issue data (customfield_10020 carries full sprint objects)
    const sprintMap = new Map();
    allIssuesRaw.forEach((i) => {
      const sprintArr = i.fields?.customfield_10020;
      if (Array.isArray(sprintArr)) {
        sprintArr.forEach((s) => {
          if (s?.id && !sprintMap.has(s.id)) {
            sprintMap.set(s.id, {
              id: `sp-${s.id}`,
              name: s.name,
              jiraProjectId: `jp-${i.fields?.project?.id || ''}`,
              state: s.state,
              start: (s.startDate || '').slice(0, 10),
              end: (s.endDate || '').slice(0, 10),
              goal: s.goal || '',
              boardId: s.boardId || null,
            });
          }
        });
      }
    });

    const jiraIssues = allIssuesRaw.map((i) => {
      const f = i.fields;
      const desc = extractText(f.description);
      // Use the last sprint in the array (most recent assignment)
      const sprintArr = f.customfield_10020;
      const latestSprint = Array.isArray(sprintArr) && sprintArr.length ? sprintArr[sprintArr.length - 1] : null;
      return {
        id: `j-${i.id}`,
        key: i.key,
        projectKey: f.project?.key || i.key.split('-')[0],
        sprintId: latestSprint?.id ? `sp-${latestSprint.id}` : null,
        sprintName: latestSprint?.name || null,
        type: f.issuetype?.name || 'Task',
        status: f.status?.name || 'To Do',
        statusCategory: f.status?.statusCategory?.name || 'To Do',
        priority: f.priority?.name || 'Medium',
        assignee: f.assignee?.displayName || 'Unassigned',
        reporter: f.reporter?.displayName || '',
        summary: f.summary || '',
        storyPoints: f.customfield_10026 || f.customfield_10016 || 0,
        labels: f.labels || [],
        updated: (f.updated || '').slice(0, 10),
        description: desc.slice(0, 500),
        parentKey: f.parent?.key || null,
        parentSummary: f.parent?.fields?.summary || null,
        parentType: f.parent?.fields?.issuetype?.name || null,
      };
    });

    // Fetch board column config from scrum boards for selected projects
    let boardColumns = [];
    const boardsRes = await fetch(`${base}/rest/agile/1.0/board?maxResults=50&type=scrum`, { headers });
    if (boardsRes.ok) {
      const boardsData = await boardsRes.json();
      const boards = boardsData.values || [];
      // Filter to boards matching selected project keys
      const relevantBoards = projectKeys.length
        ? boards.filter(b => projectKeys.includes(b.location?.projectKey))
        : boards;

      // Fetch sprints from scrum boards (supplement the sprint data from issues)
      const sprintFetches = relevantBoards.slice(0, 10).map((b) =>
        fetch(`${base}/rest/agile/1.0/board/${b.id}/sprint?state=active,future,closed&maxResults=50&startAt=0`, { headers })
          .then((r) => r.ok ? r.json() : { values: [] })
          .then(async (d) => {
            const vals = d.values || [];
            // For boards with many sprints, get the last page to ensure we have recent ones
            if ((d.total || 0) > 50) {
              const lastPage = await fetch(`${base}/rest/agile/1.0/board/${b.id}/sprint?state=active,future,closed&maxResults=50&startAt=${Math.max(0, d.total - 50)}`, { headers })
                .then(r => r.ok ? r.json() : { values: [] }).catch(() => ({ values: [] }));
              vals.push(...(lastPage.values || []));
            }
            return vals.map((s) => ({
              id: `sp-${s.id}`,
              name: s.name,
              jiraProjectId: `jp-${b.location?.projectId || b.id}`,
              state: s.state,
              start: (s.startDate || '').slice(0, 10),
              end: (s.endDate || '').slice(0, 10),
              goal: s.goal || '',
              boardId: b.id,
            }));
          })
          .catch(() => [])
      );
      const sprintArrays = await Promise.all(sprintFetches);
      sprintArrays.flat().forEach((s) => {
        if (!sprintMap.has(parseInt(s.id.replace('sp-', '')))) sprintMap.set(parseInt(s.id.replace('sp-', '')), s);
        else { const existing = sprintMap.get(parseInt(s.id.replace('sp-', ''))); if (!existing.boardId) existing.boardId = s.boardId; }
      });

      // Fetch column config from the first relevant scrum board
      if (relevantBoards.length) {
        try {
          const cfgRes = await fetch(`${base}/rest/agile/1.0/board/${relevantBoards[0].id}/configuration`, { headers });
          if (cfgRes.ok) {
            const cfgData = await cfgRes.json();
            // Also fetch all statuses to map status IDs to names
            const statusRes = await fetch(`${base}/rest/api/3/status`, { headers });
            const statusMap = {};
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              statusData.forEach((s) => { statusMap[s.id] = s.name; });
            }
            boardColumns = (cfgData.columnConfig?.columns || []).map((col) => ({
              name: col.name,
              statuses: (col.statuses || []).map(s => statusMap[s.id] || s.id),
            }));
          }
        } catch (e) { console.error('[jira] board config error:', e.message); }
      }
    }

    const sprints = [...sprintMap.values()];

    res.json({ jiraProjects, jiraIssues, sprints, boardColumns });
  } catch (e) {
    console.error('[jira] sync error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Confluence sync ───────────────────────────────────────────────────────────

app.post('/api/confluence/sync', async (req, res) => {
  const confAuth = getAtlassianAuth('confluence');
  if (!confAuth) {
    return res.status(400).json({ error: 'Confluence not connected. Sign in via Integrations or add CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_API_TOKEN to .env' });
  }
  const { headers, base } = confAuth;

  try {
    // Fetch spaces — Cloud uses /wiki prefix, Server/DC does not
    const confBase = confluenceApiBase(base);
    const spacesRes = await fetch(`${confBase}/rest/api/space?limit=50&type=global`, { headers });
    if (!spacesRes.ok) throw new Error(`Confluence spaces: ${spacesRes.status} ${await spacesRes.text()}`);
    const spacesData = await spacesRes.json();
    const confluenceSpaces = (spacesData.results || []).map((s) => ({
      id: `cs-${s.id}`,
      key: s.key,
      name: s.name,
    }));

    // Fetch pages with body content
    const pagesRes = await fetch(
      `${confBase}/rest/api/content?type=page&limit=100&expand=body.storage,metadata.labels,version,ancestors,space`,
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
  const botToken = t?.accessToken || t?.token || process.env.SLACK_BOT_TOKEN;
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
  const t = getToken('microsoft') || getToken('teams') || getToken('outlook');
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

// ── Jira issue comments (on-demand) ─────────────────────────────────────────

app.get('/api/jira/comments/:issueKey', async (req, res) => {
  const jiraAuth = getAtlassianAuth('jira');
  if (!jiraAuth) return res.status(400).json({ error: 'Jira not configured' });
  const { headers, base } = jiraAuth;
  try {
    const r = await fetch(`${base}/rest/api/3/issue/${req.params.issueKey}/comment?maxResults=50&orderBy=-created`, { headers });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const data = await r.json();
    const comments = (data.comments || []).map(c => ({
      id: c.id,
      author: c.author?.displayName || 'Unknown',
      created: (c.created || '').slice(0, 10),
      body: extractText(c.body),
    }));
    res.json(comments);
  } catch (e) {
    console.error('[jira] comments error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Jira project list (for scope picker) ─────────────────────────────────────

app.get('/api/jira/projects', async (req, res) => {
  const jiraAuth = getAtlassianAuth('jira');
  if (!jiraAuth) return res.status(400).json({ error: 'Jira not configured' });
  const { headers, base } = jiraAuth;
  try {
    let r = await fetch(`${base}/rest/api/3/project?maxResults=100`, { headers });
    if (!r.ok && r.status >= 400 && r.status < 500) {
      r = await fetch(`${base}/rest/api/2/project?maxResults=100`, { headers });
    }
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    const data = await r.json();
    // Cloud returns { values: [...] }, Server returns [...] directly
    const list = Array.isArray(data) ? data : (data.values || []);
    res.json(list.map((p) => ({ key: p.key, name: p.name })));
  } catch (e) {
    console.error('[jira] projects error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Confluence space list (for scope picker) ──────────────────────────────────

app.get('/api/confluence/spaces', async (req, res) => {
  const confAuth = getAtlassianAuth('confluence');
  if (!confAuth) return res.status(400).json({ error: 'Confluence not configured' });
  const { headers, base } = confAuth;
  try {
    const r = await fetch(`${confluenceApiBase(base)}/rest/api/space?limit=100&type=global`, { headers });
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
  const { system, messages, provider: reqProvider, tools, stream: wantStream } = req.body;

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
      const body = {
        model: claudeToken?.model || process.env.ANTHROPIC_MODEL || 'claude-opus-4-7',
        max_tokens: Math.min(req.body.max_tokens || 2048, 8192),
        system: system || 'You are a helpful project management assistant.',
        messages,
      };
      if (tools && tools.length > 0) body.tools = tools;
      if (wantStream && (!tools || tools.length === 0)) body.stream = true;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Streaming path — pipe SSE events to client
      if (body.stream) {
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error?.message || `Anthropic API error ${response.status}`);
        }
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop(); // keep incomplete line
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                res.write(line + '\n\n');
              }
            }
          }
          if (buf.startsWith('data: ')) res.write(buf + '\n\n');
        } catch (streamErr) {
          console.error('[ai] stream error:', streamErr.message);
        }
        res.end();
        return;
      }

      // Non-streaming path
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || `Anthropic API error ${response.status}`);
      // Extract text and tool_use blocks
      const textBlock = data.content.find(b => b.type === 'text');
      const toolUses = data.content.filter(b => b.type === 'tool_use');
      res.json({
        text: textBlock?.text || '',
        tool_calls: toolUses.map(b => ({ id: b.id, name: b.name, input: b.input })),
        stop_reason: data.stop_reason,
        provider: 'claude',
        _raw_content: data.content,
      });
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
