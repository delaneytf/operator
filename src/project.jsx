// Project workspace — objective, milestones, tasks, notes, risks.

function ProjectTaskAddForm({ project, onDone }) {
  const successCriteria = project.successCriteria || [];
  const emptyDraft = { title: '', status: 'todo', priority: 'medium', dueDate: '', estimate: '', objectiveId: '', description: '', source: 'planned' };
  const [draft, setDraft] = React.useState(emptyDraft);

  return (
    <div style={{ padding: 14, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
      <input className="input" style={{ marginBottom: 10, fontWeight: 600 }} value={draft.title} autoFocus
        onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Task title" />
      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Status</span>
          <select className="select" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="todo">Todo</option>
            <option value="in-progress">Doing</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Priority</span>
          <select className="select" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Due date</span>
          <input className="input" type="date" value={draft.dueDate || ''} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value || null })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Estimate (hrs)</span>
          <input className="input" type="number" min="0" step="0.5" value={draft.estimate || ''} onChange={(e) => setDraft({ ...draft, estimate: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      {successCriteria.length > 0 && (
        <div className="field">
          <span className="field-label">Linked objective</span>
          <select className="select" value={draft.objectiveId || ''} onChange={(e) => setDraft({ ...draft, objectiveId: e.target.value })}>
            <option value="">— none —</option>
            {successCriteria.map((sc) => <option key={sc.id} value={sc.id}>{sc.text}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <span className="field-label">Description</span>
        <textarea className="textarea" rows={2} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value || null })} placeholder="Context, acceptance criteria, links, or notes…" />
      </div>
      <div className="field">
        <span className="field-label">Source</span>
        <div className="seg">
          {['planned', 'reactive'].map((s) => (
            <button key={s} type="button" className={`seg-btn ${draft.source === s ? 'active' : ''}`} onClick={() => setDraft({ ...draft, source: s })}>{s}</button>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onDone}>Cancel</button>
        <button className="btn btn-primary" disabled={!draft.title} onClick={() => {
          actions.addTask({
            projectId: project.id, title: draft.title, status: draft.status, priority: draft.priority,
            dueDate: draft.dueDate || null, estimate: parseFloat(draft.estimate) || 1,
            objectiveId: draft.objectiveId || null, description: draft.description || null, source: draft.source,
          });
          onDone();
        }}>Add task</button>
      </div>
    </div>
  );
}

function ProjectView({ state, projectId, onOpenTask, onBack }) {
  const project = state.projects.find((p) => p.id === projectId);
  const [tab, setTab] = React.useState('overview');
  const [addingTask, setAddingTask] = React.useState(false);

  if (!project) return <EmptyState title="Project not found" />;

  const tasks = state.tasks.filter((t) => t.projectId === projectId);
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const milestones = state.milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.date.localeCompare(b.date));
  const notes = state.notes.filter((n) => n.projectId === projectId && n.kind !== 'artifact');
  const artifacts = state.notes.filter((n) => n.projectId === projectId && n.kind === 'artifact');
  const risks = state.risks.filter((r) => r.projectId === projectId);
  const meetings = (state.meetings || []).filter((m) => (m.projectIds || []).includes(projectId)).sort((a, b) => b.date.localeCompare(a.date));
  const prog = projectProgress(state, projectId);
  const risk = projectRiskScore(state, projectId);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'target' },
    { id: 'tasks', label: 'Tasks', icon: 'list', count: openTasks.length },
    { id: 'milestones', label: 'Milestones', icon: 'flag', count: milestones.filter((m) => m.status !== 'done').length },
    { id: 'notes', label: 'Notes', icon: 'note', count: notes.length },
    { id: 'artifacts', label: 'Artifacts', icon: 'link', count: artifacts.length },
    { id: 'risks', label: 'Risks', icon: 'warn', count: risks.filter((r) => r.status !== 'closed').length },
    { id: 'meetings', label: 'Meetings', icon: 'clock', count: meetings.length },
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
            <button className="btn btn-sm btn-primary" onClick={() => setAddingTask(true)}><Icon name="plus" size={11} /> New task</button>
          </div>
          {addingTask && <ProjectTaskAddForm project={project} onDone={() => setAddingTask(false)} />}
          {tasks.length === 0 && !addingTask ? (
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
      {tab === 'artifacts' && <ArtifactsTab project={project} artifacts={artifacts} state={state} />}
      {tab === 'risks' && <RisksTab project={project} risks={risks} />}
      {tab === 'meetings' && <MeetingsTab project={project} meetings={meetings} state={state} />}
    </div>
  );
}

function OverviewTab({ project, state, milestones, tasks, onGoto }) {
  const nextMs = milestones.filter((m) => m.status !== 'done')[0];
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const topTasks = [...openTasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.rank || 99) - (b.rank || 99)).slice(0, 5);
  const recentNotes = state.notes.filter((n) => n.projectId === project.id && n.kind !== 'artifact').slice(0, 3);
  const openRisks = state.risks.filter((r) => r.projectId === project.id && r.status !== 'closed').sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingMeetings = (state.meetings || [])
    .filter((m) => (m.projectIds || []).includes(project.id) && m.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

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

      {/* Upcoming meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Upcoming meetings</span>
            <button className="btn btn-ghost btn-sm" onClick={() => onGoto('meetings')}>View all</button>
          </div>
          {upcomingMeetings.map((m) => {
            const recLabel = m.recurrence && m.recurrence !== 'none' ? RECURRENCE_LABELS[m.recurrence] : null;
            const linkedTaskCount = (state.tasks || []).filter((t) => t.meetingId === m.id).length;
            const linkedDecCount = (state.notes || []).filter((n) => n.meetingId === m.id && n.kind === 'decision').length;
            return (
              <div key={m.id} className="ms-compact-row" style={{ cursor: 'default' }}>
                <Icon name="clock" size={12} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }} className="truncate">{m.title}</div>
                  {m.attendees && <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>{m.attendees}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                  <div className="row-flex" style={{ gap: 6 }}>
                    {recLabel && <span className="pill" style={{ fontSize: 9.5, padding: '1px 5px' }}>↻ {recLabel}</span>}
                    <span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{fmtDate(m.date)}</span>
                  </div>
                  {(linkedTaskCount > 0 || linkedDecCount > 0) && (
                    <div className="row-flex" style={{ gap: 6 }}>
                      {linkedTaskCount > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{linkedTaskCount} task{linkedTaskCount > 1 ? 's' : ''}</span>}
                      {linkedDecCount > 0 && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{linkedDecCount} decision{linkedDecCount > 1 ? 's' : ''}</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
  const isQuestion = note.kind === 'question';
  const kindTone = { decision: 'accent', question: note.resolved ? 'ok' : 'warn', note: 'neutral' }[note.kind] || 'neutral';
  const [editing, setEditing] = React.useState(false);
  const [resolving, setResolving] = React.useState(false);
  const [resolutionText, setResolutionText] = React.useState('');
  const noteToDraft = (n) => ({ kind: n.kind, title: n.title, body: n.body || '', context: n.context || '', options: n.options || '', reversibility: n.reversibility || 'reversible', resolution: n.resolution || '', resolved: !!n.resolved, tags: (n.tags || []).join(', ') });
  const [draft, setDraft] = React.useState(() => noteToDraft(note));

  React.useEffect(() => {
    if (!editing) setDraft(noteToDraft(note));
  }, [note.id, note.title, note.body, note.resolved, editing]);

  if (editing) {
    return (
      <div className="note-card note-card-editing">
        <div className="field">
          <span className="field-label">Kind</span>
          <div className="seg">
            {['note', 'decision', 'question'].map((k) => (
              <button key={k} className={`seg-btn ${draft.kind === k ? 'active' : ''}`} onClick={() => setDraft({ ...draft, kind: k })}>{k}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field-label">Title</span>
          <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
        </div>
        {draft.kind === 'decision' && (
          <div className="field">
            <span className="field-label">Reversibility</span>
            <select className="select" value={draft.reversibility} onChange={(e) => setDraft({ ...draft, reversibility: e.target.value })}>
              <option value="reversible">Reversible</option>
              <option value="irreversible">Irreversible</option>
            </select>
          </div>
        )}
        <div className="field">
          <span className="field-label">{draft.kind === 'decision' ? 'Choice / summary' : 'Body'}</span>
          <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
        </div>
        {draft.kind === 'decision' && (
          <>
            <div className="field">
              <span className="field-label">Context — what made this necessary</span>
              <textarea className="input" rows={2} value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} placeholder="What situation forced the decision?" />
            </div>
            <div className="field">
              <span className="field-label">Options considered</span>
              <textarea className="input" rows={2} value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} placeholder="A) … B) … C) …" />
            </div>
          </>
        )}
        {draft.kind === 'question' && (
          <>
            <div className="field">
              <span className="field-label">Resolution</span>
              <textarea className="input" rows={2} value={draft.resolution} onChange={(e) => setDraft({ ...draft, resolution: e.target.value })} placeholder="How was this resolved?" />
            </div>
            <div className="field">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input type="checkbox" checked={draft.resolved} onChange={(e) => setDraft({ ...draft, resolved: e.target.checked })} />
                Mark as resolved
              </label>
            </div>
          </>
        )}
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
              kind: draft.kind, title: draft.title, body: draft.body,
              context: draft.context, options: draft.options, reversibility: draft.reversibility,
              resolution: draft.resolution, resolved: draft.resolved,
              tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
            });
            setEditing(false);
          }}>Save</button>
        </div>
      </div>
    );
  }

  if (resolving) {
    return (
      <div className="note-card note-card-editing" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 10 }}>{note.title}</div>
        <div className="field">
          <span className="field-label">Resolution</span>
          <textarea className="input" rows={3} autoFocus value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} placeholder="How was this resolved?" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-sm" onClick={() => { setResolving(false); setResolutionText(''); }}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={() => {
            actions.updateNote(note.id, { resolved: true, resolution: resolutionText });
            setResolving(false);
            setResolutionText('');
          }}>Mark resolved</button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-card note-card-hoverable" onClick={() => setEditing(true)}>
      <div className="note-head">
        <Pill tone={kindTone}>{isQuestion && note.resolved ? 'resolved' : note.kind}</Pill>
        <span className="note-title">{note.title}</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{fmtDate(note.date)}</span>
        {isQuestion && !note.resolved && (
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 7px', fontSize: 11 }}
            onClick={(e) => { e.stopPropagation(); setResolving(true); }}>
            Resolve
          </button>
        )}
        {isQuestion && note.resolved && (
          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 7px', fontSize: 11 }}
            onClick={(e) => { e.stopPropagation(); actions.updateNote(note.id, { resolved: false, resolution: '' }); }}>
            Re-open
          </button>
        )}
        <Icon name="edit" size={11} className="note-edit-icon" />
      </div>
      {note.body && <div className="note-body">{note.body}</div>}
      {isQuestion && note.resolved && note.resolution && (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-4)', marginRight: 6 }}>Resolution</span>
          {note.resolution}
        </div>
      )}
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
  const emptyDraft = { kind: 'note', title: '', body: '', context: '', options: '', reversibility: 'reversible', tags: '' };
  const [draft, setDraft] = React.useState(emptyDraft);

  const filtered = kind === 'all' ? notes : notes.filter((n) => n.kind === kind);

  return (
    <div className="card">
      <div className="card-head">
        <div className="seg" style={{ width: 'auto' }}>
          {['all', 'note', 'decision', 'question'].map((k) => (
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
              {['note', 'decision', 'question'].map((k) => (
                <button key={k} className={`seg-btn ${draft.kind === k ? 'active' : ''}`} onClick={() => setDraft({ ...draft, kind: k })}>{k}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="field-label">Title</span>
            <input className="input" value={draft.title} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          {draft.kind === 'decision' && (
            <div className="field">
              <span className="field-label">Reversibility</span>
              <select className="select" value={draft.reversibility} onChange={(e) => setDraft({ ...draft, reversibility: e.target.value })}>
                <option value="reversible">Reversible</option>
                <option value="irreversible">Irreversible</option>
              </select>
            </div>
          )}
          <div className="field">
            <span className="field-label">{draft.kind === 'decision' ? 'Choice / summary' : 'Body'}</span>
            <textarea className="textarea" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
          {draft.kind === 'decision' && (
            <>
              <div className="field">
                <span className="field-label">Context — what made this necessary</span>
                <textarea className="input" rows={2} value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} placeholder="What situation forced the decision?" />
              </div>
              <div className="field">
                <span className="field-label">Options considered</span>
                <textarea className="input" rows={2} value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} placeholder="A) … B) … C) …" />
              </div>
            </>
          )}
          <div className="field">
            <span className="field-label">Tags (comma-separated)</span>
            <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => { setDraft(emptyDraft); setAdding(false); }}>Cancel</button>
            <button className="btn btn-primary" onClick={() => {
              if (!draft.title) return;
              actions.addNote({
                projectId: project.id, kind: draft.kind, title: draft.title, body: draft.body,
                context: draft.context, options: draft.options, reversibility: draft.reversibility,
                tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean),
              });
              setDraft(emptyDraft);
              setAdding(false);
            }}>Add</button>
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <EmptyState title="No notes" body="Capture general notes, decisions, and open questions here." icon="note" />
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

function ArtifactRow({ artifact, projects }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({ title: artifact.title, url: artifact.url || '', description: artifact.body || '', artifactType: artifact.artifactType || 'link', tags: (artifact.tags || []).join(', ') });
  React.useEffect(() => { if (!editing) setDraft({ title: artifact.title, url: artifact.url || '', description: artifact.body || '', artifactType: artifact.artifactType || 'link', tags: (artifact.tags || []).join(', ') }); }, [artifact.id, editing]);

  const typeIcon = { link: 'link', confluence: 'ext', file: 'doc' }[draft.artifactType] || 'link';
  const typeLabel = { link: 'Link', confluence: 'Confluence', file: 'File' };

  if (editing) {
    return (
      <div className="note-card note-card-editing">
        <div className="field">
          <span className="field-label">Title</span>
          <input className="input" value={draft.title} autoFocus onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </div>
        {draft.artifactType !== 'confluence' && (
          <div className="field">
            <span className="field-label">URL</span>
            <input className="input" value={draft.url} placeholder="https://…" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          </div>
        )}
        <div className="field">
          <span className="field-label">Description</span>
          <textarea className="textarea" value={draft.description} rows={2} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
        </div>
        <div className="field">
          <span className="field-label">Tags (comma-separated)</span>
          <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-danger-ghost" onClick={() => { if (confirm('Delete artifact?')) actions.deleteNote(artifact.id); }}>Delete</button>
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => {
            if (!draft.title) return;
            actions.updateNote(artifact.id, { title: draft.title, url: draft.url, body: draft.description, artifactType: draft.artifactType, tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
            setEditing(false);
          }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-card note-card-hoverable" onClick={() => setEditing(true)}>
      <div className="note-head">
        <Pill tone="info"><Icon name={typeIcon} size={9} /> {typeLabel[artifact.artifactType] || 'Link'}</Pill>
        {artifact.url
          ? <a href={artifact.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500, color: 'var(--fg)', textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>{artifact.title}</a>
          : <span className="note-title">{artifact.title}</span>}
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>{fmtDate(artifact.date)}</span>
        <Icon name="edit" size={11} className="note-edit-icon" />
      </div>
      {artifact.url && <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artifact.url}</div>}
      {artifact.body && <div className="note-body">{artifact.body}</div>}
      {(artifact.tags || []).length > 0 && <div className="note-tags">{artifact.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}
    </div>
  );
}

function ArtifactsTab({ project, artifacts, state }) {
  const [adding, setAdding] = React.useState(false);
  const [addType, setAddType] = React.useState('link');
  const [pageSearch, setPageSearch] = React.useState('');
  const emptyDraft = { title: '', url: '', description: '', tags: '' };
  const [draft, setDraft] = React.useState(emptyDraft);

  const confluencePages = state.confluencePages || [];
  const filteredPages = pageSearch
    ? confluencePages.filter((p) => p.title.toLowerCase().includes(pageSearch.toLowerCase()) || (p.tags || []).some((t) => t.includes(pageSearch.toLowerCase())))
    : confluencePages;

  const handleSaveConfluence = (page) => {
    actions.addNote({ projectId: project.id, kind: 'artifact', artifactType: 'confluence', title: page.title, url: '', confluencePageId: page.id, body: draft.description, tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
    setDraft(emptyDraft);
    setPageSearch('');
    setAdding(false);
  };

  const handleSave = () => {
    if (!draft.title) return;
    actions.addNote({ projectId: project.id, kind: 'artifact', artifactType: addType, title: draft.title, url: draft.url, body: draft.description, tags: draft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
    setDraft(emptyDraft);
    setAdding(false);
  };

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-head-title">Artifacts</span>
        <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> Add</button>
      </div>
      {adding && (
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <div className="field">
            <span className="field-label">Type</span>
            <div className="seg">
              {[['link', 'Link'], ['confluence', 'Confluence page'], ['file', 'File']].map(([v, l]) => (
                <button key={v} className={`seg-btn ${addType === v ? 'active' : ''}`} onClick={() => { setAddType(v); setDraft(emptyDraft); setPageSearch(''); }}>{l}</button>
              ))}
            </div>
          </div>
          {addType === 'confluence' ? (
            <>
              <div className="field">
                <span className="field-label">Search Confluence pages</span>
                <input className="input" autoFocus placeholder="Filter by title or tag…" value={pageSearch} onChange={(e) => setPageSearch(e.target.value)} />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 8 }}>
                {filteredPages.length === 0 && <div style={{ padding: '12px 14px', color: 'var(--fg-4)', fontSize: 12 }}>No pages found.</div>}
                {filteredPages.map((p) => (
                  <div key={p.id} className="note-card note-card-hoverable" style={{ borderRadius: 0, borderBottom: '1px solid var(--line)' }} onClick={() => handleSaveConfluence(p)}>
                    <div className="note-head">
                      <Icon name="ext" size={11} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                      <span className="note-title">{p.title}</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{fmtDate(p.updated)}</span>
                    </div>
                    {(p.tags || []).length > 0 && <div className="note-tags">{p.tags.map((t) => <span key={t} className="tag">#{t}</span>)}</div>}
                  </div>
                ))}
              </div>
              <div className="field">
                <span className="field-label">Description (optional)</span>
                <textarea className="textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="modal-foot">
                <button className="btn" onClick={() => { setAdding(false); setDraft(emptyDraft); setPageSearch(''); }}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <span className="field-label">Title</span>
                <input className="input" autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">{addType === 'file' ? 'URL or file path' : 'URL'}</span>
                <input className="input" value={draft.url} placeholder="https://…" onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">Description (optional)</span>
                <textarea className="textarea" rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>
              <div className="field">
                <span className="field-label">Tags (comma-separated)</span>
                <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
              </div>
              <div className="modal-foot">
                <button className="btn" onClick={() => { setAdding(false); setDraft(emptyDraft); }}>Cancel</button>
                <button className="btn btn-primary" disabled={!draft.title} onClick={handleSave}>Add</button>
              </div>
            </>
          )}
        </div>
      )}
      {artifacts.length === 0 && !adding
        ? <EmptyState title="No artifacts" body="Link documents, specs, or Confluence pages to this project." icon="link" />
        : artifacts.map((a) => <ArtifactRow key={a.id} artifact={a} />)}
    </div>
  );
}

const RECURRENCE_LABELS = { none: 'One-time', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };

function MeetingForm({ draft, setDraft, onSave, onCancel, onDelete, autoFocus, projects }) {
  const toggleProject = (pid) => {
    const ids = draft.projectIds || [];
    setDraft({ ...draft, projectIds: ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid] });
  };
  return (
    <div style={{ padding: '14px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
      <div className="row-2" style={{ marginBottom: 8 }}>
        <input className="input" placeholder="Meeting title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus={autoFocus} />
        <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={{ width: 160, flexShrink: 0 }} />
      </div>
      <div className="row-2" style={{ marginBottom: 8 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Attendees</span>
          <input className="input" placeholder="e.g. Alice, Bob, Carol" value={draft.attendees} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Recurrence</span>
          <select className="select" value={draft.recurrence || 'none'} onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}>
            {Object.entries(RECURRENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      {projects && projects.length > 0 && (
        <div className="field">
          <span className="field-label">Projects</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {projects.map((p) => {
              const on = (draft.projectIds || []).includes(p.id);
              return (
                <button key={p.id} type="button"
                  className={`btn btn-sm${on ? ' btn-primary' : ''}`}
                  onClick={() => toggleProject(p.id)}>
                  {p.code}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="field">
        <span className="field-label">Notes</span>
        <textarea className="textarea" style={{ minHeight: 120 }} placeholder="Key points, decisions, action items…" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function MeetingRow({ meeting: m, projects, state }) {
  const [editing, setEditing] = React.useState(false);
  const makeDraft = () => ({ title: m.title, date: m.date, attendees: m.attendees || '', notes: m.notes || '', recurrence: m.recurrence || 'none', projectIds: m.projectIds || [] });
  const [draft, setDraft] = React.useState(makeDraft);
  const [expandedItemId, setExpandedItemId] = React.useState(null);
  React.useEffect(() => { if (!editing) setDraft(makeDraft()); }, [m.id, editing]);

  const linkedTasks = state ? (state.tasks || []).filter((t) => t.meetingId === m.id) : [];
  const linkedDecisions = state ? (state.notes || []).filter((n) => n.meetingId === m.id && n.kind === 'decision') : [];

  if (editing) {
    return (
      <MeetingForm draft={draft} setDraft={setDraft} autoFocus projects={projects}
        onSave={() => { actions.updateMeeting(m.id, draft); setEditing(false); }}
        onCancel={() => setEditing(false)}
        onDelete={() => { if (confirm('Delete meeting?')) actions.deleteMeeting(m.id); }}
      />
    );
  }

  const recLabel = m.recurrence && m.recurrence !== 'none' ? RECURRENCE_LABELS[m.recurrence] : null;
  const taggedProjects = (projects || []).filter((p) => (m.projectIds || []).includes(p.id));
  return (
    <div className="note-card">
      <div className="note-head" style={{ cursor: 'pointer' }} onClick={() => setEditing(true)}>
        <Pill tone="info"><Icon name="clock" size={9} /> meeting</Pill>
        <span className="note-title">{m.title}</span>
        {recLabel && <span className="pill" style={{ fontSize: 10, padding: '1px 6px' }}>↻ {recLabel}</span>}
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>{fmtDate(m.date)}</span>
        <Icon name="edit" size={11} className="note-edit-icon" />
      </div>
      {m.attendees && <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>{m.attendees}</div>}
      {taggedProjects.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginTop: 5 }}>
          {taggedProjects.map((p) => <span key={p.id} className="pcard-code" style={{ fontSize: 9.5, padding: '1px 5px' }}>{p.code}</span>)}
        </div>
      )}
      {m.notes && <div className="note-body">{m.notes}</div>}
      {(linkedTasks.length > 0 || linkedDecisions.length > 0) && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {linkedTasks.map((t) => {
            const tp = (projects || []).find((p) => p.id === t.projectId);
            const itemKey = 'task-' + t.id;
            if (expandedItemId === itemKey) {
              return (
                <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <PriorityBadge priority={t.priority} />
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{t.title}</span>
                    {tp && <span className="pcard-code" style={{ fontSize: 9.5 }}>{tp.code}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--fg-3)', marginBottom: t.description ? 6 : 4 }}>
                    <span>Status: <strong>{t.status}</strong></span>
                    {t.dueDate && <span>Due: <strong>{fmtDate(t.dueDate)}</strong></span>}
                    {t.estimate > 0 && <span>Est: <strong>{t.estimate}h</strong></span>}
                  </div>
                  {t.description && <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 6, whiteSpace: 'pre-line' }}>{t.description}</div>}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); if (confirm('Delete task?')) { actions.deleteTask(t.id); setExpandedItemId(null); } }}>Delete</button>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); window.actions.openTask(t.id); }}><Icon name="edit" size={11} /> Edit</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setExpandedItemId(expandedItemId === itemKey ? null : itemKey); }}>
                <PriorityBadge priority={t.priority} />
                <span style={{ flex: 1, minWidth: 0 }} className="truncate">{t.title}</span>
                <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{t.status}</span>
                <Icon name="chevronD" size={9} style={{ color: 'var(--fg-4)' }} />
              </div>
            );
          })}
          {linkedDecisions.map((n) => {
            const itemKey = 'dec-' + n.id;
            if (expandedItemId === itemKey) {
              return (
                <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {n.reversibility === 'irreversible'
                      ? <span className="pill pill-danger" style={{ fontSize: 9.5, flexShrink: 0 }}>irreversible</span>
                      : <span className="pill pill-accent" style={{ fontSize: 9.5, flexShrink: 0 }}>decision</span>}
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{n.title}</span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{fmtDate(n.date)}</span>
                  </div>
                  {n.body && <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 6, whiteSpace: 'pre-line' }}>{n.body}</div>}
                  {n.context && <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 4 }}><em>Context:</em> {n.context}</div>}
                  {n.options && <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.5, marginBottom: 4 }}><em>Options:</em> {n.options}</div>}
                  {(n.tags || []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                      {n.tags.map((tag) => <span key={tag} className="pill pill-ghost">{tag}</span>)}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); if (confirm('Delete decision?')) { actions.deleteNote(n.id); setExpandedItemId(null); } }}>Delete</button>
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); window.actions.setActiveView('decisions'); }}>View in Decisions</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 0', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setExpandedItemId(expandedItemId === itemKey ? null : itemKey); }}>
                <span className="pill pill-accent" style={{ fontSize: 9.5, flexShrink: 0 }}>decision</span>
                <span style={{ flex: 1, minWidth: 0 }} className="truncate">{n.title}</span>
                <Icon name="chevronD" size={9} style={{ color: 'var(--fg-4)' }} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MeetingsTab({ project, meetings, state }) {
  const [adding, setAdding] = React.useState(false);
  const emptyDraft = () => ({ title: '', date: new Date().toISOString().slice(0, 10), attendees: '', notes: '', recurrence: 'none', projectIds: project ? [project.id] : [] });
  const [draft, setDraft] = React.useState(emptyDraft);
  const projects = state ? state.projects : (project ? [project] : []);

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-head-title">Meeting notes</span>
        <button className="btn btn-sm btn-primary" onClick={() => setAdding(true)}><Icon name="plus" size={11} /> New meeting</button>
      </div>
      {adding && (
        <MeetingForm draft={draft} setDraft={setDraft} autoFocus projects={projects}
          onSave={() => {
            if (!draft.title || !draft.date) return;
            actions.addMeeting(draft);
            setDraft(emptyDraft());
            setAdding(false);
          }}
          onCancel={() => { setDraft(emptyDraft()); setAdding(false); }}
        />
      )}
      {meetings.length === 0
        ? <EmptyState title="No meetings yet" body="Log meeting notes, attendees, and action items here." icon="clock" />
        : meetings.map((m) => <MeetingRow key={m.id} meeting={m} projects={projects} state={state} />)
      }
    </div>
  );
}

Object.assign(window, { ProjectView, MeetingForm, MeetingsTab, RECURRENCE_LABELS });
