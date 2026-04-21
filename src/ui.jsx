// Shared utilities + small presentational primitives used across views.

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// --- Date helpers ---
const DAY = 86400000;
const parseDate = (s) => (s ? new Date(s + 'T00:00:00') : null);
// Use local date string to avoid UTC-offset day-shift bugs
const localIso = (d) => {
  const dd = d || new Date();
  return dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0');
};
const today0 = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / DAY);
const daysFromToday = (s) => {
  if (!s) return null;
  return Math.round((parseDate(s) - today0()) / DAY);
};
const fmtDate = (s) => {
  if (!s) return '—';
  const d = parseDate(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtRelative = (s) => {
  const diff = daysFromToday(s);
  if (diff === null) return '—';
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  if (diff > 0 && diff < 7) return `in ${diff}d`;
  if (diff < 0 && diff > -7) return `${Math.abs(diff)}d overdue`;
  if (diff >= 7 && diff < 30) return `in ${Math.round(diff / 7)}w`;
  if (diff <= -7 && diff > -30) return `${Math.round(Math.abs(diff) / 7)}w overdue`;
  return fmtDate(s);
};

// --- Priority + status ---
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_LABEL = {
  todo: 'Todo',
  'in-progress': 'Doing',
  blocked: 'Blocked',
  done: 'Done',
};
const PROJECT_STATUS_LABEL = {
  'on-track': 'On track',
  'at-risk': 'At risk',
  blocked: 'Blocked',
  done: 'Done',
};

// --- Computed selectors ---
function projectProgress(state, projectId) {
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  if (!tasks.length) return { pct: 0, done: 0, total: 0 };
  const done = tasks.filter((t) => t.status === 'done').length;
  return { pct: Math.round((done / tasks.length) * 100), done, total: tasks.length };
}

function projectRiskScore(state, projectId) {
  const risks = state.risks.filter((r) => r.projectId === projectId && r.status !== 'closed');
  if (!risks.length) return { score: 0, peak: 0, count: 0 };
  const peak = Math.max(...risks.map((r) => r.severity * r.likelihood));
  const score = risks.reduce((acc, r) => acc + r.severity * r.likelihood, 0);
  return { score, peak, count: risks.length };
}

function todayTasks(state, limit = null) {
  const list = state.tasks
    .filter((t) => t.status !== 'done')
    .map((t) => {
      const due = daysFromToday(t.dueDate);
      const priority = PRIORITY_ORDER[t.priority] ?? 2;
      // Score: overdue penalty heavy, then priority, then rank
      const overdue = due !== null && due < 0;
      const soon = due !== null && due <= 2;
      const urgencyScore =
        (overdue ? -1000 : 0) + (soon ? -100 : 0) + priority * 10 + (t.rank || 99) - (due ?? 99);
      return { ...t, _score: urgencyScore, _due: due };
    })
    .sort((a, b) => a._score - b._score);
  return limit ? list.slice(0, limit) : list;
}

function workloadByDay(state, days = 14) {
  const buckets = [];
  const base = today0();
  for (let i = 0; i < days; i++) {
    const d = new Date(base.getTime() + i * DAY);
    const iso = localIso(d);
    const tasks = state.tasks.filter((t) => t.dueDate === iso && t.status !== 'done');
    const hours = tasks.reduce((acc, t) => acc + (t.estimate || 1), 0);
    buckets.push({ date: iso, day: d, tasks, hours });
  }
  return buckets;
}

function detectConflicts(state) {
  const buckets = workloadByDay(state, 21);
  const overloaded = buckets.filter((b) => b.hours > 6);
  // timeline conflicts: projects with overlapping milestone weeks at P0
  const p0 = state.projects.filter((p) => p.priority === 'critical');
  const conflicts = [];
  for (let i = 0; i < p0.length; i++) {
    for (let j = i + 1; j < p0.length; j++) {
      const a = state.milestones.filter((m) => m.projectId === p0[i].id && m.status !== 'done');
      const b = state.milestones.filter((m) => m.projectId === p0[j].id && m.status !== 'done');
      a.forEach((ma) => {
        b.forEach((mb) => {
          if (Math.abs(daysBetween(ma.date, mb.date)) <= 3) {
            conflicts.push({ a: p0[i], b: p0[j], ma, mb });
          }
        });
      });
    }
  }
  return { overloaded, conflicts };
}

// --- UI primitives ---
function Icon({ name, size = 14, className = '' }) {
  // Tiny inline SVG icon set — clean, consistent stroke.
  const s = size;
  const stroke = 'currentColor';
  const props = { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', stroke, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', className };
  const paths = {
    check: <polyline points="3 8 6.5 11.5 13 4.5" />,
    plus: <><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></>,
    dot: <circle cx="8" cy="8" r="2.5" fill={stroke} stroke="none" />,
    circle: <circle cx="8" cy="8" r="5" />,
    chevronR: <polyline points="6 3 11 8 6 13" />,
    chevronL: <polyline points="10 3 5 8 10 13" />,
    chevronD: <polyline points="3 6 8 11 13 6" />,
    warn: <><path d="M8 2 L14 13 L2 13 Z" /><line x1="8" y1="6" x2="8" y2="9.5" /><circle cx="8" cy="11.5" r="0.5" fill={stroke} stroke="none" /></>,
    block: <><circle cx="8" cy="8" r="5.5" /><line x1="4" y1="4" x2="12" y2="12" /></>,
    flag: <><line x1="4" y1="3" x2="4" y2="14" /><path d="M4 3 L12 3 L10 6 L12 9 L4 9" /></>,
    clock: <><circle cx="8" cy="8" r="5.5" /><polyline points="8 5 8 8 10 9.5" /></>,
    grid: <><rect x="2.5" y="2.5" width="4" height="4" /><rect x="9.5" y="2.5" width="4" height="4" /><rect x="2.5" y="9.5" width="4" height="4" /><rect x="9.5" y="9.5" width="4" height="4" /></>,
    list: <><line x1="4" y1="4" x2="13" y2="4" /><line x1="4" y1="8" x2="13" y2="8" /><line x1="4" y1="12" x2="13" y2="12" /><circle cx="2.5" cy="4" r="0.5" fill={stroke} /><circle cx="2.5" cy="8" r="0.5" fill={stroke} /><circle cx="2.5" cy="12" r="0.5" fill={stroke} /></>,
    target: <><circle cx="8" cy="8" r="5.5" /><circle cx="8" cy="8" r="2.5" /></>,
    note: <><path d="M3 2.5 L11 2.5 L13 4.5 L13 13.5 L3 13.5 Z" /><line x1="5" y1="6" x2="11" y2="6" /><line x1="5" y1="9" x2="11" y2="9" /><line x1="5" y1="12" x2="9" y2="12" /></>,
    calendar: <><rect x="2.5" y="3.5" width="11" height="10" /><line x1="2.5" y1="6.5" x2="13.5" y2="6.5" /><line x1="5.5" y1="2" x2="5.5" y2="5" /><line x1="10.5" y1="2" x2="10.5" y2="5" /></>,
    x: <><line x1="4" y1="4" x2="12" y2="12" /><line x1="12" y1="4" x2="4" y2="12" /></>,
    trash: <><line x1="2.5" y1="4.5" x2="13.5" y2="4.5" /><path d="M4 4.5 L5 13.5 L11 13.5 L12 4.5" /><path d="M6 4.5 V 3 L10 3 V 4.5" /></>,
    search: <><circle cx="7" cy="7" r="4" /><line x1="10" y1="10" x2="13" y2="13" /></>,
    drag: <><circle cx="6" cy="4" r="0.8" fill={stroke} /><circle cx="6" cy="8" r="0.8" fill={stroke} /><circle cx="6" cy="12" r="0.8" fill={stroke} /><circle cx="10" cy="4" r="0.8" fill={stroke} /><circle cx="10" cy="8" r="0.8" fill={stroke} /><circle cx="10" cy="12" r="0.8" fill={stroke} /></>,
    bolt: <path d="M9 2 L4 9 L7 9 L7 14 L12 7 L9 7 Z" />,
    sun: <><circle cx="8" cy="8" r="3" /><line x1="8" y1="1.5" x2="8" y2="3" /><line x1="8" y1="13" x2="8" y2="14.5" /><line x1="1.5" y1="8" x2="3" y2="8" /><line x1="13" y1="8" x2="14.5" y2="8" /><line x1="3.5" y1="3.5" x2="4.5" y2="4.5" /><line x1="11.5" y1="11.5" x2="12.5" y2="12.5" /><line x1="3.5" y1="12.5" x2="4.5" y2="11.5" /><line x1="11.5" y1="4.5" x2="12.5" y2="3.5" /></>,
    moon: <path d="M12.5 9.5 A 5 5 0 1 1 6.5 3.5 A 4 4 0 0 0 12.5 9.5 Z" />,
    settings: <><circle cx="8" cy="8" r="2" /><path d="M8 1.5 L8 3.5 M8 12.5 L8 14.5 M1.5 8 L3.5 8 M12.5 8 L14.5 8 M3.3 3.3 L4.7 4.7 M11.3 11.3 L12.7 12.7 M3.3 12.7 L4.7 11.3 M11.3 4.7 L12.7 3.3" /></>,
    edit: <><path d="M3 13 L3 10.5 L10.5 3 L13 5.5 L5.5 13 Z" /><line x1="9" y1="4.5" x2="11.5" y2="7" /></>,
    pin: <><path d="M10 2 L14 6 L11 7 L10 11 L5 6 L9 5 Z" /><line x1="5" y1="6" x2="2" y2="14" /></>,
    download: <><path d="M8 2 L8 10" /><polyline points="4.5 7 8 10.5 11.5 7" /><line x1="3" y1="13.5" x2="13" y2="13.5" /></>,
    doc: <><path d="M4 2 L10 2 L12 4 L12 14 L4 14 Z" /><line x1="6" y1="6" x2="10" y2="6" /><line x1="6" y1="9" x2="10" y2="9" /><line x1="6" y1="12" x2="8.5" y2="12" /></>,
    milestone: <polygon points="8 2 13 8 8 14 3 8" />,
    bell: <><path d="M8 2 C5.5 2 4 4 4 6.5 L4 10 L2.5 12 L13.5 12 L12 10 L12 6.5 C12 4 10.5 2 8 2 Z" /><line x1="6.5" y1="12" x2="6.5" y2="13.5" /><line x1="9.5" y1="12" x2="9.5" y2="13.5" /><line x1="6.5" y1="13.5" x2="9.5" y2="13.5" /></>,
    filter: <path d="M2.5 3 L13.5 3 L9.5 8 L9.5 13 L6.5 11.5 L6.5 8 Z" />,
    link: <><path d="M6.5 9.5 L9.5 6.5" /><path d="M9 4.5 A 2.5 2.5 0 0 1 12 7.5 L10.5 9" /><path d="M7 11 L5.5 12.5 A 2.5 2.5 0 0 1 2.5 9.5 L4 8" /></>,
    ext: <><path d="M8 3 H 3 V 13 H 13 V 8" /><path d="M10 3 H 13 V 6" /><line x1="7" y1="9" x2="13" y2="3" /></>,
    folder: <><path d="M2 4.5 L2 12.5 L14 12.5 L14 6.5 L7 6.5 L5.5 4.5 Z" /></>,
    timeline: <><line x1="2" y1="4" x2="2" y2="12" /><line x1="2" y1="4" x2="10" y2="4" /><line x1="2" y1="8" x2="13" y2="8" /><line x1="2" y1="12" x2="8" y2="12" /></>,
  };
  return <svg {...props}>{paths[name] || null}</svg>;
}

function Pill({ children, tone = 'neutral', className = '', ...rest }) {
  return (
    <span className={`pill pill-${tone} ${className}`} {...rest}>
      {children}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const norm = { P0: 'critical', P1: 'high', P2: 'medium', P3: 'low' }[priority] || priority;
  const tone = { critical: 'p0', high: 'p1', medium: 'p2', low: 'p3' }[norm] || 'p2';
  const label = { critical: 'Crit', high: 'High', medium: 'Med', low: 'Low' }[norm] || norm;
  return <span className={`prio prio-${tone}`}>{label}</span>;
}

function StatusDot({ status }) {
  return <span className={`sdot sdot-${status}`} title={STATUS_LABEL[status]} />;
}

function DueChip({ date, small, done }) {
  const diff = daysFromToday(date);
  if (diff === null) return <span className={`due due-empty ${small ? 'due-sm' : ''}`}>—</span>;
  let tone = 'neutral';
  if (!done) {
    if (diff < 0) tone = 'danger';
    else if (diff <= 2) tone = 'warn';
    else if (diff <= 7) tone = 'accent';
  }
  return <span className={`due due-${tone} ${small ? 'due-sm' : ''}`}>{done ? fmtDate(date) : fmtRelative(date)}</span>;
}

function ProjectChip({ project, onClick }) {
  if (!project) return null;
  return (
    <button className={`proj-chip proj-chip-${project.status}`} onClick={onClick} title={project.name}>
      <span className="proj-chip-dot" />
      <span className="proj-chip-code">{project.code}</span>
    </button>
  );
}

function Progress({ value, tone = 'accent' }) {
  return (
    <div className={`pbar pbar-${tone}`}>
      <div className="pbar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function InlineEdit({ value, onSave, multiline = false, className = '', placeholder = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      if (!multiline) ref.current.select();
    }
  }, [editing, multiline]);

  const commit = () => {
    const v = draft.trim();
    if (v && v !== value) onSave(v);
    else setDraft(value);
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    const common = {
      ref,
      value: draft,
      onChange: (e) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e) => {
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
        else if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
        else if (e.key === 'Escape') { e.preventDefault(); cancel(); }
      },
      className: `inline-edit-input ${className}`,
      placeholder,
    };
    return multiline ? <textarea rows={2} {...common} /> : <input {...common} />;
  }

  return (
    <span
      className={`inline-edit-view ${className} ${!value ? 'inline-edit-empty' : ''}`}
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      {value || placeholder}
      <Icon name="edit" size={11} className="inline-edit-pencil" />
    </span>
  );
}

function EmptyState({ title, body, icon = 'plus' }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={18} /></div>
      <div className="empty-title">{title}</div>
      {body && <div className="empty-body">{body}</div>}
    </div>
  );
}

// Modal shell
function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Tiny sparkline for metrics
function Sparkline({ values, max, width = 120, height = 32, tone = 'accent' }) {
  if (!values.length) return null;
  const m = max ?? Math.max(...values, 1);
  const step = width / Math.max(values.length - 1, 1);
  const pts = values.map((v, i) => `${i * step},${height - (v / m) * (height - 4) - 2}`).join(' ');
  return (
    <svg width={width} height={height} className={`spark spark-${tone}`}>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts} />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={height - (v / m) * (height - 4) - 2} r={i === values.length - 1 ? 2.5 : 1.5} />
      ))}
    </svg>
  );
}

// --- Stale projects: no updates in 10+ days ---
function staleProjects(state, days = 10) {
  const cutoff = today0().getTime() - days * DAY;
  return state.projects.filter((p) => {
    const latest = Math.max(
      parseDate(p.createdAt).getTime(),
      ...state.tasks.filter((t) => t.projectId === p.id).map((t) => parseDate(t.updatedAt).getTime()),
      ...state.notes.filter((n) => n.projectId === p.id).map((n) => parseDate(n.date).getTime()),
      ...state.milestones.filter((m) => m.projectId === p.id).map((m) => parseDate(m.date).getTime())
    );
    return latest < cutoff;
  });
}

// --- Global search across all entities and fields ---
function globalSearch(state, q) {
  if (!q || q.trim().length < 2) return { projects: [], tasks: [], notes: [], risks: [], milestones: [], meetings: [], blockers: [], jira: [], pages: [] };
  const needle = q.toLowerCase();
  const m = (s) => !!s && String(s).toLowerCase().includes(needle);
  const any = (...vals) => vals.some(m);
  const anyArr = (arr) => (arr || []).some(m);

  const noteDisplayId = (n) => {
    const num = n.id.replace(/^n-/, '');
    if (n.kind === 'question') return `q-${num}`;
    if (n.kind === 'decision') return `d-${num}`;
    return `n-${num}`;
  };

  return {
    projects: state.projects.filter((p) =>
      any(p.id, p.code, p.name, p.objective, p.owner, p.status, p.priority)),
    tasks: state.tasks.filter((t) =>
      any(t.id, t.title, t.status, t.priority, t.source) || anyArr(t.tags)),
    notes: state.notes.filter((n) =>
      any(n.id, noteDisplayId(n), n.kind, n.title, n.body, n.context, n.options) || anyArr(n.tags)),
    risks: state.risks.filter((r) =>
      any(r.id, r.title, r.category, r.response, r.mitigation, r.trigger, r.impact, r.owner, r.status)),
    milestones: state.milestones.filter((ms) =>
      any(ms.id, ms.title, ms.deliverable, ms.status)),
    meetings: (state.meetings || []).filter((mt) =>
      any(mt.id, mt.title, mt.attendees, mt.notes, mt.recurrence)),
    blockers: (state.blockers || []).filter((b) =>
      any(b.id, b.description, b.waitingOn, b.kind)),
    jira: (state.jiraIssues || []).filter((i) =>
      any(i.key, i.summary, i.description, i.assignee, i.reporter, i.type, i.status) || anyArr(i.labels)),
    pages: (state.confluencePages || []).filter((p) =>
      any(p.title, p.body, p.space) || anyArr(p.tags)),
  };
}

// --- Pages mentioning a project (by tag or project code in body/title) ---
function pagesForProject(state, project) {
  if (!project) return [];
  const code = project.code.toLowerCase();
  const name = project.name.split('—')[1]?.trim().toLowerCase() || project.name.toLowerCase();
  return (state.confluencePages || []).filter((p) => {
    const t = (p.tags || []).map((x) => x.toLowerCase());
    if (t.includes(code) || t.includes(name)) return true;
    const body = p.body.toLowerCase();
    return body.includes(code) || body.includes(name);
  });
}

// --- Markdown export for a project ---
function projectMarkdown(state, projectId) {
  const p = state.projects.find((x) => x.id === projectId);
  if (!p) return '';
  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const milestones = state.milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.date.localeCompare(b.date));
  const notes = state.notes.filter((n) => n.projectId === projectId);
  const risks = state.risks.filter((r) => r.projectId === projectId && r.status !== 'closed');
  const prog = projectProgress(state, projectId);
  const recent = tasks.filter((t) => t.status === 'done' && t.completedAt && daysFromToday(t.completedAt) >= -7);
  const open = tasks.filter((t) => t.status !== 'done').sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

  let md = `# ${p.code} — ${p.name}\n\n`;
  md += `**Status:** ${PROJECT_STATUS_LABEL[p.status]} · ${p.priority} · ${prog.pct}% complete (${prog.done}/${prog.total})\n`;
  md += `**Due:** ${fmtDate(p.dueDate)}\n\n`;
  md += `## Objective\n${p.objective}\n\n`;
  md += `## Success criteria\n`;
  p.successCriteria.forEach((sc) => { md += `- ${sc.text} — ${sc.current} / ${sc.target}\n`; });
  md += `\n## Shipped this week (${recent.length})\n`;
  if (!recent.length) md += `_Nothing shipped in the last 7 days._\n`;
  recent.forEach((t) => { md += `- ${t.title}${t.completedAt ? ` — ${fmtDate(t.completedAt)}` : ''}\n`; });
  md += `\n## In flight / top of queue (${open.length})\n`;
  open.slice(0, 8).forEach((t) => { md += `- [${t.priority}] ${t.title}${t.dueDate ? ` · due ${fmtDate(t.dueDate)}` : ''}\n`; });
  md += `\n## Upcoming milestones\n`;
  milestones.filter((m) => m.status !== 'done').slice(0, 5).forEach((m) => { md += `- ${fmtDate(m.date)} — ${m.title}\n`; });
  md += `\n## Open risks (${risks.length})\n`;
  risks.slice(0, 5).forEach((r) => { md += `- **${r.title}** (sev ${r.severity}·lik ${r.likelihood}) — ${r.mitigation}\n`; });
  md += `\n## Recent decisions\n`;
  const decisions = notes.filter((n) => n.kind === 'decision').slice(0, 4);
  if (!decisions.length) md += `_No decisions logged._\n`;
  decisions.forEach((n) => { md += `- **${n.title}** — ${n.body}\n`; });
  md += `\n---\n_Generated ${fmtDate(today0().toISOString().slice(0, 10))} by Operator._\n`;
  return md;
}

// --- Weekly review markdown ---
function reviewMarkdown(state, review) {
  const weekOf = review.weekOf;
  let md = `# Weekly Review — week of ${fmtDate(weekOf)}\n\n`;
  md += `- **Completed:** ${review.completed}\n`;
  md += `- **Delayed:** ${review.delayed}\n`;
  md += `- **Blocked:** ${review.blocked}\n`;
  md += `- **Planned vs reactive:** ${Math.round(review.plannedRatio * 100)}% planned\n`;
  md += `- **Avg cycle time:** ${review.cycleTime}d\n\n`;
  if (review.completedTasks) {
    md += `## Shipped\n`;
    review.completedTasks.forEach((t) => { md += `- ${t.title}\n`; });
    md += `\n## Delayed\n`;
    review.delayedTasks.forEach((t) => { md += `- ${t.title}\n`; });
    md += `\n## Blocked\n`;
    review.blockedTasks.forEach((t) => { md += `- ${t.title}\n`; });
  }
  if (review.note) md += `\n## Observations & decisions\n${review.note}\n`;
  return md;
}

// --- iCal export for milestones + due dates ---
function iCalExport(state) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmtICS = (dateStr) => dateStr.replace(/-/g, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Operator//EN',
    'CALSCALE:GREGORIAN',
  ];
  state.milestones.forEach((m) => {
    const p = state.projects.find((pp) => pp.id === m.projectId);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.id}@operator`,
      `DTSTART;VALUE=DATE:${fmtICS(m.date)}`,
      `DTEND;VALUE=DATE:${fmtICS(m.date)}`,
      `SUMMARY:[${p?.code || '?'}] ${m.title}`,
      `DESCRIPTION:${m.deliverable || ''} · status ${m.status}`,
      'END:VEVENT'
    );
  });
  state.tasks.filter((t) => t.dueDate && t.status !== 'done' && t.priority !== 'low').forEach((t) => {
    const p = state.projects.find((pp) => pp.id === t.projectId);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@operator`,
      `DTSTART;VALUE=DATE:${fmtICS(t.dueDate)}`,
      `DTEND;VALUE=DATE:${fmtICS(t.dueDate)}`,
      `SUMMARY:[${p?.code || '?'}] ${t.priority} ${t.title}`,
      `DESCRIPTION:Operator task · ${t.priority}`,
      'END:VEVENT'
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// --- Download helper ---
function downloadFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// --- Yesterday recap ---
function yesterdayRecap(state) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  const shipped = state.tasks.filter((t) => t.status === 'done' && t.completedAt === yStr);
  const decisions = state.notes.filter((n) => n.kind === 'decision' && n.date === yStr);
  const slipped = state.tasks.filter((t) => t.status !== 'done' && t.dueDate === yStr);
  return { shipped, decisions, slipped, date: yStr };
}

// --- Resolve task dependency chain (returns array of upstream task objects not yet done) ---
function blockingDeps(state, task) {
  if (!task.dependsOn || !task.dependsOn.length) return [];
  return task.dependsOn
    .map((id) => state.tasks.find((t) => t.id === id))
    .filter((t) => t && t.status !== 'done');
}
function dependentTasks(state, taskId) {
  return state.tasks.filter((t) => (t.dependsOn || []).includes(taskId));
}

Object.assign(window, {
  DAY,
  parseDate,
  localIso,
  today0,
  daysBetween,
  daysFromToday,
  fmtDate,
  fmtRelative,
  PRIORITY_ORDER,
  STATUS_LABEL,
  PROJECT_STATUS_LABEL,
  projectProgress,
  projectRiskScore,
  todayTasks,
  workloadByDay,
  detectConflicts,
  Icon,
  Pill,
  PriorityBadge,
  StatusDot,
  DueChip,
  ProjectChip,
  Progress,
  EmptyState,
  InlineEdit,
  Modal,
  Sparkline,
  staleProjects,
  globalSearch,
  pagesForProject,
  projectMarkdown,
  reviewMarkdown,
  iCalExport,
  downloadFile,
  yesterdayRecap,
  blockingDeps,
  dependentTasks,
});
