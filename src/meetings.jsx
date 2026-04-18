// Top-level Meetings view — fully self-contained.

const MTG_RECURRENCE = { none: 'One-time', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };

function MeetingsView({ state, onOpenProject, onOpenTask }) {
  const allMeetings = (state.meetings || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const [activeMeetingId, setActiveMeetingId] = React.useState(state.meta.activeMeetingId || allMeetings[0]?.id || null);
  const [adding, setAdding] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [projectFilter, setProjectFilter] = React.useState(null);

  const now = new Date().toISOString().slice(0, 10);
  const emptyDraft = { title: '', date: now, attendees: '', notes: '', recurrence: 'none', projectIds: [] };
  const [draft, setDraft] = React.useState(emptyDraft);

  React.useEffect(() => {
    if (state.meta.activeMeetingId) {
      setActiveMeetingId(state.meta.activeMeetingId);
      setAdding(false);
      actions.setMeta({ activeMeetingId: null });
    }
  }, [state.meta.activeMeetingId]);

  React.useEffect(() => {
    if (!activeMeetingId && allMeetings[0]) setActiveMeetingId(allMeetings[0].id);
  }, [allMeetings.length]);

  const filtered = allMeetings.filter((m) => {
    if (projectFilter && !(m.projectIds || []).includes(projectFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q) || (m.attendees || '').toLowerCase().includes(q) || (m.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  const active = allMeetings.find((m) => m.id === activeMeetingId) || null;

  const upcoming = filtered.filter((m) => m.date >= now);
  const past = filtered.filter((m) => m.date < now);

  const startAdding = () => {
    setDraft({ ...emptyDraft, date: now });
    setAdding(true);
    setActiveMeetingId(null);
  };

  return (
    <div className="content-narrow" style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="row-flex-sb" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="title-h1">Meetings</div>
            <div className="title-sub">Log notes, action items, and decisions from your meetings.</div>
          </div>
          <button className="btn btn-primary" onClick={startAdding}>
            <Icon name="plus" size={11} /> New meeting
          </button>
        </div>
      </div>

      <div className="decisions-split">
        {/* Left: list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <input className="input" placeholder="Search meetings…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm${!projectFilter ? ' btn-primary' : ''}`} onClick={() => setProjectFilter(null)}>All</button>
            {state.projects.map((p) => (
              <button key={p.id} className={`btn btn-sm${projectFilter === p.id ? ' btn-primary' : ''}`}
                onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)}>
                {p.code}
              </button>
            ))}
          </div>
          <div className="decisions-list card" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {adding && (
              <div className="dec-card dec-card-hoverable active">
                <div className="dec-card-hd">
                  <Icon name="plus" size={11} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>New meeting</span>
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <>
                <div className="dec-section-hd">Upcoming</div>
                {upcoming.map((m) => (
                  <MtgListItem key={m.id} meeting={m} isActive={active?.id === m.id} projects={state.projects}
                    onClick={() => { setActiveMeetingId(m.id); setAdding(false); }} />
                ))}
              </>
            )}
            {past.length > 0 && (
              <>
                <div className="dec-section-hd">Past</div>
                {past.map((m) => (
                  <MtgListItem key={m.id} meeting={m} isActive={active?.id === m.id} projects={state.projects}
                    onClick={() => { setActiveMeetingId(m.id); setAdding(false); }} />
                ))}
              </>
            )}
            {filtered.length === 0 && !adding && <EmptyState title="No meetings" />}
          </div>
        </div>

        {/* Right: detail / form */}
        <div className="card" style={{ overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {adding ? (
            <MtgForm
              draft={draft} setDraft={setDraft} projects={state.projects}
              onSave={() => {
                if (!draft.title || !draft.date) return;
                const saved = actions.addMeeting(draft);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : active ? (
            <MtgDetail key={active.id} meeting={active} state={state} onOpenProject={onOpenProject} onOpenTask={onOpenTask} />
          ) : (
            <div style={{ padding: 40, color: 'var(--fg-4)', textAlign: 'center', fontSize: 13 }}>Select a meeting</div>
          )}
        </div>
      </div>
    </div>
  );
}

function MtgListItem({ meeting: m, isActive, projects, onClick }) {
  const tagged = (projects || []).filter((p) => (m.projectIds || []).includes(p.id));
  return (
    <div className={`dec-card dec-card-hoverable${isActive ? ' active' : ''}`} onClick={onClick}>
      <div className="dec-card-hd">
        <Icon name="clock" size={11} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 13, flex: 1, minWidth: 0 }} className="truncate">{m.title}</span>
        {m.recurrence && m.recurrence !== 'none' && <span style={{ fontSize: 9.5, color: 'var(--fg-4)', fontFamily: 'var(--font-mono)' }}>↻</span>}
      </div>
      <div className="dec-card-meta">
        <span className="mono" style={{ fontSize: 10.5 }}>{fmtDate(m.date)}</span>
        {m.attendees && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{m.attendees}</span>}
      </div>
      {tagged.length > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          {tagged.map((p) => <span key={p.id} className="pcard-code" style={{ fontSize: 9, padding: '1px 4px' }}>{p.code}</span>)}
        </div>
      )}
    </div>
  );
}

function MtgTaskForm({ draft, setDraft, projects, state, onSave, onCancel, onDelete, autoFocus }) {
  const project = (projects || []).find((p) => p.id === draft.projectId);
  const successCriteria = project?.successCriteria || [];
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid var(--line)' }}>
      <input className="input" style={{ marginBottom: 10, fontWeight: 600 }} value={draft.title || ''} autoFocus={autoFocus}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Task title" />
      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Project</span>
          <select className="select" value={draft.projectId || ''} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}>
            <option value="">Select project…</option>
            {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Status</span>
          <select className="select" value={draft.status || 'todo'} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="todo">Todo</option>
            <option value="in-progress">Doing</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Priority</span>
          <select className="select" value={draft.priority || 'medium'} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
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
            <button key={s} type="button" className={`seg-btn ${(draft.source || 'planned') === s ? 'active' : ''}`} onClick={() => setDraft({ ...draft, source: s })}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!draft.title} onClick={() => onSave(draft)}>Save</button>
      </div>
    </div>
  );
}

function MtgDecisionForm({ draft, setDraft, projects, onSave, onCancel, onDelete, autoFocus }) {
  return (
    <div style={{ padding: '14px 0', borderTop: '1px solid var(--line)' }}>
      <div className="field">
        <span className="field-label">Title</span>
        <input className="input" value={draft.title} autoFocus={autoFocus} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Decision title" />
      </div>
      <div className="row-2">
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Project</span>
          <select className="select" value={draft.projectId} onChange={(e) => setDraft({ ...draft, projectId: e.target.value })}>
            <option value="">Select project…</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Date</span>
          <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Reversibility</span>
          <select className="select" value={draft.reversibility} onChange={(e) => setDraft({ ...draft, reversibility: e.target.value })}>
            <option value="reversible">Reversible</option>
            <option value="irreversible">Irreversible</option>
          </select>
        </div>
      </div>
      <div className="field">
        <span className="field-label">Choice / summary</span>
        <textarea className="input" rows={2} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="What was decided?" />
      </div>
      <div className="field">
        <span className="field-label">Context — what made this necessary</span>
        <textarea className="input" rows={2} value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} placeholder="What situation forced the decision?" />
      </div>
      <div className="field">
        <span className="field-label">Options considered</span>
        <textarea className="input" rows={2} value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} placeholder="A) … B) … C) …" />
      </div>
      <div className="field">
        <span className="field-label">Tags (comma-separated)</span>
        <input className="input" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!draft.title || !draft.projectId} onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function MtgDetail({ meeting: m, state, onOpenProject, onOpenTask }) {
  const projects = state.projects || [];
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({
    title: m.title, date: m.date, attendees: m.attendees || '',
    notes: m.notes || '', recurrence: m.recurrence || 'none', projectIds: m.projectIds || [],
  });

  const [addingTask, setAddingTask] = React.useState(false);
  const [editingTaskId, setEditingTaskId] = React.useState(null);
  const [editTaskDraft, setEditTaskDraft] = React.useState(null);
  const [expandedTaskId, setExpandedTaskId] = React.useState(null);
  const [addingDecision, setAddingDecision] = React.useState(false);
  const [editingDecId, setEditingDecId] = React.useState(null);
  const [expandedDecId, setExpandedDecId] = React.useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultProjectId = (m.projectIds || [])[0] || '';
  const emptyTask = { title: '', status: 'todo', priority: 'medium', dueDate: null, estimate: 1, objectiveId: '', description: '', source: 'planned', projectId: defaultProjectId };
  const [taskDraft, setTaskDraft] = React.useState(emptyTask);
  const emptyDec = {
    kind: 'decision', title: '', body: '', context: '', options: '',
    reversibility: 'reversible', tags: '', projectId: defaultProjectId, date: todayStr,
  };
  const [decDraft, setDecDraft] = React.useState(emptyDec);
  const [editDecDraft, setEditDecDraft] = React.useState(null);

  const tagged = projects.filter((p) => (m.projectIds || []).includes(p.id));
  const recLabel = m.recurrence && m.recurrence !== 'none' ? MTG_RECURRENCE[m.recurrence] : null;

  const linkedTasks = (state.tasks || []).filter((t) => t.meetingId === m.id);
  const linkedDecisions = (state.notes || []).filter((n) => n.meetingId === m.id && n.kind === 'decision');

  if (editing) {
    return (
      <MtgForm
        draft={draft} setDraft={setDraft} projects={projects}
        onSave={() => { actions.updateMeeting(m.id, draft); setEditing(false); }}
        onCancel={() => setEditing(false)}
        onDelete={() => { if (confirm('Delete this meeting?')) { actions.deleteMeeting(m.id); } }}
      />
    );
  }

  const startEditTask = (t) => {
    setEditTaskDraft({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate || null, estimate: t.estimate || 1, objectiveId: t.objectiveId || '', description: t.description || '', source: t.source || 'planned', projectId: t.projectId || defaultProjectId });
    setEditingTaskId(t.id);
    setAddingTask(false);
  };

  const startEditDec = (n) => {
    setEditDecDraft({
      title: n.title, body: n.body || '', context: n.context || '', options: n.options || '',
      reversibility: n.reversibility || 'reversible', tags: (n.tags || []).join(', '),
      projectId: n.projectId || defaultProjectId, date: n.date || todayStr,
    });
    setEditingDecId(n.id);
    setAddingDecision(false);
  };

  return (
    <div className="dec-detail" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 8 }}>{m.title}</div>
          <div className="row-flex" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{fmtDate(m.date)}</span>
            {recLabel && <Pill tone="info">↻ {recLabel}</Pill>}
            {tagged.map((p) => (
              <button key={p.id} className="pcard-code"
                style={{ fontSize: 10, padding: '2px 6px', cursor: 'pointer', background: 'none', border: '1px solid var(--line)', borderRadius: 4 }}
                onClick={() => onOpenProject && onOpenProject(p.id)}>
                {p.code}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={11} /> Edit</button>
      </div>

      {/* Attendees */}
      {m.attendees && (
        <div style={{ marginBottom: 16 }}>
          <div className="dec-section-label">Attendees</div>
          <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{m.attendees}</div>
        </div>
      )}

      {/* Notes */}
      <div style={{ marginBottom: 20 }}>
        <div className="dec-section-label">Notes</div>
        {m.notes
          ? <div className="dec-body">{m.notes}</div>
          : <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No notes. <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Add</button></div>
        }
      </div>

      {/* Tasks */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="dec-section-label" style={{ marginBottom: 0 }}>Tasks</div>
          <button className="btn btn-sm" onClick={() => { setAddingTask(!addingTask); setEditingTaskId(null); }}><Icon name="plus" size={10} /> Add</button>
        </div>
        {addingTask && (
          <MtgTaskForm
            draft={taskDraft} setDraft={setTaskDraft} projects={projects.filter((p) => p.status !== 'done')} state={state} autoFocus
            onCancel={() => { setTaskDraft(emptyTask); setAddingTask(false); }}
            onSave={(d) => {
              actions.addTask({ ...d, meetingId: m.id, dueDate: d.dueDate || null, objectiveId: d.objectiveId || null, description: d.description || null });
              setTaskDraft(emptyTask);
              setAddingTask(false);
            }}
          />
        )}
        {linkedTasks.length === 0 && !addingTask && <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No tasks yet.</div>}
        {linkedTasks.map((t) => {
          const p = projects.find((pp) => pp.id === t.projectId);
          if (editingTaskId === t.id && editTaskDraft) {
            return (
              <MtgTaskForm
                key={t.id}
                draft={editTaskDraft} setDraft={setEditTaskDraft} projects={projects.filter((pp) => pp.status !== 'done')} state={state}
                onCancel={() => { setEditingTaskId(null); setEditTaskDraft(null); }}
                onDelete={() => { if (confirm('Delete task?')) { actions.deleteTask(t.id); setEditingTaskId(null); setEditTaskDraft(null); } }}
                onSave={(d) => {
                  actions.updateTask(t.id, { ...d, dueDate: d.dueDate || null, objectiveId: d.objectiveId || null, description: d.description || null });
                  setEditingTaskId(null);
                  setEditTaskDraft(null);
                }}
              />
            );
          }
          if (expandedTaskId === t.id) {
            return (
              <div key={t.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                onClick={() => setExpandedTaskId(null)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <PriorityBadge priority={t.priority} />
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{t.title}</span>
                  {p && <span className="pcard-code" style={{ fontSize: 9.5 }}>{p.code}</span>}
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--fg-3)', marginBottom: t.description ? 8 : 6 }}>
                  <span>Status: <strong>{t.status}</strong></span>
                  {t.dueDate && <span>Due: <strong>{fmtDate(t.dueDate)}</strong></span>}
                  {t.estimate > 0 && <span>Est: <strong>{t.estimate}h</strong></span>}
                </div>
                {t.description && <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: 8, whiteSpace: 'pre-line' }}>{t.description}</div>}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); if (confirm('Delete task?')) { actions.deleteTask(t.id); setExpandedTaskId(null); } }}>Delete</button>
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setExpandedTaskId(null); startEditTask(t); }}><Icon name="edit" size={11} /> Edit</button>
                </div>
              </div>
            );
          }
          return (
            <div key={t.id} className="workload-task-row" style={{ cursor: 'pointer', paddingLeft: 0, paddingRight: 0 }}
              onClick={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}>
              <PriorityBadge priority={t.priority} />
              <span style={{ flex: 1, minWidth: 0 }} className="truncate">{t.title}</span>
              {t.dueDate && <DueChip date={t.dueDate} small />}
              {p && <span className="pcard-code" style={{ fontSize: 9.5 }}>{p.code}</span>}
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); if (confirm('Delete task?')) actions.deleteTask(t.id); }}>
                <Icon name="trash" size={10} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Decisions */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="dec-section-label" style={{ marginBottom: 0 }}>Decisions</div>
          <button className="btn btn-sm" onClick={() => { setAddingDecision(!addingDecision); setEditingDecId(null); }}><Icon name="plus" size={10} /> Add</button>
        </div>
        {addingDecision && (
          <MtgDecisionForm
            draft={decDraft} setDraft={setDecDraft} projects={projects} autoFocus
            onCancel={() => { setDecDraft(emptyDec); setAddingDecision(false); }}
            onSave={() => {
              actions.addNote({
                kind: decDraft.kind || 'decision', title: decDraft.title, body: decDraft.body,
                context: decDraft.context, options: decDraft.options, reversibility: decDraft.reversibility,
                projectId: decDraft.projectId, date: decDraft.date, meetingId: m.id,
                tags: decDraft.tags.split(',').map((s) => s.trim()).filter(Boolean),
              });
              setDecDraft(emptyDec);
              setAddingDecision(false);
            }}
          />
        )}
        {linkedDecisions.length === 0 && !addingDecision && <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No decisions logged.</div>}
        {linkedDecisions.map((n) => {
          const p = projects.find((pp) => pp.id === n.projectId);
          if (editingDecId === n.id && editDecDraft) {
            return (
              <MtgDecisionForm
                key={n.id}
                draft={editDecDraft} setDraft={setEditDecDraft} projects={projects}
                onCancel={() => { setEditingDecId(null); setEditDecDraft(null); }}
                onDelete={() => {
                  if (confirm('Delete this decision?')) {
                    actions.deleteNote(n.id);
                    setEditingDecId(null);
                    setEditDecDraft(null);
                  }
                }}
                onSave={() => {
                  actions.updateNote(n.id, {
                    title: editDecDraft.title, body: editDecDraft.body, context: editDecDraft.context,
                    options: editDecDraft.options, reversibility: editDecDraft.reversibility,
                    projectId: editDecDraft.projectId, date: editDecDraft.date,
                    tags: editDecDraft.tags.split(',').map((s) => s.trim()).filter(Boolean),
                  });
                  setEditingDecId(null);
                  setEditDecDraft(null);
                }}
              />
            );
          }
          if (expandedDecId === n.id) {
            return (
              <div key={n.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }}
                onClick={() => setExpandedDecId(null)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {n.reversibility === 'irreversible'
                    ? <span className="pill pill-danger" style={{ fontSize: 9.5, flexShrink: 0 }}>irreversible</span>
                    : <Pill tone="accent" style={{ fontSize: 9.5, flexShrink: 0 }}>decision</Pill>}
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{n.title}</span>
                  {p && <span className="pcard-code" style={{ fontSize: 9.5 }}>{p.code}</span>}
                  <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{fmtDate(n.date)}</span>
                </div>
                {n.body && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="dec-section-label" style={{ marginBottom: 3 }}>Choice</div>
                    <div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{n.body}</div>
                  </div>
                )}
                {n.context && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="dec-section-label" style={{ marginBottom: 3 }}>Context</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{n.context}</div>
                  </div>
                )}
                {n.options && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="dec-section-label" style={{ marginBottom: 3 }}>Options</div>
                    <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{n.options}</div>
                  </div>
                )}
                {(n.tags || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {n.tags.map((tag) => <span key={tag} className="pill pill-ghost">{tag}</span>)}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); if (confirm('Delete decision?')) { actions.deleteNote(n.id); setExpandedDecId(null); } }}>Delete</button>
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); setExpandedDecId(null); startEditDec(n); }}><Icon name="edit" size={11} /> Edit</button>
                </div>
              </div>
            );
          }
          return (
            <div key={n.id} className="workload-task-row" style={{ cursor: 'pointer', alignItems: 'flex-start', padding: '7px 0' }}
              onClick={() => setExpandedDecId(expandedDecId === n.id ? null : n.id)}>
              {n.reversibility === 'irreversible'
                ? <span className="pill pill-danger" style={{ fontSize: 9.5, flexShrink: 0 }}>irreversible</span>
                : <Pill tone="accent" style={{ fontSize: 9.5, flexShrink: 0 }}>decision</Pill>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13 }} className="truncate">{n.title}</div>
                {n.body && <div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5, marginTop: 2 }} className="truncate">{n.body}</div>}
              </div>
              {p && <span className="pcard-code" style={{ fontSize: 9.5, flexShrink: 0 }}>{p.code}</span>}
              <button className="btn btn-ghost btn-sm" style={{ padding: '2px 6px', flexShrink: 0 }}
                onClick={(e) => { e.stopPropagation(); if (confirm('Delete decision?')) actions.deleteNote(n.id); }}>
                <Icon name="trash" size={10} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MtgForm({ draft, setDraft, projects, onSave, onCancel, onDelete }) {
  const toggleProject = (pid) => {
    const ids = draft.projectIds || [];
    setDraft({ ...draft, projectIds: ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid] });
  };
  return (
    <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
      <div className="row-2" style={{ marginBottom: 10 }}>
        <input className="input" placeholder="Meeting title" value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
        <input className="input" type="date" value={draft.date}
          onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={{ width: 160, flexShrink: 0 }} />
      </div>
      <div className="row-2" style={{ marginBottom: 10 }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Attendees</span>
          <input className="input" placeholder="e.g. Alice, Bob" value={draft.attendees}
            onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span className="field-label">Recurrence</span>
          <select className="select" value={draft.recurrence || 'none'}
            onChange={(e) => setDraft({ ...draft, recurrence: e.target.value })}>
            {Object.entries(MTG_RECURRENCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>
      {projects && projects.length > 0 && (
        <div className="field">
          <span className="field-label">Projects</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {projects.map((p) => {
              const on = (draft.projectIds || []).includes(p.id);
              return (
                <button key={p.id} type="button" className={`btn btn-sm${on ? ' btn-primary' : ''}`}
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
        <textarea className="textarea" style={{ minHeight: 140 }}
          placeholder="Key points, decisions, action items…"
          value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

Object.assign(window, { MeetingsView });
