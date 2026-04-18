// Project workspace — objective, milestones, tasks, notes, risks.

function ProjectView({ state, projectId, onOpenTask, onBack }) {
  const project = state.projects.find((p) => p.id === projectId);
  const [tab, setTab] = React.useState('overview');
  const [showAdd, setShowAdd] = React.useState(false);

  if (!project) return <EmptyState title="Project not found" />;

  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const milestones = state.milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.date.localeCompare(b.date));
  const notes = state.notes.filter((n) => n.projectId === projectId);
  const risks = state.risks.filter((r) => r.projectId === projectId);
  const prog = projectProgress(state, projectId);
  const risk = projectRiskScore(state, projectId);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'target' },
    { id: 'tasks', label: 'Tasks', icon: 'list', count: openTasks.length },
    { id: 'milestones', label: 'Milestones', icon: 'flag', count: milestones.filter((m) => m.status !== 'done').length },
    { id: 'notes', label: 'Notes', icon: 'note', count: notes.length },
    { id: 'risks', label: 'Risks', icon: 'warn', count: risks.filter((r) => r.status !== 'closed').length },
  ];

  return (
    <div className="content-narrow">
      {/* Header */}
      <div className="row-flex-sb" style={{ marginBottom: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row-flex" style={{ marginBottom: 6 }}>
            <span className="pcard-code">{project.code}</span>
            <select
              className="select proj-status-select"
              style={{ padding: '2px 6px', fontSize: 11 }}
              value={project.priority}
              onChange={(e) => actions.updateProject(project.id, { priority: e.target.value })}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              className="select proj-status-select"
              style={{ padding: '2px 6px', fontSize: 11 }}
              value={project.status}
              onChange={(e) => {
                const patch = { status: e.target.value };
                if (e.target.value === 'done' && !project.completedDate) {
                  patch.completedDate = new Date().toISOString().slice(0, 10);
                }
                actions.updateProject(project.id, patch);
              }}
            >
              <option value="on-track">On track</option>
              <option value="at-risk">At risk</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done ✓</option>
            </select>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
              {fmtDate(project.startDate)} → {fmtDate(project.dueDate)}
            </span>
          </div>
          <div className="title-h1" style={{ marginBottom: 6 }}>
            <InlineEdit
              value={project.name}
              onSave={(v) => actions.updateProject(project.id, { name: v })}
              className="title-h1-edit"
              placeholder="Project name"
            />
          </div>
          <div className="title-sub" style={{ maxWidth: 760 }}>
            <InlineEdit
              value={project.objective}
              onSave={(v) => actions.updateProject(project.id, { objective: v })}
              multiline
              className="title-sub-edit"
              placeholder="Objective — what outcome does this project deliver?"
            />
          </div>
        </div>
        <div className="stack-sm" style={{ minWidth: 200 }}>
          <div className="row-flex-sb">
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>PROGRESS</span>
            <span className="mono" style={{ fontSize: 12 }}>{prog.done}/{prog.total} · {prog.pct}%</span>
          </div>
          <Progress value={prog.pct} tone={project.status === 'blocked' ? 'danger' : project.status === 'at-risk' ? 'warn' : 'ok'} />
          <div className="row-flex-sb" style={{ marginTop: 4 }}>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>PEAK RISK</span>
            <span className="mono" style={{ fontSize: 12, color: risk.peak >= 12 ? 'var(--danger)' : risk.peak >= 8 ? 'var(--warn)' : 'var(--fg)' }}>
              {risk.peak || '—'}
            </span>
          </div>
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'color-mix(in oklch, var(--danger) 40%, transparent)' }}
              onClick={() => {
                if (window.confirm(`Delete "${project.name}" and all its tasks, milestones, notes, and risks?`)) {
                  actions.deleteProject(project.id);
                  actions.setMeta({ activeView: 'portfolio' });
                }
              }}>
              Delete project
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={12} /> {t.label}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab project={project} state={state} milestones={milestones} tasks={tasks} onGoto={setTab} />}
      {tab === 'tasks' && (
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Tasks · drag to reorder within priority</span>
            <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}><Icon name="plus" size={11} /> New task</button>
          </div>
          {showAdd && (
            <QuickAddTask
              projectId={project.id}
              projects={[project]}
              onAdd={(t) => actions.addTask({ ...t, projectId: project.id })}
              onCancel={() => setShowAdd(false)}
            />
          )}
          {tasks.length === 0 ? (
            <EmptyState title="No tasks yet" body="Add the first task to start executing." icon="plus" />
          ) : (
            <TaskGroupedList
              tasks={tasks}
              projects={[project]}
              onOpen={onOpenTask}
              onToggle={actions.toggleTaskDone}
              onReorder={(priority, ids) => actions.reorderTasks(project.id, priority, ids)}
            />
          )}
        </div>
      )}
      {tab === 'milestones' && <MilestonesTab project={project} milestones={milestones} />}
      {tab === 'notes' && <NotesTab project={project} notes={notes} />}
      {tab === 'risks' && <RisksTab project={project} risks={risks} />}
    </div>
  );
}

function OverviewTab({ project, state, milestones, tasks, onGoto }) {
  const nextMs = milestones.filter((m) => m.status !== 'done')[0];
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const topTasks = [...openTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.rank || 99) - (b.rank || 99)).slice(0, 5);
  const recentNotes = state.notes.filter((n) => n.projectId === project.id).slice(0, 3);
  const openRisks = state.risks.filter((r) => r.projectId === project.id && r.status !== 'closed').sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood);

  // Early/late stats
  const timedTasks = doneTasks.filter((t) => t.daysEarlyLate != null);
  const earlyTasks = timedTasks.filter((t) => t.daysEarlyLate > 0);
  const lateTasks = timedTasks.filter((t) => t.daysEarlyLate < 0);
  const onTimeTasks = timedTasks.filter((t) => t.daysEarlyLate === 0);
  const doneMilestones = milestones.filter((m) => m.status === 'done' && m.daysEarlyLate != null);
  const earlyMs = doneMilestones.filter((m) => m.daysEarlyLate > 0);
  const lateMs = doneMilestones.filter((m) => m.daysEarlyLate < 0);

  return (
    <div className="stack">
      <div className="grid g-2">
        {/* Success criteria */}
        <SuccessCriteriaCard project={project} />

        {/* Next milestone + compact list */}
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Upcoming milestones</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onGoto('milestones')}>View all</button>
          </div>
          <MilestoneCompactList project={project} milestones={milestones} />
        </div>
      </div>

      {/* Top tasks + risks */}
      <div className="grid g-2">
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Priority queue</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onGoto('tasks')}>All tasks</button>
          </div>
          {topTasks.length === 0 ? (
            <EmptyState title="Nothing open" icon="check" />
          ) : topTasks.map((t) => (
            <TaskRow key={t.id} task={t} project={project} onOpen={() => onGoto('tasks')} onToggle={actions.toggleTaskDone} />
          ))}
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Open risks</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onGoto('risks')}>All risks</button>
          </div>
          {openRisks.length === 0 ? (
            <EmptyState title="No open risks" icon="check" />
          ) : openRisks.slice(0, 4).map((r) => (
            <div key={r.id} className="risk-row">
              <div className={`risk-sev risk-sev-${Math.ceil((r.severity * r.likelihood) / 5)}`}>{r.severity * r.likelihood}</div>
              <div>
                <div style={{ fontWeight: 500 }}>{r.title}</div>
                <div className="mono" style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 2 }}>{r.mitigation}</div>
              </div>
              <span />
              <Pill tone={r.status === 'monitoring' ? 'info' : 'warn'}>{r.status}</Pill>
              <span />
            </div>
          ))}
        </div>
      </div>

      {/* Completion timing */}
      {timedTasks.length > 0 && (
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Completion timing</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{timedTasks.length} tracked · {doneMilestones.length} milestones</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--line)' }}>
            {[
              { label: 'Early', count: earlyTasks.length, ms: earlyMs.length, tone: 'var(--ok)' },
              { label: 'On time', count: onTimeTasks.length, ms: 0, tone: 'var(--fg-3)' },
              { label: 'Late', count: lateTasks.length, ms: lateMs.length, tone: 'var(--danger)' },
            ].map(({ label, count, ms, tone }) => (
              <div key={label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
                <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: tone }}>{count}<span style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 4 }}>tasks</span></div>
                {ms > 0 && <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{ms} milestone{ms > 1 ? 's' : ''}</div>}
              </div>
            ))}
          </div>
          {lateTasks.length > 0 && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)' }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', textTransform: 'uppercase', marginBottom: 6 }}>Late completions</div>
              {lateTasks.slice(0, 5).map((t) => (
                <div key={t.id} className="row-flex" style={{ fontSize: 12, gap: 8, marginBottom: 4 }}>
                  <span style={{ color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 11, flexShrink: 0 }}>{Math.abs(t.daysEarlyLate)}d late</span>
                  <span className="truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recent notes */}
      {recentNotes.length > 0 && (
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Recent notes</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onGoto('notes')}>All notes</button>
          </div>
          {recentNotes.map((n) => <NoteRow key={n.id} note={n} />)}
        </div>
      )}
    </div>
  );
}

function SuccessCriteriaCard({ project }) {
  const [editingId, setEditingId] = React.useState(null);
  const [draft, setDraft] = React.useState({});

  const startEdit = (sc) => { setEditingId(sc.id); setDraft({ text: sc.text, current: sc.current, target: sc.target }); };
  const saveEdit = () => {
    if (draft.text) actions.updateSuccessCriterion(project.id, editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-head-title">Objective & success criteria</span>
        <button className="btn btn-ghost btn-sm" onClick={() => actions.addSuccessCriterion(project.id, { text: 'New criterion', current: '0', target: '100' })}>
          <Icon name="plus" size={11} /> Add
        </button>
      </div>
      <div className="card-body-flush">
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', color: 'var(--fg-2)', fontSize: 13, lineHeight: 1.5 }}>
          {project.objective}
        </div>
        <div className="sc-row" style={{ color: 'var(--fg-4)', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>
          <span>Criterion</span>
          <span style={{ textAlign: 'right' }}>Current</span>
          <span style={{ textAlign: 'right' }}>Target</span>
          <span />
        </div>
        {(project.successCriteria || []).map((sc) => {
          const pct = (() => {
            const cur = parseFloat(sc.current);
            const tgt = parseFloat(sc.target);
            if (isNaN(cur) || isNaN(tgt) || tgt === 0) return 0;
            return Math.min(100, Math.round((cur / tgt) * 100));
          })();
          if (editingId === sc.id) {
            return (
              <div key={sc.id} style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
                <div className="row-2" style={{ marginBottom: 6 }}>
                  <input className="input" placeholder="Criterion" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} autoFocus />
                  <input className="input" placeholder="Current" value={draft.current} onChange={(e) => setDraft({ ...draft, current: e.target.value })} style={{ width: 80 }} />
                  <input className="input" placeholder="Target" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} style={{ width: 80 }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => { actions.deleteSuccessCriterion(project.id, sc.id); setEditingId(null); }}>Delete</button>
                  <button className="btn btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn btn-primary btn-sm" onClick={saveEdit}>Save</button>
                </div>
              </div>
            );
          }
          return (
            <div className="sc-row sc-row-editable" key={sc.id} onClick={() => startEdit(sc)} title="Click to edit">
              <div className="sc-row-label">{sc.text}</div>
              <div className="sc-row-val">{sc.current}</div>
              <div className="sc-row-val" style={{ color: 'var(--fg-4)' }}>{sc.target}</div>
              <Progress value={pct} tone={pct >= 80 ? 'ok' : pct >= 40 ? 'warn' : 'danger'} />
            </div>
          );
        })}
        {(!project.successCriteria || project.successCriteria.length === 0) && (
          <div style={{ padding: '14px', color: 'var(--fg-4)', fontSize: 12, textAlign: 'center' }}>No criteria yet — click Add to define success.</div>
        )}
      </div>
    </div>
  );
}

function MilestoneCompactList({ project, milestones }) {
  if (!milestones.length) {
    return <EmptyState title="No milestones" icon="flag" />;
  }
  const todayT = today0().getTime();
  const sorted = [...milestones].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  // Show next 4 upcoming (or latest if none upcoming).
  const upcoming = sorted.filter((m) => parseDate(m.date).getTime() >= todayT - DAY);
  const list = (upcoming.length ? upcoming : sorted.slice(-4)).slice(0, 5);

  return (
    <div className="ms-compact">
      {list.map((m) => {
        const t = parseDate(m.date).getTime();
        const days = Math.round((t - todayT) / DAY);
        const rel = m.status === 'done' ? 'done'
          : days < 0 ? `${-days}d overdue`
          : days === 0 ? 'today'
          : days === 1 ? 'tomorrow'
          : `in ${days}d`;
        const toneClass = m.status === 'done' ? 'ms-c-done'
          : days < 0 ? 'ms-c-over'
          : days <= 7 ? 'ms-c-soon'
          : 'ms-c-far';
        return (
          <div key={m.id} className={`ms-compact-row ${toneClass}`}>
            <div className={`tl-ms tl-ms-${m.status}`} style={{ position: 'static', transform: 'none' }} />
            <div style={{ minWidth: 0 }}>
              <div className="ms-compact-title" title={m.title}>{m.title}</div>
              {m.deliverable && <div className="ms-compact-sub">{m.deliverable}</div>}
            </div>
            <div className="ms-compact-date">
              <div className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{fmtDate(m.date)}</div>
              <div className="ms-compact-rel">{rel}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MilestoneTimeline({ project, milestones }) {
  if (!milestones.length) {
    return <EmptyState title="No milestones" icon="flag" />;
  }
  const start = parseDate(project.startDate).getTime();
  const end = parseDate(project.dueDate).getTime();
  const span = Math.max(end - start, DAY);
  const todayT = today0().getTime();
  const todayPct = Math.max(0, Math.min(100, ((todayT - start) / span) * 100));

  // Sort by date; alternate above/below by default; bump to outer lane on collision.
  const sorted = [...milestones].sort((a, b) => parseDate(a.date) - parseDate(b.date));
  const COLLIDE_PCT = 18; // callouts closer than this % clash
  const placed = sorted.map((m, i) => {
    const t = parseDate(m.date).getTime();
    const pct = Math.max(0, Math.min(100, ((t - start) / span) * 100));
    return { ms: m, pct, side: i % 2 === 0 ? 'below' : 'above', lane: 0, i };
  });
  const lanesPerSide = { above: [], below: [] };
  placed.forEach((p) => {
    const lanes = lanesPerSide[p.side];
    let lane = 0;
    while (lane < 6) {
      const occ = lanes[lane] || [];
      if (!occ.some((q) => Math.abs(q - p.pct) < COLLIDE_PCT)) break;
      lane++;
    }
    p.lane = lane;
    if (!lanes[lane]) lanes[lane] = [];
    lanes[lane].push(p.pct);
  });

  const maxLaneAbove = placed.some((p) => p.side === 'above')
    ? Math.max(...placed.filter((p) => p.side === 'above').map((p) => p.lane)) + 1 : 0;
  const maxLaneBelow = placed.some((p) => p.side === 'below')
    ? Math.max(...placed.filter((p) => p.side === 'below').map((p) => p.lane)) + 1 : 0;
  const LANE_H = 32;
  const aboveH = maxLaneAbove * LANE_H + 10;
  const belowH = maxLaneBelow * LANE_H + 10;
  const trackHeight = aboveH + belowH + 12;

  return (
    <div className="timeline">
      <div className="timeline-track" style={{ height: trackHeight, paddingTop: aboveH, paddingBottom: belowH }}>
        <div className="timeline-today" style={{ left: `${todayPct}%` }} />
        {placed.map((p) => {
          const { ms: m, pct, side, lane } = p;
          const offset = 12 + lane * LANE_H;
          // Near edges, shift the callout's transform anchor so it doesn't clip
          const anchor = pct < 8 ? 'flex-start' : pct > 92 ? 'flex-end' : 'center';
          const translateX = pct < 8 ? '0%' : pct > 92 ? '-100%' : '-50%';
          const calloutStyle = side === 'above'
            ? { bottom: `calc(50% + ${offset}px)`, transform: `translateX(${translateX})`, alignItems: anchor, textAlign: anchor === 'flex-start' ? 'left' : anchor === 'flex-end' ? 'right' : 'center' }
            : { top: `calc(50% + ${offset}px)`, transform: `translateX(${translateX})`, alignItems: anchor, textAlign: anchor === 'flex-start' ? 'left' : anchor === 'flex-end' ? 'right' : 'center' };
          return (
            <div key={m.id} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0 }}>
              <div className={`tl-ms tl-ms-${m.status}`} />
              <div className={`tl-ms-stem tl-ms-stem-${side}`} style={{ height: offset - 6 }} />
              <div className={`tl-ms-callout tl-ms-callout-${side}`} style={calloutStyle}>
                <div className="tl-ms-date">{fmtDate(m.date)}</div>
                <div className="tl-ms-label" title={m.title}>{m.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MilestoneRow({ milestone: m }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: m.title, date: m.date, deliverable: m.deliverable || '' });

  if (editing) {
    return (
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
        <div className="row-2" style={{ marginBottom: 8 }}>
          <input className="input" placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
          <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </div>
        <input className="input" placeholder="Deliverable" value={draft.deliverable} onChange={(e) => setDraft({ ...draft, deliverable: e.target.value })} style={{ marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-danger-ghost btn-sm" onClick={() => { if (confirm('Delete milestone?')) actions.deleteMilestone(m.id); }}>Delete</button>
          <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { actions.updateMilestone(m.id, draft); setEditing(false); }}>Save</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ms-row ms-row-hoverable" onClick={() => setEditing(true)}>
      <span className={`ms-row-bullet tl-ms-${m.status}`} />
      <div>
        <div style={{ fontWeight: 500 }}>{m.title}</div>
        {m.deliverable && <div className="mono" style={{ color: 'var(--fg-4)', fontSize: 11, marginTop: 2 }}>{m.deliverable}</div>}
      </div>
      <DueChip date={m.date} />
      <select className="select" style={{ padding: '3px 6px', fontSize: 11 }} value={m.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => actions.updateMilestone(m.id, { status: e.target.value })}>
        <option value="planned">Planned</option>
        <option value="in-progress">In progress</option>
        <option value="blocked">Blocked</option>
        <option value="done">Done</option>
      </select>
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditing(true); }}><Icon name="edit" size={12} /></button>
    </div>
  );
}

function MilestonesTab({ project, milestones }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', date: '', deliverable: '' });

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-head-title">Milestones</span>
        <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> New</button>
      </div>
      <MilestoneTimeline project={project} milestones={milestones} />
      {adding && (
        <div style={{ padding: 12, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <div className="row-2" style={{ marginBottom: 8 }}>
            <input className="input" placeholder="Milestone title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <input className="input" placeholder="Deliverable" value={draft.deliverable} onChange={(e) => setDraft({ ...draft, deliverable: e.target.value })} />
          <div className="modal-foot">
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              if (!draft.title || !draft.date) return;
              actions.addMilestone({ ...draft, projectId: project.id });
              setDraft({ title: '', date: '', deliverable: '' });
              setAdding(false);
            }}>Add</button>
          </div>
        </div>
      )}
      <div>
        {milestones.map((m) => <MilestoneRow key={m.id} milestone={m} />)}
      </div>
    </div>
  );
}

function NoteRow({ note }) {
  const kindTone = { decision: 'accent', question: 'warn', artifact: 'info', note: 'neutral' }[note.kind] || 'neutral';
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ kind: note.kind, title: note.title, body: note.body || '', tags: (note.tags || []).join(', ') });

  React.useEffect(() => {
    if (!editing) setDraft({ kind: note.kind, title: note.title, body: note.body || '', tags: (note.tags || []).join(', ') });
  }, [note.id, note.title, note.body, editing]);

  if (editing) {
    return (
      <div className="note-card note-card-editing">
        <div className="field">
          <span className="field-label">Kind</span>
          <div className="seg">
            {['note', 'decision', 'question', 'artifact'].map((k) => (
              <button key={k} className={`seg-btn ${draft.kind === k ? 'active' : ''}`} onClick={() => setDraft({ ...draft, kind: k })}>{k}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Title</span>
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
        </div>
        <div className="field">
          <span className="field-label">Body</span>
          <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Tags (comma-separated)</span>
          <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-danger-ghost" onClick={() => {
            if (confirm('Delete this note?')) actions.deleteNote(note.id);
          }}>Delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!draft.title) return;
            actions.updateNote(note.id, {
              kind: draft.kind,
              title: draft.title,
              body: draft.body,
              tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
            });
            setEditing(false);
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-card note-card-hoverable" onClick={() => setEditing(true)}>
      <div className="note-head">
        <Pill tone={kindTone}>{note.kind}</Pill>
        <span className="note-title">{note.title}</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{fmtDate(note.date)}</span>
        <Icon name="edit" size={11} className="note-edit-icon" />
      </div>
      {note.body && <div className="note-body">{note.body}</div>}
      {note.tags?.length > 0 && (
        <div className="note-tags">
          {note.tags.map((t) => <span key={t} className="tag">#{t}</span>)}
        </div>
      )}
    </div>
  );
}

function NotesTab({ project, notes }) {
  const [kind, setKind] = React.useState('all');
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ kind: 'note', title: '', body: '', tags: '' });

  const filtered = kind === 'all' ? notes : notes.filter((n) => n.kind === kind);

  return (
    <div className="card">
      <div className="card-head">
        <div className="seg" style={{ width: 'auto' }}>
          {['all', 'note', 'decision', 'question', 'artifact'].map((k) => (
            <button key={k} className={`seg-btn ${kind === k ? 'active' : ''}`} onClick={() => setKind(k)}>
              {k} {k !== 'all' && <span style={{ color: 'var(--fg-4)', marginLeft: 4 }}>{notes.filter((n) => n.kind === k).length}</span>}
            </button>
          ))}
        </div>
        <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> New note</button>
      </div>
      {adding && (
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <div className="field">
            <span className="field-label">Kind</span>
            <div className="seg">
              {['note', 'decision', 'question', 'artifact'].map((k) => (
                <button key={k} className={`seg-btn ${draft.kind === k ? 'active' : ''}`} onClick={() => setDraft({ ...draft, kind: k })}>{k}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Title</span>
            <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Body</span>
            <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Tags (comma-separated)</span>
            <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              if (!draft.title) return;
              actions.addNote({
                projectId: project.id,
                kind: draft.kind,
                title: draft.title,
                body: draft.body,
                tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
              });
              setDraft({ kind: 'note', title: '', body: '', tags: '' });
              setAdding(false);
            }}>Add</button>
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <EmptyState title="No notes" body="Capture general notes, decisions, open questions, and artifact links as you go." icon="note" />
      ) : filtered.map((n) => <NoteRow key={n.id} note={n} />)}
    </div>
  );
}

function RiskRow({ risk: r }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: r.title, severity: r.severity, likelihood: r.likelihood, mitigation: r.mitigation || '' });

  if (editing) {
    return (
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
        <div className="field">
          <span className="field-label">Title</span>
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
        </div>
        <div className="row-2">
          <div className="field">
            <span className="field-label">Severity ({draft.severity})</span>
            <input type="range" min="1" max="5" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: +e.target.value })} />
          </div>
          <div className="field">
            <span className="field-label">Likelihood ({draft.likelihood})</span>
            <input type="range" min="1" max="5" value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: +e.target.value })} />
          </div>
        </div>
        <div className="field">
          <span className="field-label">Mitigation</span>
          <textarea className="textarea" value={draft.mitigation} onChange={(e) => setDraft({ ...draft, mitigation: e.target.value })} />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-danger-ghost btn-sm" onClick={() => { if (confirm('Delete risk?')) actions.deleteRisk(r.id); }}>Delete</button>
          <button className="btn btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => { actions.updateRisk(r.id, draft); setEditing(false); }}>Save</button>
        </div>
      </div>
    );
  }
  return (
    <div className="risk-row risk-row-hoverable" onClick={() => setEditing(true)}>
      <div className={`risk-sev risk-sev-${Math.ceil((r.severity * r.likelihood) / 5)}`}>{r.severity * r.likelihood}</div>
      <div>
        <div style={{ fontWeight: 500 }}>{r.title}</div>
        {r.mitigation && <div className="mono" style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>{r.mitigation}</div>}
      </div>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>S{r.severity}·L{r.likelihood}</span>
      <select className="select" style={{ padding: '3px 6px', fontSize: 11 }} value={r.status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => actions.updateRisk(r.id, { status: e.target.value })}>
        <option value="open">Open</option>
        <option value="monitoring">Monitoring</option>
        <option value="closed">Closed</option>
      </select>
      <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setEditing(true); }}><Icon name="edit" size={12} /></button>
    </div>
  );
}

function RisksTab({ project, risks }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: '', severity: 3, likelihood: 3, mitigation: '' });

  const open = risks.filter((r) => r.status !== 'closed').sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood);

  return (
    <div className="grid g-2">
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Register</span>
          <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> New risk</button>
        </div>
        {adding && (
          <div style={{ padding: 14, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
            <div className="field">
              <span className="field-label">Title</span>
              <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="row-2">
              <div className="field">
                <span className="field-label">Severity ({draft.severity})</span>
                <input type="range" min="1" max="5" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: +e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">Likelihood ({draft.likelihood})</span>
                <input type="range" min="1" max="5" value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: +e.target.value })} />
              </div>
            </div>
            <div className="field">
              <span className="field-label">Mitigation</span>
              <textarea className="textarea" value={draft.mitigation} onChange={(e) => setDraft({ ...draft, mitigation: e.target.value })} />
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                if (!draft.title) return;
                actions.addRisk({ ...draft, projectId: project.id });
                setDraft({ title: '', severity: 3, likelihood: 3, mitigation: '' });
                setAdding(false);
              }}>Add</button>
            </div>
          </div>
        )}
        {open.length === 0 ? <EmptyState title="No open risks" icon="check" /> : open.map((r) => <RiskRow key={r.id} risk={r} />)}
      </div>
      <div className="card">
        <div className="card-head">
          <span className="card-head-title">Heatmap</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{open.length} open</span>
        </div>
        <div style={{ padding: 18 }}>
          <RiskMatrix risks={open} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProjectView });
