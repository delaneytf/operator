// Top-level Meetings view — tasks-style layout: metrics, table rows, expandable detail, modal for add/edit.

const MTG_RECURRENCE = { none: 'One-time', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' };

function MeetingsView({ state, onOpenProject, onOpenTask }) {
  const allMeetings = (state.meetings || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const [search, setSearch] = React.useState('');
  const [projectFilter, setProjectFilter] = React.useState(null);
  const [collapsed, setCollapsed] = React.useState({ past: false });
  const [expandedId, setExpandedId] = React.useState(null);
  const [formModalId, setFormModalId] = React.useState(undefined); // undefined=closed, null=new, string=edit
  const [detailModalId, setDetailModalId] = React.useState(null);

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  React.useEffect(() => {
    if (state.meta.activeMeetingId) {
      setDetailModalId(state.meta.activeMeetingId);
      actions.setMeta({ activeMeetingId: null });
    }
  }, [state.meta.activeMeetingId]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const filtered = allMeetings.filter((m) => {
    if (projectFilter && !(m.projectIds || []).includes(projectFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return m.title.toLowerCase().includes(q)
        || (m.attendees || '').toLowerCase().includes(q)
        || (m.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  const upcoming = filtered.filter((m) => m.date >= todayIso);
  const past = filtered.filter((m) => m.date < todayIso);

  // Metrics (all meetings, not filtered)
  const weekAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();
  const metricTotal = allMeetings.length;
  const metricUpcoming = allMeetings.filter((m) => m.date >= todayIso).length;
  const metricThisWeek = allMeetings.filter((m) => m.date >= weekAgoStr && m.date <= todayIso).length;
  const metricRecurring = allMeetings.filter((m) => m.recurrence && m.recurrence !== 'none').length;

  const metrics = [
    { label: 'Total', value: metricTotal, color: 'var(--fg-2)' },
    { label: 'Upcoming', value: metricUpcoming, color: metricUpcoming > 0 ? 'var(--mtg)' : 'var(--fg-4)' },
    { label: 'This week', value: metricThisWeek, color: 'var(--fg-2)' },
    { label: 'Recurring', value: metricRecurring, color: 'var(--fg-3)' },
  ];

  return (
    <>
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <div className="title-h1">Meetings</div>
          <div className="title-sub">Log notes, action items, and decisions from your meetings.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setFormModalId(null)}>
          <Icon name="plus" size={11} /> New meeting
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search meetings…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, width: 200, flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          <button className={`btn btn-sm${!projectFilter ? ' btn-primary' : ''}`} onClick={() => setProjectFilter(null)}>All</button>
          {state.projects.map((p) => (
            <button key={p.id} className={`btn btn-sm${projectFilter === p.id ? ' btn-primary' : ''}`}
              onClick={() => setProjectFilter(projectFilter === p.id ? null : p.id)}>
              {p.code}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {filtered.length === 0 && <div className="empty">No meetings match.</div>}

        {upcoming.length > 0 && (
          <div>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('upcoming')}>
              <Icon name={collapsed['upcoming'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: 'var(--mtg)' }}>Upcoming</span>
              <span className="tgroup-head-count">{upcoming.length}</span>
            </div>
            {!collapsed['upcoming'] && upcoming.map((m) => (
              <MeetingRow key={m.id} meeting={m} projects={state.projects} state={state}
                expanded={expandedId === m.id}
                onToggleExpand={() => toggleExpand(m.id)}
                onEdit={() => setFormModalId(m.id)}
                onOpen={() => setDetailModalId(m.id)}
                onOpenTask={onOpenTask} />
            ))}
          </div>
        )}

        {past.length > 0 && (
          <div>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('past')}>
              <Icon name={collapsed['past'] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: 'var(--fg-3)' }}>Past</span>
              <span className="tgroup-head-count">{past.length}</span>
            </div>
            {!collapsed['past'] && past.map((m) => (
              <MeetingRow key={m.id} meeting={m} projects={state.projects} state={state}
                expanded={expandedId === m.id}
                onToggleExpand={() => toggleExpand(m.id)}
                onEdit={() => setFormModalId(m.id)}
                onOpen={() => setDetailModalId(m.id)}
                onOpenTask={onOpenTask} />
            ))}
          </div>
        )}
      </div>
    </div>

    {formModalId !== undefined && (
      <MtgFormModal
        meetingId={formModalId}
        state={state}
        onClose={() => setFormModalId(undefined)} />
    )}
    {detailModalId && (
      <MtgDetailModal
        meetingId={detailModalId}
        state={state}
        onOpenProject={onOpenProject}
        onOpenTask={onOpenTask}
        onClose={() => setDetailModalId(null)} />
    )}
    </>
  );
}

function MtgInlinePanel({ meeting: m, state, onOpenTask }) {
  const projects = state.projects || [];
  const defaultProjectId = (m.projectIds || [])[0] || '';
  const todayStr = new Date().toISOString().slice(0, 10);
  const recLabel = m.recurrence && m.recurrence !== 'none' ? MTG_RECURRENCE[m.recurrence] : null;

  const [addingTask, setAddingTask] = React.useState(false);
  const [editingTaskId, setEditingTaskId] = React.useState(null);
  const [editTaskDraft, setEditTaskDraft] = React.useState(null);
  const [expandedTaskId, setExpandedTaskId] = React.useState(null);
  const [readOnlyTaskId, setReadOnlyTaskId] = React.useState(null);
  const [addingDecision, setAddingDecision] = React.useState(false);
  const [editingDecId, setEditingDecId] = React.useState(null);
  const [expandedDecId, setExpandedDecId] = React.useState(null);
  const [editDecDraft, setEditDecDraft] = React.useState(null);

  const emptyTask = { title: '', status: 'todo', priority: 'medium', dueDate: null, estimate: 1, objectiveId: '', description: '', source: 'planned', projectId: defaultProjectId, dependsOn: [] };
  const [taskDraft, setTaskDraft] = React.useState(emptyTask);
  const emptyDec = { kind: 'decision', title: '', body: '', context: '', options: '', reversibility: 'reversible', tags: '', projectId: defaultProjectId, date: todayStr };
  const [decDraft, setDecDraft] = React.useState(emptyDec);

  const linkedTasks = (state.tasks || []).filter((t) => t.meetingId === m.id);
  const linkedDecisions = (state.notes || []).filter((n) => n.meetingId === m.id && n.kind === 'decision');

  const startEditTask = (t) => {
    setEditTaskDraft({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate || null, estimate: t.estimate || 1, objectiveId: t.objectiveId || '', description: t.description || '', source: t.source || 'planned', projectId: t.projectId || defaultProjectId, dependsOn: t.dependsOn || [] });
    setEditingTaskId(t.id);
    setAddingTask(false);
  };

  const startEditDec = (n) => {
    setEditDecDraft({ title: n.title, body: n.body || '', context: n.context || '', options: n.options || '', reversibility: n.reversibility || 'reversible', tags: (n.tags || []).join(', '), projectId: n.projectId || defaultProjectId, date: n.date || todayStr });
    setEditingDecId(n.id);
    setAddingDecision(false);
  };

  return (
    <div>
      {m.notes && (
        <div className="pq-section">
          <div className="pq-section-label">Notes</div>
          <div className="pq-section-val">{m.notes}</div>
        </div>
      )}

      {/* Decisions */}
      <div className="pq-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="pq-section-label" style={{ marginBottom: 0 }}>Decisions</div>
          <button className="btn btn-sm" onClick={() => { setAddingDecision(!addingDecision); setEditingDecId(null); }}><Icon name="plus" size={10} /> Add</button>
        </div>
        {addingDecision && (
          <MtgDecisionForm draft={decDraft} setDraft={setDecDraft} projects={projects} autoFocus
            onCancel={() => { setDecDraft(emptyDec); setAddingDecision(false); }}
            onSave={() => {
              actions.addNote({ kind: 'decision', title: decDraft.title, body: decDraft.body, context: decDraft.context, options: decDraft.options, reversibility: decDraft.reversibility, projectId: decDraft.projectId, date: decDraft.date, meetingId: m.id, tags: decDraft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
              setDecDraft(emptyDec); setAddingDecision(false);
            }} />
        )}
        {linkedDecisions.length === 0 && !addingDecision && <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No decisions logged.</div>}
        {linkedDecisions.map((n) => {
          const p = projects.find((pp) => pp.id === n.projectId);
          if (editingDecId === n.id && editDecDraft) {
            return (
              <MtgDecisionForm key={n.id} draft={editDecDraft} setDraft={setEditDecDraft} projects={projects}
                onCancel={() => { setEditingDecId(null); setEditDecDraft(null); }}
                onDelete={() => { if (confirm('Delete decision?')) { actions.deleteNote(n.id); setEditingDecId(null); setEditDecDraft(null); } }}
                onSave={() => {
                  actions.updateNote(n.id, { title: editDecDraft.title, body: editDecDraft.body, context: editDecDraft.context, options: editDecDraft.options, reversibility: editDecDraft.reversibility, projectId: editDecDraft.projectId, date: editDecDraft.date, tags: editDecDraft.tags.split(',').map((s) => s.trim()).filter(Boolean) });
                  setEditingDecId(null); setEditDecDraft(null);
                }} />
            );
          }
          if (expandedDecId === n.id) {
            return (
              <div key={n.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => setExpandedDecId(null)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  {n.reversibility === 'irreversible'
                    ? <span className="pill pill-danger" style={{ fontSize: 9.5, flexShrink: 0 }}>irreversible</span>
                    : <Pill tone="accent" style={{ fontSize: 9.5, flexShrink: 0 }}>decision</Pill>}
                  <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{n.title}</span>
                  {p && <span className="pcard-code" style={{ fontSize: 9.5 }}>{p.code}</span>}
                  <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{fmtDate(n.date)}</span>
                </div>
                {n.body && <div style={{ marginBottom: 8 }}><div className="pq-section-label">Choice</div><div className="pq-section-val">{n.body}</div></div>}
                {n.context && <div style={{ marginBottom: 8 }}><div className="pq-section-label">Context</div><div className="pq-section-val" style={{ color: 'var(--fg-3)' }}>{n.context}</div></div>}
                {n.options && <div style={{ marginBottom: 8 }}><div className="pq-section-label">Options</div><div className="pq-section-val" style={{ color: 'var(--fg-3)' }}>{n.options}</div></div>}
                {(n.tags || []).length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>{n.tags.map((tag) => <span key={tag} className="pill pill-ghost">{tag}</span>)}</div>}
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
                {n.body && <div style={{ fontSize: 12, color: 'var(--fg-3)', marginTop: 2 }} className="truncate">{n.body}</div>}
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

      {/* Tasks */}
      <div className="pq-section" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="pq-section-label" style={{ marginBottom: 0 }}>Tasks</div>
          <button className="btn btn-sm" onClick={() => { setAddingTask(!addingTask); setEditingTaskId(null); }}><Icon name="plus" size={10} /> Add</button>
        </div>
        {addingTask && (
          <MtgTaskForm draft={taskDraft} setDraft={setTaskDraft} projects={projects.filter((p) => p.status !== 'done')} state={state} autoFocus
            onCancel={() => { setTaskDraft(emptyTask); setAddingTask(false); }}
            onSave={(d, pendingBlockers) => {
              const created = actions.addTask({ ...d, meetingId: m.id, dueDate: d.dueDate || null, objectiveId: d.objectiveId || null, description: d.description || null });
              (pendingBlockers || []).forEach((b) => actions.addBlocker({ ...b, taskId: created.id }));
              setTaskDraft(emptyTask); setAddingTask(false);
            }} />
        )}
        {linkedTasks.length === 0 && !addingTask && <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No tasks yet.</div>}
        {linkedTasks.map((t) => {
          const p = projects.find((pp) => pp.id === t.projectId);
          if (editingTaskId === t.id && editTaskDraft) {
            return (
              <MtgTaskForm key={t.id} taskId={t.id} draft={editTaskDraft} setDraft={setEditTaskDraft}
                projects={projects.filter((pp) => pp.status !== 'done')} state={state}
                onCancel={() => { setEditingTaskId(null); setEditTaskDraft(null); }}
                onDelete={() => { if (confirm('Delete task?')) { actions.deleteTask(t.id); setEditingTaskId(null); setEditTaskDraft(null); } }}
                onSave={(d) => {
                  actions.updateTask(t.id, { ...d, dueDate: d.dueDate || null, objectiveId: d.objectiveId || null, description: d.description || null });
                  if (d.dependsOn) actions.setTaskDependency(t.id, d.dependsOn);
                  setEditingTaskId(null); setEditTaskDraft(null);
                }} />
            );
          }
          return (
            <div key={t.id} style={{ marginLeft: -38 }}>
              <TaskRow task={t} project={p}
                onOpen={(id) => { setExpandedTaskId(null); startEditTask(state.tasks.find((x) => x.id === id)); }}
                onToggle={actions.toggleTaskDone}
                showProject={true}
                expanded={expandedTaskId === t.id}
                onToggleExpand={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                onJumpTo={(id) => setReadOnlyTaskId(id)} />
            </div>
          );
        })}
      </div>

      {readOnlyTaskId && (
        <TaskReadOnlyModal taskId={readOnlyTaskId} state={state}
          onClose={() => setReadOnlyTaskId(null)}
          onEdit={(id) => { setReadOnlyTaskId(null); startEditTask(state.tasks.find((x) => x.id === id)); }}
          onJumpTo={(id) => setReadOnlyTaskId(id)} />
      )}
    </div>
  );
}

function MeetingRow({ meeting: m, projects, state, expanded, onToggleExpand, onEdit, onOpen, onOpenTask }) {
  const tagged = (projects || []).filter((p) => (m.projectIds || []).includes(p.id));
  const linkedTasks = (state.tasks || []).filter((t) => t.meetingId === m.id);
  const linkedDecisions = (state.notes || []).filter((n) => n.meetingId === m.id && n.kind === 'decision');
  const recLabel = m.recurrence && m.recurrence !== 'none' ? MTG_RECURRENCE[m.recurrence] : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const isUpcoming = m.date >= todayIso;

  return (
    <React.Fragment>
      <div
        className={`trow${expanded ? ' trow-expanded' : ''}`}
        style={{ gridTemplateColumns: '20px 1fr auto 76px 22px', cursor: 'pointer', padding: '8px 12px' }}
        onClick={onToggleExpand}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="clock" size={11} style={{ color: 'var(--mtg)', flexShrink: 0 }} />
        </div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span className="truncate" style={{ fontWeight: 500, fontSize: 13 }}>{m.title}</span>
            {recLabel && <span className="mono" style={{ fontSize: 9.5, color: 'var(--fg-4)', flexShrink: 0 }}>↻ {recLabel}</span>}
          </div>
          {m.attendees && (
            <span className="truncate mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{m.attendees}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {tagged.map((p) => <span key={p.id} className="pcard-code" style={{ fontSize: 9, padding: '1px 4px' }}>{p.code}</span>)}
        </div>
        <div className="mono" style={{ fontSize: 11, color: isUpcoming ? 'var(--mtg)' : 'var(--fg-3)', display: 'flex', alignItems: 'center' }}>
          {fmtDate(m.date)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={expanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)' }} />
        </div>
      </div>
      {expanded && (
        <div className="pq-detail" onClick={(e) => e.stopPropagation()}>
          <div className="pq-meta-row">
            <div className="pq-meta">
              {m.attendees && (
                <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{m.attendees}</span>
              )}
              {tagged.length > 0 && (
                <>
                  {m.attendees && <span className="pq-meta-sep" />}
                  <span className="pq-meta-item" style={{ gap: 4 }}>
                    {tagged.map((p) => <ProjectChip key={p.id} project={p} />)}
                  </span>
                </>
              )}
              {recLabel && (
                <>
                  <span className="pq-meta-sep" />
                  <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>↻ {recLabel}</span>
                </>
              )}
              <span className="pq-meta-sep" />
              <span className="pq-meta-item mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                {linkedTasks.length} task{linkedTasks.length !== 1 ? 's' : ''} · {linkedDecisions.length} decision{linkedDecisions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Icon name="edit" size={11} /> Edit
              </button>
              <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
                Open full
              </button>
            </div>
          </div>
          <MtgInlinePanel meeting={m} state={state} onOpenTask={onOpenTask} />
          <div className="pq-detail-foot">
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{fmtDate(m.date)}</span>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}

function MtgFormModal({ meetingId, state, defaults, onClose }) {
  const existing = meetingId ? (state.meetings || []).find((m) => m.id === meetingId) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = React.useState(existing
    ? { title: existing.title, date: existing.date, attendees: existing.attendees || '', notes: existing.notes || '', recurrence: existing.recurrence || 'none', projectIds: existing.projectIds || [] }
    : { title: '', date: todayIso, attendees: '', notes: '', recurrence: 'none', projectIds: defaults?.projectIds || [] }
  );

  const handleSave = () => {
    if (!draft.title || !draft.date) return;
    if (existing) {
      actions.updateMeeting(meetingId, draft);
    } else {
      actions.addMeeting(draft);
    }
    onClose();
  };

  const handleDelete = () => {
    if (confirm('Delete this meeting and all its tasks and decisions?')) {
      actions.deleteMeeting(meetingId);
      onClose();
    }
  };

  return (
    <Modal open title={existing ? 'Edit meeting' : 'New meeting'} onClose={onClose}>
      <MtgForm
        draft={draft} setDraft={setDraft} projects={state.projects}
        onSave={handleSave}
        onCancel={onClose}
        onDelete={existing ? handleDelete : undefined}
      />
    </Modal>
  );
}

function MtgDetailModal({ meetingId, state, onOpenProject, onOpenTask, onClose }) {
  const meeting = (state.meetings || []).find((m) => m.id === meetingId);
  if (!meeting) return null;
  return (
    <Modal open title="" onClose={onClose} wide>
      <MtgDetail key={meeting.id} meeting={meeting} state={state} onOpenProject={onOpenProject} onOpenTask={onOpenTask} />
    </Modal>
  );
}

function MtgTaskForm({ draft, setDraft, projects, state, onSave, onCancel, onDelete, autoFocus, taskId }) {
  const isNew = !taskId;
  const project = (projects || []).find((p) => p.id === draft.projectId);
  const successCriteria = project?.successCriteria || [];
  const existingBlockers = isNew ? [] : (state.blockers || []).filter((b) => b.taskId === taskId);

  const [pendingBlockers, setPendingBlockers] = React.useState([]);
  const [newBlocker, setNewBlocker] = React.useState('');
  const [newBlockerWho, setNewBlockerWho] = React.useState('');
  const [newBlockerJira, setNewBlockerJira] = React.useState('');

  const addBlocker = () => {
    if (!newBlocker.trim()) return;
    if (isNew) {
      setPendingBlockers((prev) => [...prev, { description: newBlocker.trim(), waitingOn: newBlockerWho.trim() || '—', jiraKey: newBlockerJira.trim() || null, kind: newBlockerJira.trim() ? 'blocker' : 'waiting' }]);
    } else {
      actions.addBlocker({ taskId, description: newBlocker.trim(), waitingOn: newBlockerWho.trim() || '—', jiraKey: newBlockerJira.trim() || null, kind: newBlockerJira.trim() ? 'blocker' : 'waiting' });
    }
    setNewBlocker(''); setNewBlockerWho(''); setNewBlockerJira('');
  };

  const displayBlockers = isNew ? pendingBlockers : existingBlockers;

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

      <div className="hr" style={{ margin: '12px 0' }} />
      <div className="field-label" style={{ marginBottom: 8 }}>Prerequisites</div>
      <TaskDependencyEditor
        task={{ ...draft, id: taskId || '__new__' }}
        state={state}
        onChange={(ids) => setDraft({ ...draft, dependsOn: ids })}
      />

      <div className="hr" style={{ margin: '12px 0' }} />
      <div className="field-label" style={{ marginBottom: 4 }}>Blockers</div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 10 }}>Dev work (Jira) or people/approvals holding this up</div>
      {displayBlockers.length === 0 ? (
        <div style={{ color: 'var(--fg-4)', fontSize: 12, marginBottom: 10 }}>No blockers.</div>
      ) : (
        <div className="stack-sm" style={{ marginBottom: 10 }}>
          {displayBlockers.map((b, idx) => {
            const isJira = !!b.jiraKey;
            return (
              <div key={isNew ? idx : b.id} className="row-flex-sb" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg)', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1 }}>
                  <span className="pq-list-icon pq-list-icon-warn" style={{ flexShrink: 0, marginTop: 1 }}>
                    <Icon name={isJira ? 'ext' : 'clock'} size={11} />
                  </span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{b.description}</div>
                    <div className="mono" style={{ color: 'var(--fg-4)', fontSize: 11, marginTop: 2 }}>
                      {isJira ? <span style={{ color: 'var(--accent)' }}>{b.jiraKey}</span> : <>waiting on {b.waitingOn}</>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ padding: '2px 7px', borderRadius: 4, fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: isJira ? 'color-mix(in oklch, var(--accent) 14%, transparent)' : 'var(--warn-soft)', color: isJira ? 'var(--accent)' : 'var(--warn)' }}>
                    {isJira ? 'Dev' : 'Person'}
                  </span>
                  {isNew
                    ? <button className="btn btn-sm" onClick={() => setPendingBlockers((prev) => prev.filter((_, i) => i !== idx))}>Remove</button>
                    : <button className="btn btn-sm" onClick={() => actions.resolveBlocker(b.id)}>Resolve</button>
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="row-flex" style={{ gap: 6, flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: 2, minWidth: 160 }} placeholder="What's blocking you?" value={newBlocker} onChange={(e) => setNewBlocker(e.target.value)} />
        <input className="input" style={{ flex: 1, minWidth: 100 }} placeholder="Who / what (person or team)" value={newBlockerWho} onChange={(e) => setNewBlockerWho(e.target.value)} />
        <input className="input" style={{ width: 110 }} placeholder="Jira key (if dev)" value={newBlockerJira} onChange={(e) => setNewBlockerJira(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') addBlocker(); }} />
        <button className="btn" onClick={addBlocker}>Add</button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        {onDelete && <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete</button>}
        <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary btn-sm" disabled={!draft.title} onClick={() => onSave(draft, pendingBlockers)}>Save</button>
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
  const [readOnlyTaskId, setReadOnlyTaskId] = React.useState(null);
  const [addingDecision, setAddingDecision] = React.useState(false);
  const [editingDecId, setEditingDecId] = React.useState(null);
  const [expandedDecId, setExpandedDecId] = React.useState(null);

  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultProjectId = (m.projectIds || [])[0] || '';
  const emptyTask = { title: '', status: 'todo', priority: 'medium', dueDate: null, estimate: 1, objectiveId: '', description: '', source: 'planned', projectId: defaultProjectId, dependsOn: [] };
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
      <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
        <MtgForm
          draft={draft} setDraft={setDraft} projects={projects}
          onSave={() => { actions.updateMeeting(m.id, draft); setEditing(false); }}
          onCancel={() => setEditing(false)}
          onDelete={() => { if (confirm('Delete this meeting?')) { actions.deleteMeeting(m.id); } }}
        />
      </div>
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
    <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
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

      {/* Decisions */}
      <div style={{ marginBottom: 20 }}>
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
              <MtgDecisionForm key={n.id}
                draft={editDecDraft} setDraft={setEditDecDraft} projects={projects}
                onCancel={() => { setEditingDecId(null); setEditDecDraft(null); }}
                onDelete={() => {
                  if (confirm('Delete this decision?')) {
                    actions.deleteNote(n.id);
                    setEditingDecId(null); setEditDecDraft(null);
                  }
                }}
                onSave={() => {
                  actions.updateNote(n.id, {
                    title: editDecDraft.title, body: editDecDraft.body, context: editDecDraft.context,
                    options: editDecDraft.options, reversibility: editDecDraft.reversibility,
                    projectId: editDecDraft.projectId, date: editDecDraft.date,
                    tags: editDecDraft.tags.split(',').map((s) => s.trim()).filter(Boolean),
                  });
                  setEditingDecId(null); setEditDecDraft(null);
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
                {n.body && <div style={{ marginBottom: 8 }}><div className="dec-section-label" style={{ marginBottom: 3 }}>Choice</div><div style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{n.body}</div></div>}
                {n.context && <div style={{ marginBottom: 8 }}><div className="dec-section-label" style={{ marginBottom: 3 }}>Context</div><div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{n.context}</div></div>}
                {n.options && <div style={{ marginBottom: 8 }}><div className="dec-section-label" style={{ marginBottom: 3 }}>Options</div><div style={{ fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5 }}>{n.options}</div></div>}
                {(n.tags || []).length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>{n.tags.map((tag) => <span key={tag} className="pill pill-ghost">{tag}</span>)}</div>}
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

      {/* Tasks */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div className="dec-section-label" style={{ marginBottom: 0 }}>Tasks</div>
          <button className="btn btn-sm" onClick={() => { setAddingTask(!addingTask); setEditingTaskId(null); }}><Icon name="plus" size={10} /> Add</button>
        </div>
        {addingTask && (
          <MtgTaskForm
            draft={taskDraft} setDraft={setTaskDraft} projects={projects.filter((p) => p.status !== 'done')} state={state} autoFocus
            onCancel={() => { setTaskDraft(emptyTask); setAddingTask(false); }}
            onSave={(d, pendingBlockers) => {
              const created = actions.addTask({ ...d, meetingId: m.id, dueDate: d.dueDate || null, objectiveId: d.objectiveId || null, description: d.description || null });
              (pendingBlockers || []).forEach((b) => actions.addBlocker({ ...b, taskId: created.id }));
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
              <MtgTaskForm key={t.id} taskId={t.id}
                draft={editTaskDraft} setDraft={setEditTaskDraft} projects={projects.filter((pp) => pp.status !== 'done')} state={state}
                onCancel={() => { setEditingTaskId(null); setEditTaskDraft(null); }}
                onDelete={() => { if (confirm('Delete task?')) { actions.deleteTask(t.id); setEditingTaskId(null); setEditTaskDraft(null); } }}
                onSave={(d) => {
                  actions.updateTask(t.id, { ...d, dueDate: d.dueDate || null, objectiveId: d.objectiveId || null, description: d.description || null });
                  if (d.dependsOn) actions.setTaskDependency(t.id, d.dependsOn);
                  setEditingTaskId(null); setEditTaskDraft(null);
                }}
              />
            );
          }
          return (
            <TaskRow key={t.id} task={t} project={p}
              onOpen={(id) => { setExpandedTaskId(null); startEditTask(state.tasks.find((x) => x.id === id)); }}
              onToggle={actions.toggleTaskDone}
              showProject={true}
              expanded={expandedTaskId === t.id}
              onToggleExpand={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
              onJumpTo={(id) => setReadOnlyTaskId(id)}
            />
          );
        })}
      </div>
      {readOnlyTaskId && (
        <TaskReadOnlyModal taskId={readOnlyTaskId} state={state}
          onClose={() => setReadOnlyTaskId(null)}
          onEdit={(id) => { setReadOnlyTaskId(null); startEditTask(state.tasks.find((x) => x.id === id)); }}
          onJumpTo={(id) => setReadOnlyTaskId(id)}
        />
      )}
    </div>
  );
}

function MtgForm({ draft, setDraft, projects, onSave, onCancel, onDelete }) {
  const toggleProject = (pid) => {
    const ids = draft.projectIds || [];
    setDraft({ ...draft, projectIds: ids.includes(pid) ? ids.filter((x) => x !== pid) : [...ids, pid] });
  };
  return (
    <div>
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

Object.assign(window, { MeetingsView, MtgInlinePanel, MeetingRow, MtgFormModal, MtgDetailModal });
