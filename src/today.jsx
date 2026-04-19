// Today view — focus, plan my day, yesterday recap.

const { useState: useStateT2 } = React;

function PQTaskRow({ task, project, onOpen, onToggle, expanded, onToggleExpand, onJumpTo, isDragOver, onDragStart, onDragOver, onDragEnd, onDrop }) {
  const state = window.getState ? window.getState() : null;
  const allBlockers = state ? (state.blockers || []).filter((b) => (task.blockers || []).includes(b.id)) : [];
  const allDeps = state && task.dependsOn
    ? task.dependsOn.map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean)
    : [];
  const openDeps = allDeps.filter((t) => t.status !== 'done');
  const waitingOnThis = state ? state.tasks.filter((t) => (t.dependsOn || []).includes(task.id)) : [];
  const activeWaiters = waitingOnThis.filter((t) => t.status !== 'done');
  const [completing, setCompleting] = useStateT2(false);

  const handleCheck = (e) => {
    e.stopPropagation();
    if (task.status === 'done') { onToggle(task.id); return; }
    setCompleting(true);
  };

  return (
    <>
      <div
        className={`trow ${task.status === 'done' ? 'done' : ''} ${expanded ? 'pq-row-active' : ''} ${isDragOver ? 'pq-drag-over' : ''}`}
        onClick={onToggleExpand}
        style={{ cursor: 'pointer' }}
        data-task-id={task.id}
        draggable
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move'; onDragStart && onDragStart(task.id); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; onDragOver && onDragOver(task.id); }}
        onDragEnd={() => onDragEnd && onDragEnd()}
        onDrop={(e) => { e.preventDefault(); onDrop && onDrop(task.id); }}
      >
        <span className="trow-drag" style={{ cursor: 'grab' }} />
        <button className="trow-check" onClick={handleCheck} aria-label="Toggle done">
          <Icon name="check" size={11} />
        </button>
        <PriorityBadge priority={task.priority} />
        <div className="truncate">
          <span className="trow-title">{task.title}</span>
          {allBlockers.length > 0 && (
            <span className="pill pill-danger" style={{ marginLeft: 8 }}>
              <Icon name="block" size={10} /> {allBlockers.length}
            </span>
          )}
          {openDeps.length > 0 && (
            <span className="pill pill-warn" style={{ marginLeft: 8 }}>
              <Icon name="link" size={10} /> {openDeps.length}
            </span>
          )}
          {activeWaiters.length > 0 && (
            <span className="pill pill-ok" style={{ marginLeft: 8 }} title={`${activeWaiters.length} task${activeWaiters.length > 1 ? 's' : ''} waiting on this`}>
              <Icon name="link" size={10} /> {activeWaiters.length} waiting
            </span>
          )}
        </div>
        {project ? <ProjectChip project={project} /> : <span />}
        <DueChip date={task.dueDate} small done={task.status === 'done'} />
        <span className="trow-right">
          <StatusDot status={task.status} />
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{task.estimate}h</span>
        </span>
        <span />
      </div>

      {expanded && (
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

function TaskReadOnlyModal({ taskId, state, onClose, onEdit, onJumpTo }) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const project = state.projects.find((p) => p.id === task.projectId);
  const allBlockers = (state.blockers || []).filter((b) => (task.blockers || []).includes(b.id));
  const allDeps = task.dependsOn
    ? task.dependsOn.map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean)
    : [];
  const waitingOnThis = state.tasks.filter((t) => (t.dependsOn || []).includes(task.id));
  const objective = project ? (project.successCriteria || []).find((sc) => sc.id === task.objectiveId) : null;
  const statusLabel = { todo: 'Todo', 'in-progress': 'In progress', blocked: 'Blocked', done: 'Done' }[task.status] || task.status;
  const dueDiff = task.dueDate && task.status !== 'done' ? daysFromToday(task.dueDate) : null;
  const dueColor = dueDiff === null ? 'var(--fg-3)' : dueDiff < 0 ? 'var(--danger)' : dueDiff === 0 ? 'var(--warn)' : 'var(--fg-3)';
  const timingLabel = task.daysEarlyLate == null ? null
    : task.daysEarlyLate > 0 ? `${task.daysEarlyLate}d early`
    : task.daysEarlyLate < 0 ? `${Math.abs(task.daysEarlyLate)}d late`
    : 'on time';
  const timingColor = task.daysEarlyLate == null ? 'var(--fg-4)'
    : task.daysEarlyLate >= 0 ? 'var(--ok)'
    : 'var(--danger)';

  const DepItem = ({ d }) => {
    const done = d.status === 'done';
    const statusColor = { done: 'var(--ok)', 'in-progress': 'var(--info)', blocked: 'var(--danger)', todo: 'var(--fg-3)' }[d.status] || 'var(--fg-3)';
    const sLabel = { done: 'Done', 'in-progress': 'In progress', blocked: 'Blocked', todo: 'Todo' }[d.status] || d.status;
    const iconClass = done ? 'pq-list-icon-ok' : d.status === 'in-progress' ? 'pq-list-icon-info' : 'pq-list-icon-warn';
    return (
      <div className="pq-list-item pq-list-item-link" onClick={() => onJumpTo(d.id)}>
        <span className={`pq-list-icon ${iconClass}`}>
          <Icon name="link" size={11} />
        </span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: done ? 'var(--fg-4)' : 'var(--fg-1)', textDecoration: done ? 'line-through' : 'none' }}>{d.title}</span>
          <PriorityBadge priority={d.priority} />
          <span className="mono" style={{ fontSize: 11, color: statusColor, fontWeight: 600 }}>{sLabel}</span>
        </div>
        <Icon name="chevronR" size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
      </div>
    );
  };

  return (
    <Modal open={true} onClose={onClose} title={
      <span className="row-flex" style={{ gap: 8 }}>
        {project && <ProjectChip project={project} />}
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{task.id.toUpperCase()}</span>
      </span>
    } wide>
      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: task.status === 'done' ? 'var(--fg-3)' : 'var(--fg)', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
        {task.title}
      </div>

      {/* Meta strip */}
      <div className="pq-meta" style={{ paddingBottom: 12, borderBottom: '1px solid var(--line)', marginBottom: 14 }}>
        <span className="pq-meta-item"><StatusDot status={task.status} /><span>{statusLabel}</span></span>
        <span className="pq-meta-sep" />
        <PriorityBadge priority={task.priority} />
        {task.estimate > 0 && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-2)' }}>{task.estimate}h est.</span></>}
        {task.createdAt && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Created {fmtDate(task.createdAt)}</span></>}
        {task.status === 'done' && task.completedAt && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>Completed {fmtDate(task.completedAt)}</span></>}
        {task.dueDate && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: dueColor }}>Due {fmtDate(task.dueDate)}</span></>}
        {task.status === 'done' && timingLabel && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: timingColor, fontWeight: 600 }}>{timingLabel}</span></>}
        <span className="pq-meta-sep" />
        <span className="pill pill-ghost" style={{ textTransform: 'capitalize' }}>{task.source || 'planned'}</span>
      </div>

      {/* Description */}
      <div className="pq-section">
        <div className="pq-section-label">Description</div>
        {task.description
          ? <div className="pq-section-val">{task.description}</div>
          : <div className="pq-section-val" style={{ color: 'var(--fg-4)', fontStyle: 'italic' }}>No description</div>
        }
      </div>

      {/* Objective */}
      {objective && (
        <div className="pq-section">
          <div className="pq-section-label">Objective</div>
          <div className="pq-section-val">
            {objective.text}
            {objective.target && <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginLeft: 8 }}>{objective.current} → {objective.target}</span>}
          </div>
        </div>
      )}

      {/* Resolution */}
      {task.status === 'done' && task.completionNote && (
        <div className="pq-section">
          <div className="pq-section-label">Resolution</div>
          <div className="pq-section-val">{task.completionNote}</div>
        </div>
      )}

      {/* Dev blockers (Jira) */}
      {allBlockers.filter((b) => !!b.jiraKey).length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Dev dependency</div>
          {allBlockers.filter((b) => !!b.jiraKey).map((b) => (
            <div key={b.id} className="pq-list-item">
              <span className="pq-list-icon pq-list-icon-accent"><Icon name="ext" size={11} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{b.description}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>
                  <span style={{ color: 'var(--accent)' }}>{b.jiraKey}</span> · {fmtRelative(b.since)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Waiting on */}
      {allBlockers.filter((b) => !b.jiraKey).length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Waiting on</div>
          {allBlockers.filter((b) => !b.jiraKey).map((b) => (
            <div key={b.id} className="pq-list-item">
              <span className="pq-list-icon pq-list-icon-warn"><Icon name="clock" size={11} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{b.description}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', marginTop: 2 }}>
                  {b.waitingOn !== '—' ? b.waitingOn : ''}{b.waitingOn !== '—' ? ' · ' : ''}{fmtRelative(b.since)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prerequisites */}
      {allDeps.length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Prerequisites</div>
          {allDeps.map((d) => <DepItem key={d.id} d={d} />)}
        </div>
      )}

      {/* Required by */}
      {waitingOnThis.length > 0 && (
        <div className="pq-section">
          <div className="pq-section-label">Required by</div>
          {waitingOnThis.map((d) => <DepItem key={d.id} d={d} />)}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--line)', marginTop: 8 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
          Updated {fmtRelative(task.updatedAt)}
        </span>
        <div className="row-flex">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-sm" onClick={() => onEdit(task.id)}><Icon name="edit" size={11} /> Edit</button>
        </div>
      </div>
    </Modal>
  );
}

function Today({ state, onOpenTask, onOpenProject }) {
  const [showAdd, setShowAdd] = useStateT2(false);
  const [planning, setPlanning] = useStateT2(false);
  const [endDayModal, setEndDayModal] = useStateT2(false);
  const [collapsed, setCollapsed] = useStateT2({ overdue: false, today: false, soon: false, remaining: true });
  const toggleSection = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  const [expandedTaskId, setExpandedTaskId] = useStateT2(null);
  const [readOnlyTaskId, setReadOnlyTaskId] = useStateT2(null);
  const toggleExpand = (id) => setExpandedTaskId((prev) => (prev === id ? null : id));
  const jumpTo = (id) => setReadOnlyTaskId(id);

  const dragSrcId = React.useRef(null);
  const [dragOverId, setDragOverId] = useStateT2(null);

  const sortByPQOrder = (tasks) => {
    const order = state.meta.pqOrder || [];
    return [...tasks].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  };

  const reorderSection = (sectionTasks, dropTargetId) => {
    const srcId = dragSrcId.current;
    if (!srcId || srcId === dropTargetId) return;
    const ids = sectionTasks.map((t) => t.id);
    const fromIdx = ids.indexOf(srcId);
    const toIdx = ids.indexOf(dropTargetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, srcId);
    const otherIds = (state.meta.pqOrder || []).filter((id) => !ids.includes(id));
    actions.setMeta({ pqOrder: [...ids, ...otherIds] });
  };

  const prioritized = todayTasks(state, 50);
  const overdue = sortByPQOrder(prioritized.filter((t) => t._due !== null && t._due < 0));
  const dueToday = sortByPQOrder(prioritized.filter((t) => t._due === 0));
  const soon = sortByPQOrder(prioritized.filter((t) => t._due !== null && t._due > 0 && t._due <= 2));
  const laterFocus = sortByPQOrder(prioritized.filter((t) => !prioritized.filter((x) => x._due !== null && x._due < 0).includes(t) && !prioritized.filter((x) => x._due === 0).includes(t) && !prioritized.filter((x) => x._due !== null && x._due > 0 && x._due <= 2).includes(t))).slice(0, 25);

  const plannedIds = state.meta.plannedToday || [];
  const plannedTasks = plannedIds.map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean);
  const committedHours = plannedTasks.reduce((a, t) => a + (t.estimate || 0), 0);
  const committedDone = plannedTasks.filter((t) => t.status === 'done').length;
  const hasPlan = plannedTasks.length > 0;

  const recap = yesterdayRecap(state);

  const workload = workloadByDay(state, 7);
  const todayHours = workload[0]?.hours || 0;
  const weekHours = workload.reduce((a, b) => a + b.hours, 0);
  const [activeDayDate, setActiveDayDate] = useStateT2(null);
  const activeDay = workload.find((b) => b.date === activeDayDate) || null;

  const doneThisWeek = state.tasks.filter((t) => t.status === 'done' && t.completedAt && daysFromToday(t.completedAt) >= -7).length;
  const weeklyReview = state.weeklyReviews[0];
  const plannedRatio = weeklyReview ? Math.round(weeklyReview.plannedRatio * 100) : 0;

  const RESOLVED_STATUSES = ['Done', 'Released', 'Closed', 'Resolved'];
  const resolvedJiraBlockers = state.blockers.filter((b) => {
    if (!b.jiraKey) return false;
    const issue = (state.jiraIssues || []).find((j) => j.key === b.jiraKey);
    return issue && RESOLVED_STATUSES.includes(issue.status);
  }).map((b) => {
    const issue = (state.jiraIssues || []).find((j) => j.key === b.jiraKey);
    const task = state.tasks.find((t) => t.id === b.taskId);
    return { ...b, issue, task };
  });

  const todayStr = localIso();
  const todayReminders = (state.reminders || []).filter((r) => r.date === todayStr);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Late night.';
    if (h < 12) return 'Good morning.';
    if (h < 17) return 'Good afternoon.';
    return 'Good evening.';
  })();

  return (
    <div className="content-narrow">
      {/* Today's reminders */}
      {todayReminders.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'oklch(70% 0.18 300 / 0.45)', background: 'oklch(70% 0.18 300 / 0.06)' }}>
          <div className="card-head">
            <div className="row-flex" style={{ gap: 8 }}>
              <Icon name="bell" size={13} style={{ color: 'oklch(45% 0.18 300)' }} />
              <span className="card-head-title" style={{ color: 'oklch(45% 0.18 300)' }}>
                {todayReminders.length === 1 ? '1 reminder today' : `${todayReminders.length} reminders today`}
              </span>
            </div>
          </div>
          <div>
            {todayReminders.map((r) => (
              <div key={r.id} className="conflict-row" style={{ cursor: 'default' }}>
                <div className="conflict-icon" style={{ background: 'oklch(70% 0.18 300 / 0.15)', color: 'oklch(45% 0.18 300)' }}>
                  <Icon name="bell" size={12} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{r.title}</div>
                  {r.note && <div className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>{r.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="today-hero">
        <div>
          {/* Greeting */}
          <div className="today-greeting">{greeting}</div>
          <div className="today-sub" style={{ marginBottom: 16 }}>
            {overdue.length > 0 ? (
              <>You have <strong style={{ color: 'var(--danger)' }}>{overdue.length} overdue</strong> and {dueToday.length} due today.{recap.slipped.length > 0 && <> <strong style={{ color: 'var(--warn)' }}>{recap.slipped.length} slipped</strong> from yesterday.</>}</>
            ) : dueToday.length > 0 ? (
              <>{dueToday.length} due today. Nothing overdue — stay on it.{recap.slipped.length > 0 && <> <strong style={{ color: 'var(--warn)' }}>{recap.slipped.length} slipped</strong> from yesterday.</>}</>
            ) : (
              <>No overdue work. {soon.length} items due in the next 48 hours.{recap.slipped.length > 0 && <> <strong style={{ color: 'var(--warn)' }}>{recap.slipped.length} slipped</strong> from yesterday.</>}</>
            )}
          </div>
          <div className="today-metrics">
            <div className="metric-cell">
              <span className="metric-label">Today's load</span>
              <span className="metric-val" style={{ color: todayHours > 6 ? 'var(--danger)' : 'var(--fg)' }}>{todayHours}<span style={{ fontSize: 13, color: 'var(--fg-3)' }}>h</span></span>
              <span className="metric-delta">{dueToday.length} tasks</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">Done / 7d</span>
              <span className="metric-val">{doneThisWeek}</span>
              <span className="metric-delta">completed</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">Planned vs reactive</span>
              <span className="metric-val">{plannedRatio}<span style={{ fontSize: 13, color: 'var(--fg-3)' }}>%</span></span>
              <span className="metric-delta">last review</span>
            </div>
            <div className="metric-cell">
              <span className="metric-label">Blocked</span>
              <span className="metric-val" style={{ color: state.blockers.length ? 'var(--danger)' : 'var(--fg)' }}>{state.blockers.length}</span>
              <span className="metric-delta">waiting on others</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Next 7 days</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{weekHours}h total</span>
          </div>
          <div className="workload" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {workload.map((b, i) => {
              const h = b.hours;
              const cls = h > 6 ? 'over' : h > 4 ? 'med' : 'ok';
              const isWeekend = b.day.getDay() === 0 || b.day.getDay() === 6;
              const isToday = i === 0;
              const isActive = activeDayDate === b.date;
              const barH = Math.max(3, Math.round((h / Math.max(...workload.map((x) => x.hours), 8)) * 56));
              return (
                <div key={b.date} className={`workload-day workload-day-btn${isActive ? ' active' : ''}`}
                  onClick={() => setActiveDayDate(isActive ? null : b.date)}>
                  <div style={{ fontSize: 9, color: isActive ? 'var(--accent)' : 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontWeight: isActive ? 700 : 400 }}>{h || ''}</div>
                  <div className={`workload-bar ${cls} ${isToday ? 'today' : ''}`} style={{ height: `${barH}px`, opacity: isActive ? 1 : 0.85 }} />
                  <div className={`workload-label ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''} ${isActive ? 'is-active' : ''}`}>
                    {b.day.toLocaleDateString('en-US', { weekday: 'short' })[0]}{b.day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          {activeDay && (
            <div className="workload-detail">
              <div className="workload-detail-hd">
                <span>{activeDay.day.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <span className="mono" style={{ fontSize: 11, color: activeDay.hours > 6 ? 'var(--danger)' : 'var(--fg-3)' }}>{activeDay.hours}h estimated</span>
                <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setActiveDayDate(null)}><Icon name="x" size={11} /></button>
              </div>
              {activeDay.tasks.length === 0 ? (
                <div style={{ padding: '10px 14px', color: 'var(--fg-4)', fontSize: 12 }}>No tasks due this day.</div>
              ) : activeDay.tasks.map((t) => {
                const p = state.projects.find((pp) => pp.id === t.projectId);
                return (
                  <div key={t.id} className="workload-task-row" onClick={() => onOpenTask && onOpenTask(t.id)}>
                    <PriorityBadge priority={t.priority} />
                    <span style={{ flex: 1, minWidth: 0 }} className="truncate">{t.title}</span>
                    {p && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{p.code}</span>}
                    {t.estimate && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)', flexShrink: 0 }}>{t.estimate}h</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Committed plan card (prominent when plan exists) */}
      {hasPlan && (
        <div className="committed-card">
          <div className="committed-head">
            <div>
              <div className="committed-title">Today's commit · {committedDone}/{plannedTasks.length} shipped</div>
              <div className="committed-sub">{committedHours}h time-boxed · pulled from priority queue</div>
            </div>
            <div className="row-flex">
              <button className="btn btn-sm" onClick={() => setPlanning(true)}>Edit plan</button>
              <button className="btn btn-sm" onClick={() => setEndDayModal(true)}>End day</button>
            </div>
          </div>
          <div className="committed-bar">
            <div className="committed-fill" style={{ width: `${plannedTasks.length ? (committedDone / plannedTasks.length) * 100 : 0}%` }} />
          </div>
          <div className="committed-list">
            {plannedTasks.map((t) => {
              const p = state.projects.find((pp) => pp.id === t.projectId);
              const deps = blockingDeps(state, t);
              return (
                <div key={t.id} className={`committed-row ${t.status === 'done' ? 'done' : ''}`} onClick={() => onOpenTask(t.id)}>
                  <button className="trow-check" onClick={(e) => { e.stopPropagation(); actions.toggleTaskDone(t.id); }}>
                    <Icon name="check" size={11} />
                  </button>
                  <PriorityBadge priority={t.priority} />
                  <span className="truncate" style={{ fontWeight: 500 }}>{t.title}</span>
                  {deps.length > 0 && <span className="pill pill-warn" title={`Blocked by ${deps.length} task(s)`}><Icon name="link" size={10} /> deps</span>}
                  <ProjectChip project={p} />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{t.estimate}h</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan my day CTA */}
      {!hasPlan && (
        <div className="plan-cta">
          <div>
            <div className="plan-cta-title">Plan today</div>
            <div className="plan-cta-sub">Commit to 3–5 tasks. End-of-day mark shipped.</div>
          </div>
          <button className="btn btn-primary" onClick={() => setPlanning(true)}>
            <Icon name="target" size={12} /> Plan my day
          </button>
        </div>
      )}

      {/* Jira blocker resolution notifications */}
      {resolvedJiraBlockers.length > 0 && (
        <div className="card" style={{ marginTop: 18, borderColor: 'var(--ok)', background: 'color-mix(in oklch, var(--ok) 6%, var(--bg-1))' }}>
          <div className="card-head">
            <div className="row-flex" style={{ gap: 8 }}>
              <Icon name="check" size={13} style={{ color: 'var(--ok)' }} />
              <span className="card-head-title" style={{ color: 'var(--ok)' }}>Blockers cleared by Jira</span>
            </div>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{resolvedJiraBlockers.length} resolved</span>
          </div>
          <div>
            {resolvedJiraBlockers.map((b) => (
              <div key={b.id} className="conflict-row" style={{ cursor: b.task ? 'pointer' : 'default' }} onClick={() => b.task && onOpenTask(b.task.id)}>
                <div className="conflict-icon" style={{ background: 'color-mix(in oklch, var(--ok) 15%, var(--bg-2))', color: 'var(--ok)' }}>
                  <Icon name="check" size={12} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{b.description}</div>
                  <div className="mono" style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 2 }}>
                    <span style={{ color: 'var(--accent)' }}>{b.jiraKey}</span>
                    {b.issue && <span style={{ color: 'var(--fg-4)' }}> · {b.issue.summary}</span>}
                    {b.task && <span style={{ color: 'var(--fg-4)' }}> · on: {b.task.title}</span>}
                  </div>
                </div>
                <span className="pill" style={{ background: 'color-mix(in oklch, var(--ok) 15%, var(--bg-2))', color: 'var(--ok)', borderColor: 'var(--ok)' }}>
                  {b.issue?.status || 'Resolved'}
                </span>
                <button className="btn btn-sm" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}
                  onClick={(e) => { e.stopPropagation(); actions.resolveBlocker(b.id); }}>
                  Resolve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main priority queue */}
      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <span className="card-head-title">Priority queue · today</span>
          <div className="row-flex">
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
              {overdue.length} overdue · {dueToday.length} today · {soon.length} soon
            </span>
            <button className="btn btn-sm" onClick={() => setShowAdd(true)}>
              <Icon name="plus" size={11} /> Add
            </button>
          </div>
        </div>
        {showAdd && <TaskModal taskId={null} state={state} onClose={() => setShowAdd(false)} />}
        <div>
          {overdue.length > 0 && (
            <>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('overdue')}>
                <Icon name={collapsed.overdue ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span style={{ color: 'var(--danger)' }}>Overdue</span>
                <span className="tgroup-head-count">{overdue.length}</span>
              </div>
              {!collapsed.overdue && overdue.map((t) => <PQTaskRow key={t.id} task={t} project={state.projects.find((p) => p.id === t.projectId)} onOpen={onOpenTask} onToggle={actions.toggleTaskDone} expanded={expandedTaskId === t.id} onToggleExpand={() => toggleExpand(t.id)} onJumpTo={jumpTo} isDragOver={dragOverId === t.id} onDragStart={(id) => { dragSrcId.current = id; }} onDragOver={(id) => setDragOverId(id)} onDragEnd={() => { dragSrcId.current = null; setDragOverId(null); }} onDrop={(id) => { reorderSection(overdue, id); setDragOverId(null); }} />)}
            </>
          )}
          {dueToday.length > 0 && (
            <>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('today')}>
                <Icon name={collapsed.today ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span>Due today</span>
                <span className="tgroup-head-count">{dueToday.length}</span>
              </div>
              {!collapsed.today && dueToday.map((t) => <PQTaskRow key={t.id} task={t} project={state.projects.find((p) => p.id === t.projectId)} onOpen={onOpenTask} onToggle={actions.toggleTaskDone} expanded={expandedTaskId === t.id} onToggleExpand={() => toggleExpand(t.id)} onJumpTo={jumpTo} isDragOver={dragOverId === t.id} onDragStart={(id) => { dragSrcId.current = id; }} onDragOver={(id) => setDragOverId(id)} onDragEnd={() => { dragSrcId.current = null; setDragOverId(null); }} onDrop={(id) => { reorderSection(dueToday, id); setDragOverId(null); }} />)}
            </>
          )}
          {soon.length > 0 && (
            <>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('soon')}>
                <Icon name={collapsed.soon ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span>Next 48 hours</span>
                <span className="tgroup-head-count">{soon.length}</span>
              </div>
              {!collapsed.soon && soon.map((t) => <PQTaskRow key={t.id} task={t} project={state.projects.find((p) => p.id === t.projectId)} onOpen={onOpenTask} onToggle={actions.toggleTaskDone} expanded={expandedTaskId === t.id} onToggleExpand={() => toggleExpand(t.id)} onJumpTo={jumpTo} isDragOver={dragOverId === t.id} onDragStart={(id) => { dragSrcId.current = id; }} onDragOver={(id) => setDragOverId(id)} onDragEnd={() => { dragSrcId.current = null; setDragOverId(null); }} onDrop={(id) => { reorderSection(soon, id); setDragOverId(null); }} />)}
            </>
          )}
          {laterFocus.length > 0 && (
            <>
              <div className="tgroup-head tgroup-head-toggle" onClick={() => toggleSection('remaining')}>
                <Icon name={collapsed.remaining ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                <span>Remaining tasks</span>
                <span className="tgroup-head-count">{laterFocus.length}</span>
              </div>
              {!collapsed.remaining && laterFocus.map((t) => <PQTaskRow key={t.id} task={t} project={state.projects.find((p) => p.id === t.projectId)} onOpen={onOpenTask} onToggle={actions.toggleTaskDone} expanded={expandedTaskId === t.id} onToggleExpand={() => toggleExpand(t.id)} onJumpTo={jumpTo} isDragOver={dragOverId === t.id} onDragStart={(id) => { dragSrcId.current = id; }} onDragOver={(id) => setDragOverId(id)} onDragEnd={() => { dragSrcId.current = null; setDragOverId(null); }} onDrop={(id) => { reorderSection(laterFocus, id); setDragOverId(null); }} />)}
            </>
          )}
          {overdue.length + dueToday.length + soon.length + laterFocus.length === 0 && (
            <EmptyState title="Caught up" body="Nothing overdue or due soon. Plan ahead or take a break." icon="check" />
          )}
        </div>
      </div>

      {/* Waiting on others — separate from blockers by kind */}
      {state.blockers.length > 0 && (
        <>
          <div className="section-gap" />
          <div className="card">
            <div className="card-head">
              <span className="card-head-title">Waiting on others</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{state.blockers.length}</span>
            </div>
            <div>
              {state.blockers.map((b) => {
                const task = state.tasks.find((t) => t.id === b.taskId);
                const project = task && state.projects.find((p) => p.id === task.projectId);
                const kind = b.kind === 'waiting' ? 'waiting' : 'blocker';
                return (
                  <div key={b.id} className="conflict-row" onClick={() => onOpenTask(b.taskId)} style={{ cursor: 'pointer' }}>
                    <div className={`conflict-icon ${kind === 'blocker' ? 'danger' : ''}`}><Icon name={kind === 'blocker' ? 'block' : 'clock'} size={12} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>
                        {b.description} <span className="pill pill-ghost" style={{ marginLeft: 6 }}>{kind}</span>
                      </div>
                      <div className="mono" style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 2 }}>
                        {kind === 'blocker' ? 'blocked on' : 'waiting on'} {b.waitingOn} · {fmtRelative(b.since)} · {task?.title}
                      </div>
                    </div>
                    <ProjectChip project={project} />
                    <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); actions.resolveBlocker(b.id); }}>Resolve</button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {planning && <PlanMyDayModal state={state} onClose={() => setPlanning(false)} />}
      {endDayModal && <EndDayModal state={state} onClose={() => setEndDayModal(false)} />}
      {readOnlyTaskId && (
        <TaskReadOnlyModal
          taskId={readOnlyTaskId}
          state={state}
          onClose={() => setReadOnlyTaskId(null)}
          onEdit={(id) => { setReadOnlyTaskId(null); onOpenTask(id); }}
          onJumpTo={jumpTo}
        />
      )}
    </div>
  );
}

function PlanMyDayModal({ state, onClose }) {
  const prioritized = todayTasks(state, 40);
  const [picked, setPicked] = useStateT2(state.meta.plannedToday || []);

  const toggle = (id) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const hours = picked.reduce((a, id) => a + (state.tasks.find((t) => t.id === id)?.estimate || 0), 0);
  const over = hours > 6;

  return (
    <Modal open={true} onClose={onClose} title="Plan my day" wide>
      <div className="plan-intro">
        Commit to 3–5 tasks. Aim for 4–6 hours of real work (meetings, email, and context switching eat the rest). Ship the committed list before pulling more.
      </div>
      <div className="row-flex-sb" style={{ margin: '12px 0 8px' }}>
        <div className="mono" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
          {picked.length} picked · <strong style={{ color: over ? 'var(--warn)' : 'var(--fg)' }}>{hours}h committed</strong>
        </div>
        <button className="btn btn-sm" onClick={() => setPicked([])}>Clear</button>
      </div>
      <div className="plan-list">
        {prioritized.slice(0, 25).map((t) => {
          const p = state.projects.find((pp) => pp.id === t.projectId);
          const selected = picked.includes(t.id);
          const deps = blockingDeps(state, t);
          return (
            <label key={t.id} className={`plan-row ${selected ? 'selected' : ''}`}>
              <input type="checkbox" checked={selected} onChange={() => toggle(t.id)} />
              <PriorityBadge priority={t.priority} />
              <span className="truncate" style={{ fontWeight: 500 }}>{t.title}</span>
              {deps.length > 0 && <span className="pill pill-warn" title={deps.map((d) => d.title).join('\n')}><Icon name="link" size={10} /> blocked</span>}
              <ProjectChip project={p} />
              <DueChip date={t.dueDate} small />
              <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{t.estimate}h</span>
            </label>
          );
        })}
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => { actions.setPlannedToday(picked); onClose(); }} disabled={picked.length === 0}>
          Commit to {picked.length} task{picked.length === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  );
}

function EndDayModal({ state, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = (state.dayNotes || []).find((n) => n.date === today);
  const [note, setNote] = useStateT2(existing?.body || '');

  const plannedIds = state.meta.plannedToday || [];
  const plannedTasks = plannedIds.map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean);
  const shipped = plannedTasks.filter((t) => t.status === 'done');
  const unshipped = plannedTasks.filter((t) => t.status !== 'done');

  const confirm = () => {
    if (note.trim()) actions.saveDayNote(today, note.trim());
    actions.rolloverPlan();
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="End of day" wide>
      <div style={{ marginBottom: 16 }}>
        {plannedTasks.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              Today's plan — {shipped.length}/{plannedTasks.length} shipped
            </div>
            {shipped.map((t) => (
              <div key={t.id} className="committed-row done" style={{ cursor: 'default' }}>
                <span className="trow-check" style={{ background: 'var(--ok)', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 4 }}>
                  <Icon name="check" size={10} style={{ color: 'var(--bg)' }} />
                </span>
                <PriorityBadge priority={t.priority} />
                <span className="truncate" style={{ fontWeight: 500, textDecoration: 'line-through', color: 'var(--fg-3)' }}>{t.title}</span>
              </div>
            ))}
            {unshipped.map((t) => (
              <div key={t.id} className="committed-row" style={{ cursor: 'default', opacity: 0.6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--fg-4)', display: 'inline-block', flexShrink: 0 }} />
                <PriorityBadge priority={t.priority} />
                <span className="truncate" style={{ fontWeight: 500 }}>{t.title}</span>
                <span className="pill pill-warn" style={{ marginLeft: 'auto' }}>slipped</span>
              </div>
            ))}
          </div>
        )}
        <div className="field">
          <span className="field-label">Day note <span style={{ color: 'var(--fg-4)', fontWeight: 400 }}>(optional — shows in calendar)</span></span>
          <textarea
            className="textarea"
            style={{ minHeight: 110 }}
            placeholder="What did you accomplish today? Any blockers, wins, or thoughts for tomorrow…"
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirm(); }}
          />
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 4 }}>⌘↵ to save</div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={confirm}>End day</button>
      </div>
    </Modal>
  );
}

Object.assign(window, { Today, PlanMyDayModal, EndDayModal, TaskReadOnlyModal });
