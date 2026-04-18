// Standalone Tasks view — all tasks across projects, two-panel layout.

const TASK_STATUS_LABELS = { todo: 'To do', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done' };
const TASK_PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function TasksView({ state }) {
  const [filterProject, setFilterProject] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [showDone, setShowDone] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState(null);
  const [editing, setEditing] = React.useState(false);

  const filtered = (state.tasks || [])
    .filter((t) => showDone ? true : t.status !== 'done')
    .filter((t) => filterProject === 'all' || t.projectId === filterProject)
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (TASK_PRIORITY_ORDER[a.priority] ?? 2) - (TASK_PRIORITY_ORDER[b.priority] ?? 2));

  const groups = [
    { key: 'in-progress', label: 'In progress' },
    { key: 'todo', label: 'To do' },
    { key: 'blocked', label: 'Blocked' },
    ...(showDone ? [{ key: 'done', label: 'Done' }] : []),
  ].map((g) => ({ ...g, items: filtered.filter((t) => t.status === g.key) }))
   .filter((g) => g.items.length > 0);

  const selected = (state.tasks || []).find((t) => t.id === selectedId);
  const openCount = (state.tasks || []).filter((t) => t.status !== 'done').length;

  const newTask = () => {
    const defaultPid = filterProject !== 'all' ? filterProject : (state.projects.find((p) => p.status !== 'done')?.id || '');
    const t = actions.addTask({ title: 'New task', projectId: defaultPid, status: 'todo', priority: 'medium', dueDate: null, estimate: 1, description: null, source: 'planned' });
    setSelectedId(t.id);
    setEditing(true);
  };

  return (
    <div className="content-narrow decisions-wrap" style={{ maxWidth: 1280 }}>
      <div style={{ marginBottom: 14 }}>
        <div className="row-flex-sb" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="title-h1">Tasks</div>
            <div className="title-sub">{openCount} open across all projects</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn btn-sm${showDone ? ' btn-primary' : ''}`} onClick={() => setShowDone((x) => !x)}>Show done</button>
            <button className="btn btn-primary" onClick={newTask}><Icon name="plus" size={11} /> New task</button>
          </div>
        </div>
      </div>

      <div className="decisions-split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <input className="input" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontSize: 12 }} />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button className={`btn btn-sm${filterProject === 'all' ? ' btn-primary' : ''}`} onClick={() => setFilterProject('all')}>All</button>
            {state.projects.map((p) => (
              <button key={p.id} className={`btn btn-sm${filterProject === p.id ? ' btn-primary' : ''}`}
                onClick={() => setFilterProject(filterProject === p.id ? 'all' : p.id)}>
                {p.code}
              </button>
            ))}
          </div>
          <div className="decisions-list card" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {groups.map((g) => (
              <div key={g.key}>
                <div className="dec-section-hd">{g.label}</div>
                {g.items.map((t) => {
                  const proj = state.projects.find((p) => p.id === t.projectId);
                  return (
                    <div key={t.id} className={`dec-card dec-card-hoverable${selectedId === t.id ? ' active' : ''}`}
                      onClick={() => { setSelectedId(t.id); setEditing(false); }}>
                      <div className="dec-card-hd">
                        <PriorityBadge priority={t.priority} />
                        <ProjectChip project={proj} />
                        <span style={{ flex: 1 }} />
                        {t.dueDate && <DueChip date={t.dueDate} small />}
                      </div>
                      <div className="dec-card-title">{t.title}</div>
                      {t.description && <div className="dec-card-body">{t.description}</div>}
                    </div>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && <div className="empty">No tasks match.</div>}
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {!selected ? (
            <div className="empty-pane">
              <div style={{ fontSize: 13, marginBottom: 6 }}>Select a task to see details.</div>
              <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>All tasks across projects in one place.</div>
            </div>
          ) : (
            <TaskDetailPane key={selected.id} task={selected} state={state} editing={editing} setEditing={setEditing} />
          )}
        </div>
      </div>
    </div>
  );
}

function TaskDetailPane({ task, state, editing, setEditing }) {
  const [local, setLocal] = React.useState(task);
  React.useEffect(() => setLocal(task), [task.id]);

  const save = (patch) => {
    const next = { ...local, ...patch };
    setLocal(next);
    actions.updateTask(task.id, patch);
  };

  const project = state.projects.find((p) => p.id === local.projectId);
  const successCriteria = project?.successCriteria || [];

  if (editing) {
    return (
      <div className="dec-detail" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
        <input className="input" style={{ fontSize: 18, fontWeight: 600, marginBottom: 10 }} value={local.title} autoFocus
          onChange={(e) => save({ title: e.target.value })} />
        <div className="row-2" style={{ marginBottom: 10 }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Project</span>
            <select className="select" value={local.projectId || ''} onChange={(e) => save({ projectId: e.target.value })}>
              {state.projects.filter((p) => p.status !== 'done').map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name.split('—')[1]?.trim() || p.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Status</span>
            <select className="select" value={local.status || 'todo'} onChange={(e) => save({ status: e.target.value })}>
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Priority</span>
            <select className="select" value={local.priority || 'medium'} onChange={(e) => save({ priority: e.target.value })}>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Due date</span>
            <input className="input" type="date" value={local.dueDate || ''} onChange={(e) => save({ dueDate: e.target.value || null })} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <span className="field-label">Estimate (hrs)</span>
            <input className="input" type="number" min="0" step="0.5" value={local.estimate || ''} onChange={(e) => save({ estimate: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        {successCriteria.length > 0 && (
          <div className="field">
            <span className="field-label">Linked objective</span>
            <select className="select" value={local.objectiveId || ''} onChange={(e) => save({ objectiveId: e.target.value })}>
              <option value="">— none —</option>
              {successCriteria.map((sc) => <option key={sc.id} value={sc.id}>{sc.text}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <span className="field-label">Description</span>
          <textarea className="input" rows={3} value={local.description || ''} onChange={(e) => save({ description: e.target.value || null })}
            placeholder="Context, acceptance criteria, links…" />
        </div>
        <div className="field">
          <span className="field-label">Source</span>
          <div className="seg">
            {['planned', 'reactive'].map((s) => (
              <button key={s} type="button" className={`seg-btn${(local.source || 'planned') === s ? ' active' : ''}`}
                onClick={() => save({ source: s })}>{s}</button>
            ))}
          </div>
        </div>
        <div className="row-flex" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn btn-danger btn-sm" onClick={() => { if (confirm('Delete this task?')) actions.deleteTask(task.id); }}>
            <Icon name="trash" size={11} /> Delete
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing(false)}>Done</button>
        </div>
      </div>
    );
  }

  const statusTone = { 'in-progress': 'pill-warn', blocked: 'pill-danger', done: 'pill-ok', todo: '' };

  return (
    <div className="dec-detail" style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
      <div className="row-flex" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <div className="row-flex" style={{ flexWrap: 'wrap', gap: 6 }}>
          <ProjectChip project={project} />
          <PriorityBadge priority={task.priority} />
          <span className={`pill ${statusTone[task.status] || ''}`}>{TASK_STATUS_LABELS[task.status]}</span>
          {task.dueDate && <DueChip date={task.dueDate} />}
        </div>
        <button className="btn btn-sm" onClick={() => setEditing(true)}><Icon name="edit" size={11} /> Edit</button>
      </div>

      <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 12, letterSpacing: '-0.01em' }}>{task.title}</div>

      {task.description && (
        <>
          <div className="dec-section-label">Description</div>
          <div className="dec-body">{task.description}</div>
        </>
      )}

      <div style={{ display: 'flex', gap: 24, marginTop: 16, flexWrap: 'wrap' }}>
        {(task.estimate > 0) && (
          <div>
            <div className="dec-section-label">Estimate</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{task.estimate}h</div>
          </div>
        )}
        {task.source && (
          <div>
            <div className="dec-section-label">Source</div>
            <div style={{ fontSize: 13, color: 'var(--fg-2)' }}>{task.source}</div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { TasksView });
