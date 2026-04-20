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
              <button className="btn btn-sm" onClick={() => document.getElementById('plan-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Edit plan</button>
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

      {/* Inline plan section */}
      <PlanMyDaySection state={state} />

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

function PlanMyDaySection({ state }) {
  const todayStr = localIso();
  const existingPlan = (state.dailyPlans || {})[todayStr] || null;

  const [phase, setPhase] = React.useState(() => existingPlan ? 'plan' : 'idle'); // 'idle' | 'loading' | 'plan' | 'refine-loading'
  const [plan, setPlan] = React.useState(() => existingPlan?.plan || []);
  const [watchlist, setWatchlist] = React.useState(() => existingPlan?.watchlist || []);
  const [insights, setInsights] = React.useState(() => existingPlan?.insights || []);
  const [picked, setPicked] = React.useState(() => state.meta.plannedToday || []);
  const [feedback, setFeedback] = React.useState('');
  const [aiReply, setAiReply] = React.useState('');
  const [suggestedActions, setSuggestedActions] = React.useState([]);
  const [acceptedActions, setAcceptedActions] = React.useState(new Set());
  const [skippedActions, setSkippedActions] = React.useState(new Set());
  const [error, setError] = React.useState(null);
  const [expandedWatchIdx, setExpandedWatchIdx] = React.useState(null);
  const [expandedDeferredIdx, setExpandedDeferredIdx] = React.useState(null);
  const [deferred, setDeferred] = React.useState(() => existingPlan?.deferred || []);

  const buildCtx = () => {
    const today = new Date().toISOString().slice(0, 10);
    const openTasks = state.tasks
      .filter(t => t.status !== 'done')
      .map(t => {
        const proj = state.projects.find(p => p.id === t.projectId);
        const taskBlockers = state.blockers.filter(b => b.taskId === t.id);
        const deps = (t.dependsOn || []).map(id => state.tasks.find(x => x.id === id)).filter(Boolean);
        const requiredBy = state.tasks.filter(x => (x.dependsOn || []).includes(t.id));
        return {
          id: t.id, title: t.title, priority: t.priority, status: t.status,
          dueDate: t.dueDate || null, daysUntilDue: t.dueDate ? daysFromToday(t.dueDate) : null,
          estimate: t.estimate || 0, project: proj ? proj.code : null, projectId: proj ? proj.id : null,
          hasBlockers: taskBlockers.length > 0,
          oldestBlockerDays: taskBlockers.length ? Math.round((Date.now() - new Date(taskBlockers[0].since).getTime()) / 86400000) : null,
          blockerDescription: taskBlockers.map(b => b.description).join('; '),
          dependsOn: deps.map(d => ({ id: d.id, title: d.title, status: d.status })),
          requiredBy: requiredBy.slice(0, 2).map(r => ({ id: r.id, title: r.title, dueDate: r.dueDate })),
        };
      })
      .sort((a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2));

    const openRisks = state.risks
      .filter(r => r.status !== 'closed')
      .map(r => ({
        id: r.id, title: r.title, score: r.severity * r.likelihood,
        reviewDate: r.reviewDate || null, daysUntilReview: r.reviewDate ? daysFromToday(r.reviewDate) : null,
        project: (state.projects.find(p => p.id === r.projectId) || {}).code, projectId: r.projectId,
      }))
      .sort((a, b) => b.score - a.score);

    const openQuestions = (state.notes || [])
      .filter(n => n.kind === 'question' && !n.resolved)
      .map(q => ({
        id: q.id, title: q.title,
        daysOpen: q.date ? Math.round((Date.now() - new Date(q.date).getTime()) / 86400000) : 0,
        projectId: q.projectId || (q.projectIds || [])[0] || null,
        project: (state.projects.find(p => p.id === (q.projectId || (q.projectIds || [])[0])) || {}).code,
      }));

    const projects = state.projects.filter(p => p.status !== 'done').map(p => ({
      id: p.id, code: p.code, name: p.name, status: p.status,
      dueDate: p.dueDate, daysUntilDue: p.dueDate ? daysFromToday(p.dueDate) : null,
    }));

    return { today, openTasks, openRisks, openQuestions, projects };
  };

  const callAI = async (system, userMsg) => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages: [{ role: 'user', content: userMsg }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
    return data.text;
  };

  const parseAIJSON = (text) => {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  };

  const generatePlan = async () => {
    setPhase('loading');
    setError(null);
    setAiReply('');
    setSuggestedActions([]);
    setAcceptedActions(new Set());
    setSkippedActions(new Set());
    try {
      const ctx = buildCtx();
      const sys = `You are an AI executive assistant embedded in a project management tool. Generate a smart daily work plan. Return ONLY valid JSON — no markdown fences, no preamble, no explanation outside the JSON.`;
      const msg = `Today is ${ctx.today}. Daily capacity: 6 hours. Generate a focused daily plan from this data:

OPEN TASKS:
${JSON.stringify(ctx.openTasks.slice(0, 30), null, 1)}

OPEN RISKS:
${JSON.stringify(ctx.openRisks.slice(0, 8), null, 1)}

OPEN QUESTIONS:
${JSON.stringify(ctx.openQuestions.slice(0, 6), null, 1)}

ACTIVE PROJECTS:
${JSON.stringify(ctx.projects, null, 1)}

Return exactly this JSON:
{"plan":[{"taskId":"...","section":"priority","reason":"under 12 words"}],"deferred":[{"taskId":"...","reason":"under 10 words","suggestDate":"tomorrow|this-week|next-week"}],"watchlist":[{"type":"risk","id":"...","title":"...","note":"under 12 words"}],"insights":["observation"]}

Rules:
- CAPACITY: plan must total ≤6h of estimated work. Pick the highest-value tasks that fit. If critical tasks alone exceed 6h, include them anyway and note the overload in insights.
- plan: 3–6 tasks. section = "priority" (overdue/critical/high due within 3 days), "unblock" (active blocker >1 day — needs follow-up today), "prerequisite" (unlocks something with near deadline). Only use task ids from OPEN TASKS above. Reasons under 12 words.
- deferred: tasks you considered but dropped due to capacity or lower priority. Include 1–4 items with honest reasons and a suggested timeframe. Only use task ids from OPEN TASKS.
- watchlist: 2–4 items. High-score risks, deadlines within 7 days, questions open 7+ days. Use actual ids from the data.
- insights: 1–3 punchy observations — especially call out if today is over capacity and what the tradeoffs are.`;

      const raw = await callAI(sys, msg);
      const parsed = parseAIJSON(raw);
      if (!parsed || !Array.isArray(parsed.plan)) throw new Error('Unexpected response format');

      const validPlan = parsed.plan.filter(item => item.taskId && state.tasks.some(t => t.id === item.taskId && t.status !== 'done'));
      const validDeferred = (parsed.deferred || []).filter(item => item.taskId && state.tasks.some(t => t.id === item.taskId && t.status !== 'done'));
      setPlan(validPlan);
      setDeferred(validDeferred);
      setWatchlist(parsed.watchlist || []);
      setInsights(parsed.insights || []);
      setPicked(validPlan.map(p => p.taskId));
      actions.saveDailyPlan(todayStr, {
        date: todayStr,
        generatedAt: new Date().toISOString(),
        plan: validPlan,
        deferred: validDeferred,
        watchlist: parsed.watchlist || [],
        insights: parsed.insights || [],
        committed: [],
        aiReplies: [],
      });
    } catch (e) {
      setError('AI unavailable — showing smart defaults. ' + (e.message || ''));
      const ctx = buildCtx();
      const fallback = ctx.openTasks.slice(0, 5).map((t, i) => ({
        taskId: t.id,
        section: t.hasBlockers ? 'unblock' : (t.daysUntilDue !== null && t.daysUntilDue <= 0 ? 'priority' : i < 2 ? 'priority' : 'prerequisite'),
        reason: t.hasBlockers ? 'Active blocker — follow up today' : t.daysUntilDue !== null && t.daysUntilDue <= 0 ? 'Overdue — needs immediate attention' : 'High priority for today',
      }));
      setPlan(fallback);
      setPicked(fallback.map(p => p.taskId));
      actions.saveDailyPlan(todayStr, {
        date: todayStr,
        generatedAt: new Date().toISOString(),
        plan: fallback,
        deferred: [],
        watchlist: [],
        insights: [],
        committed: [],
        aiReplies: [],
      });
    }
    setPhase('plan');
  };

  const refinePlan = async () => {
    if (!feedback.trim()) return;
    setPhase('refine-loading');
    setError(null);
    try {
      const ctx = buildCtx();
      const sys = `You are an AI executive assistant. The user is refining their daily plan. Return ONLY valid JSON.`;
      const currentPlanDesc = plan.map(p => {
        const task = state.tasks.find(t => t.id === p.taskId);
        return { taskId: p.taskId, title: task?.title || '?', section: p.section };
      });
      const msg = `Current plan: ${JSON.stringify(currentPlanDesc)}

User feedback: "${feedback}"

Open tasks for reference:
${JSON.stringify(ctx.openTasks.slice(0, 30), null, 1)}

Open risks:
${JSON.stringify(ctx.openRisks.slice(0, 8), null, 1)}

Projects:
${JSON.stringify(ctx.projects, null, 1)}

Daily capacity: 6 hours. Return:
{"feedbackResponse":"one sentence acknowledgment","plan":[{"taskId":"...","section":"priority|unblock|prerequisite","reason":"under 12 words"}],"deferred":[{"taskId":"...","reason":"under 10 words","suggestDate":"tomorrow|this-week|next-week"}],"watchlist":[{"type":"risk|deadline|question","id":"...","title":"...","note":"..."}],"suggestedActions":[{"type":"addBlocker|addTask|addRisk|addQuestion","label":"short label under 10 words","params":{}}]}

suggestedActions params:
- addBlocker: {"taskId":"...","description":"what is blocking","waitingOn":"person or team"}
- addTask: {"title":"...","priority":"critical|high|medium|low","projectId":"...","dueDate":"YYYY-MM-DD or null"}
- addRisk: {"title":"...","projectId":"...","severity":3,"likelihood":3,"description":"..."}
- addQuestion: {"title":"...","projectId":"..."}

Only suggest actions that directly follow from the feedback. Empty array if none needed.`;

      const raw = await callAI(sys, msg);
      const parsed = parseAIJSON(raw);
      if (!parsed) throw new Error('Invalid response');

      if (parsed.feedbackResponse) setAiReply(parsed.feedbackResponse);
      const curPlan = (state.dailyPlans || {})[todayStr] || {};
      if (parsed.plan) {
        const validPlan = parsed.plan.filter(item => item.taskId && state.tasks.some(t => t.id === item.taskId && t.status !== 'done'));
        const validDeferred = (parsed.deferred || []).filter(item => item.taskId && state.tasks.some(t => t.id === item.taskId && t.status !== 'done'));
        setPlan(validPlan);
        setPicked(validPlan.map(p => p.taskId));
        if (parsed.deferred) setDeferred(validDeferred);
        actions.updateDailyPlan(todayStr, {
          plan: validPlan,
          deferred: validDeferred,
          watchlist: parsed.watchlist || watchlist,
          aiReplies: [...(curPlan.aiReplies || []), parsed.feedbackResponse].filter(Boolean),
        });
      }
      if (parsed.watchlist) setWatchlist(parsed.watchlist);
      if (parsed.suggestedActions) {
        setSuggestedActions(parsed.suggestedActions);
        setAcceptedActions(new Set());
        setSkippedActions(new Set());
      }
      setFeedback('');
    } catch (e) {
      setError('Could not refine plan. ' + (e.message || ''));
    }
    setPhase('plan');
  };

  const applyAction = (action, idx) => {
    try {
      const p = action.params || {};
      if (action.type === 'addBlocker' && p.taskId) {
        actions.addBlocker({ taskId: p.taskId, description: p.description || action.label, waitingOn: p.waitingOn || '—' });
      } else if (action.type === 'addTask') {
        actions.addTask({ title: p.title || action.label, priority: p.priority || 'medium', projectId: p.projectId || null, dueDate: p.dueDate || null });
      } else if (action.type === 'addRisk') {
        actions.addRisk({ title: p.title || action.label, projectId: p.projectId || null, severity: p.severity || 3, likelihood: p.likelihood || 3, description: p.description || '' });
      } else if (action.type === 'addQuestion') {
        actions.addNote({ kind: 'question', title: p.title || action.label, projectId: p.projectId || null, date: new Date().toISOString().slice(0, 10) });
      }
      setAcceptedActions(prev => new Set([...prev, idx]));
    } catch (e) { console.error('Action failed', e); }
  };

  const toggle = (id) => setPicked(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const hours = picked.reduce((a, id) => a + (state.tasks.find(t => t.id === id)?.estimate || 0), 0);
  const over = hours > 6;
  const isLoading = phase === 'loading' || phase === 'refine-loading';

  const commitPlan = () => {
    actions.setPlannedToday(picked);
    actions.updateDailyPlan(todayStr, { committed: picked });
  };

  const [sectionCollapsed, setSectionCollapsed] = React.useState(false);

  // If the store loads a plan after initial mount (e.g. server sync), transition out of idle
  React.useEffect(() => {
    if (phase === 'idle' && existingPlan) {
      setPlan(existingPlan.plan || []);
      setDeferred(existingPlan.deferred || []);
      setWatchlist(existingPlan.watchlist || []);
      setInsights(existingPlan.insights || []);
      setPhase('plan');
    }
  }, [existingPlan]);

  const SECTION_META = {
    priority:     { label: 'Must do today',        color: 'var(--danger)', icon: 'bolt' },
    unblock:      { label: 'Follow up · unblock',  color: 'var(--warn)',   icon: 'clock' },
    prerequisite: { label: 'Enables what\'s next', color: 'var(--info)',   icon: 'link' },
  };
  const ACTION_LABELS = { addBlocker: 'Add blocker', addTask: 'New task', addRisk: 'Flag risk', addQuestion: 'Log question' };

  const planIds = new Set(plan.map(p => p.taskId));
  const otherTasks = state.tasks
    .filter(t => t.status !== 'done' && !planIds.has(t.id))
    .sort((a, b) => (PRIORITY_ORDER[a.priority] || 2) - (PRIORITY_ORDER[b.priority] || 2))
    .slice(0, 20);

  if (phase === 'idle') {
    return (
      <div className="plan-cta">
        <div>
          <div className="plan-cta-title">Plan today</div>
          <div className="plan-cta-sub">AI analyzes your tasks, risks, and deadlines to build a focused daily plan.</div>
        </div>
        <button className="btn btn-primary" onClick={generatePlan}>
          <Icon name="target" size={12} /> Plan my day
        </button>
      </div>
    );
  }

  return (
    <div className="card" id="plan-section" style={{ marginBottom: 18 }}>
      <div className="card-head" style={{ flexWrap: 'wrap', gap: 8, cursor: 'pointer' }} onClick={() => setSectionCollapsed(c => !c)}>
        <div className="row-flex" style={{ gap: 8 }}>
          <Icon name={sectionCollapsed ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          <Icon name="bolt" size={13} style={{ color: 'var(--accent)' }} />
          <span className="card-head-title">Plan my day</span>
          {isLoading && <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
            · {phase === 'refine-loading' ? 'refining…' : 'generating…'}
          </span>}
          {!isLoading && existingPlan?.generatedAt && (
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>
              · {new Date(existingPlan.generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
        {!isLoading && (
          <div className="row-flex" style={{ gap: 6 }} onClick={e => e.stopPropagation()}>
            <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>
              {picked.length} sel. · <span style={{ color: over ? 'var(--warn)' : 'var(--fg-2)', fontWeight: 600 }}>{hours}h</span>
              {over && <span style={{ color: 'var(--warn)' }}> · over capacity</span>}
            </span>
            <button className="btn btn-sm" onClick={() => setPicked([])}>Clear</button>
            <button className="btn btn-sm" onClick={generatePlan}><Icon name="bolt" size={10} /> Regenerate</button>
            <button className="btn btn-primary btn-sm" disabled={picked.length === 0} onClick={commitPlan}>
              Commit{picked.length > 0 ? ` · ${hours}h` : ''}
            </button>
          </div>
        )}
      </div>
      {!sectionCollapsed && isLoading && (
        <div style={{ padding: '40px 0', textAlign: 'center' }}>
          <div className="chat-typing" style={{ justifyContent: 'center', marginBottom: 12 }}>
            <span /><span /><span />
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 10 }}>
            {phase === 'loading' ? 'Analyzing your tasks, risks, and deadlines…' : 'Updating your plan…'}
          </div>
        </div>
      )}

      {!sectionCollapsed && !isLoading && (
        <>
          {/* Insights */}
          {insights.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, padding: '12px 14px 0' }}>
              {insights.map((ins, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px', flex: '1 1 auto',
                  background: 'oklch(60% 0.15 280 / 0.08)', border: '1px solid oklch(60% 0.15 280 / 0.2)',
                  borderRadius: 6, fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.4,
                }}>
                  <Icon name="bolt" size={10} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                  {ins}
                </div>
              ))}
            </div>
          )}

          {/* AI reply after refine */}
          {aiReply && (
            <div style={{
              padding: '8px 12px', margin: '12px 14px', borderRadius: 6, fontSize: 12, color: 'var(--fg-2)',
              background: 'oklch(55% 0.12 200 / 0.08)', border: '1px solid oklch(55% 0.12 200 / 0.2)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <Icon name="bolt" size={11} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 1 }} />
              {aiReply}
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '7px 11px', margin: '12px 14px', borderRadius: 6, fontSize: 11.5, color: 'var(--danger)',
              background: 'oklch(55% 0.2 25 / 0.07)', border: '1px solid oklch(55% 0.2 25 / 0.2)',
            }}>
              {error}
            </div>
          )}

          {/* AI-suggested sections */}
          <div className="plan-list" style={{ marginBottom: 0 }}>
            {plan.length === 0 && (
              <div style={{ padding: '16px 14px', color: 'var(--fg-4)', fontSize: 12, textAlign: 'center' }}>
                No AI suggestions — select tasks manually below.
              </div>
            )}
            {['priority', 'unblock', 'prerequisite'].map(section => {
              const items = plan.filter(p => p.section === section);
              if (!items.length) return null;
              const sm = SECTION_META[section];
              return (
                <React.Fragment key={section}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px 4px', borderTop: '1px solid var(--line)' }}>
                    <Icon name={sm.icon} size={10} style={{ color: sm.color }} />
                    <span className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: sm.color, fontWeight: 600 }}>
                      {sm.label}
                    </span>
                  </div>
                  {items.map(item => {
                    const task = state.tasks.find(t => t.id === item.taskId);
                    if (!task) return null;
                    const proj = state.projects.find(p => p.id === task.projectId);
                    const isSelected = picked.includes(task.id);
                    const taskBlockers = state.blockers.filter(b => b.taskId === task.id);
                    return (
                      <label key={task.id} className={`plan-row ${isSelected ? 'selected' : ''}`}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 0, padding: '8px 14px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggle(task.id)} style={{ flexShrink: 0 }} />
                          <PriorityBadge priority={task.priority} />
                          <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{task.id.toUpperCase()}</span>
                          <span className="truncate" style={{ fontWeight: 500, flex: 1, fontSize: 13 }}>{task.title}</span>
                          {taskBlockers.length > 0 && <span className="pill pill-warn" style={{ fontSize: 10, flexShrink: 0 }}><Icon name="clock" size={9} /> blocked</span>}
                          <ProjectChip project={proj} />
                          <DueChip date={task.dueDate} small />
                          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0 }}>{task.estimate || 0}h</span>
                        </div>
                        {item.reason && (
                          <div style={{ paddingLeft: 22, marginTop: 3, fontSize: 11, color: 'var(--fg-4)', fontStyle: 'italic', lineHeight: 1.4 }}>
                            {item.reason}
                          </div>
                        )}
                      </label>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          {/* Watchlist */}
          {watchlist.length > 0 && (() => {
            const TYPE_CFG = {
              risk:     { label: 'Risk',     icon: 'warn',     color: 'var(--warn)',   pill: 'pill-warn' },
              question: { label: 'Question', icon: 'circle',   color: 'var(--info)',   pill: 'pill-info' },
              deadline: { label: 'Deadline', icon: 'clock',    color: 'var(--danger)', pill: 'pill-danger' },
              task:     { label: 'Blocked',  icon: 'block',    color: 'var(--warn)',   pill: 'pill-warn' },
            };
            return (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px 4px', borderTop: '1px solid var(--line)' }}>
                  <Icon name="bell" size={10} style={{ color: 'var(--fg-4)' }} />
                  <span className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', fontWeight: 600 }}>Watch</span>
                </div>
                {watchlist.map((w, i) => {
                  const cfg = TYPE_CFG[w.type] || TYPE_CFG.risk;
                  const isExpanded = expandedWatchIdx === i;

                  // Look up full record
                  const risk     = w.type === 'risk'     ? state.risks.find(r => r.id === w.id) : null;
                  const question = w.type === 'question' ? (state.notes || []).find(n => n.id === w.id) : null;
                  const project  = w.type === 'deadline' ? state.projects.find(p => p.id === w.id) : null;
                  const task     = w.type === 'task'     ? state.tasks.find(t => t.id === w.id) : null;
                  const riskProj = risk ? state.projects.find(p => p.id === risk.projectId) : null;
                  const qProj    = question ? state.projects.find(p => p.id === (question.projectId || (question.projectIds || [])[0])) : null;
                  const taskProj = task ? state.projects.find(p => p.id === task.projectId) : null;

                  return (
                    <div key={i} style={{ borderTop: '1px solid var(--line)' }}>
                      {/* Collapsed row — always visible */}
                      <div
                        onClick={() => setExpandedWatchIdx(isExpanded ? null : i)}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', cursor: 'pointer' }}
                      >
                        <Icon name={cfg.icon} size={12} style={{ color: cfg.color, flexShrink: 0 }} />
                        <span className={`pill ${cfg.pill}`} style={{ fontSize: 9.5, flexShrink: 0 }}>{cfg.label}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--fg-1)', flex: 1, minWidth: 0 }} className="truncate">{w.title}</span>
                        {w.note && !isExpanded && <span style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0, maxWidth: 200 }} className="truncate">{w.note}</span>}
                        <Icon name={isExpanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div style={{ margin: '0 14px 10px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 }}>
                          {/* AI note */}
                          {w.note && (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 10, padding: '6px 8px', background: 'oklch(60% 0.15 280 / 0.06)', borderRadius: 4, border: '1px solid oklch(60% 0.15 280 / 0.12)' }}>
                              <Icon name="bolt" size={10} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }} />
                              <span style={{ color: 'var(--fg-3)', fontStyle: 'italic', lineHeight: 1.45 }}>{w.note}</span>
                            </div>
                          )}

                          {risk && (
                            <>
                              <div className="pq-meta" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
                                <span className={`pill ${risk.severity * risk.likelihood >= 12 ? 'pill-danger' : risk.severity * risk.likelihood >= 6 ? 'pill-warn' : 'pill-ok'}`} style={{ fontWeight: 700 }}>
                                  Score {risk.severity * risk.likelihood}
                                </span>
                                <span className="pq-meta-sep" />
                                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>S{risk.severity}/5 × L{risk.likelihood}/5</span>
                                <span className="pq-meta-sep" />
                                <span className={`pill pill-${risk.status === 'open' ? 'warn' : risk.status === 'monitoring' ? 'info' : 'ok'}`} style={{ textTransform: 'capitalize' }}>{risk.status}</span>
                                {riskProj && <><span className="pq-meta-sep" /><ProjectChip project={riskProj} /></>}
                              </div>
                              {risk.mitigation && (
                                <div style={{ marginBottom: 8 }}>
                                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-4)', marginBottom: 3 }}>Mitigation</div>
                                  <div style={{ color: 'var(--fg-2)', lineHeight: 1.5 }}>{risk.mitigation}</div>
                                </div>
                              )}
                              {risk.reviewDate && (
                                <div className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <Icon name="clock" size={10} />Next review: {fmtDate(risk.reviewDate)}
                                </div>
                              )}
                            </>
                          )}

                          {question && (
                            <>
                              <div className="pq-meta" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
                                {qProj && <><ProjectChip project={qProj} /><span className="pq-meta-sep" /></>}
                                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>Open {fmtRelative(question.date)}</span>
                                {question.resolved && <><span className="pq-meta-sep" /><span className="pill pill-ok">resolved</span></>}
                              </div>
                              {question.body
                                ? <div style={{ color: 'var(--fg-2)', lineHeight: 1.5 }}>{question.body}</div>
                                : <div style={{ color: 'var(--fg-4)', fontStyle: 'italic' }}>No description added.</div>
                              }
                            </>
                          )}

                          {project && (
                            <>
                              <div className="pq-meta" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
                                <ProjectChip project={project} />
                                <span className="pq-meta-sep" />
                                <span className={`pill pill-${project.status === 'blocked' ? 'danger' : project.status === 'at-risk' ? 'warn' : 'ok'}`} style={{ textTransform: 'capitalize' }}>{project.status}</span>
                                {project.dueDate && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>Due {fmtDate(project.dueDate)}</span></>}
                              </div>
                              {project.objective
                                ? <div style={{ color: 'var(--fg-2)', lineHeight: 1.5 }}>{project.objective}</div>
                                : <div style={{ color: 'var(--fg-4)', fontStyle: 'italic' }}>No objective set.</div>
                              }
                            </>
                          )}

                          {task && (
                            <>
                              <div className="pq-meta" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
                                <PriorityBadge priority={task.priority} />
                                <span className="pq-meta-sep" />
                                <StatusDot status={task.status} />
                                <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{task.status}</span>
                                {taskProj && <><span className="pq-meta-sep" /><ProjectChip project={taskProj} /></>}
                                {task.dueDate && <><span className="pq-meta-sep" /><DueChip date={task.dueDate} small /></>}
                                {task.estimate > 0 && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{task.estimate}h</span></>}
                              </div>
                              {state.blockers.filter(b => b.taskId === task.id).length > 0 && (
                                <div style={{ marginBottom: 4 }}>
                                  <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-4)', marginBottom: 4 }}>Blockers</div>
                                  {state.blockers.filter(b => b.taskId === task.id).map(b => (
                                    <div key={b.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 4, padding: '5px 8px', background: 'oklch(55% 0.2 55 / 0.06)', borderRadius: 4, border: '1px solid oklch(55% 0.2 55 / 0.15)' }}>
                                      <Icon name="clock" size={10} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ color: 'var(--fg-2)', lineHeight: 1.4 }}>{b.description}</div>
                                        {b.waitingOn && b.waitingOn !== '—' && <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>Waiting on: {b.waitingOn} · {fmtRelative(b.since)}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {task.description && <div style={{ color: 'var(--fg-3)', lineHeight: 1.5, marginTop: 4 }}>{task.description}</div>}
                            </>
                          )}

                          {/* Fallback if id not found */}
                          {!risk && !question && !project && !task && (
                            <div style={{ color: 'var(--fg-4)', fontStyle: 'italic' }}>Details not available.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Deferred — tasks AI dropped from the plan */}
          {deferred.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px 4px', borderTop: '1px solid var(--line)' }}>
                <Icon name="clock" size={10} style={{ color: 'var(--fg-4)' }} />
                <span className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', fontWeight: 600 }}>Deferred · capacity limit</span>
              </div>
              {deferred.map((d, i) => {
                const task = state.tasks.find(t => t.id === d.taskId);
                if (!task) return null;
                const proj = state.projects.find(p => p.id === task.projectId);
                const taskBlockers = state.blockers.filter(b => b.taskId === task.id);
                const suggestLabel = { tomorrow: 'Tomorrow', 'this-week': 'This week', 'next-week': 'Next week' }[d.suggestDate] || d.suggestDate;
                const isExpanded = expandedDeferredIdx === i;
                return (
                  <div key={i} style={{ borderTop: '1px solid var(--line)' }}>
                    <div
                      onClick={() => setExpandedDeferredIdx(isExpanded ? null : i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer', opacity: 0.8 }}
                    >
                      <Icon name={isExpanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                      <PriorityBadge priority={task.priority} />
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{task.id.toUpperCase()}</span>
                      <span className="truncate" style={{ fontSize: 12.5, color: 'var(--fg-3)', flex: 1 }}>{task.title}</span>
                      {proj && <ProjectChip project={proj} />}
                      {d.reason && !isExpanded && <span style={{ fontSize: 11, color: 'var(--fg-4)', fontStyle: 'italic', flexShrink: 0, maxWidth: 180 }} className="truncate">{d.reason}</span>}
                      {suggestLabel && <span className="pill pill-ghost" style={{ fontSize: 9.5, flexShrink: 0 }}>→ {suggestLabel}</span>}
                    </div>
                    {isExpanded && (
                      <div style={{ margin: '0 14px 10px', padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--line)', fontSize: 12 }}>
                        {d.reason && (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 10, padding: '6px 8px', background: 'oklch(60% 0.15 280 / 0.06)', borderRadius: 4, border: '1px solid oklch(60% 0.15 280 / 0.12)' }}>
                            <Icon name="clock" size={10} style={{ color: 'var(--fg-4)', flexShrink: 0, marginTop: 1 }} />
                            <span style={{ color: 'var(--fg-3)', fontStyle: 'italic', lineHeight: 1.45 }}>{d.reason}{suggestLabel ? ` — suggest ${suggestLabel.toLowerCase()}.` : ''}</span>
                          </div>
                        )}
                        <div className="pq-meta" style={{ paddingBottom: 8, marginBottom: 8, borderBottom: '1px solid var(--line)' }}>
                          <PriorityBadge priority={task.priority} />
                          <span className="pq-meta-sep" />
                          <StatusDot status={task.status} />
                          <span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{task.status}</span>
                          {proj && <><span className="pq-meta-sep" /><ProjectChip project={proj} /></>}
                          {task.dueDate && <><span className="pq-meta-sep" /><DueChip date={task.dueDate} small /></>}
                          {task.estimate > 0 && <><span className="pq-meta-sep" /><span className="mono" style={{ fontSize: 11, color: 'var(--fg-3)' }}>{task.estimate}h</span></>}
                        </div>
                        {task.description && <div style={{ color: 'var(--fg-2)', lineHeight: 1.5, marginBottom: taskBlockers.length ? 8 : 0 }}>{task.description}</div>}
                        {taskBlockers.length > 0 && (
                          <div>
                            <div className="mono" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-4)', marginBottom: 4 }}>Blockers</div>
                            {taskBlockers.map(b => (
                              <div key={b.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', padding: '5px 8px', background: 'oklch(55% 0.2 55 / 0.06)', borderRadius: 4, border: '1px solid oklch(55% 0.2 55 / 0.15)', marginBottom: 4 }}>
                                <Icon name="clock" size={10} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                                <div>
                                  <div style={{ color: 'var(--fg-2)' }}>{b.description}</div>
                                  {b.waitingOn && b.waitingOn !== '—' && <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginTop: 2 }}>Waiting on: {b.waitingOn}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={(e) => { e.stopPropagation(); toggle(task.id); setExpandedDeferredIdx(null); }}>
                          + Add to today's plan
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Suggested actions */}
          {suggestedActions.filter((_, i) => !skippedActions.has(i)).length > 0 && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: 'oklch(60% 0.15 280 / 0.06)', borderRadius: 8, border: '1px solid oklch(60% 0.15 280 / 0.15)' }}>
              <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
                Suggested actions
              </div>
              {suggestedActions.map((action, idx) => {
                if (skippedActions.has(idx)) return null;
                const accepted = acceptedActions.has(idx);
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: idx < suggestedActions.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <span className="pill" style={{ fontSize: 10, flexShrink: 0 }}>{ACTION_LABELS[action.type] || action.type}</span>
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--fg-2)' }}>{action.label}</span>
                    {accepted
                      ? <span style={{ fontSize: 11, color: 'var(--ok)', fontWeight: 600 }}>✓ Added</span>
                      : <>
                          <button className="btn btn-sm btn-primary" onClick={() => applyAction(action, idx)}>Accept</button>
                          <button className="btn btn-sm" onClick={() => setSkippedActions(prev => new Set([...prev, idx]))}>Skip</button>
                        </>
                    }
                  </div>
                );
              })}
            </div>
          )}

          {/* Manual picker — other tasks */}
          {otherTasks.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary style={{
                cursor: 'pointer', padding: '7px 14px', borderTop: '1px solid var(--line)', listStyle: 'none',
                display: 'flex', alignItems: 'center', gap: 6, userSelect: 'none',
              }}>
                <Icon name="chevronR" size={10} style={{ color: 'var(--fg-4)' }} />
                <span className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', fontWeight: 600 }}>
                  Add more tasks ({otherTasks.length})
                </span>
              </summary>
              <div className="plan-list" style={{ marginBottom: 0 }}>
                {otherTasks.map(t => {
                  const proj = state.projects.find(p => p.id === t.projectId);
                  const isSelected = picked.includes(t.id);
                  return (
                    <label key={t.id} className={`plan-row ${isSelected ? 'selected' : ''}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggle(t.id)} />
                      <PriorityBadge priority={t.priority} />
                      <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{t.id.toUpperCase()}</span>
                      <span className="truncate" style={{ fontWeight: 500 }}>{t.title}</span>
                      <ProjectChip project={proj} />
                      <DueChip date={t.dueDate} small />
                      <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)' }}>{t.estimate || 0}h</span>
                    </label>
                  );
                })}
              </div>
            </details>
          )}

          {/* Feedback / refine */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <div className="mono" style={{ fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-4)', marginBottom: 6 }}>
              Refine with AI
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                style={{ flex: 1, fontSize: 12.5 }}
                placeholder={`e.g. "The API task is blocked on legal" or "Customer demo moved to Thursday"`}
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); refinePlan(); } }}
              />
              <button className="btn btn-sm btn-primary" onClick={refinePlan} disabled={!feedback.trim()}>
                <Icon name="bolt" size={10} /> Refine
              </button>
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', marginTop: 5 }}>
              Tell the assistant what changed or what's blocked — it can suggest adding blockers, tasks, risks, and more.
            </div>
          </div>
        </>
      )}

    </div>
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

Object.assign(window, { Today, PlanMyDaySection, EndDayModal, TaskReadOnlyModal });
