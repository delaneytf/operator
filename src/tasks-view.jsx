// Tasks view — metrics, search/filter, PQ-style queue grouped by priority or due date.

const TASK_PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function TasksView({ state }) {
  const [filterProject, setFilterProject] = React.useState('all');
  const [search, setSearch] = React.useState('');
  const [groupBy, setGroupBy] = React.useState('priority'); // 'priority' | 'due'
  const [collapsed, setCollapsed] = React.useState({});
  const [expandedId, setExpandedId] = React.useState(null);
  const [taskModalId, setTaskModalId] = React.useState(null);
  const [showNewTask, setShowNewTask] = React.useState(false);
  const [readOnlyTaskId, setReadOnlyTaskId] = React.useState(null);

  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  // Drag-to-reorder (same mechanism as Today PQ)
  const dragSrcId = React.useRef(null);
  const [dragOverId, setDragOverId] = React.useState(null);
  const orderFromMeta = state.meta.tasksViewOrder || [];

  const sortByOrder = (tasks) =>
    [...tasks].sort((a, b) => {
      const ai = orderFromMeta.indexOf(a.id);
      const bi = orderFromMeta.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

  const reorderInSection = (sectionTasks, dropTargetId) => {
    const srcId = dragSrcId.current;
    if (!srcId || srcId === dropTargetId) return;
    const ids = sectionTasks.map((t) => t.id);
    const from = ids.indexOf(srcId);
    const to = ids.indexOf(dropTargetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, srcId);
    const otherIds = (state.meta.tasksViewOrder || []).filter((id) => !ids.includes(id));
    actions.setMeta({ tasksViewOrder: [...ids, ...otherIds] });
  };

  const makeDragProps = (t, sectionTasks) => ({
    onDragStart: (e) => { dragSrcId.current = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); },
    onDragOver: (e) => { e.preventDefault(); setDragOverId(t.id); },
    onDrop: (e) => { e.preventDefault(); reorderInSection(sectionTasks, t.id); setDragOverId(null); },
    onDragEnd: () => { dragSrcId.current = null; setDragOverId(null); },
  });

  // Metrics
  const allTasks = state.tasks || [];
  const openTasks = allTasks.filter((t) => t.status !== 'done');
  const metricTodo      = allTasks.filter((t) => t.status === 'todo').length;
  const metricInProg    = allTasks.filter((t) => t.status === 'in-progress').length;
  const metricBlocked   = allTasks.filter((t) =>
    t.status === 'blocked' || (state.blockers || []).some((b) => b.taskId === t.id)
  ).length;
  const metricWaiting   = allTasks.filter((t) =>
    t.status !== 'done' && (state.blockers || []).some((b) => b.taskId === t.id && !b.jiraKey)
  ).length;
  const metricDone      = allTasks.filter((t) => t.status === 'done').length;
  const metricOverdue   = openTasks.filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0).length;
  const metricEstHrs    = openTasks.reduce((a, t) => a + (t.estimate || 0), 0);
  const metricReactive  = openTasks.length > 0
    ? Math.round(openTasks.filter((t) => t.source === 'reactive').length / openTasks.length * 100)
    : 0;

  const metrics = [
    { label: 'To do',         value: metricTodo,                        color: 'var(--fg-2)' },
    { label: 'In progress',   value: metricInProg,                      color: 'var(--info)' },
    { label: 'Blocked',       value: metricBlocked,                     color: metricBlocked > 0 ? 'var(--danger)' : 'var(--fg-4)' },
    { label: 'Waiting on',    value: metricWaiting,                     color: metricWaiting > 0 ? 'var(--warn)' : 'var(--fg-4)' },
    { label: 'Done',          value: metricDone,                        color: 'var(--ok)' },
    { label: 'Overdue',       value: metricOverdue,                     color: metricOverdue > 0 ? 'var(--danger)' : 'var(--fg-4)' },
    { label: 'Est. remaining',value: `${metricEstHrs}h`,                color: 'var(--fg-2)' },
    { label: 'Reactive %',    value: `${metricReactive}%`,              color: metricReactive > 40 ? 'var(--warn)' : 'var(--fg-2)' },
  ];

  // Filtered set
  const filtered = allTasks
    .filter((t) => filterProject === 'all' || t.projectId === filterProject)
    .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()) || (t.description || '').toLowerCase().includes(search.toLowerCase()));

  // Sections
  let sections;
  if (groupBy === 'priority') {
    const byPrio = ['critical', 'high', 'medium', 'low'].map((p) => ({
      key: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      labelColor: { critical: 'var(--danger)', high: 'var(--warn)', medium: 'var(--fg-2)', low: 'var(--fg-4)' }[p],
      tasks: sortByOrder(
        filtered.filter((t) => t.priority === p && t.status !== 'done')
          .sort((a, b) => (a.dueDate ? daysFromToday(a.dueDate) : 999) - (b.dueDate ? daysFromToday(b.dueDate) : 999))
      ),
    })).filter((s) => s.tasks.length > 0);
    const doneTasks = sortByOrder(filtered.filter((t) => t.status === 'done'));
    if (doneTasks.length > 0) {
      byPrio.push({ key: 'done', label: 'Done', labelColor: 'var(--ok)', tasks: doneTasks, defaultCollapsed: true });
    }
    sections = byPrio;
  } else {
    const open = filtered.filter((t) => t.status !== 'done');
    const byPrioSort = (a, b) => (TASK_PRIORITY_ORDER[a.priority] ?? 2) - (TASK_PRIORITY_ORDER[b.priority] ?? 2);
    sections = [
      { key: 'overdue',  label: 'Overdue',       labelColor: 'var(--danger)', tasks: sortByOrder(open.filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0).sort(byPrioSort)) },
      { key: 'today',    label: 'Due today',      labelColor: 'var(--warn)',   tasks: sortByOrder(open.filter((t) => t.dueDate && daysFromToday(t.dueDate) === 0).sort(byPrioSort)) },
      { key: 'week',     label: 'This week',      labelColor: 'var(--accent)', tasks: sortByOrder(open.filter((t) => t.dueDate && daysFromToday(t.dueDate) > 0 && daysFromToday(t.dueDate) <= 7).sort(byPrioSort)) },
      { key: 'later',    label: 'Later',          labelColor: 'var(--fg-3)',   tasks: sortByOrder(open.filter((t) => t.dueDate && daysFromToday(t.dueDate) > 7).sort(byPrioSort)) },
      { key: 'nodue',    label: 'No due date',    labelColor: 'var(--fg-4)',   tasks: sortByOrder(open.filter((t) => !t.dueDate).sort(byPrioSort)) },
      { key: 'done',     label: 'Done',           labelColor: 'var(--ok)',     tasks: sortByOrder(filtered.filter((t) => t.status === 'done')), defaultCollapsed: true },
    ].filter((s) => s.tasks.length > 0);
  }

  // Initialise default-collapsed sections on first render
  React.useEffect(() => {
    const init = {};
    sections.forEach((s) => { if (s.defaultCollapsed && collapsed[s.key] === undefined) init[s.key] = true; });
    if (Object.keys(init).length) setCollapsed((prev) => ({ ...prev, ...init }));
  }, [groupBy]);

  return (
    <>
    <div className="content-narrow">

      {/* Header */}
      <div className="row-flex-sb" style={{ marginBottom: 20, alignItems: 'flex-end' }}>
        <div>
          <div className="title-h1">Tasks</div>
          <div className="title-sub">{openTasks.length} open · {metricDone} done · {metricEstHrs}h estimated</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewTask(true)}>
          <Icon name="plus" size={11} /> New task
        </button>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: 'var(--bg-1)', padding: '10px 14px' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: m.color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, width: 200, flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          <button className={`btn btn-sm${filterProject === 'all' ? ' btn-primary' : ''}`} onClick={() => setFilterProject('all')}>All</button>
          {state.projects.map((p) => (
            <button key={p.id} className={`btn btn-sm${filterProject === p.id ? ' btn-primary' : ''}`}
              onClick={() => setFilterProject(filterProject === p.id ? 'all' : p.id)}>
              {p.code}
            </button>
          ))}
        </div>
        <div className="seg" style={{ flexShrink: 0 }}>
          <button type="button" className={`seg-btn${groupBy === 'priority' ? ' active' : ''}`} onClick={() => setGroupBy('priority')}>Priority</button>
          <button type="button" className={`seg-btn${groupBy === 'due' ? ' active' : ''}`} onClick={() => setGroupBy('due')}>Due date</button>
        </div>
      </div>

      {/* Queue */}
      <div className="card">
        {sections.length === 0 && <div className="empty">No tasks match.</div>}
        {sections.map((section) => (
          <div key={section.key}>
            <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection(section.key)}>
              <Icon name={collapsed[section.key] ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
              <span style={{ color: section.labelColor }}>{section.label}</span>
              <span className="tgroup-head-count">{section.tasks.length}</span>
            </div>
            {!collapsed[section.key] && section.tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                project={state.projects.find((p) => p.id === t.projectId)}
                onOpen={(id) => setTaskModalId(id)}
                onToggle={actions.toggleTaskDone}
                showProject={true}
                expanded={expandedId === t.id}
                onToggleExpand={() => toggleExpand(t.id)}
                onJumpTo={(id) => setReadOnlyTaskId(id)}
                dragProps={makeDragProps(t, section.tasks)}
                dropState={dragOverId === t.id ? 'drop-before' : dragSrcId.current === t.id ? 'dragging' : ''}
              />
            ))}
          </div>
        ))}
      </div>
    </div>

    {showNewTask && (
      <TaskModal taskId={null} state={state}
        defaults={{ projectId: filterProject !== 'all' ? filterProject : undefined }}
        onClose={() => setShowNewTask(false)} />
    )}
    {taskModalId && (
      <TaskModal taskId={taskModalId} state={state} onClose={() => setTaskModalId(null)} />
    )}
    {readOnlyTaskId && (
      <TaskReadOnlyModal taskId={readOnlyTaskId} state={state}
        onClose={() => setReadOnlyTaskId(null)}
        onEdit={(id) => { setReadOnlyTaskId(null); setTaskModalId(id); }}
        onJumpTo={(id) => setReadOnlyTaskId(id)} />
    )}
    </>
  );
}

Object.assign(window, { TasksView });
