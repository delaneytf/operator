// Task row, task lists, quick-add — shared across Today and Project views.

const { useState: useStateT, useRef: useRefT } = React;

function TaskRow({ task, project, onOpen, onToggle, showProject = false, dragProps = {}, dropState, expanded, onToggleExpand, onJumpTo }) {
  const overdue = task._due !== undefined ? task._due < 0 : daysFromToday(task.dueDate) < 0;
  const blockerCount = (task.blockers || []).length;
  const state = window.getState ? window.getState() : null;
  const openDeps = state && task.dependsOn ? task.dependsOn.map((id) => state.tasks.find((t) => t.id === id)).filter((t) => t && t.status !== 'done') : [];
  const [completing, setCompleting] = React.useState(false);

  const handleClick = () => onToggleExpand ? onToggleExpand() : onOpen(task.id);
  const handleCheck = (e) => {
    e.stopPropagation();
    if (task.status === 'done') { onToggle(task.id); return; }
    setCompleting(true);
  };

  return (
    <>
    <div
      className={`trow ${task.status === 'done' ? 'done' : ''} ${dropState || ''} ${expanded ? 'pq-row-active' : ''}`}
      onClick={handleClick}
      style={onToggleExpand ? { cursor: 'pointer' } : undefined}
      draggable={!!dragProps.onDragStart}
      {...dragProps}
    >
      <span className="trow-drag"><Icon name="drag" size={12} /></span>
      <button
        className="trow-check"
        onClick={handleCheck}
        aria-label="Toggle done"
      >
        <Icon name="check" size={11} />
      </button>
      <PriorityBadge priority={task.priority} />
      <div className="truncate">
        <span className="trow-title">{task.title}</span>
        {blockerCount > 0 && (
          <span className="pill pill-danger" style={{ marginLeft: 8 }}>
            <Icon name="block" size={10} /> {blockerCount}
          </span>
        )}
        {openDeps.length > 0 && (
          <span className="pill pill-warn" style={{ marginLeft: 8 }} title={openDeps.map((d) => d.title).join('\n')}>
            <Icon name="link" size={10} /> {openDeps.length}
          </span>
        )}
        {task.source === 'reactive' && !task.status === 'done' && (
          <span className="pill pill-warn" style={{ marginLeft: 8 }}>reactive</span>
        )}
      </div>
      {showProject && project ? <ProjectChip project={project} /> : <span />}
      <DueChip date={task.dueDate} small done={task.status === 'done'} />
      <span className="trow-right">
        <StatusDot status={task.status} />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
          {task.estimate}h
        </span>
      </span>
      <span />
    </div>
    {expanded && state && (
      <TaskExpandedDetail task={task} state={state} onEdit={onOpen} onJumpTo={onJumpTo} />
    )}
    {completing && (
      <CompletionNoteModal
        task={task}
        onConfirm={(note) => { onToggle(task.id, note); setCompleting(false); }}
        onCancel={() => setCompleting(false)}
      />
    )}
    </>
  );
}

function CompletionNoteModal({ task, onConfirm, onCancel }) {
  const [note, setNote] = React.useState('');
  const daysEarlyLate = task.dueDate
    ? Math.round((new Date(task.dueDate) - new Date(new Date().toISOString().slice(0, 10))) / 86400000)
    : null;
  const timing = daysEarlyLate == null ? null
    : daysEarlyLate > 0 ? { label: `${daysEarlyLate}d early`, color: 'var(--ok)' }
    : daysEarlyLate < 0 ? { label: `${Math.abs(daysEarlyLate)}d late`, color: 'var(--danger)' }
    : { label: 'on time', color: 'var(--fg-3)' };

  return (
    <Modal open={true} title="Mark complete" onClose={onCancel}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{task.title}</div>
        {timing && (
          <span className="mono" style={{ fontSize: 11, color: timing.color }}>{timing.label}</span>
        )}
      </div>
      <div className="field">
        <span className="field-label">Completion note <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>(optional)</span></span>
        <textarea
          className="textarea"
          style={{ minHeight: 80 }}
          placeholder="What did you accomplish? Any blockers resolved, decisions made, or follow-ups needed?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onConfirm(note); }}
        />
        <div style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 4 }}>⌘↵ to save</div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onConfirm(note)}>Mark complete</button>
      </div>
    </Modal>
  );
}

// Priority-grouped task list with drag-reorder within a priority tier.
function TaskGroupedList({ tasks, projects, onOpen, onToggle, onReorder, showProject, onJumpTo }) {
  const byPrio = { critical: [], high: [], medium: [], low: [] };
  tasks.forEach((t) => {
    (byPrio[t.priority] || byPrio.medium).push(t);
  });
  Object.keys(byPrio).forEach((k) => byPrio[k].sort((a, b) => (a.rank || 99) - (b.rank || 99)));

  const [drag, setDrag] = useStateT({ id: null, over: null });
  const [expandedId, setExpandedId] = useStateT(null);
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const onDragStart = (id) => (e) => {
    setDrag({ id, over: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (id) => (e) => {
    e.preventDefault();
    if (drag.id && drag.id !== id) setDrag((d) => ({ ...d, over: id }));
  };
  const onDrop = (id, group) => (e) => {
    e.preventDefault();
    if (!drag.id || !onReorder) return;
    const g = byPrio[group];
    const srcIdx = g.findIndex((t) => t.id === drag.id);
    const dstIdx = g.findIndex((t) => t.id === id);
    if (srcIdx < 0 || dstIdx < 0) {
      setDrag({ id: null, over: null });
      return;
    }
    const reordered = [...g];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dstIdx, 0, moved);
    onReorder(group, reordered.map((t) => t.id));
    setDrag({ id: null, over: null });
  };
  const onDragEnd = () => setDrag({ id: null, over: null });

  return (
    <>
      {['critical', 'high', 'medium', 'low'].map((p) =>
        byPrio[p].length ? (
          <div key={p}>
            <div className="tgroup-head">
              <span style={{ textTransform: 'capitalize' }}>{p}</span>
              <span className="tgroup-head-count">{byPrio[p].length}</span>
            </div>
            {byPrio[p].map((t) => {
              const isDragging = drag.id === t.id;
              const isDropTarget = drag.over === t.id;
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  project={projects.find((p) => p.id === t.projectId)}
                  onOpen={onOpen}
                  onToggle={onToggle}
                  showProject={showProject}
                  expanded={expandedId === t.id}
                  onToggleExpand={() => toggleExpand(t.id)}
                  onJumpTo={onJumpTo}
                  dragProps={onReorder ? {
                    onDragStart: onDragStart(t.id),
                    onDragOver: onDragOver(t.id),
                    onDrop: onDrop(t.id, p),
                    onDragEnd,
                  } : {}}
                  dropState={isDragging ? 'dragging' : isDropTarget ? 'drop-before' : ''}
                />
              );
            })}
          </div>
        ) : null
      )}
    </>
  );
}

// Quick add — inline form anchored to a project
function QuickAddTask({ projectId, projects, onAdd, onCancel, defaultPriority = 'high' }) {
  const [title, setTitle] = useStateT('');
  const [priority, setPriority] = useStateT(defaultPriority);
  const [due, setDue] = useStateT('');
  const [pid, setPid] = useStateT(projectId || (projects[0] && projects[0].id));
  const inputRef = useRefT(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), priority, projectId: pid, dueDate: due || null });
    setTitle('');
    if (!e?.shiftKey) onCancel?.();
  };

  const activeProjects = projects.filter((p) => p.status !== 'done');
  const showProjectPicker = !projectId && activeProjects.length > 0;

  return (
    <form onSubmit={submit} style={{ padding: 10, display: 'grid', gridTemplateColumns: `1fr 80px${showProjectPicker ? ' 1fr' : ''} 130px auto`, gap: 8, borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
      <input
        ref={inputRef}
        className="input"
        placeholder="New task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') onCancel?.(); }}
      />
      <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
      </select>
      {showProjectPicker && (
        <select className="select" value={pid} onChange={(e) => setPid(e.target.value)}>
          {activeProjects.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>)}
        </select>
      )}
      <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <div className="row-flex">
        <button type="submit" className="btn btn-primary btn-sm">Add</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Esc</button>
      </div>
    </form>
  );
}

// Shared inline expanded detail panel — used in project tasks tab, meetings tab, and priority queue
function TaskExpandedDetail({ task, state, onEdit, onJumpTo }) {
  const project = state.projects.find((p) => p.id === task.projectId);
  const allBlockers = (state.blockers || []).filter((b) => (task.blockers || []).includes(b.id));
  const allDeps = (task.dependsOn || []).map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean);
  const waitingOnThis = state.tasks.filter((t) => (t.dependsOn || []).includes(task.id));
  const objective = project ? (project.successCriteria || []).find((sc) => sc.id === task.objectiveId) : null;
  const statusLabel = { todo: 'Todo', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done' }[task.status] || task.status;
  const dueDiff = task.dueDate && task.status !== 'done' ? daysFromToday(task.dueDate) : null;
  const dueColor = dueDiff === null ? 'var(--fg-3)' : dueDiff < 0 ? 'var(--danger)' : dueDiff === 0 ? 'var(--warn)' : 'var(--fg-3)';

  const DepRow = ({ d }) => {
    const done = d.status === 'done';
    const statusColor = { done: 'var(--ok)', 'in-progress': 'var(--info)', blocked: 'var(--danger)', todo: 'var(--fg-3)' }[d.status] || 'var(--fg-3)';
    const sLabel = { done: 'Done', 'in-progress': 'In progress', blocked: 'Blocked', todo: 'Todo' }[d.status] || d.status;
    const iconClass = done ? 'pq-list-icon-ok' : d.status === 'in-progress' ? 'pq-list-icon-info' : 'pq-list-icon-warn';
    return (
      <div className={`pq-list-item ${onJumpTo ? 'pq-list-item-link' : ''}`} onClick={onJumpTo ? () => onJumpTo(d.id) : undefined}>
        <span className={`pq-list-icon ${iconClass}`}><Icon name="link" size={11} /></span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: done ? 'var(--fg-4)' : 'var(--fg-1)', textDecoration: done ? 'line-through' : 'none' }}>{d.title}</span>
          <PriorityBadge priority={d.priority} />
          <span className="mono" style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{sLabel}</span>
        </div>
        {onJumpTo && <Icon name="chevronR" size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />}
      </div>
    );
  };

  const timingLabel = task.daysEarlyLate == null ? null
    : task.daysEarlyLate > 0 ? `${task.daysEarlyLate}d early`
    : task.daysEarlyLate < 0 ? `${Math.abs(task.daysEarlyLate)}d late`
    : 'on time';
  const timingColor = task.daysEarlyLate == null ? 'var(--fg-4)'
    : task.daysEarlyLate >= 0 ? 'var(--ok)'
    : 'var(--danger)';

  return (
    <div className="pq-detail" onClick={(e) => e.stopPropagation()}>
      <div className="pq-meta-row">
        <div className="pq-meta">
          <span className="pq-meta-item">
            <StatusDot status={task.status} />
            <span>{statusLabel}</span>
          </span>
          {task.estimate > 0 && (
            <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{task.estimate}h est.</span></>
          )}
          {task.createdAt && (
            <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Created {fmtDate(task.createdAt)}</span></>
          )}
          {task.status === 'done' && task.completedAt && (
            <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Completed {fmtDate(task.completedAt)}</span></>
          )}
          {task.dueDate && (
            <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: dueColor }}>Due {fmtDate(task.dueDate)}</span></>
          )}
          {task.status === 'done' && timingLabel && (
            <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: timingColor, fontWeight: 600 }}>{timingLabel}</span></>
          )}
          <span className="pq-meta-sep" />
          <span className="pill pill-ghost" style={{ textTransform: 'capitalize' }}>{task.source || 'planned'}</span>
        </div>
        {onEdit && <button className="btn btn-sm" onClick={() => onEdit(task.id)}><Icon name="edit" size={11} /> Edit</button>}
      </div>

      {!task.description && <div style={{ color: 'var(--fg-4)', fontSize: 12, padding: '4px 0 8px' }}>No description.</div>}
      {task.description && (
        <div className="pq-section">
          <div className="pq-section-label">Description</div>
          <div className="pq-section-val">{task.description}</div>
        </div>
      )}

      {objective && (
        <div className="pq-section">
          <div className="pq-section-label">Objective</div>
          <div className="pq-section-val">{objective.text}
            {objective.target && <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 8 }}>{objective.current} → {objective.target}</span>}
          </div>
        </div>
      )}

      {task.status === 'done' && task.completionNote && (
        <div className="pq-section">
          <div className="pq-section-label">Resolution</div>
          <div className="pq-section-val">{task.completionNote}</div>
        </div>
      )}

      {allBlockers.filter((b) => !!b.jiraKey).length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Dev dependency</div>
          {allBlockers.filter((b) => !!b.jiraKey).map((b) => (
            <div key={b.id} className="pq-list-item">
              <span className="pq-list-icon pq-list-icon-accent"><Icon name="ext" size={11} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{b.description}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}><span style={{ color: 'var(--accent)' }}>{b.jiraKey}</span> · {fmtRelative(b.since)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {allBlockers.filter((b) => !b.jiraKey).length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Waiting on</div>
          {allBlockers.filter((b) => !b.jiraKey).map((b) => (
            <div key={b.id} className="pq-list-item">
              <span className="pq-list-icon pq-list-icon-warn"><Icon name="clock" size={11} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{b.description}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>{b.waitingOn !== '—' ? `${b.waitingOn} · ` : ''}{fmtRelative(b.since)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {allDeps.length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Prerequisites</div>
          {allDeps.map((d) => <DepRow key={d.id} d={d} />)}
        </div>
      )}

      {waitingOnThis.length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Required by</div>
          {waitingOnThis.map((d) => <DepRow key={d.id} d={d} />)}
        </div>
      )}

      <div className="pq-detail-foot">
        Updated {fmtRelative(task.updatedAt)}
      </div>
    </div>
  );
}

// Task detail / create modal
function TaskModal({ taskId, state, onClose, defaults = {} }) {
  const isNew = !taskId;
  const existingTask = isNew ? null : state.tasks.find((t) => t.id === taskId);
  if (!isNew && !existingTask) return null;

  const activeProjects = state.projects.filter((p) => p.status !== 'done');
  const initLocal = isNew
    ? { title: '', projectId: defaults.projectId || activeProjects[0]?.id || '', status: 'todo', priority: defaults.priority || 'medium', dueDate: defaults.dueDate || null, estimate: 0, description: null, source: 'planned', objectiveId: null, dependsOn: [] }
    : existingTask;

  const [local, setLocal] = useStateT(initLocal);
  React.useEffect(() => { if (!isNew && existingTask) setLocal(existingTask); }, [isNew ? null : existingTask?.id]);

  const currentProject = state.projects.find((p) => p.id === local.projectId);
  const successCriteria = currentProject?.successCriteria || [];
  const blockers = isNew ? [] : state.blockers.filter((b) => (existingTask.blockers || []).includes(b.id));

  const [newBlocker, setNewBlocker] = useStateT('');
  const [newBlockerWho, setNewBlockerWho] = useStateT('');
  const [newBlockerJira, setNewBlockerJira] = useStateT('');
  const [pendingBlockers, setPendingBlockers] = useStateT([]);
  const [completingFromModal, setCompletingFromModal] = useStateT(false);

  const save = (patch) => {
    setLocal((l) => ({ ...l, ...patch }));
    if (!isNew) actions.updateTask(existingTask.id, patch);
  };

  const addPendingBlocker = () => {
    if (!newBlocker.trim()) return;
    setPendingBlockers((prev) => [...prev, { description: newBlocker.trim(), waitingOn: newBlockerWho.trim() || '—', jiraKey: newBlockerJira.trim() || null, kind: newBlockerJira.trim() ? 'blocker' : 'waiting' }]);
    setNewBlocker(''); setNewBlockerWho(''); setNewBlockerJira('');
  };

  const handleCreate = () => {
    if (!local.title.trim()) return;
    const payload = { ...local, title: local.title.trim() };
    if (defaults.meetingId) payload.meetingId = defaults.meetingId;
    const created = actions.addTask(payload);
    pendingBlockers.forEach((b) => actions.addBlocker({ ...b, taskId: created.id }));
    onClose();
  };

  const modalTitle = isNew
    ? 'New task'
    : <span className="row-flex"><ProjectChip project={currentProject} /> <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{existingTask.id.toUpperCase()}</span></span>;

  return (
    <Modal open={true} onClose={onClose} title={modalTitle} wide>
      {!isNew && completingFromModal && (
        <CompletionNoteModal
          task={existingTask}
          onConfirm={(note) => { actions.toggleTaskDone(existingTask.id, note); setCompletingFromModal(false); }}
          onCancel={() => setCompletingFromModal(false)}
        />
      )}
      <input
        className="input"
        style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}
        value={local.title}
        autoFocus={isNew}
        placeholder={isNew ? 'Task title…' : undefined}
        onChange={(e) => save({ title: e.target.value })}
        onKeyDown={isNew ? (e) => { if (e.key === 'Enter') handleCreate(); } : undefined}
      />
      <div className="row-2">
        <div className="field">
          <span className="field-label">Project</span>
          <select className="select" value={local.projectId || ''} onChange={(e) => save({ projectId: e.target.value })}>
            {activeProjects.map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Status</span>
          <select className="select" value={local.status} onChange={(e) => {
            if (!isNew && e.target.value === 'done' && local.status !== 'done') {
              setCompletingFromModal(true);
            } else {
              save({ status: e.target.value });
            }
          }}>
            <option value="todo">Todo</option>
            <option value="in-progress">Doing</option>
            <option value="blocked">Blocked</option>
            <option value="done">Done</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">Priority</span>
          <select className="select" value={local.priority} onChange={(e) => save({ priority: e.target.value })}>
            <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
        </div>
        <div className="field">
          <span className="field-label">Due date</span>
          <input className="input" type="date" value={local.dueDate || ''} onChange={(e) => save({ dueDate: e.target.value || null })} />
        </div>
        <div className="field">
          <span className="field-label">Estimate (hrs)</span>
          <input className="input" type="number" min="0" step="0.5" value={local.estimate || ''} onChange={(e) => save({ estimate: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="field">
        <span className="field-label">Linked objective</span>
        <select className="select" value={local.objectiveId || ''} onChange={(e) => save({ objectiveId: e.target.value })}>
          <option value="">— none —</option>
          {successCriteria.map((sc) => <option key={sc.id} value={sc.id}>{sc.text}</option>)}
        </select>
      </div>
      <div className="field">
        <span className="field-label">Description <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>(optional)</span></span>
        <textarea
          className="textarea"
          style={{ minHeight: 80 }}
          placeholder="Add context, acceptance criteria, links, or notes…"
          value={local.description || ''}
          onChange={(e) => save({ description: e.target.value || null })}
        />
      </div>
      <div className="field">
        <span className="field-label">Source</span>
        <div className="seg">
          {['planned', 'reactive'].map((s) => (
            <button key={s} type="button" className={`seg-btn ${local.source === s ? 'active' : ''}`} onClick={() => save({ source: s })}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {!isNew && existingTask.status === 'done' && (
        <>
          <div className="hr" />
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Completion note</span>
              {existingTask.daysEarlyLate != null && (
                <span className="mono" style={{ fontSize: 10.5, color: existingTask.daysEarlyLate > 0 ? 'var(--ok)' : existingTask.daysEarlyLate < 0 ? 'var(--danger)' : 'var(--fg-4)' }}>
                  {existingTask.daysEarlyLate > 0 ? `${existingTask.daysEarlyLate}d early` : existingTask.daysEarlyLate < 0 ? `${Math.abs(existingTask.daysEarlyLate)}d late` : 'on time'}
                </span>
              )}
              {existingTask.completedAt && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>completed {fmtDate(existingTask.completedAt)}</span>}
            </div>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              placeholder="Add a note about what was accomplished…"
              value={local.completionNote || ''}
              onChange={(e) => save({ completionNote: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="hr" />
      <div className="field-label" style={{ marginBottom: 8 }}>Prerequisites</div>
      <TaskDependencyEditor
        task={local}
        state={state}
        onChange={(ids) => isNew ? save({ dependsOn: ids }) : actions.setTaskDependency(existingTask.id, ids)}
      />

      <div className="hr" />
      <div className="field-label" style={{ marginBottom: 4 }}>Blockers</div>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginBottom: 10 }}>Dev work (Jira) or people/approvals holding this up</div>
      {(isNew ? pendingBlockers : blockers).length === 0 ? (
        <div style={{ color: 'var(--fg-4)', fontSize: 12, marginBottom: 10 }}>No blockers.</div>
      ) : (
        <div className="stack-sm" style={{ marginBottom: 10 }}>
          {(isNew ? pendingBlockers : blockers).map((b, idx) => {
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
                      {isJira
                        ? <span style={{ color: 'var(--accent)' }}>{b.jiraKey}</span>
                        : <>waiting on {b.waitingOn}</>
                      }
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
          onKeyDown={(e) => { if (e.key === 'Enter') { if (isNew) addPendingBlocker(); else { if (!newBlocker.trim()) return; actions.addBlocker({ taskId: existingTask.id, description: newBlocker.trim(), waitingOn: newBlockerWho.trim() || '—', jiraKey: newBlockerJira.trim() || null, kind: newBlockerJira.trim() ? 'blocker' : 'waiting' }); setNewBlocker(''); setNewBlockerWho(''); setNewBlockerJira(''); } } }} />
        <button className="btn" onClick={() => {
          if (isNew) { addPendingBlocker(); return; }
          if (!newBlocker.trim()) return;
          actions.addBlocker({ taskId: existingTask.id, description: newBlocker.trim(), waitingOn: newBlockerWho.trim() || '—', jiraKey: newBlockerJira.trim() || null, kind: newBlockerJira.trim() ? 'blocker' : 'waiting' });
          setNewBlocker(''); setNewBlockerWho(''); setNewBlockerJira('');
        }}>Add</button>
      </div>

      <div className="modal-foot">
        {isNew ? (
          <>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={!local.title.trim()}>Create task</button>
          </>
        ) : (
          <>
            <button className="btn btn-danger" onClick={() => { actions.deleteTask(existingTask.id); onClose(); }}>
              <Icon name="trash" size={12} /> Delete
            </button>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </Modal>
  );
}

Object.assign(window, { TaskRow, TaskGroupedList, QuickAddTask, TaskModal, CompletionNoteModal, TaskDependencyEditor, TaskExpandedDetail });

function TaskDependencyEditor({ task, state, onChange }) {
  const deps = (task.dependsOn || []).map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean);
  const candidates = state.tasks.filter((t) =>
    t.id !== task.id &&
    t.status !== 'done' &&
    !(task.dependsOn || []).includes(t.id) &&
    t.projectId === task.projectId
  );
  const [picking, setPicking] = useStateT(false);
  const remove = (id) => onChange((task.dependsOn || []).filter((x) => x !== id));
  const add = (id) => { onChange([...(task.dependsOn || []), id]); setPicking(false); };

  return (
    <div>
      {deps.length === 0 && (
        <div style={{ color: 'var(--fg-4)', fontSize: 12, marginBottom: 8 }}>
          No prerequisites — this task can start immediately.
        </div>
      )}
      {deps.map((d) => (
        <div key={d.id} className="dep-row">
          <span className={`dep-dot ${d.status === 'done' ? 'done' : ''}`} />
          <PriorityBadge priority={d.priority} />
          <span className="truncate" style={{ flex: 1, textDecoration: d.status === 'done' ? 'line-through' : 'none', opacity: d.status === 'done' ? 0.6 : 1 }}>
            {d.title}
          </span>
          <span className="pill pill-ghost">{d.status}</span>
          <button className="icon-btn" onClick={() => remove(d.id)}><Icon name="x" size={10} /></button>
        </div>
      ))}
      {picking ? (
        <select
          className="select" autoFocus
          onBlur={() => setPicking(false)}
          onChange={(e) => e.target.value && add(e.target.value)}
          defaultValue=""
          style={{ marginTop: 6 }}
        >
          <option value="" disabled>Choose a task that must finish first…</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>{t.priority} · {t.title}</option>
          ))}
        </select>
      ) : (
        <button className="btn btn-sm btn-ghost" onClick={() => setPicking(true)} style={{ marginTop: 6 }}>
          <Icon name="plus" size={10} /> Add prerequisite
        </button>
      )}
      {deps.some((d) => d.status !== 'done') && (
        <div className="dep-hint">
          <Icon name="warn" size={11} /> {deps.filter((d) => d.status !== 'done').length} prerequisite(s) must finish before this task can complete.
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TaskDependencyEditor });
