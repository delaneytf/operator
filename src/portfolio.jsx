// Portfolio dashboard — grid of project cards + workload + conflicts + risks overview.

function Portfolio({ state, onOpenProject, onOpenTask }) {
  const { projects } = state;
  const activeProjects = projects.filter((p) => p.status !== 'done' && p.status !== 'closed');
  const doneProjects = projects.filter((p) => p.status === 'done' || p.status === 'closed');
  const sortByPriority = (arr) => [...arr].sort((a, b) => {
    const po = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (po !== 0) return po;
    return a.name.localeCompare(b.name);
  });
  const sorted = sortByPriority(activeProjects);
  const sortedDone = sortByPriority(doneProjects);
  const [doneExpanded, setDoneExpanded] = React.useState(false);
  const [collapsedProgramIds, setCollapsedProgramIds] = React.useState(() => {
    const init = {};
    (state.programs || []).forEach(pg => { init[pg.id] = true; });
    return init;
  });
  const [closeProgramId, setCloseProgramId] = React.useState(null);

  const workload = workloadByDay(state, 14);
  const maxHours = Math.max(...workload.map((b) => b.hours), 8);
  const { overloaded, conflicts } = detectConflicts(state);
  const [activeDayDate, setActiveDayDate] = React.useState(null);
  const [expandedOverload, setExpandedOverload] = React.useState(null);
  const [expandedRiskId, setExpandedRiskId] = React.useState(null);
  const [editingRiskId, setEditingRiskId] = React.useState(null);
  const [showTopRisks, setShowTopRisks] = React.useState(true);
  const [taskDetailId, setTaskDetailId] = React.useState(null);
  const RR   = window.RiskRow;
  const TROM = window.TaskReadOnlyModal;
  const enabledFields = state?.meta?.riskFields || window.RISK_FIELDS_DEFAULT || ['category', 'response'];
  const activeDay = workload.find((b) => b.date === activeDayDate) || null;

  const taskDetail = taskDetailId ? state.tasks.find((t) => t.id === taskDetailId) : null;
  const taskDetailProject = taskDetail ? projects.find((p) => p.id === taskDetail.projectId) : null;

  // metrics
  const allTasks = state.tasks;
  const openTasks = allTasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const overdue = openTasks.filter((t) => t.dueDate && daysFromToday(t.dueDate) < 0);
  const blocked = openTasks.filter((t) => t.status === 'blocked' || (t.blockers || []).length);
  const totalRiskPeak = Math.max(0, ...state.risks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').map((r) => r.severity * r.likelihood));

  return (
    <>
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 14 }}>
        <div>
          <div className="title-h1">Portfolio</div>
          <div className="title-sub">
            {activeProjects.length} active projects · {openTasks.length} open tasks · reviewed {fmtRelative(state.meta.lastWeeklyReview)}
          </div>
        </div>
        <div className="row-flex">
          <span className="kbd">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Top-line metrics */}
      <div className="today-metrics" style={{ marginTop: 0, marginBottom: 18 }}>
        <div className="metric-cell">
          <span className="metric-label">Open tasks</span>
          <span className="metric-val">{openTasks.length}</span>
          <span className="metric-delta">{overdue.length} overdue · {blocked.length} blocked</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Critical projects</span>
          <span className="metric-val">{activeProjects.filter((p) => p.priority === 'critical').length}</span>
          <span className="metric-delta">of {activeProjects.length} active</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Peak risk</span>
          <span className="metric-val" style={{ color: totalRiskPeak >= 12 ? 'var(--danger)' : totalRiskPeak >= 8 ? 'var(--warn)' : 'var(--fg)' }}>
            {totalRiskPeak}
          </span>
          <span className="metric-delta">{state.risks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').length} open risks</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Next 14d load</span>
          <span className="metric-val">{workload.reduce((a, b) => a + b.hours, 0).toFixed(0)}<span style={{ fontSize: 13, color: 'var(--fg-3)' }}>h</span></span>
          <span className="metric-delta">{overloaded.length} days &gt;6h</span>
        </div>
      </div>

      {/* Workload + conflicts row */}
      <div className="grid g-2" style={{ marginBottom: 22 }}>
        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Workload · next 14 days</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>hrs estimated · 6h/day capacity</span>
          </div>
          <div className="workload">
            {workload.map((b, i) => {
              const h = b.hours;
              const cls = h > 6 ? 'over' : h > 4 ? 'med' : h > 0 ? 'ok' : 'idle';
              const isWeekend = b.day.getDay() === 0 || b.day.getDay() === 6;
              const isToday = i === 0;
              const isActive = activeDayDate === b.date;
              const barH = h > 0
                ? Math.max(10, Math.round((h / Math.max(maxHours, 8)) * 56))
                : 6;
              return (
                <div key={b.date} className={`workload-day workload-day-btn ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveDayDate(isActive ? null : b.date)}>
                  <div style={{ fontSize: 9, color: isActive ? 'var(--accent)' : 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontWeight: isActive ? 700 : 400 }}>{h || ''}</div>
                  <div className={`workload-bar ${cls} ${isToday ? 'today' : ''}`} style={{ height: `${barH}px`, opacity: isActive ? 1 : (h === 0 ? 0.35 : 0.85) }} />
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
                const p = projects.find((pp) => pp.id === t.projectId);
                return (
                  <div key={t.id} className="workload-task-row" onClick={() => setTaskDetailId(t.id)}>
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

        <div className="card">
          <div className="card-head">
            <span className="card-head-title">Overload days</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{overloaded.length} day{overloaded.length === 1 ? '' : 's'} &gt;6h</span>
          </div>
          <div>
            {overloaded.length === 0 ? (
              <EmptyState title="No overload" body="No day exceeds capacity in the next 14 days." icon="check" />
            ) : overloaded.slice(0, 5).map((b) => {
              const isExpanded = expandedOverload === b.date;
              const sorted = [...b.tasks].sort((x, y) => (y.estimate || 0) - (x.estimate || 0));
              return (
                <div key={b.date}>
                  <div className="overload-row overload-row-btn" onClick={() => setExpandedOverload(isExpanded ? null : b.date)}>
                    <div className="overload-date">
                      <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(b.date)}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{b.day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>
                        <span style={{ color: 'var(--warn)' }}>+{b.hours - 6}h over</span> · {b.tasks.length} tasks
                      </div>
                      {!isExpanded && (
                        <div style={{ color: 'var(--fg-3)', fontSize: 11, marginTop: 2 }} className="truncate">
                          {sorted.slice(0, 2).map((t) => `"${t.title}" (${t.estimate}h)`).join(', ')}
                        </div>
                      )}
                    </div>
                    <span className="pill pill-warn">{b.hours}h</span>
                    <Icon name={isExpanded ? 'chevronD' : 'chevronR'} size={10} />
                  </div>
                  {isExpanded && (
                    <div className="overload-expand">
                      {sorted.map((t) => {
                        const p = projects.find((pp) => pp.id === t.projectId);
                        return (
                          <div key={t.id} className="workload-task-row" onClick={() => setTaskDetailId(t.id)}>
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Cross-project top risks — no heatmap here (lives in Risks tab) */}
      <div className="card" style={{ marginBottom: 22 }}>
        <button className="card-head" style={{ width: '100%', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--fg-3)' }}
          onClick={() => setShowTopRisks((v) => !v)}>
          <span className="card-head-title" style={{ color: 'var(--fg-3)' }}>Top risks · all projects</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', marginLeft: 'auto' }}>
            {state.risks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').length} open · sorted by severity×likelihood
          </span>
          <Icon name={showTopRisks ? 'chevronD' : 'chevronR'} size={10} style={{ marginLeft: 8 }} />
        </button>
        {showTopRisks && <div>
          {state.risks.filter((r) => r.status !== 'closed' && r.status !== 'cancelled').length === 0 ? (
            <EmptyState title="No open risks" icon="check" />
          ) : state.risks
            .filter((r) => r.status !== 'closed' && r.status !== 'cancelled')
            .sort((a, b) => b.severity * b.likelihood - a.severity * a.likelihood)
            .slice(0, 5)
            .map((r) => {
              const p = projects.find((pp) => pp.id === r.projectId);
              return RR ? (
                <RR key={r.id} risk={r}
                  project={p}
                  expanded={expandedRiskId === r.id}
                  onToggleExpand={() => setExpandedRiskId((prev) => prev === r.id ? null : r.id)}
                  onEdit={() => setEditingRiskId(r.id)}
                  enabledFields={enabledFields}
                  hideFromRow={['category', 'response', 'reviewDate']} />
              ) : null;
            })}
        </div>}
      </div>

      {/* Project rows — grouped by program */}
      {(() => {
        const programs = state.programs || [];
        const toggleProgram = (id) => setCollapsedProgramIds(prev => ({ ...prev, [id]: !prev[id] }));

        // Build program groups including ALL projects (active + done/closed)
        const programGroups = programs
          .map(pg => {
            const allPgProjs = projects.filter(p => p.programId === pg.id);
            const activePgProjs = sorted.filter(p => p.programId === pg.id);
            const donePgProjs = sortedDone.filter(p => p.programId === pg.id);
            return { program: pg, projects: allPgProjs, activeProjects: activePgProjs, doneProjects: donePgProjs };
          })
          .filter(g => g.projects.length > 0);

        // Active programs vs completed/closed programs
        const activeProgramGroups = programGroups.filter(g => g.program.status !== 'done' && g.program.status !== 'closed');
        const doneProgramGroups = programGroups.filter(g => g.program.status === 'done' || g.program.status === 'closed');

        const standaloneProjects = sorted.filter(p => !p.programId);
        const standaloneDone = sortedDone.filter(p => !p.programId);
        const totalCount = activeProgramGroups.length + standaloneProjects.length;

        return (
          <>
            <div className="sh">
              <span className="sh-title">Programs</span>
              <span className="sh-meta">{totalCount}</span>
            </div>

            {totalCount === 0 && (
              <EmptyState title="No active projects" body="All projects are completed or closed." icon="check" />
            )}

            <div className="pcard-stack">
              {activeProgramGroups.map(({ program: pg, projects: pgProjs, activeProjects: pgActive, doneProjects: pgDone }) => {
                const isCollapsed = !!collapsedProgramIds[pg.id];
                const allFinished = pgProjs.every(p => p.status === 'done' || p.status === 'closed');
                return (
                  <div key={pg.id}>
                    <ProgramRow
                      program={pg}
                      projects={pgProjs}
                      state={state}
                      collapsed={isCollapsed}
                      onToggle={() => toggleProgram(pg.id)}
                      onView={() => actions.setMeta({ activeView: 'program', activeProgramId: pg.id })}
                    />
                    {!isCollapsed && pgProjs.length > 0 && (
                      <div className="prow-children">
                        {[...pgActive, ...pgDone].map((p) => (
                          <ProjectChildRow key={p.id} project={p} state={state} onOpen={() => onOpenProject(p.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {standaloneProjects.map(p => (
                <StandaloneRow key={p.id} project={p} state={state} onOpen={() => onOpenProject(p.id)}
                  onView={() => onOpenProject(p.id)} />
              ))}
            </div>

            {/* Completed & Closed section */}
            {(doneProgramGroups.length > 0 || standaloneDone.length > 0) && (
              <div className="card" style={{ marginTop: 16 }}>
                <div className="tgroup-head tgroup-head-toggle" style={{ borderTop: 'none' }} onClick={() => setDoneExpanded(x => !x)}>
                  <Icon name={doneExpanded ? 'chevronD' : 'chevronR'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                  <span>Completed &amp; Closed</span>
                  <span className="tgroup-head-count">
                    {doneProgramGroups.length + standaloneDone.length}
                  </span>
                </div>
                {doneExpanded && (
                  <div>
                    {doneProgramGroups.map(({ program: pg, projects: pgProjs, activeProjects: pgActive, doneProjects: pgDone }) => {
                      const isCollapsed = collapsedProgramIds[pg.id] !== false;
                      const pgTone = pg.status === 'done' ? 'ok' : 'neutral';
                      return (
                        <React.Fragment key={pg.id}>
                          <div className="prow-done-row prow-done-row-toggle" onClick={() => toggleProgram(pg.id)}>
                            <Icon name={isCollapsed ? 'chevronR' : 'chevronD'} size={10} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
                            <span className="prow-done-tag">Program · {pgProjs.length}P</span>
                            <span className="prow-done-name truncate">{pg.name}</span>
                            <Pill tone={pgTone}>{PROJECT_STATUS_LABEL[pg.status] || 'Completed'}</Pill>
                            <button className="prow-view-btn" onClick={(e) => { e.stopPropagation(); actions.setMeta({ activeView: 'program', activeProgramId: pg.id }); }}>View →</button>
                          </div>
                          {!isCollapsed && pgProjs.map((p) => {
                            const pTone = p.status === 'done' ? 'ok' : 'neutral';
                            return (
                              <div key={p.id} className="prow-done-row prow-done-row-child" onClick={() => onOpenProject(p.id)}>
                                <span />
                                <span className="prow-done-tag">{p.code}</span>
                                <span className="prow-done-name truncate">{p.name}</span>
                                <Pill tone={pTone}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
                                <button className="prow-view-btn" onClick={(e) => { e.stopPropagation(); onOpenProject(p.id); }}>View →</button>
                              </div>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    {standaloneDone.map((p) => {
                      const pTone = p.status === 'done' ? 'ok' : 'neutral';
                      return (
                        <div key={p.id} className="prow-done-row" onClick={() => onOpenProject(p.id)}>
                          <span />
                          <span className="prow-done-tag">Project</span>
                          <span className="prow-done-name truncate">{p.name}</span>
                          <Pill tone={pTone}>{PROJECT_STATUS_LABEL[p.status]}</Pill>
                          <button className="prow-view-btn" onClick={(e) => { e.stopPropagation(); onOpenProject(p.id); }}>View →</button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}
      <div style={{ marginBottom: 22 }} />

      {/* Stale projects */}
      {(() => {
        const stale = staleProjects(state, 10);
        if (!stale.length) return null;
        return (
          <div className="card" style={{ marginBottom: 18, borderLeft: '2px solid var(--warn)' }}>
            <div className="card-head">
              <span className="card-head-title"><Icon name="clock" size={11} /> Stale projects</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>no updates in 10+ days</span>
            </div>
            <div style={{ padding: '2px 4px' }}>
              {stale.map((p) => (
                <div key={p.id} className="stale-row" onClick={() => onOpenProject(p.id)}>
                  <span className={`sb-proj-dot pc-${p.status}`} />
                  <span className="mono" style={{ fontSize: 11 }}>{p.code}</span>
                  <span className="truncate">{p.name}</span>
                  <span className="mono" style={{ color: 'var(--fg-4)', fontSize: 11 }}>due {fmtDate(p.dueDate)}</span>
                  <Pill tone="warn">stale</Pill>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>

    {/* Read-only task detail modal */}
    {taskDetailId && TROM && (
      <TROM
        taskId={taskDetailId}
        state={state}
        onClose={() => setTaskDetailId(null)}
        onEdit={(id) => { setTaskDetailId(null); onOpenTask && onOpenTask(id || taskDetailId); }}
        onJumpTo={(id) => setTaskDetailId(id)}
      />
    )}
    {/* Risk edit modal */}
    {editingRiskId && window.RiskModal && (
      <window.RiskModal
        riskId={editingRiskId}
        state={state}
        onClose={() => setEditingRiskId(null)}
      />
    )}

    {/* Close program confirmation modal */}
    {closeProgramId && (() => {
      const pg = (state.programs || []).find(p => p.id === closeProgramId);
      if (!pg) return null;
      return (
        <Modal open title={`Close program: ${pg.name}`} onClose={() => setCloseProgramId(null)}>
          <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.5 }}>
            Mark this program as <strong>Closed</strong>? All associated projects are already completed or closed.
          </div>
          <div className="modal-foot">
            <button className="btn" onClick={() => setCloseProgramId(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => {
              actions.updateProgram(closeProgramId, { status: 'closed', closedDate: new Date().toISOString().slice(0, 10) });
              setCloseProgramId(null);
            }}>Close program</button>
          </div>
        </Modal>
      );
    })()}
    </>
  );
}

// --- Shared helpers for row components ---
function rowStatusTone(status) {
  return { 'on-track': 'ok', 'at-risk': 'warn', 'blocked': 'danger', 'done': 'neutral', 'closed': 'neutral' }[status] || 'neutral';
}
function rowProgTone(status) {
  return status === 'blocked' ? 'danger' : status === 'at-risk' ? 'warn' : 'ok';
}
function rowProgressColor(status) {
  return status === 'blocked' ? 'var(--danger)' : status === 'at-risk' ? 'var(--warn)' : 'var(--ok)';
}

function ProgramRow({ program, projects, state, collapsed, onToggle, onView }) {
  const allTasks = state.tasks.filter(t => projects.some(p => p.id === t.projectId));
  const openTasks = allTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const overdue = openTasks.filter(t => t.dueDate && daysFromToday(t.dueDate) < 0);
  const avgPct = projects.length
    ? Math.round(projects.reduce((s, p) => s + (projectProgress(state, p.id).pct || 0), 0) / projects.length)
    : 0;
  const effectiveStatus = (program.status === 'done' || program.status === 'closed' || program.status === 'planned')
    ? program.status
    : (['blocked', 'at-risk', 'on-track', 'done'].find(s => projects.some(p => p.status === s)) || 'on-track');
  const bestPriority = [...projects].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0]?.priority;
  const activeCount = projects.filter(p => p.status !== 'done' && p.status !== 'closed').length;
  const latestDue = projects.filter(p => p.dueDate).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(-1)[0]?.dueDate;

  return (
    <div className="prow" onClick={onToggle} style={{ userSelect: 'none' }}>
      <div className={`prow-accent prow-accent-${effectiveStatus}`} />
      <div className="prow-ident">
        <div className="prow-tag">
          <Icon name="chevronD" size={10} className={collapsed ? 'prow-tag-chev-closed' : 'prow-tag-chev-open'} />
          <span>Program · {projects.length}P</span>
        </div>
        <div className="prow-title" title={program.name}>
          <span className="prow-title-code">{program.name.match(/^[A-Z0-9]+\.?\s*/)?.[0] || ''}</span>
          {program.name.replace(/^[A-Z0-9]+\.?\s*/, '') || program.name}
        </div>
        {program.description && <div className="prow-obj" title={program.description}>{program.description}</div>}
      </div>
      <div className="prow-pills">
        {bestPriority && <PriorityBadge priority={bestPriority} />}
        <Pill tone={rowStatusTone(effectiveStatus)}>{PROJECT_STATUS_LABEL[effectiveStatus]}</Pill>
      </div>
      <div className="prow-progress">
        <div className="prow-progress-head">
          <span>{activeCount} active · {avgPct}% avg</span>
          <span>{latestDue ? `due ${fmtDate(latestDue)}` : ''}</span>
        </div>
        <div className="prow-progress-bar">
          <div className="prow-progress-fill" style={{ width: `${Math.max(0, Math.min(100, avgPct))}%`, background: rowProgressColor(effectiveStatus) }} />
        </div>
      </div>
      <div className="prow-overdue">
        <span className="prow-overdue-label">Overdue</span>
        <span className="prow-overdue-val" style={{ color: overdue.length ? 'var(--danger)' : undefined }}>{overdue.length}</span>
      </div>
      <div className="prow-actions">
        {onView && (
          <button className="prow-view-btn" onClick={(e) => { e.stopPropagation(); onView(); }}>View →</button>
        )}
      </div>
    </div>
  );
}

function ProjectChildRow({ project, state, onOpen, muted = false }) {
  const prog = projectProgress(state, project.id);
  const openTasks = state.tasks.filter(t => t.projectId === project.id && t.status !== 'done' && t.status !== 'cancelled');
  const overdue = openTasks.filter(t => t.dueDate && daysFromToday(t.dueDate) < 0);
  const statusTone = rowStatusTone(project.status);

  return (
    <div className="prow-child" onClick={onOpen} style={muted ? { opacity: 0.65 } : undefined}>
      <div className="prow-ident" style={{ paddingLeft: 0 }}>
        <div className="prow-tag"><span>{project.code}</span></div>
        <div className="prow-title" title={project.name}>
          {project.name}
        </div>
        {project.objective && <div className="prow-obj" title={project.objective}>{project.objective}</div>}
      </div>
      <div className="prow-pills">
        <PriorityBadge priority={project.priority} />
        <Pill tone={statusTone}>{PROJECT_STATUS_LABEL[project.status]}</Pill>
      </div>
      <div className="prow-progress">
        <div className="prow-progress-head">
          <span>{prog.done}/{prog.total} · {prog.pct}%</span>
          <span>{project.dueDate ? `due ${fmtDate(project.dueDate)}` : ''}</span>
        </div>
        <div className="prow-progress-bar">
          <div className="prow-progress-fill" style={{ width: `${Math.max(0, Math.min(100, prog.pct))}%`, background: rowProgressColor(project.status) }} />
        </div>
      </div>
      <div className="prow-overdue">
        <span className="prow-overdue-label">Overdue</span>
        <span className="prow-overdue-val" style={{ color: overdue.length ? 'var(--danger)' : undefined }}>{overdue.length}</span>
      </div>
      <div className="prow-actions" />
    </div>
  );
}

function StandaloneRow({ project, state, onOpen, onView, muted = false }) {
  const prog = projectProgress(state, project.id);
  const openTasks = state.tasks.filter(t => t.projectId === project.id && t.status !== 'done' && t.status !== 'cancelled');
  const overdue = openTasks.filter(t => t.dueDate && daysFromToday(t.dueDate) < 0);
  const statusTone = rowStatusTone(project.status);

  return (
    <div className="prow" onClick={onOpen} style={muted ? { opacity: 0.65 } : undefined}>
      <div className={`prow-accent prow-accent-${project.status}`} />
      <div className="prow-ident">
        <div className="prow-tag">
          <span style={{ fontSize: 11 }}>◇</span>
          <span>Standalone Project</span>
        </div>
        <div className="prow-title" title={project.name}>{project.name}</div>
        {project.objective && <div className="prow-obj" title={project.objective}>{project.objective}</div>}
      </div>
      <div className="prow-pills">
        <PriorityBadge priority={project.priority} />
        <Pill tone={statusTone}>{PROJECT_STATUS_LABEL[project.status]}</Pill>
      </div>
      <div className="prow-progress">
        <div className="prow-progress-head">
          <span>{prog.done}/{prog.total} · {prog.pct}%</span>
          <span>{project.dueDate ? `due ${fmtDate(project.dueDate)}` : ''}</span>
        </div>
        <div className="prow-progress-bar">
          <div className="prow-progress-fill" style={{ width: `${Math.max(0, Math.min(100, prog.pct))}%`, background: rowProgressColor(project.status) }} />
        </div>
      </div>
      <div className="prow-overdue">
        <span className="prow-overdue-label">Overdue</span>
        <span className="prow-overdue-val" style={{ color: overdue.length ? 'var(--danger)' : undefined }}>{overdue.length}</span>
      </div>
      <div className="prow-actions">
        {onView && (
          <button className="prow-view-btn" onClick={(e) => { e.stopPropagation(); onView(); }}>View →</button>
        )}
      </div>
    </div>
  );
}

function RiskMatrix({ risks, projects, onRisk }) {
  // 5x5 matrix: rows = severity (5 top), cols = likelihood (1 left)
  const cells = {};
  for (let sev = 5; sev >= 1; sev--) {
    for (let lik = 1; lik <= 5; lik++) {
      cells[`${sev}-${lik}`] = [];
    }
  }
  risks.forEach((r) => {
    const key = `${r.severity}-${r.likelihood}`;
    if (cells[key]) cells[key].push(r);
  });
  const toneFor = (sev, lik) => {
    const s = sev * lik;
    if (s >= 16) return 'rm-crit';
    if (s >= 10) return 'rm-high';
    if (s >= 6) return 'rm-med';
    return 'rm-low';
  };
  return (
    <div>
      <div className="risk-matrix">
        <div className="rm-y-label" style={{ gridRow: '1 / 6' }}>Severity →</div>
        {[5, 4, 3, 2, 1].map((sev, rIdx) =>
          [1, 2, 3, 4, 5].map((lik) => {
            const list = cells[`${sev}-${lik}`];
            return (
              <div key={`${sev}-${lik}`} className={`rm-cell ${toneFor(sev, lik)}`} style={{ gridRow: rIdx + 1, gridColumn: lik + 1 }} title={list.map((r) => r.title).join('\n')}>
                {list.length > 0 && <span className="rm-cell-count">{list.length}</span>}
              </div>
            );
          })
        )}
        <div className="rm-x-label">Likelihood →</div>
      </div>
    </div>
  );
}

Object.assign(window, { Portfolio, ProgramRow, ProjectChildRow, StandaloneRow, RiskMatrix });
