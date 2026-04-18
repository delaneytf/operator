// Task row, task lists, quick-add — shared across Today and Project views.

const { useState: useStateT, useRef: useRefT } = React;

function TaskRow({ task, project, onOpen, onToggle, showProject = false, dragProps = {}, dropState }) {
  const overdue = task._due !== undefined ? task._due < 0 : daysFromToday(task.dueDate) < 0;
  const blockerCount = (task.blockers || []).length;
  const state = window.getState ? window.getState() : null;
  const openDeps = state && task.dependsOn ? task.dependsOn.map((id) => state.tasks.find((t) => t.id === id)).filter((t) => t && t.status !== 'done') : [];
  const [completing, setCompleting] = React.useState(false);

  const handleCheck = (e) => {
    e.stopPropagation();
    if (task.status === 'done') { onToggle(task.id); return; } // un-complete immediately
    setCompleting(true);
  };

  return (
    <>
    <div
      className={`trow ${task.status === 'done' ? 'done' : ''} ${dropState || ''}`}
      onClick={() => onOpen(task.id)}
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
      <DueChip date={task.dueDate} small />
      <span className="trow-right">
        <StatusDot status={task.status} />
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
          {task.estimate}h
        </span>
      </span>
      <span />
    </div>
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
function TaskGroupedList({ tasks, projects, onOpen, onToggle, onReorder, showProject }) {
  const byPrio = { critical: [], high: [], medium: [], low: [] };
  tasks.forEach((t) => {
    (byPrio[t.priority] || byPrio.medium).push(t);
  });
  Object.keys(byPrio).forEach((k) => byPrio[k].sort((a, b) => (a.rank || 99) - (b.rank || 99)));

  const [drag, setDrag] = useStateT({ id: null, over: null });

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

// Task detail modal
function TaskModal({ taskId, state, onClose }) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const project = state.projects.find((p) => p.id === task.projectId);
  const successCriteria = project?.successCriteria || [];
  const blockers = state.blockers.filter((b) => (task.blockers || []).includes(b.id));

  const [local, setLocal] = useStateT(task);
  React.useEffect(() => { setLocal(task); }, [task.id]);
  const save = (patch) => {
    setLocal((l) => ({ ...l, ...patch }));
    actions.updateTask(task.id, patch);
  };

  const [newBlocker, setNewBlocker] = useStateT('');
  const [newBlockerJira, setNewBlockerJira] = useStateT('');
  const [completingFromModal, setCompletingFromModal] = useStateT(false);

  return (
    <Modal open={true} onClose={onClose} title={<span className="row-flex"><ProjectChip project={project} /> <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{task.id.toUpperCase()}</span></span>} wide>
      {completingFromModal && (
        <CompletionNoteModal
          task={task}
          onConfirm={(note) => { actions.toggleTaskDone(task.id, note); setCompletingFromModal(false); }}
          onCancel={() => setCompletingFromModal(false)}
        />
      )}
      <input
        className="input"
        style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}
        value={local.title}
        onChange={(e) => save({ title: e.target.value })}
      />
      <div className="row-2">
        <div className="field">
          <span className="field-label">Project</span>
          <select className="select" value={local.projectId || ''} onChange={(e) => save({ projectId: e.target.value })}>
            {state.projects.filter((p) => p.status !== 'done').map((p) => (
              <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field-label">Status</span>
          <select className="select" value={local.status} onChange={(e) => {
            if (e.target.value === 'done' && local.status !== 'done') {
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

      {task.status === 'done' && (
        <>
          <div className="hr" />
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className="field-label" style={{ marginBottom: 0 }}>Completion note</span>
              {task.daysEarlyLate != null && (
                <span className="mono" style={{ fontSize: 10.5, color: task.daysEarlyLate > 0 ? 'var(--ok)' : task.daysEarlyLate < 0 ? 'var(--danger)' : 'var(--fg-4)' }}>
                  {task.daysEarlyLate > 0 ? `${task.daysEarlyLate}d early` : task.daysEarlyLate < 0 ? `${Math.abs(task.daysEarlyLate)}d late` : 'on time'}
                </span>
              )}
              {task.completedAt && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>completed {fmtDate(task.completedAt)}</span>}
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
      <div className="field-label" style={{ marginBottom: 8 }}>Depends on</div>
      <TaskDependencyEditor task={local} state={state} onChange={(ids) => actions.setTaskDependency(task.id, ids)} />

      <div className="hr" />
      <div className="field-label" style={{ marginBottom: 8 }}>Blockers</div>
      {blockers.length === 0 ? (
        <div style={{ color: 'var(--fg-4)', fontSize: 12, marginBottom: 10 }}>No blockers.</div>
      ) : (
        <div className="stack-sm" style={{ marginBottom: 10 }}>
          {blockers.map((b) => (
            <div key={b.id} className="row-flex-sb" style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--bg)' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{b.description}</div>
                <div style={{ color: 'var(--fg-4)', fontSize: 11, marginTop: 2 }} className="mono">
                  waiting on {b.waitingOn} · since {fmtDate(b.since)}
                  {b.jiraKey && <span style={{ marginLeft: 8, color: 'var(--accent)' }}>{b.jiraKey}</span>}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => actions.resolveBlocker(b.id)}>Resolve</button>
            </div>
          ))}
        </div>
      )}
      <div className="row-flex" style={{ gap: 6 }}>
        <input className="input" style={{ flex: 1 }} placeholder="Describe blocker…" value={newBlocker} onChange={(e) => setNewBlocker(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') document.getElementById('blocker-jira-input')?.focus(); }} />
        <input id="blocker-jira-input" className="input" style={{ width: 110 }} placeholder="Jira key (opt.)" value={newBlockerJira} onChange={(e) => setNewBlockerJira(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') { if (!newBlocker.trim()) return; actions.addBlocker({ taskId: task.id, description: newBlocker.trim(), waitingOn: '—', jiraKey: newBlockerJira.trim() || null }); setNewBlocker(''); setNewBlockerJira(''); } }} />
        <button className="btn" onClick={() => {
          if (!newBlocker.trim()) return;
          actions.addBlocker({ taskId: task.id, description: newBlocker.trim(), waitingOn: '—', jiraKey: newBlockerJira.trim() || null });
          setNewBlocker(''); setNewBlockerJira('');
        }}>Add</button>
      </div>

      <div className="modal-foot">
        <button className="btn btn-danger" onClick={() => { actions.deleteTask(task.id); onClose(); }}>
          <Icon name="trash" size={12} /> Delete
        </button>
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

Object.assign(window, { TaskRow, TaskGroupedList, QuickAddTask, TaskModal });

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
          Not blocked by any task.
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
          <option value="" disabled>Pick upstream task…</option>
          {candidates.map((t) => (
            <option key={t.id} value={t.id}>{t.priority} · {t.title}</option>
          ))}
        </select>
      ) : (
        <button className="btn btn-sm btn-ghost" onClick={() => setPicking(true)} style={{ marginTop: 6 }}>
          <Icon name="plus" size={10} /> Add dependency
        </button>
      )}
      {deps.some((d) => d.status !== 'done') && (
        <div className="dep-hint">
          <Icon name="warn" size={11} /> Cannot complete until {deps.filter((d) => d.status !== 'done').length} upstream task(s) finish.
        </div>
      )}
    </div>
  );
}

Object.assign(window, { TaskDependencyEditor });
