// AI Assistant — full-service: local commands, data queries, slash commands, AI chat with streaming + multi-step tools

// ─── Date parsing (no library) ──────────────────────────────────────────────

function parseNaturalDate(text) {
  const t = text.toLowerCase();
  const today = new Date(); today.setHours(0,0,0,0);
  const iso = (d) => d.toISOString().slice(0, 10);
  const isoMatch = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const mdMatch = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?\b/);
  if (mdMatch) {
    const m = months.indexOf(mdMatch[1].slice(0, 3));
    const d = parseInt(mdMatch[2]);
    const y = mdMatch[3] ? parseInt(mdMatch[3]) : today.getFullYear();
    const dt = new Date(y, m, d);
    if (dt < today && !mdMatch[3]) dt.setFullYear(dt.getFullYear() + 1);
    return iso(dt);
  }
  if (/\btoday\b/.test(t)) return iso(today);
  if (/\btomorrow\b/.test(t)) { const d = new Date(today); d.setDate(d.getDate() + 1); return iso(d); }
  if (/\bnext\s+week\b/.test(t)) { const d = new Date(today); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return iso(d); }
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const dayMatch = t.match(/\b(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  if (dayMatch) {
    const target = days.indexOf(dayMatch[1]);
    const isNext = /next/.test(dayMatch[0]);
    const d = new Date(today);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    if (isNext && diff <= 7) diff += 7;
    d.setDate(d.getDate() + diff);
    return iso(d);
  }
  const inMatch = t.match(/\bin\s+(\d+)\s+(day|week)s?\b/);
  if (inMatch) { const d = new Date(today); d.setDate(d.getDate() + parseInt(inMatch[1]) * (inMatch[2] === 'week' ? 7 : 1)); return iso(d); }
  if (/\bend\s+of\s+(the\s+)?month\b/.test(t)) return iso(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  return null;
}

// ─── Project / content helpers ──────────────────────────────────────────────

function resolveProject(text, projects) {
  const t = text.toLowerCase();
  for (const p of projects) { if (t.includes(p.code.toLowerCase())) return p; }
  for (const p of projects) {
    const words = p.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    if (words.some(w => t.includes(w))) return p;
  }
  return null;
}

function extractContent(text, project) {
  let s = text;
  if (project) {
    const re = new RegExp('\\b(?:to|for|on|in)\\s+' + project.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b[:\\s]*', 'i');
    s = s.replace(re, '');
  }
  s = s.replace(/^(?:add|create|new|log|set|schedule|book|make|record)\s+(?:a\s+)?(?:reminder|note|question|decision|task|risk|milestone|meeting)\s*/i, '');
  s = s.replace(/^remind\s+me\s+(?:to\s+)?/i, '');
  const datePattern = '(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\\s+\\w+|this\\s+\\w+|in\\s+\\d+\\s+\\w+|end\\s+of\\s+(?:the\\s+)?month|\\d{4}-\\d{2}-\\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\w*\\s+\\d{1,2}(?:\\s*,?\\s*\\d{4})?)';
  s = s.replace(new RegExp('\\b(?:on|for|by|to|due|before)\\s+' + datePattern, 'gi'), '');
  s = s.replace(new RegExp('^' + datePattern + '\\b', 'i'), '');
  s = s.replace(/^[:\s]+/, '').replace(/^to\s+/i, '').replace(/\s+/g, ' ').trim();
  return s;
}

function extractSearchText(text, project) {
  let s = text;
  s = s.replace(/^(?:delete|remove|cancel|complete|finish|done|close|resolve|reopen|mark)\s+(?:the\s+|a\s+|my\s+)?(?:reminder|note|question|decision|task|risk|milestone|meeting)\s*/i, '');
  s = s.replace(/\s+as\s+(?:done|complete|completed|cancelled|canceled|closed|resolved|todo|open|in[- ]progress|blocked|planned)\s*$/i, '');
  if (project) {
    const re = new RegExp('\\b(?:from|on|in)\\s+' + project.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    s = s.replace(re, '');
  }
  const datePattern = '(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next\\s+\\w+|this\\s+\\w+|in\\s+\\d+\\s+\\w+|end\\s+of\\s+(?:the\\s+)?month|\\d{4}-\\d{2}-\\d{2}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\w*\\s+\\d{1,2}(?:\\s*,?\\s*\\d{4})?)';
  s = s.replace(new RegExp('\\b(?:on|for|by|from|to|due|before)\\s+' + datePattern, 'gi'), '');
  s = s.replace(/["'"]/g, '').replace(/^[:\s]+/, '').replace(/\s+/g, ' ').trim();
  return s;
}

function fuzzyMatch(searchText, items, titleKey) {
  if (!searchText || !items.length) return null;
  const needle = searchText.toLowerCase();
  let match = items.find(it => (it[titleKey] || '').toLowerCase() === needle);
  if (match) return match;
  match = items.find(it => (it[titleKey] || '').toLowerCase().includes(needle));
  if (match) return match;
  match = items.find(it => { const t = (it[titleKey] || '').toLowerCase(); return t.length > 3 && needle.includes(t); });
  if (match) return match;
  const needleWords = needle.split(/\s+/).filter(w => w.length > 2);
  let bestScore = 0, bestItem = null;
  for (const it of items) {
    const titleWords = (it[titleKey] || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (!titleWords.length) continue;
    const overlap = needleWords.filter(w => titleWords.some(tw => tw.includes(w) || w.includes(tw))).length;
    const score = overlap / Math.max(needleWords.length, titleWords.length);
    if (score > bestScore && score >= 0.4) { bestScore = score; bestItem = it; }
  }
  return bestItem;
}

// ─── Local data query handlers (no AI) ──────────────────────────────────────

const fmtD = (d) => d || '—';
const PRIO_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function handleOverdue(state) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = (state.tasks || []).filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today);
  const milestones = (state.milestones || []).filter(m => m.status !== 'done' && m.status !== 'cancelled' && m.date && m.date < today);
  const projMap = {};
  (state.projects || []).forEach(p => { projMap[p.id] = p.code; });
  const rows = [
    ...tasks.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]).map(t => ({
      type: 'Task', title: t.title, project: projMap[t.projectId] || '—', due: t.dueDate, priority: t.priority, status: t.status
    })),
    ...milestones.map(m => ({
      type: 'Milestone', title: m.name, project: projMap[m.projectId] || '—', due: m.date, priority: '—', status: m.status
    })),
  ];
  return {
    message: rows.length ? `${rows.length} overdue item${rows.length > 1 ? 's' : ''}:` : 'Nothing overdue — you\'re on track!',
    data: rows.length ? { type: 'table', columns: [{ key: 'type', label: 'Type' }, { key: 'title', label: 'Title' }, { key: 'project', label: 'Project' }, { key: 'due', label: 'Due' }, { key: 'priority', label: 'Priority' }, { key: 'status', label: 'Status' }], rows } : null,
    actions: [], followUps: rows.length ? ['Mark first overdue task as done', 'Show all blocked tasks', '/thisweek'] : ['/summary', '/risks'],
  };
}

function handleDueThisWeek(state) {
  const today = new Date(); today.setHours(0,0,0,0);
  const todayS = today.toISOString().slice(0, 10);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndS = weekEnd.toISOString().slice(0, 10);
  const tasks = (state.tasks || []).filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate && t.dueDate >= todayS && t.dueDate <= weekEndS);
  const milestones = (state.milestones || []).filter(m => m.status !== 'done' && m.status !== 'cancelled' && m.date && m.date >= todayS && m.date <= weekEndS);
  const projMap = {}; (state.projects || []).forEach(p => { projMap[p.id] = p.code; });
  const rows = [
    ...tasks.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')).map(t => ({
      type: 'Task', title: t.title, project: projMap[t.projectId] || '—', due: t.dueDate, priority: t.priority, status: t.status
    })),
    ...milestones.map(m => ({
      type: 'Milestone', title: m.name, project: projMap[m.projectId] || '—', due: m.date, priority: '—', status: m.status
    })),
  ];
  return {
    message: rows.length ? `${rows.length} item${rows.length > 1 ? 's' : ''} due this week:` : 'Nothing due this week.',
    data: rows.length ? { type: 'table', columns: [{ key: 'type', label: 'Type' }, { key: 'title', label: 'Title' }, { key: 'project', label: 'Project' }, { key: 'due', label: 'Due' }, { key: 'priority', label: 'Priority' }], rows } : null,
    actions: [], followUps: rows.length ? ['/overdue', '/blockers', '/summary'] : ['/overdue', '/summary'],
  };
}

function handleBlocked(state) {
  const blockedTasks = (state.tasks || []).filter(t => t.status === 'blocked');
  const projMap = {}; (state.projects || []).forEach(p => { projMap[p.id] = p.code; });
  const blockers = (state.blockers || []);
  const rows = blockedTasks.map(t => {
    const tBlockers = blockers.filter(b => b.taskId === t.id);
    return { title: t.title, project: projMap[t.projectId] || '—', blockers: tBlockers.map(b => b.description).join('; ') || '—', since: tBlockers[0]?.since || '—' };
  });
  return {
    message: rows.length ? `${rows.length} blocked task${rows.length > 1 ? 's' : ''}:` : 'No blocked tasks!',
    data: rows.length ? { type: 'table', columns: [{ key: 'title', label: 'Task' }, { key: 'project', label: 'Project' }, { key: 'blockers', label: 'Blocker' }, { key: 'since', label: 'Since' }], rows } : null,
    actions: [], followUps: rows.length ? ['/overdue', '/risks', '/summary'] : ['/summary'],
  };
}

function handleOpenQuestions(query, state) {
  const project = query ? resolveProject(query, state.projects || []) : null;
  const questions = (state.notes || []).filter(n => n.kind === 'question' && !n.resolved && !n.cancelled && (!project || n.projectId === project.id));
  const projMap = {}; (state.projects || []).forEach(p => { projMap[p.id] = p.code; });
  const rows = questions.map(q => ({ title: q.title, project: projMap[q.projectId] || '—', date: q.date || '—' }));
  const label = project ? `Open questions for ${project.code}` : 'Open questions';
  return {
    message: rows.length ? `${rows.length} ${label.toLowerCase()}:` : `No open questions${project ? ` for ${project.code}` : ''}.`,
    data: rows.length ? { type: 'table', columns: [{ key: 'title', label: 'Question' }, { key: 'project', label: 'Project' }, { key: 'date', label: 'Asked' }], rows } : null,
    actions: [], followUps: rows.length ? ['Resolve first question', '/summary'] : ['/summary'],
  };
}

function handleRiskSummary(state) {
  const open = (state.risks || []).filter(r => r.status === 'open' || r.status === 'monitoring');
  const projMap = {}; (state.projects || []).forEach(p => { projMap[p.id] = p.code; });
  const rows = open.sort((a, b) => (b.severity * b.likelihood) - (a.severity * a.likelihood))
    .map(r => ({ title: r.title, project: projMap[r.projectId] || '—', score: `${r.severity * r.likelihood}`, severity: r.severity, likelihood: r.likelihood, status: r.status }));
  return {
    message: rows.length ? `${rows.length} open risk${rows.length > 1 ? 's' : ''} (sorted by score):` : 'No open risks!',
    data: rows.length ? { type: 'table', columns: [{ key: 'title', label: 'Risk' }, { key: 'project', label: 'Project' }, { key: 'score', label: 'Score' }, { key: 'status', label: 'Status' }], rows } : null,
    actions: [], followUps: rows.length ? ['/blockers', '/overdue', '/summary'] : ['/summary'],
  };
}

function handleRiskCount(state) {
  const open = (state.risks || []).filter(r => r.status === 'open' || r.status === 'monitoring');
  const critical = open.filter(r => r.severity * r.likelihood >= 16).length;
  const high = open.filter(r => { const s = r.severity * r.likelihood; return s >= 10 && s < 16; }).length;
  const medium = open.filter(r => { const s = r.severity * r.likelihood; return s >= 4 && s < 10; }).length;
  const low = open.filter(r => r.severity * r.likelihood < 4).length;
  return {
    message: `${open.length} open risks`,
    data: { type: 'count', label: 'Open risks', value: open.length, breakdown: [
      { label: 'Critical (16+)', value: critical, tone: 'danger' },
      { label: 'High (10-15)', value: high, tone: 'warn' },
      { label: 'Medium (4-9)', value: medium, tone: 'accent' },
      { label: 'Low (<4)', value: low, tone: 'ok' },
    ]},
    actions: [], followUps: ['/risks', '/blockers', '/summary'],
  };
}

function handleReminders(state) {
  const today = new Date().toISOString().slice(0, 10);
  const reminders = (state.reminders || []).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const rows = reminders.map(r => ({
    title: r.title, date: r.date || '—',
    status: r.date < today ? 'past' : r.date === today ? 'today' : 'upcoming',
  }));
  return {
    message: rows.length ? `${rows.length} reminder${rows.length > 1 ? 's' : ''}:` : 'No reminders set.',
    data: rows.length ? { type: 'table', columns: [{ key: 'title', label: 'Reminder' }, { key: 'date', label: 'Date' }, { key: 'status', label: 'Status' }], rows } : null,
    actions: [], followUps: rows.length ? ['Remind me to...', '/summary'] : ['Remind me to...'],
  };
}

function handleSummary(state) {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = state.tasks || [];
  const overdue = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate && t.dueDate < today).length;
  const blocked = tasks.filter(t => t.status === 'blocked').length;
  const openRisks = (state.risks || []).filter(r => r.status === 'open' || r.status === 'monitoring').length;
  const critRisks = (state.risks || []).filter(r => (r.status === 'open' || r.status === 'monitoring') && r.severity * r.likelihood >= 16).length;
  const openQuestions = (state.notes || []).filter(n => n.kind === 'question' && !n.resolved && !n.cancelled).length;
  const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndS = weekEnd.toISOString().slice(0, 10);
  const dueThisWeek = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate && t.dueDate >= today && t.dueDate <= weekEndS).length;
  const upcomingMilestones = (state.milestones || []).filter(m => m.status !== 'done' && m.status !== 'cancelled' && m.date && m.date >= today && m.date <= weekEndS).length;
  return {
    message: 'Quick status summary:',
    data: { type: 'list', items: [
      { title: `${overdue} overdue`, subtitle: 'tasks past their due date', tone: overdue > 0 ? 'danger' : 'ok' },
      { title: `${blocked} blocked`, subtitle: 'tasks waiting on blockers', tone: blocked > 0 ? 'warn' : 'ok' },
      { title: `${dueThisWeek} due this week`, subtitle: `tasks due in the next 7 days`, tone: dueThisWeek > 5 ? 'warn' : 'neutral' },
      { title: `${upcomingMilestones} milestones this week`, subtitle: 'approaching milestone targets', tone: upcomingMilestones > 0 ? 'accent' : 'neutral' },
      { title: `${openRisks} open risks`, subtitle: critRisks > 0 ? `${critRisks} critical` : 'none critical', tone: critRisks > 0 ? 'danger' : 'neutral' },
      { title: `${openQuestions} open questions`, subtitle: 'unresolved across projects', tone: openQuestions > 3 ? 'warn' : 'neutral' },
    ]},
    actions: [], followUps: ['/overdue', '/blockers', '/risks'],
  };
}

function handleUndo() {
  const entry = actions.peekUndo();
  if (!entry) return { message: 'Nothing to undo.', actions: [], followUps: [] };
  actions.undo();
  return { message: `Undone: ${entry.description}`, actions: [`undo — ${entry.description}`], followUps: actions.canUndo() ? ['Undo again', '/summary'] : ['/summary'] };
}

function tryLocalQuery(query, state) {
  const ql = query.toLowerCase();
  if (/\b(?:due|coming up|scheduled|upcoming)\s*(?:this\s+week|next\s+\d+\s+days?)\b/.test(ql) || ql === '/thisweek') return handleDueThisWeek(state);
  if (/\boverdue\b/.test(ql) || ql === '/overdue') return handleOverdue(state);
  if (/\b(?:open|unresolved)\s+questions?\b/.test(ql) || ql === '/questions') return handleOpenQuestions(query, state);
  if (/\bhow\s+many\s+risks?\b/.test(ql) || /\brisk\s*count\b/.test(ql)) return handleRiskCount(state);
  if ((/\b(?:blocked|blockers?)\b/.test(ql) || ql === '/blockers') && !/\b(?:add|create|remove|delete)\b/.test(ql)) return handleBlocked(state);
  if ((/\b(?:open\s+)?risks?\b/.test(ql) && (/\bshow\b/.test(ql) || /\blist\b/.test(ql) || /\bwhat\b/.test(ql))) || ql === '/risks') return handleRiskSummary(state);
  if (/\breminders?\b/.test(ql) && (/\bshow\b/.test(ql) || /\blist\b/.test(ql) || /\bmy\b/.test(ql) || /\bupcoming\b/.test(ql)) || ql === '/reminders') return handleReminders(state);
  if ((/\bsummary\b/.test(ql) || /\bstatus\b/.test(ql) || /\boverview\b/.test(ql)) && !/\b(?:add|update|set)\b/.test(ql) || ql === '/summary') return handleSummary(state);
  return null;
}

// ─── Slash commands ─────────────────────────────────────────────────────────

const SLASH_COMMANDS = [
  { cmd: '/overdue',    desc: 'Show overdue tasks and milestones',    icon: 'clock',    handler: (s) => handleOverdue(s) },
  { cmd: '/blockers',   desc: 'Show all blocked tasks',               icon: 'block',    handler: (s) => handleBlocked(s) },
  { cmd: '/thisweek',   desc: 'Due this week (tasks + milestones)',   icon: 'calendar',  handler: (s) => handleDueThisWeek(s) },
  { cmd: '/risks',      desc: 'Open risks sorted by score',           icon: 'warn',     handler: (s) => handleRiskSummary(s) },
  { cmd: '/reminders',  desc: 'Upcoming reminders',                   icon: 'bell',     handler: (s) => handleReminders(s) },
  { cmd: '/questions',  desc: 'Open questions across projects',       icon: 'note',     handler: (s) => handleOpenQuestions(null, s) },
  { cmd: '/summary',    desc: 'Quick status overview',                icon: 'target',   handler: (s) => handleSummary(s) },
  { cmd: '/undo',       desc: 'Undo last action',                     icon: 'chevronL', handler: () => handleUndo() },
];

// ─── Local command parsing ──────────────────────────────────────────────────

function tryLocalCommand(query, state) {
  const q = query.trim();
  const ql = q.toLowerCase();
  const projects = state.projects || [];
  const today = new Date().toISOString().slice(0, 10);

  // Undo
  if (/^(?:undo|undo that|revert|revert that|take that back)\s*$/i.test(ql)) return handleUndo();

  // Add reminder
  if (/^(?:remind\s+me|set\s+(?:a\s+)?reminder|reminder[\s:])/.test(ql)) {
    const date = parseNaturalDate(q) || today;
    const title = extractContent(q, null);
    if (!title) return { message: "What should I remind you about?", actions: [], followUps: [] };
    actions.addReminder({ title, date });
    return { message: `Reminder set for ${date}: "${title}"`, actions: [`add reminder — ${title}`], followUps: ['Show my reminders', '/summary'] };
  }

  // Delete / Remove
  const deleteMatch = ql.match(/^(?:delete|remove|cancel)\s+(?:the\s+|a\s+|my\s+)?(\w+)/);
  if (deleteMatch) return tryDeleteCommand(deleteMatch[1], q, state, projects);

  // Mark X as Y
  const markMatch = ql.match(/^mark\s+(?:the\s+|my\s+)?(\w+)\s+(.+?)\s+as\s+(\w[\w-]*)\s*$/);
  if (markMatch) return tryStatusCommand(markMatch[1], markMatch[2], markMatch[3], state, projects);

  // Complete/finish/resolve/close/reopen
  const verbStatusMatch = ql.match(/^(complete|finish|done|close|resolve|reopen)\s+(?:the\s+|my\s+)?(\w+)\s+(.+)$/);
  if (verbStatusMatch) {
    const statusMap = { complete: 'done', finish: 'done', done: 'done', close: 'closed', resolve: 'resolved', reopen: 'open' };
    return tryStatusCommand(verbStatusMatch[2], verbStatusMatch[3], statusMap[verbStatusMatch[1]], state, projects);
  }

  // Add / Create
  const cmdMatch = ql.match(/^(?:add|create|new|log|set|schedule|book|make|record)\s+(?:a\s+)?(\w+)/);
  if (!cmdMatch) return null;
  const kind = cmdMatch[1];
  const kindMap = { note:'note', notes:'note', question:'question', questions:'question', decision:'decision', decisions:'decision', task:'task', tasks:'task', risk:'risk', risks:'risk', milestone:'milestone', milestones:'milestone', meeting:'meeting', meetings:'meeting', reminder:'reminder', reminders:'reminder' };
  const itemType = kindMap[kind];
  if (!itemType) return null;

  if (itemType === 'reminder') {
    const date = parseNaturalDate(q) || today;
    const title = extractContent(q, null);
    if (!title) return { message: "What should I remind you about?", actions: [], followUps: [] };
    actions.addReminder({ title, date });
    return { message: `Reminder set for ${date}: "${title}"`, actions: [`add reminder — ${title}`], followUps: ['Show my reminders', '/summary'] };
  }

  const project = resolveProject(q, projects);
  if (!project) {
    if (projects.length === 1) return tryProjectCommand(itemType, q, projects[0], today);
    return { message: `Which project? Include the project code in your message (${projects.map(p => p.code).join(', ')}).`, actions: [], followUps: [] };
  }
  return tryProjectCommand(itemType, q, project, today);
}

function tryProjectCommand(itemType, query, project, today) {
  const title = extractContent(query, project);
  if (!title) return { message: `What should the ${itemType} be about?`, actions: [], followUps: [] };
  const date = parseNaturalDate(query) || today;
  const fu = ['/summary', `Show ${itemType}s for ${project.code}`];
  switch (itemType) {
    case 'note':       actions.addNote({ projectId: project.id, kind: 'note', title, date, tags: [] }); return { message: `Note added to ${project.code}: "${title}"`, actions: [`add note — ${title}`], followUps: fu };
    case 'question':   actions.addNote({ projectId: project.id, kind: 'question', title, date, tags: [] }); return { message: `Question added to ${project.code}: "${title}"`, actions: [`add question — ${title}`], followUps: fu };
    case 'decision':   actions.addNote({ projectId: project.id, kind: 'decision', title, date, tags: [] }); return { message: `Decision logged on ${project.code}: "${title}"`, actions: [`add decision — ${title}`], followUps: fu };
    case 'task':       actions.addTask({ projectId: project.id, title, status: 'todo', priority: 'medium', source: 'planned', rank: 99, dueDate: date !== today ? date : null }); return { message: `Task added to ${project.code}: "${title}"${date !== today ? ` (due ${date})` : ''}`, actions: [`add task — ${title}`], followUps: fu };
    case 'risk':       actions.addRisk({ projectId: project.id, title, status: 'open', severity: 3, likelihood: 3, response: 'Reduce' }); return { message: `Risk added to ${project.code}: "${title}" (severity 3, likelihood 3 — edit to adjust)`, actions: [`add risk — ${title}`], followUps: fu };
    case 'milestone':  actions.addMilestone({ projectId: project.id, name: title, date, status: 'planned', description: '', deliverable: '' }); return { message: `Milestone added to ${project.code}: "${title}" (target: ${date})`, actions: [`add milestone — ${title}`], followUps: fu };
    case 'meeting':    actions.addMeeting({ projectId: project.id, title, date, attendees: '', notes: '' }); return { message: `Meeting added to ${project.code}: "${title}" on ${date}`, actions: [`add meeting — ${title}`], followUps: fu };
    default: return null;
  }
}

function tryDeleteCommand(typeWord, query, state, projects) {
  const kindMap = { reminder:'reminder', reminders:'reminder', note:'note', notes:'note', question:'question', questions:'question', decision:'decision', decisions:'decision', task:'task', tasks:'task', risk:'risk', risks:'risk', milestone:'milestone', milestones:'milestone', meeting:'meeting', meetings:'meeting' };
  const itemType = kindMap[typeWord]; if (!itemType) return null;
  const project = resolveProject(query, projects);
  const searchText = extractSearchText(query, project);
  if (!searchText) return { message: `Which ${itemType} should I delete?`, actions: [], followUps: [] };
  let item, deleteAction, label;
  switch (itemType) {
    case 'reminder':  item = fuzzyMatch(searchText, state.reminders || [], 'title'); if (item) { actions.deleteReminder(item.id); label = item.title; deleteAction = `delete reminder — ${label}`; } break;
    case 'note': case 'question': case 'decision': item = fuzzyMatch(searchText, (state.notes || []).filter(n => n.kind === itemType), 'title'); if (item) { actions.deleteNote(item.id); label = item.title; deleteAction = `delete ${itemType} — ${label}`; } break;
    case 'task':      item = fuzzyMatch(searchText, state.tasks || [], 'title'); if (item) { actions.deleteTask(item.id); label = item.title; deleteAction = `delete task — ${label}`; } break;
    case 'risk':      item = fuzzyMatch(searchText, state.risks || [], 'title'); if (item) { actions.deleteRisk(item.id); label = item.title; deleteAction = `delete risk — ${label}`; } break;
    case 'milestone': item = fuzzyMatch(searchText, state.milestones || [], 'name'); if (item) { actions.deleteMilestone(item.id); label = item.name; deleteAction = `delete milestone — ${label}`; } break;
    case 'meeting':   item = fuzzyMatch(searchText, state.meetings || [], 'title'); if (item) { actions.deleteMeeting(item.id); label = item.title; deleteAction = `delete meeting — ${label}`; } break;
  }
  if (!item) return { message: `Couldn't find a ${itemType} matching "${searchText}".`, actions: [], followUps: [] };
  return { message: `Deleted ${itemType}: "${label}"`, actions: [deleteAction], followUps: ['Undo', '/summary'] };
}

function tryStatusCommand(typeWord, titleText, newStatus, state, projects) {
  const kindMap = { task:'task', tasks:'task', risk:'risk', risks:'risk', milestone:'milestone', milestones:'milestone', question:'question', questions:'question', reminder:'reminder', reminders:'reminder', note:'note', notes:'note', decision:'decision', decisions:'decision', meeting:'meeting', meetings:'meeting' };
  const itemType = kindMap[typeWord]; if (!itemType) return null;
  const project = resolveProject(titleText, state.projects || []);
  let searchText = titleText.replace(/["'"]/g, '').trim();
  if (project) { searchText = searchText.replace(new RegExp('\\b(?:from|on|in)\\s+' + project.code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'), '').trim(); }
  const statusAliases = { done:'done', complete:'done', completed:'done', finished:'done', todo:'todo', open:'open', reopen:'open', reopened:'open', cancelled:'cancelled', canceled:'cancelled', closed:'closed', resolved:'resolved', blocked:'blocked', 'in-progress':'in-progress', inprogress:'in-progress', started:'in-progress', planned:'planned', monitoring:'monitoring' };
  const status = statusAliases[newStatus.toLowerCase()] || newStatus.toLowerCase();
  let item, label;
  switch (itemType) {
    case 'task': item = fuzzyMatch(searchText, state.tasks || [], 'title'); if (item) { if (status === 'done') actions.toggleTaskDone(item.id); else actions.updateTask(item.id, { status }); label = item.title; } break;
    case 'risk': item = fuzzyMatch(searchText, state.risks || [], 'title'); if (item) { actions.updateRisk(item.id, { status }); label = item.title; } break;
    case 'milestone': item = fuzzyMatch(searchText, state.milestones || [], 'name'); if (item) { actions.updateMilestone(item.id, { status }); label = item.name; } break;
    case 'question': item = fuzzyMatch(searchText, (state.notes || []).filter(n => n.kind === 'question'), 'title'); if (item) { if (status === 'resolved') actions.updateNote(item.id, { resolved: true, resolvedDate: new Date().toISOString().slice(0, 10) }); else if (status === 'cancelled') actions.updateNote(item.id, { status: 'cancelled' }); else if (status === 'open') actions.updateNote(item.id, { resolved: false, resolvedDate: null, status: 'open' }); else actions.updateNote(item.id, { status }); label = item.title; } break;
    case 'reminder': item = fuzzyMatch(searchText, state.reminders || [], 'title'); if (item) { actions.updateReminder(item.id, { status }); label = item.title; } break;
    default: return null;
  }
  if (!item) return { message: `Couldn't find a ${itemType} matching "${searchText}".`, actions: [], followUps: [] };
  return { message: `Updated ${itemType} "${label}" → ${status}`, actions: [`update ${itemType} — ${label} → ${status}`], followUps: ['Undo', '/summary'] };
}

// ─── AI tool definitions ────────────────────────────────────────────────────

const ASSISTANT_TOOLS = [
  { name: 'update_project', description: 'Update fields on an existing project.', input_schema: { type: 'object', properties: { id: { type: 'string', description: 'Project ID' }, patch: { type: 'object', description: 'Fields to update' } }, required: ['id', 'patch'] } },
  { name: 'update_milestone', description: 'Update milestone fields.', input_schema: { type: 'object', properties: { id: { type: 'string' }, patch: { type: 'object' } }, required: ['id', 'patch'] } },
  { name: 'add_milestone', description: 'Add a new milestone to a project.', input_schema: { type: 'object', properties: { projectId: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, deliverable: { type: 'string' }, date: { type: 'string' }, status: { type: 'string', enum: ['planned','in-progress','blocked','done'] } }, required: ['projectId','name','date'] } },
  { name: 'add_task', description: 'Add a new task to a project.', input_schema: { type: 'object', properties: { projectId: { type: 'string' }, title: { type: 'string' }, priority: { type: 'string', enum: ['critical','high','medium','low'] }, dueDate: { type: 'string' }, estimate: { type: 'number' }, status: { type: 'string', enum: ['todo','in-progress','done'] }, milestoneId: { type: 'string', description: 'Milestone ID to associate this task with' } }, required: ['projectId','title'] } },
  { name: 'update_task', description: 'Update an existing task.', input_schema: { type: 'object', properties: { id: { type: 'string' }, patch: { type: 'object' } }, required: ['id','patch'] } },
  { name: 'add_risk', description: 'Add a new risk to a project.', input_schema: { type: 'object', properties: { projectId: { type: 'string' }, title: { type: 'string' }, severity: { type: 'number' }, likelihood: { type: 'number' }, mitigation: { type: 'string' }, category: { type: 'string' }, owner: { type: 'string' }, status: { type: 'string', enum: ['open','monitoring','closed'] } }, required: ['projectId','title','severity','likelihood'] } },
  { name: 'update_risk', description: 'Update an existing risk.', input_schema: { type: 'object', properties: { id: { type: 'string' }, patch: { type: 'object' } }, required: ['id','patch'] } },
  { name: 'add_note', description: 'Add a decision, question, or note.', input_schema: { type: 'object', properties: { projectId: { type: 'string' }, kind: { type: 'string', enum: ['decision','question','artifact','note'] }, title: { type: 'string' }, body: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } }, required: ['projectId','kind','title'] } },
  { name: 'update_program', description: 'Update program name, description, deliverable, or status.', input_schema: { type: 'object', properties: { id: { type: 'string' }, patch: { type: 'object' } }, required: ['id','patch'] } },
  { name: 'add_program', description: 'Create a new program.', input_schema: { type: 'object', properties: { name: { type: 'string', description: 'Program name' }, description: { type: 'string' }, status: { type: 'string', enum: ['planned','active','on-track','at-risk','blocked','done','closed'], description: 'Program status (defaults to active)' } }, required: ['name'] } },
  { name: 'add_project', description: 'Create a new project, optionally under a program.', input_schema: { type: 'object', properties: { programId: { type: 'string', description: 'Program ID to assign project to' }, name: { type: 'string' }, code: { type: 'string', description: 'Short project code, e.g. ATLAS' }, owner: { type: 'string' }, priority: { type: 'string', enum: ['critical','high','medium','low'] }, status: { type: 'string', enum: ['planned','on-track','at-risk','blocked','done','closed'] }, objective: { type: 'string' }, startDate: { type: 'string', description: 'YYYY-MM-DD' }, dueDate: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['name'] } },
];

function executeTool(name, input) {
  switch (name) {
    case 'update_project':   return actions.updateProject(input.id, input.patch);
    case 'update_milestone': return actions.updateMilestone(input.id, input.patch);
    case 'add_milestone':    return actions.addMilestone({ status: 'planned', description: '', deliverable: '', ...input });
    case 'add_task':         return actions.addTask({ status: 'todo', source: 'planned', rank: 99, ...input });
    case 'update_task':      return actions.updateTask(input.id, input.patch);
    case 'add_risk':         return actions.addRisk({ status: 'open', response: 'Reduce', ...input });
    case 'update_risk':      return actions.updateRisk(input.id, input.patch);
    case 'add_note':         return actions.addNote({ date: new Date().toISOString().slice(0, 10), tags: [], ...input });
    case 'update_program':   return actions.updateProgram(input.id, input.patch);
    case 'add_program':      return actions.addProgram(input);
    case 'add_project':      return actions.addProject(input);
    default: console.warn('[assistant] unknown tool:', name);
  }
}

// Parse tool calls from text responses (for non-Claude providers or streaming)
function parseTextToolCalls(text) {
  const calls = [];
  // Match ~~~tool-calls ... ~~~ blocks
  const blockRe = /~~~tool-calls\s*\n([\s\S]*?)\n~~~/g;
  let blockMatch;
  while ((blockMatch = blockRe.exec(text)) !== null) {
    const lines = blockMatch[1].trim().split('\n');
    for (const line of lines) {
      const m = line.match(/^(\w+)\((\{[\s\S]*\})\)\s*$/);
      if (m) {
        try { calls.push({ name: m[1], input: JSON.parse(m[2]) }); } catch {}
      }
    }
  }
  // Also match legacy print(platform.xxx({...})) pattern
  const printRe = /(?:print\()?platform\.(\w+)\(([^)]*)\)\)?/g;
  let pm;
  while ((pm = printRe.exec(text)) !== null) {
    const rawName = pm[1];
    const rawArgs = pm[2].trim();
    // Map platform method names to tool names
    const nameMap = {
      update_project: 'update_project', add_milestone: 'add_milestone', add_task: 'add_task',
      update_task: 'update_task', add_risk: 'add_risk', update_risk: 'update_risk',
      add_note: 'add_note', update_program: 'update_program', add_program: 'add_program',
      add_project: 'add_project', update_milestone: 'update_milestone',
    };
    const toolName = nameMap[rawName];
    if (toolName && rawArgs) {
      try {
        // Handle both keyword args and JSON: title='x', targetDate='y' or {json}
        let input;
        if (rawArgs.startsWith('{')) {
          input = JSON.parse(rawArgs);
        } else {
          // Parse keyword args: key='value', key=value, key='value'
          input = {};
          const kwRe = /(\w+)\s*=\s*(?:'([^']*)'|"([^"]*)"|(\S+))/g;
          let kw;
          while ((kw = kwRe.exec(rawArgs)) !== null) {
            input[kw[1]] = kw[2] ?? kw[3] ?? kw[4];
          }
        }
        // Normalize common parameter name mistakes
        if (toolName === 'add_milestone') {
          if (input.title && !input.name) { input.name = input.title; delete input.title; }
          if (input.targetDate && !input.date) { input.date = input.targetDate; delete input.targetDate; }
          if (input.project_id && !input.projectId) { input.projectId = input.project_id; delete input.project_id; }
        }
        if (input.project_id && !input.projectId) { input.projectId = input.project_id; delete input.project_id; }
        calls.push({ name: toolName, input });
      } catch {}
    }
  }
  // Remove tool-call blocks and print() lines from the displayed text
  const toolCodeTag = 'tool_code';
  const tcOpenRe = new RegExp('<' + toolCodeTag + '>[\\s\\S]*?</' + toolCodeTag + '>', 'g');
  let cleanText = text.replace(/~~~tool-calls\s*\n[\s\S]*?\n~~~/g, '').replace(tcOpenRe, '').replace(/```[\s\S]*?```/g, (m) => {
    // Only strip code blocks that contain platform.xxx calls
    return /platform\.\w+\(/.test(m) ? '' : m;
  }).trim();
  return { calls, cleanText };
}

// ─── Rich system prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior PM assistant embedded in Operator, a project management platform. You have full read AND write access to all platform data.

## Data Model
- Programs: statuses [planned, active, on-track, at-risk, blocked, done, closed]
- Projects: statuses [planned, on-track, at-risk, blocked, done, closed], priorities [critical, high, medium, low]
- Tasks: statuses [todo, in-progress, blocked, done, cancelled], same priorities. Tasks have dueDate, estimate (days), and can have blockers. Tasks can be linked to milestones via milestoneId.
- Risks: severity (1-5) × likelihood (1-5) = score. Statuses: [open, monitoring, closed, cancelled]. Scores ≥16 are critical, ≥10 high.
- Milestones: statuses [planned, in-progress, blocked, done]. Have target date and deliverable.
- Notes: kinds [note, question, decision]. Questions can be resolved/unresolved.
- Blockers: linked to tasks — include description, waitingOn, since date.

## Capabilities
- READ + WRITE: projects, tasks, risks, milestones, notes (decisions/questions), meetings, programs
- CREATE: programs (add_program), projects (add_project) — both return the created object with an id you can reference in subsequent calls
- READ-ONLY: Jira issues, Confluence pages, sprints
- You can make MULTIPLE tool calls in a single response when needed (e.g., updating several tasks at once).
- When importing data from files, create programs/projects FIRST, then use the returned IDs to create tasks, milestones, and risks within them.

## Reasoning Guidance
- When analyzing risks, consider both score AND recency of last review.
- For task prioritization, factor in dependencies, blockers, and due dates.
- For status reports, organize by project — highlight blockers first, then risks, then progress.
- Proactively flag overdue items, stale risks (no review date or past review), and approaching milestones.

## Response Style
- Be concise: 3-6 sentences or short bullets unless detail is requested.
- Always confirm what you changed after tool calls.
- Reference items by their title so the user can find them.
- Use **bold** for emphasis and - bullets for lists.

## Tool Calls (IMPORTANT)
When you need to create or update data, emit tool calls using this EXACT format — one per line inside a ~~~tool-calls block:
~~~tool-calls
tool_name({"param": "value", "param2": "value2"})
tool_name({"param": "value"})
~~~
Available tools and their parameters:
- update_project({"id": "...", "patch": {...}}) — update project fields
- update_milestone({"id": "...", "patch": {...}}) — update milestone fields
- add_milestone({"projectId": "...", "name": "...", "date": "YYYY-MM-DD", "deliverable": "...", "description": "...", "status": "planned|in-progress|blocked|done"}) — REQUIRED: name, date
- add_task({"projectId": "...", "title": "...", "priority": "...", "dueDate": "...", "estimate": N, "status": "todo|in-progress|done", "milestoneId": "..."})
- update_task({"id": "...", "patch": {...}})
- add_risk({"projectId": "...", "title": "...", "severity": N, "likelihood": N, "mitigation": "...", "category": "...", "owner": "...", "status": "open|monitoring|closed"})
- update_risk({"id": "...", "patch": {...}})
- add_note({"projectId": "...", "kind": "decision|question|artifact|note", "title": "...", "body": "...", "tags": [...]})
- update_program({"id": "...", "patch": {...}})
- add_program({"name": "...", "description": "...", "status": "planned|active|on-track|at-risk|blocked|done|closed"})
- add_project({"name": "...", "code": "...", "programId": "...", "status": "...", "priority": "...", "objective": "...", "description": "...", "owner": "...", "team": [...]})

Use the EXACT parameter names shown above. Do NOT use alternative names (e.g. use "name" not "title" for milestones, "date" not "targetDate").
Always place tool calls BEFORE your summary text.

## Follow-ups
After every response, end with a ~~~follow-ups block containing a JSON array of 2-3 suggested next questions or actions. Example:
~~~follow-ups
["Show tasks due this week", "What risks need review?", "Add a task to ATLAS: ..."]
~~~`;

// ─── Rich rendering components ──────────────────────────────────────────────

function MiniTable({ columns, rows }) {
  if (!rows?.length) return null;
  const toneColor = { critical: 'var(--err)', high: 'var(--warn)', medium: 'var(--fg-2)', low: 'var(--fg-4)', open: 'var(--warn)', monitoring: 'var(--accent)', closed: 'var(--ok)', done: 'var(--ok)', todo: 'var(--fg-3)', blocked: 'var(--err)', 'in-progress': 'var(--accent)', planned: 'var(--fg-3)', past: 'var(--fg-4)', today: 'var(--warn)', upcoming: 'var(--ok)' };
  return (
    <table className="mini-table">
      <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.slice(0, 20).map((row, i) => (
        <tr key={i}>{columns.map(c => {
          const val = row[c.key];
          const color = toneColor[val];
          return <td key={c.key} style={color ? { color, fontWeight: 500 } : undefined}>{val}</td>;
        })}</tr>
      ))}</tbody>
      {rows.length > 20 && <tfoot><tr><td colSpan={columns.length} style={{ color: 'var(--fg-4)', fontSize: 11 }}>+ {rows.length - 20} more</td></tr></tfoot>}
    </table>
  );
}

function CountBlock({ label, value, breakdown }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>{value}</span>
        <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>{label}</span>
      </div>
      {breakdown?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {breakdown.filter(b => b.value > 0).map((b, i) => {
            const toneMap = { danger: 'var(--err)', warn: 'var(--warn)', accent: 'var(--accent)', ok: 'var(--ok)', neutral: 'var(--fg-3)' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span style={{ width: 24, textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', color: toneMap[b.tone] || 'var(--fg-2)' }}>{b.value}</span>
                <span style={{ color: 'var(--fg-3)' }}>{b.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemList({ items }) {
  if (!items?.length) return null;
  const toneMap = { danger: 'var(--err)', warn: 'var(--warn)', accent: 'var(--accent)', ok: 'var(--ok)', neutral: 'var(--fg-3)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '4px 0' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: toneMap[it.tone] || 'var(--fg-4)', flexShrink: 0, marginTop: 5 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: toneMap[it.tone] || 'var(--fg-2)' }}>{it.title}</div>
            {it.subtitle && <div style={{ fontSize: 11.5, color: 'var(--fg-4)', marginTop: 1 }}>{it.subtitle}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function StructuredBlock({ data }) {
  if (!data) return null;
  if (data.type === 'table') return <MiniTable columns={data.columns} rows={data.rows} />;
  if (data.type === 'count') return <CountBlock {...data} />;
  if (data.type === 'list') return <ItemList items={data.items} />;
  return null;
}

// Lightweight markdown for AI text
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];
  const flushList = () => { if (listItems.length) { elements.push(<ul key={`ul-${elements.length}`} style={{ margin: '4px 0', paddingLeft: 18 }}>{listItems}</ul>); listItems = []; } inList = false; };
  const renderInline = (s) => {
    const parts = [];
    let last = 0;
    const re = /\*\*(.+?)\*\*/g;
    let m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) parts.push(s.slice(last, m.index));
      parts.push(<strong key={m.index}>{m[1]}</strong>);
      last = re.lastIndex;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts.length ? parts : s;
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^[-•]\s+/.test(trimmed)) {
      if (!inList) { flushList(); inList = true; }
      listItems.push(<li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>{renderInline(trimmed.replace(/^[-•]\s+/, ''))}</li>);
    } else {
      flushList();
      if (trimmed === '') { elements.push(<br key={i} />); }
      else { elements.push(<div key={i} style={{ marginBottom: 2 }}>{renderInline(trimmed)}</div>); }
    }
  });
  flushList();
  return elements;
}

// Parse follow-ups from AI text
function parseFollowUps(text) {
  const match = text.match(/~~~follow-ups\s*\n([\s\S]*?)(?:\n~~~|$)/);
  if (!match) return { cleanText: text, followUps: [] };
  const cleanText = text.replace(/~~~follow-ups\s*\n[\s\S]*?(?:\n~~~|$)/, '').trim();
  try {
    const followUps = JSON.parse(match[1].trim());
    return { cleanText, followUps: Array.isArray(followUps) ? followUps.slice(0, 3) : [] };
  } catch { return { cleanText, followUps: [] }; }
}

// ─── Guide Modal ────────────────────────────────────────────────────────────

function AssistantGuideModal({ onClose }) {
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 20 }}>
      <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
  const Row = ({ label, children }) => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
      <span className="mono" style={{ fontWeight: 600, fontSize: 12, color: 'var(--fg-2)', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
  return (
    <Modal open title="Assistant guide" onClose={onClose} wide>
      <Section title="Slash commands — type / to see all">
        {SLASH_COMMANDS.map(sc => <Row key={sc.cmd} label={sc.cmd}>{sc.desc}</Row>)}
      </Section>
      <Section title="Quick actions — no AI needed">
        <Row label="Add items">"Add a task to ATLAS: update docs", "Add a question to ATLAS: who owns this?"</Row>
        <Row label="Reminders">"Remind me to review PRs on Friday", "Set a reminder for tomorrow to check deploy"</Row>
        <Row label="Delete">"Delete reminder refill prescription", "Remove task update docs"</Row>
        <Row label="Status">"Mark task update docs as done", "Complete task review PRs", "Resolve question who owns API"</Row>
        <Row label="Undo">"Undo" or "Undo that" — reverts your last action</Row>
      </Section>
      <Section title="Data queries — instant, no AI">
        <Row label="Overdue">"What's overdue?" or "Show overdue tasks"</Row>
        <Row label="Blocked">"What's blocked?" or "Show blockers"</Row>
        <Row label="Due soon">"What's due this week?"</Row>
        <Row label="Summary">"Show summary" or "Quick status"</Row>
        <Row label="Risks">"Show open risks" or "How many risks?"</Row>
        <Row label="Questions">"Show open questions" or "Open questions for ATLAS"</Row>
      </Section>
      <Section title="AI questions — powered by your connected AI provider">
        <Row label="Analysis">"What is blocking the most progress across my projects?"</Row>
        <Row label="Recommendations">"Which risks should I focus on this week?"</Row>
        <Row label="Summaries">"Summarize what is overdue or at risk"</Row>
        <Row label="Actions">"Move all medium tasks on ATLAS to high priority"</Row>
        <Row label="Multi-turn">Follow-up questions reference the conversation — "What about the second one?"</Row>
      </Section>
      <Section title="Tips">
        <Row label="Scope">Use the scope buttons in the header to filter which projects and integrations the AI sees.</Row>
        <Row label="Follow-ups">Click suggested follow-up buttons after any response for quick next steps.</Row>
        <Row label="History">AI conversations remember context — you can refer back to earlier messages.</Row>
        <Row label="Streaming">AI responses stream in real-time when supported by your provider.</Row>
      </Section>
      <Section title="File attachments">
        <Row label="Supported">XLSX, PDF, CSV, JSON, TXT, and Markdown files — max 2MB each, up to 5 files</Row>
        <Row label="Usage">Click the attachment icon next to the input, select file(s), then describe what to do</Row>
        <Row label="Example">"Create all programs, projects, tasks, and milestones from this file" with the import template attached</Row>
        <Row label="Tip">Download the import template, fill it out in Excel, and attach it. The AI will match existing items by name/code and update them, or create new ones if no match is found.</Row>
      </Section>
      <div className="modal-foot">
        <button className="btn btn-primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}

// ─── CSV parser ─────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return text;
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

// ─── Main Assistant Component ───────────────────────────────────────────────

function Assistant({ state }) {
  const [activeThread, setActiveThread] = React.useState((state.chatThreads || [])[0]?.id || null);
  const [input, setInput] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [scope, setScope] = React.useState({});
  const [showGuide, setShowGuide] = React.useState(false);
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashFilter, setSlashFilter] = React.useState('');
  const [slashIdx, setSlashIdx] = React.useState(0);
  const [streamingText, setStreamingText] = React.useState('');
  const [attachedFiles, setAttachedFiles] = React.useState([]);
  const [toolProgress, setToolProgress] = React.useState(null);
  const scrollRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  const integrations = state.meta.integrations || {};
  const connectedIntgKeys = ['jira', 'confluence'].filter(k => integrations[k]?.connected);
  const isInScope = (key) => scope[key] !== false;

  React.useEffect(() => {
    if (!activeThread && (state.chatThreads || [])[0]) setActiveThread(state.chatThreads[0].id);
  }, [(state.chatThreads || []).length]);

  const thread = (state.chatThreads || []).find((t) => t.id === activeThread);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo(0, scrollRef.current.scrollHeight);
  }, [thread?.messages.length, busy, streamingText]);

  const newThread = () => { const t = actions.addChatThread('New conversation'); setActiveThread(t.id); };

  const handleFileSelect = async (e) => {
    const MAX_SIZE = 2 * 1024 * 1024;
    const MAX_FILES = 5;
    const files = Array.from(e.target.files);
    const newFiles = [];
    for (const file of files.slice(0, MAX_FILES - attachedFiles.length)) {
      if (file.size > MAX_SIZE) continue;
      let content;
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const resp = await fetch('/api/parse-xlsx', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: arrayBuffer });
          if (!resp.ok) throw new Error('Parse failed');
          const sheets = await resp.json();
          content = JSON.stringify(sheets, null, 2);
        } catch (err) {
          console.error('[assistant] XLSX parse error:', err);
          content = '[Error: Could not parse XLSX file]';
        }
      } else if (file.name.endsWith('.pdf') && window.pdfjsLib) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const pages = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            pages.push(textContent.items.map(item => item.str).join(' '));
          }
          content = pages.join('\n\n');
        } catch (err) {
          console.error('[assistant] PDF parse error:', err);
          content = '[Error: Could not extract text from PDF]';
        }
      } else {
        content = await new Promise(r => { const reader = new FileReader(); reader.onload = () => r(reader.result); reader.readAsText(file); });
      }
      newFiles.push({ name: file.name, size: file.size, content });
    }
    setAttachedFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES));
    e.target.value = '';
  };

  // Filtered slash commands
  const filteredSlash = SLASH_COMMANDS.filter(sc => sc.cmd.includes('/' + slashFilter) || sc.desc.toLowerCase().includes(slashFilter));

  const autoResize = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 240) + 'px';
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    autoResize(e.target);
    if (val.startsWith('/')) {
      setSlashOpen(true);
      setSlashFilter(val.slice(1).toLowerCase());
      setSlashIdx(0);
    } else {
      setSlashOpen(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (slashOpen && filteredSlash.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx(i => Math.min(i + 1, filteredSlash.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Tab' || (e.key === 'Enter' && slashOpen)) {
        e.preventDefault();
        const selected = filteredSlash[slashIdx];
        if (selected) { setInput(selected.cmd); setSlashOpen(false); }
      }
      else if (e.key === 'Escape') { setSlashOpen(false); }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.target.form.requestSubmit();
    }
  };

  const executeSlashCommand = (cmd, tid) => {
    const sc = SLASH_COMMANDS.find(s => s.cmd === cmd.trim());
    if (!sc) return false;
    const result = sc.handler(state);
    if (result) {
      actions.appendChatMessage(tid, { role: 'assistant', text: result.message, data: result.data, toolCalls: result.actions, followUps: result.followUps, citations: [] });
    }
    return true;
  };

  // ── Smarter context builder ──
  const buildContext = (q) => {
    const keywords = q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const score = (text) => keywords.reduce((a, k) => a + (text.toLowerCase().includes(k) ? 1 : 0), 0);
    const ql = q.toLowerCase();

    // Detect question type for smarter limits
    const isRiskFocused = /risk|mitigation|threat|severity|likelihood/i.test(ql);
    const isTaskFocused = /task|todo|overdue|blocked|assigned|priority/i.test(ql);
    const isSprintFocused = /sprint|velocity|story\s*point|jira/i.test(ql);
    const taskLimit = isTaskFocused ? 60 : isRiskFocused ? 15 : 30;
    const riskLimit = isRiskFocused ? 30 : isTaskFocused ? 8 : 15;

    const scopedProjects = state.projects.filter(p => isInScope(`proj_${p.id}`));
    const scopedProjectIds = new Set(scopedProjects.map(p => p.id));

    const projects = scopedProjects.map((p) => ({ id: p.id, code: p.code, name: p.name, status: p.status, dueDate: p.dueDate || null, owner: p.owner || null, objective: (p.objective || '').slice(0, 200) }));
    const tasks = state.tasks.filter((t) => t.status !== 'done' && (!t.projectId || scopedProjectIds.has(t.projectId))).map((t) => {
      const proj = state.projects.find((p) => p.id === t.projectId);
      const taskBlockers = (state.blockers || []).filter((b) => b.taskId === t.id);
      return { id: t.id, title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate || null, estimate: t.estimate || 0, project: proj ? proj.code : null, blockers: taskBlockers.map((b) => b.description), dependsOn: (t.dependsOn || []).length };
    }).sort((a, b) => (['critical','high','medium','low'].indexOf(a.priority) - ['critical','high','medium','low'].indexOf(b.priority)));
    const risks = (state.risks || []).filter((r) => r.status !== 'closed' && (!r.projectId || scopedProjectIds.has(r.projectId))).map((r) => {
      const proj = state.projects.find((p) => p.id === r.projectId);
      return { id: r.id, title: r.title, status: r.status, score: r.severity * r.likelihood, severity: r.severity, likelihood: r.likelihood, project: proj ? proj.code : null, reviewDate: r.reviewDate || null, mitigation: (r.mitigation || '').slice(0, 150) };
    }).sort((a, b) => b.score - a.score);
    const blockers = (state.blockers || []).map((b) => { const task = state.tasks.find((t) => t.id === b.taskId); const proj = task ? state.projects.find((p) => p.id === task.projectId) : null; return { description: b.description, waitingOn: b.waitingOn, since: b.since, task: task ? task.title : null, project: proj ? proj.code : null }; });
    const questions = (state.notes || []).filter((n) => n.kind === 'question' && !n.resolved).map((q) => { const proj = state.projects.find((p) => p.id === (q.projectId || (q.projectIds || [])[0])); return { id: q.id, title: q.title, body: (q.body || '').slice(0, 200), project: proj ? proj.code : null, date: q.date }; });
    const decisions = (state.notes || []).filter((n) => n.kind === 'decision').slice(0, 15).map((d) => { const proj = state.projects.find((p) => p.id === (d.projectId || (d.projectIds || [])[0])); return { title: d.title, body: (d.body || '').slice(0, 200), project: proj ? proj.code : null, date: d.date }; });
    const meetings = (state.meetings || []).slice(0, 10).map((m) => ({ title: m.title, date: m.date, project: (state.projects.find((p) => p.id === m.projectId) || {}).code || null, summary: (m.summary || '').slice(0, 200) }));
    const jira = isInScope('jira') ? (state.jiraIssues || []).map((i) => ({ i, score: score(`${i.key} ${i.summary} ${i.description || ''} ${(i.labels || []).join(' ')} ${i.assignee} ${i.status}`) })).sort((a, b) => b.score - a.score).slice(0, isSprintFocused ? 30 : 12).map(({ i }) => ({ key: i.key, type: i.type, status: i.status, priority: i.priority, assignee: i.assignee, summary: i.summary, sprint: (state.sprints || []).find((s) => s.id === i.sprintId)?.name, points: i.storyPoints, description: (i.description || '').slice(0, 240) })) : [];
    const conf = isInScope('confluence') ? (state.confluencePages || []).map((p) => ({ p, score: score(`${p.title} ${p.body} ${(p.tags || []).join(' ')}`) })).sort((a, b) => b.score - a.score).slice(0, 5).map(({ p }) => ({ id: p.id, title: p.title, space: (state.confluenceSpaces || []).find((s) => s.id === p.spaceId)?.name, author: p.author, updated: p.updated, excerpt: p.body.slice(0, 500) })) : [];
    const sprints = (state.sprints || []).map((s) => ({ name: s.name, state: s.state, start: s.start, end: s.end, goal: s.goal, points_total: (state.jiraIssues || []).filter((i) => i.sprintId === s.id).reduce((a, b) => a + (b.storyPoints || 0), 0), points_done: (state.jiraIssues || []).filter((i) => i.sprintId === s.id && i.status === 'Done').reduce((a, b) => a + (b.storyPoints || 0), 0) }));

    // Thread history for context
    const threadHistory = (thread?.messages || []).slice(-5).map(m => `${m.role}: ${(m.text || '').slice(0, 100)}`).join('\n');

    return { projects, tasks: tasks.slice(0, taskLimit), risks: risks.slice(0, riskLimit), blockers, questions: questions.slice(0, 10), decisions, meetings, jira, confluence: conf, sprints, threadHistory };
  };

  // ── Send ──
  const send = async () => {
    if ((!input.trim() && !attachedFiles.length) || busy) return;
    let tid = activeThread;
    if (!tid) { const t = actions.addChatThread(input.slice(0, 40) || 'File import'); tid = t.id; setActiveThread(tid); }
    const q = input.trim();
    const filesToSend = [...attachedFiles];
    const fileNames = filesToSend.map(f => f.name);
    actions.appendChatMessage(tid, { role: 'user', text: q || `[Attached ${fileNames.length} file${fileNames.length > 1 ? 's' : ''}]`, attachedFiles: fileNames.length > 0 ? fileNames : undefined });
    setInput(''); setSlashOpen(false); setBusy(true); setAttachedFiles([]);
    if (inputRef.current) { inputRef.current.style.height = 'auto'; }

    // 1. Slash commands
    if (q.startsWith('/')) {
      if (executeSlashCommand(q, tid)) { setBusy(false); return; }
    }

    // 2. Local data queries
    const queryResult = tryLocalQuery(q, state);
    if (queryResult) {
      actions.appendChatMessage(tid, { role: 'assistant', text: queryResult.message, data: queryResult.data, toolCalls: queryResult.actions, followUps: queryResult.followUps, citations: [] });
      setBusy(false); return;
    }

    // 3. Local commands (add/delete/update)
    const localResult = tryLocalCommand(q, state);
    if (localResult) {
      actions.appendChatMessage(tid, { role: 'assistant', text: localResult.message, toolCalls: localResult.actions, followUps: localResult.followUps, citations: [] });
      setBusy(false); return;
    }

    // 4. AI call
    const ctx = buildContext(q);
    const HISTORY_DEPTH = 10;
    const threadMsgs = (thread?.messages || []).slice(-(HISTORY_DEPTH));
    const historyMessages = threadMsgs.map(m => ({ role: m.role, content: m.text || '' }));

    // Build file context
    let fileContext = '';
    if (filesToSend.length > 0) {
      fileContext = '\nATTACHED FILES:\n' + filesToSend.map(f => {
        let content = f.content;
        if (f.name.endsWith('.csv')) {
          try { content = JSON.stringify(parseCSV(f.content), null, 2); } catch { /* use raw */ }
        }
        return `--- FILE: ${f.name} ---\n${content}\n--- END FILE ---`;
      }).join('\n') + '\n';
    }

    const blob = `CONTEXT:\n\nPROGRAMS:\n${JSON.stringify((state.programs || []).map(p => ({ id: p.id, name: p.name, status: p.status, description: p.description })), null, 2)}\n\nPROJECTS:\n${JSON.stringify(ctx.projects, null, 2)}\n\nMILESTONES:\n${JSON.stringify((state.milestones || []).map(m => ({ id: m.id, projectId: m.projectId, name: m.name, date: m.date, status: m.status, deliverable: m.deliverable })), null, 2)}\n\nOPEN TASKS:\n${JSON.stringify(ctx.tasks, null, 2)}\n\nOPEN RISKS:\n${JSON.stringify(ctx.risks, null, 2)}\n\nBLOCKERS:\n${JSON.stringify(ctx.blockers, null, 2)}\n\nOPEN QUESTIONS:\n${JSON.stringify(ctx.questions, null, 2)}\n\nRECENT DECISIONS:\n${JSON.stringify(ctx.decisions, null, 2)}\n\nRECENT MEETINGS:\n${JSON.stringify(ctx.meetings, null, 2)}\n\nSPRINTS:\n${JSON.stringify(ctx.sprints, null, 2)}\n\nJIRA ISSUES:\n${JSON.stringify(ctx.jira, null, 2)}\n\nCONFLUENCE PAGES:\n${JSON.stringify(ctx.confluence, null, 2)}\n\n${ctx.threadHistory ? 'RECENT CONVERSATION:\n' + ctx.threadHistory + '\n\n' : ''}${fileContext}\n---\nREQUEST: ${q || 'Import the data from the attached file(s) into the platform.'}`;

    // Augment system prompt for file imports
    const fileImportPreamble = filesToSend.length > 0 ? `FILE IMPORT INSTRUCTIONS: The user has attached file(s). Parse the content and use your tools to import data into the platform.

MERGE STRATEGY — match existing items before creating new ones:
1. PROGRAMS: Compare each row's name against existing programs in CONTEXT. If a program with the same name (or very similar name) already exists, use update_program with the existing program's id to update its fields. Only use add_program for genuinely new programs.
2. PROJECTS: Compare each row's code AND name against existing projects in CONTEXT. If a project with the same code already exists, use update_project with the existing project's id. Only use add_project for new projects.
3. TASKS: Compare title + projectId against existing tasks. If a task with the same title already exists in the same project, use update_task. Otherwise use add_task.
4. MILESTONES: Compare name + projectId against existing milestones. If it exists, use update_milestone. Otherwise use add_milestone.
5. RISKS: Compare title + projectId against existing risks. If it exists, use update_risk. Otherwise use add_risk.
6. DECISIONS/QUESTIONS/NOTES: Always create new — these are append-only logs.
7. MEETINGS: Always create new.

ORDERING: Process programs first, then projects (so you have IDs), then tasks/milestones/risks/notes.
CROSS-REFERENCES: Use ref_id columns in the file to map relationships. A task's project_ref maps to the project you just created or matched.
EFFICIENCY: Use parallel tool calls (multiple tool_use blocks in one response) to batch operations.
After importing, confirm what was created vs updated with a summary.\n\n` : '';
    const systemPrompt = fileImportPreamble + SYSTEM_PROMPT;

    try {
      const provider = state.meta.defaultAI || null;
      let currentMessages = [...historyMessages, { role: 'user', content: blob }];
      let allActionsApplied = [];
      let finalText = '';
      let maxRounds = filesToSend.length > 0 ? 8 : 3;

      // Try streaming first
      const payload = { system: systemPrompt, messages: currentMessages, tools: ASSISTANT_TOOLS, stream: true, ...(provider && { provider }), ...(filesToSend.length > 0 && { max_tokens: 8192 }) };

      while (maxRounds-- > 0) {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('text/event-stream')) {
          // Streaming response
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = '';
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const payload = line.slice(6).trim();
              if (payload === '[DONE]') break;
              try {
                const evt = JSON.parse(payload);
                if (evt.type === 'content_block_delta' && evt.delta?.text) {
                  accumulated += evt.delta.text;
                  setStreamingText(accumulated);
                }
              } catch {}
            }
          }
          setStreamingText('');
          finalText = accumulated;
          break; // No multi-step in streaming mode
        } else {
          // Non-streaming JSON response
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

          const toolCalls = data.tool_calls || [];

          if (toolCalls.length > 0 && data.stop_reason === 'tool_use') {
            // Execute tools, prepare for next round
            const toolResults = toolCalls.map(tc => {
              try {
                const result = executeTool(tc.name, tc.input);
                allActionsApplied.push(`${tc.name.replace(/_/g, ' ')} — ${JSON.stringify(tc.input).slice(0, 80)}`);
                return { type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify(result || { success: true }) };
              } catch (e) {
                return { type: 'tool_result', tool_use_id: tc.id, content: JSON.stringify({ error: e.message }), is_error: true };
              }
            });

            setToolProgress({ applied: allActionsApplied.length });

            // Build next round messages
            if (data._raw_content) {
              currentMessages.push({ role: 'assistant', content: data._raw_content });
              currentMessages.push({ role: 'user', content: toolResults });
            } else {
              // Fallback: can't do multi-step without raw content
              finalText = data.text || '';
              break;
            }
            payload.messages = currentMessages;
          } else {
            // Final response
            finalText = data.text || '';
            // Execute any remaining tool calls
            toolCalls.forEach(tc => {
              try {
                executeTool(tc.name, tc.input);
                allActionsApplied.push(`${tc.name.replace(/_/g, ' ')} — ${JSON.stringify(tc.input).slice(0, 80)}`);
              } catch (e) { console.error('[assistant] tool error:', tc.name, e.message); }
            });
            break;
          }
        }
      }

      // Parse and execute any text-based tool calls (for Gemini/OpenAI or streaming responses)
      if (finalText) {
        const parsed = parseTextToolCalls(finalText);
        if (parsed.calls.length > 0) {
          parsed.calls.forEach(tc => {
            try {
              executeTool(tc.name, tc.input);
              allActionsApplied.push(`${tc.name.replace(/_/g, ' ')} — ${JSON.stringify(tc.input).slice(0, 80)}`);
            } catch (e) { console.error('[assistant] text tool error:', tc.name, e.message); }
          });
          finalText = parsed.cleanText;
        }
      }

      const answer = finalText || (allActionsApplied.length ? `Done — applied ${allActionsApplied.length} change${allActionsApplied.length > 1 ? 's' : ''}.` : '');
      const { cleanText, followUps } = parseFollowUps(answer);
      const citedJira = (cleanText.match(/\b[A-Z]{2,6}-\d+\b/g) || []);
      const citedConf = ctx.confluence.filter((c) => cleanText.includes(c.title)).map((c) => c.title);
      actions.appendChatMessage(tid, {
        role: 'assistant',
        text: cleanText,
        citations: [...new Set([...citedJira, ...citedConf])],
        toolCalls: allActionsApplied,
        followUps,
      });
    } catch (e) {
      actions.appendChatMessage(tid, { role: 'assistant', text: `Couldn't reach the assistant. ${e.message || 'Is the server running and an AI key configured in Integrations?'}`, citations: [], followUps: ['/summary', 'Show my reminders'] });
    } finally { setBusy(false); setToolProgress(null); }
  };

  const handleFollowUp = (text) => {
    setInput(text);
    // Auto-send after a tick so the input updates
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.form.requestSubmit();
      }
    }, 50);
  };

  const examples = [
    'Remind me to review PRs on Friday',
    'Add a task to ATLAS: update API documentation',
    '/summary',
    'What is blocking the most progress across my projects?',
    'Which risks are highest priority?',
    '/overdue',
  ];

  return (
    <div className="content-narrow assistant-wrap" style={{ maxWidth: 1280 }}>
      <div className="row-flex-sb" style={{ marginBottom: 14 }}>
        <div>
          <div className="row-flex" style={{ marginBottom: 4 }}>
            <Pill tone="accent"><Icon name="bolt" size={10} /> Assistant</Pill>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
              full platform context{connectedIntgKeys.length > 0 ? ' · ' + connectedIntgKeys.join(' · ') : ''}
            </span>
          </div>
          <div className="title-h1">Ask a question</div>
          <div className="title-sub">Type / for commands, or ask anything about your projects, tasks, risks, and more.</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn" onClick={async () => {
            try {
              const resp = await fetch('/api/export-xlsx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
              if (!resp.ok) throw new Error('Export failed');
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `operator-export-${new Date().toISOString().slice(0, 10)}.xlsx`; a.click();
              URL.revokeObjectURL(url);
            } catch (e) { console.error('[export]', e); alert('Export failed: ' + e.message); }
          }}><Icon name="upload" size={11} /> Export data</button>
          <a className="btn" href="/operator-import-template.xlsx" download style={{ textDecoration: 'none' }}><Icon name="download" size={11} /> Import template</a>
          <button className="btn" onClick={() => setShowGuide(true)}><Icon name="doc" size={11} /> Guide</button>
          <button className="btn" onClick={newThread}><Icon name="plus" size={11} /> New chat</button>
        </div>
      </div>

      <div className="assistant-grid">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head"><span className="card-head-title">Conversations</span></div>
          <div style={{ padding: 6, overflowY: 'auto', flex: 1, minHeight: 0 }}>
            {(state.chatThreads || []).length === 0 && <div style={{ padding: 14, color: 'var(--fg-4)', fontSize: 12 }}>No conversations yet.</div>}
            {(state.chatThreads || []).map((t) => (
              <div key={t.id} className={`sb-item ${activeThread === t.id ? 'active' : ''}`} onClick={() => setActiveThread(t.id)} style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 2, paddingTop: 7, paddingBottom: 7, position: 'relative', cursor: 'pointer' }}>
                <span className="sb-item-label truncate" style={{ width: '100%', fontSize: 12.5, paddingRight: 20 }}>{t.title}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{t.messages.length} msgs · {fmtRelative(t.createdAt)}</span>
                <button className="icon-btn" title="Delete conversation" style={{ position: 'absolute', top: 6, right: 4, opacity: 0.4 }}
                  onClick={(e) => { e.stopPropagation(); actions.deleteChatThread(t.id); if (activeThread === t.id) setActiveThread((state.chatThreads || []).find(ct => ct.id !== t.id)?.id || null); }}>
                  <Icon name="trash" size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="card-head" style={{ flexWrap: 'wrap', gap: 6 }}>
            <span className="card-head-title" style={{ cursor: thread ? 'text' : 'default' }}
              contentEditable={!!thread} suppressContentEditableWarning
              onBlur={(e) => { if (thread && e.target.textContent.trim()) actions.updateChatThread(thread.id, { title: e.target.textContent.trim() }); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } }}
            >{thread?.title || 'New conversation'}</span>
            <div className="row-flex" style={{ flexWrap: 'wrap', gap: 4 }}>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>scope:</span>
              {connectedIntgKeys.map(key => (
                <button key={key} className={`seg-btn ${isInScope(key) ? 'active' : ''}`}
                  style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '2px 7px', textTransform: 'capitalize' }}
                  onClick={() => setScope(s => ({ ...s, [key]: !isInScope(key) }))}>
                  {key}
                </button>
              ))}
              {state.projects.map(p => (
                <button key={p.id} className={`seg-btn ${isInScope(`proj_${p.id}`) ? 'active' : ''}`}
                  style={{ border: '1px solid var(--line)', borderRadius: 4, padding: '2px 7px' }}
                  onClick={() => setScope(s => ({ ...s, [`proj_${p.id}`]: !isInScope(`proj_${p.id}`) }))}>
                  {p.code}
                </button>
              ))}
            </div>
          </div>
          <div ref={scrollRef} className="chat-scroll">
            {(!thread || thread.messages.length === 0) && (
              <div style={{ padding: 28, textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--fg-2)', marginBottom: 12, fontWeight: 500 }}>Try asking:</div>
                <div className="stack-sm" style={{ maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {examples.map((ex) => (
                    <button key={ex} className="btn" style={{ textAlign: 'left', justifyContent: 'flex-start', width: '100%' }}
                      onClick={() => { setInput(ex); }}>
                      <Icon name={ex.startsWith('/') ? 'target' : 'bolt'} size={10} /> {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {thread?.messages.map((m, i) => <ChatBubble key={i} message={m} onFollowUp={handleFollowUp} />)}
            {busy && (
              <div className="chat-bubble chat-bubble-assistant">
                <div className="chat-label">Assistant</div>
                {streamingText ? <div className="chat-text">{renderMarkdown(streamingText)}</div>
                  : toolProgress ? <div style={{ fontSize: 12, color: 'var(--fg-3)' }}><Icon name="bolt" size={11} /> Processing… {toolProgress.applied} change{toolProgress.applied !== 1 ? 's' : ''} applied</div>
                  : <div className="chat-typing"><span></span><span></span><span></span></div>}
              </div>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            {slashOpen && filteredSlash.length > 0 && (
              <div className="slash-dropdown">
                {filteredSlash.map((sc, i) => (
                  <div key={sc.cmd} className={`slash-item ${i === slashIdx ? 'slash-item-active' : ''}`}
                    onMouseEnter={() => setSlashIdx(i)}
                    onClick={() => { setInput(sc.cmd); setSlashOpen(false); setTimeout(() => { if (inputRef.current) inputRef.current.form.requestSubmit(); }, 50); }}>
                    <Icon name={sc.icon} size={13} />
                    <span className="mono" style={{ fontWeight: 600 }}>{sc.cmd}</span>
                    <span style={{ color: 'var(--fg-4)', fontSize: 12, flex: 1 }}>{sc.desc}</span>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".txt,.csv,.json,.md,.pdf,.xlsx,.xls" multiple
              style={{ display: 'none' }} onChange={handleFileSelect} />
            <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send(); }} style={{ flexWrap: 'wrap' }}>
              {attachedFiles.length > 0 && (
                <div className="file-chips">
                  {attachedFiles.map((f, i) => (
                    <span key={i} className="file-chip">
                      <Icon name="doc" size={10} /> {f.name} ({(f.size / 1024).toFixed(1)}KB)
                      <button type="button" className="icon-btn" onClick={() => setAttachedFiles(a => a.filter((_, j) => j !== i))}><Icon name="x" size={9} /></button>
                    </span>
                  ))}
                </div>
              )}
              <button type="button" className="icon-btn" title="Attach file" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                <Icon name="link" size={14} />
              </button>
              <textarea ref={inputRef} className="input" placeholder="Type / for commands, or ask a question…"
                rows={1} style={{ resize: 'none', overflow: 'auto', maxHeight: 240, lineHeight: '1.4', whiteSpace: 'pre-wrap' }}
                value={input} onChange={handleInputChange} onKeyDown={handleInputKeyDown} disabled={busy}
                onPaste={(e) => { setTimeout(() => autoResize(e.target), 0); }} />
              <button type="submit" className="btn btn-primary" disabled={(!input.trim() && !attachedFiles.length) || busy}>{busy ? '…' : 'Send'}</button>
            </form>
          </div>
        </div>
      </div>

      {showGuide && <AssistantGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  );
}

function ChatBubble({ message, onFollowUp }) {
  const isUser = message.role === 'user';
  return (
    <div className={`chat-bubble ${isUser ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
      <div className="chat-label">{isUser ? 'You' : 'Assistant'}</div>
      {message.data ? (
        <>
          {message.text && <div className="chat-text" style={{ marginBottom: 8 }}>{renderMarkdown(message.text)}</div>}
          <StructuredBlock data={message.data} />
        </>
      ) : (
        <div className="chat-text">{isUser ? message.text : renderMarkdown(message.text)}</div>
      )}
      {isUser && message.attachedFiles?.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {message.attachedFiles.map((name, i) => <span key={i} className="file-chip"><Icon name="doc" size={10} /> {name}</span>)}
        </div>
      )}
      {message.toolCalls?.length > 0 && (
        <div className="chat-cites" style={{ borderColor: 'var(--ok)', marginTop: 6 }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ok)' }}>✓ changes applied:</span>
          {message.toolCalls.map((c, i) => <span key={i} className="tag" style={{ background: 'color-mix(in oklch, var(--ok) 12%, transparent)', borderColor: 'color-mix(in oklch, var(--ok) 30%, transparent)' }}>{c}</span>)}
        </div>
      )}
      {message.citations?.length > 0 && (
        <div className="chat-cites">
          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>sources:</span>
          {message.citations.map((c, i) => <span key={i} className="tag">{c}</span>)}
        </div>
      )}
      {!isUser && message.followUps?.length > 0 && onFollowUp && (
        <div className="chat-followups">
          {message.followUps.map((f, i) => (
            <button key={i} className="btn" onClick={() => onFollowUp(f)}>
              <Icon name="bolt" size={10} /> {f}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Assistant, ChatBubble, AssistantGuideModal });
