// Weekly review + metrics view.

function ReviewView({ state }) {
  const [compiling, setCompiling] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [expandedIds, setExpandedIds] = React.useState({});
  const toggleExpand = (id) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const compile = () => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    const completed = state.tasks.filter((t) => t.status === 'done' && t.completedAt && t.completedAt >= weekStartStr);
    const delayed = state.tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < new Date().toISOString().slice(0, 10) && t.dueDate >= weekStartStr);
    const blocked = state.tasks.filter((t) => t.status === 'blocked' || (t.blockers || []).length > 0);
    const planned = completed.filter((t) => t.source !== 'reactive').length;
    const reactive = completed.filter((t) => t.source === 'reactive').length;
    const plannedRatio = completed.length ? planned / completed.length : 0;

    // On-time rate: % of completed tasks (with a due date) finished on or before due.
    const withDue = completed.filter((t) => t.dueDate);
    const onTime = withDue.filter((t) => t.completedAt <= t.dueDate).length;
    const onTimeRate = withDue.length ? Math.round((onTime / withDue.length) * 100) : null;

    setDraft({
      weekOf: weekStartStr,
      completed: completed.length,
      delayed: delayed.length,
      blocked: blocked.length,
      plannedRatio,
      onTimeRate: onTimeRate,
      completedTasks: completed,
      delayedTasks: delayed,
      blockedTasks: blocked,
      note: '',
    });
    setCompiling(true);
  };

  const history = state.weeklyReviews;
  const completionSpark = history.slice().reverse().map((r) => r.completed);
  const onTimeSpark = history.slice().reverse().map((r) => r.onTimeRate ?? 0);
  const plannedSpark = history.slice().reverse().map((r) => r.plannedRatio * 100);

  // Live metrics
  const allCompleted = state.tasks.filter((t) => t.status === 'done').length;
  const totalTasks = state.tasks.length;
  const completionRate = totalTasks ? Math.round((allCompleted / totalTasks) * 100) : 0;
  const doneTasks = state.tasks.filter((t) => t.status === 'done');
  const doneWithDue = doneTasks.filter((t) => t.dueDate);
  const doneOnTime = doneWithDue.filter((t) => t.completedAt && t.completedAt <= t.dueDate).length;
  const onTimeRateLive = doneWithDue.length ? Math.round((doneOnTime / doneWithDue.length) * 100) : 0;
  const plannedVsReactive = (() => {
    const done = state.tasks.filter((t) => t.status === 'done');
    if (!done.length) return { plannedPct: 0, planned: 0, reactive: 0 };
    const reactive = done.filter((t) => t.source === 'reactive').length;
    const planned = done.length - reactive;
    return { plannedPct: Math.round((planned / done.length) * 100), planned, reactive };
  })();

  return (
    <div className="content-narrow">
      <div className="row-flex-sb" style={{ marginBottom: 14 }}>
        <div>
          <div className="title-h1">Weekly review</div>
          <div className="title-sub">Last review {fmtRelative(state.meta.lastWeeklyReview)} · {history.length} reviews on file</div>
        </div>
        <button className="btn btn-primary" onClick={compile}><Icon name="bolt" size={12} /> Compile this week</button>
      </div>

      {/* Live metrics */}
      <div className="today-metrics" style={{ marginTop: 0, marginBottom: 18 }}>
        <div className="metric-cell">
          <span className="metric-label">Completion rate</span>
          <span className="metric-val">{completionRate}<span style={{ fontSize: 13, color: 'var(--fg-3)' }}>%</span></span>
          <span className="metric-delta">{allCompleted} / {totalTasks} all-time</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">On-time rate</span>
          <span className="metric-val">{onTimeRateLive}<span style={{ fontSize: 13, color: 'var(--fg-3)' }}>%</span></span>
          <span className="metric-delta">{doneOnTime} / {doneWithDue.length} with due dates</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Planned work</span>
          <span className="metric-val">{plannedVsReactive.plannedPct}<span style={{ fontSize: 13, color: 'var(--fg-3)' }}>%</span></span>
          <span className="metric-delta">{plannedVsReactive.reactive} reactive</span>
        </div>
        <div className="metric-cell">
          <span className="metric-label">Open blockers</span>
          <span className="metric-val" style={{ color: state.blockers.length ? 'var(--danger)' : 'var(--fg)' }}>{state.blockers.length}</span>
          <span className="metric-delta">waiting on others</span>
        </div>
      </div>

      {/* Trend sparklines */}
      {history.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <span className="card-head-title">Trends · last {history.length} reviews</span>
          </div>
          <div style={{ padding: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
            <TrendCell label="Completed / week" values={completionSpark} latest={history[0].completed} />
            <TrendCell label="On-time %" values={onTimeSpark} latest={`${history[0].onTimeRate ?? 0}%`} tone="ok" />
            <TrendCell label="Planned %" values={plannedSpark} latest={`${Math.round(history[0].plannedRatio * 100)}%`} tone="ok" />
          </div>
        </div>
      )}

      {/* Review compiler */}
      {compiling && draft && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-head">
            <span className="card-head-title">Review for week of {fmtDate(draft.weekOf)}</span>
            <button className="icon-btn" onClick={() => { setCompiling(false); setDraft(null); }}><Icon name="x" /></button>
          </div>
          <div style={{ padding: 14 }}>
            <div className="grid g-3" style={{ marginBottom: 14 }}>
              <div className="metric-cell">
                <span className="metric-label">Completed</span>
                <span className="metric-val" style={{ color: 'var(--ok)' }}>{draft.completed}</span>
              </div>
              <div className="metric-cell">
                <span className="metric-label">Delayed</span>
                <span className="metric-val" style={{ color: draft.delayed > 0 ? 'var(--warn)' : 'var(--fg)' }}>{draft.delayed}</span>
              </div>
              <div className="metric-cell">
                <span className="metric-label">Blocked</span>
                <span className="metric-val" style={{ color: draft.blocked > 0 ? 'var(--danger)' : 'var(--fg)' }}>{draft.blocked}</span>
              </div>
            </div>

            <div className="grid g-3">
              <div>
                <div className="sh"><span className="sh-title" style={{ color: 'var(--ok)' }}>Completed</span><span className="sh-meta">{draft.completedTasks.length}</span></div>
                <div className="stack-sm">
                  {draft.completedTasks.slice(0, 8).map((t) => {
                    const timing = t.daysEarlyLate != null
                      ? t.daysEarlyLate > 0 ? { label: `${t.daysEarlyLate}d early`, color: 'var(--ok)' }
                      : t.daysEarlyLate < 0 ? { label: `${Math.abs(t.daysEarlyLate)}d late`, color: 'var(--danger)' }
                      : { label: 'on time', color: 'var(--fg-4)' }
                      : null;
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <Icon name="check" size={11} />
                        <span className="truncate" style={{ color: 'var(--fg-2)' }}>{t.title}</span>
                        {timing && <span className="mono" style={{ fontSize: 10, color: timing.color, flexShrink: 0 }}>{timing.label}</span>}
                      </div>
                    );
                  })}
                  {draft.completedTasks.length === 0 && <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>No completions this week.</span>}
                </div>
              </div>
              <div>
                <div className="sh"><span className="sh-title" style={{ color: 'var(--warn)' }}>Delayed</span><span className="sh-meta">{draft.delayedTasks.length}</span></div>
                <div className="stack-sm">
                  {draft.delayedTasks.slice(0, 8).map((t) => (
                    <div key={t.id} className="row-flex" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                      <Icon name="clock" size={11} />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {draft.delayedTasks.length === 0 && <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>None.</span>}
                </div>
              </div>
              <div>
                <div className="sh"><span className="sh-title" style={{ color: 'var(--danger)' }}>Blocked</span><span className="sh-meta">{draft.blockedTasks.length}</span></div>
                <div className="stack-sm">
                  {draft.blockedTasks.slice(0, 8).map((t) => (
                    <div key={t.id} className="row-flex" style={{ fontSize: 12, color: 'var(--fg-2)' }}>
                      <Icon name="block" size={11} />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {draft.blockedTasks.length === 0 && <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>None.</span>}
                </div>
              </div>
            </div>

            <div className="field" style={{ marginTop: 14 }}>
              <span className="field-label">Observations & decisions</span>
              <textarea className="textarea" placeholder="What went well, what's off-track, what to change next week…" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </div>

            <div className="modal-foot">
              <button className="btn" onClick={() => { setCompiling(false); setDraft(null); }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                actions.addWeeklyReview({
                  weekOf: draft.weekOf,
                  completed: draft.completed,
                  delayed: draft.delayed,
                  blocked: draft.blocked,
                  plannedRatio: draft.plannedRatio,
                  onTimeRate: draft.onTimeRate,
                  note: draft.note,
                  completedTasks: draft.completedTasks,
                  delayedTasks: draft.delayedTasks,
                  blockedTasks: draft.blockedTasks,
                });
                setCompiling(false);
                setDraft(null);
              }}>Save review</button>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="sh"><span className="sh-title">History</span><span className="sh-meta">{history.length}</span></div>
      <div className="stack">
        {history.length === 0 ? (
          <EmptyState title="No reviews yet" body="Compile your first weekly review to start tracking trends." icon="calendar" />
        ) : history.map((r) => {
          const isOpen = !!expandedIds[r.id];

          // Reconstruct task lists for reviews saved before snapshots were added
          const weekEnd = new Date(r.weekOf);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const weekEndStr = weekEnd.toISOString().slice(0, 10);
          const completedTasks = r.completedTasks?.length
            ? r.completedTasks
            : state.tasks.filter((t) => t.completedAt >= r.weekOf && t.completedAt < weekEndStr)
                .map((t) => ({ id: t.id, title: t.title, priority: t.priority, projectId: t.projectId, daysEarlyLate: t.daysEarlyLate }));
          const delayedTasks = r.delayedTasks?.length
            ? r.delayedTasks
            : state.tasks.filter((t) => t.status !== 'done' && t.dueDate >= r.weekOf && t.dueDate < weekEndStr && t.dueDate < new Date().toISOString().slice(0, 10))
                .map((t) => ({ id: t.id, title: t.title, priority: t.priority }));
          const blockedTasks = r.blockedTasks?.length
            ? r.blockedTasks
            : state.tasks.filter((t) => (t.status === 'blocked' || (t.blockers || []).length) && t.updatedAt >= r.weekOf && t.updatedAt < weekEndStr)
                .map((t) => ({ id: t.id, title: t.title, priority: t.priority }));

          const earlyCount = completedTasks.filter((t) => t.daysEarlyLate > 0).length;
          const lateCount = completedTasks.filter((t) => t.daysEarlyLate < 0).length;

          return (
            <div key={r.id} className="review-card review-card-btn" onClick={() => toggleExpand(r.id)}>
              <div className="row-flex-sb" style={{ marginBottom: isOpen ? 14 : 0 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>Week of {fmtDate(r.weekOf)}</div>
                  <div className="mono" style={{ color: 'var(--fg-4)', fontSize: 11, marginTop: 2 }}>{fmtRelative(r.weekOf)}</div>
                </div>
                <div className="row-flex">
                  <Pill tone="ok">{r.completed} done</Pill>
                  {r.delayed > 0 && <Pill tone="warn">{r.delayed} late</Pill>}
                  {r.blocked > 0 && <Pill tone="danger">{r.blocked} blocked</Pill>}
                  {earlyCount > 0 && <Pill tone="info">{earlyCount} early</Pill>}
                  <Icon name={isOpen ? 'chevronD' : 'chevronR'} size={11} />
                </div>
              </div>

              {isOpen && (
                <div onClick={(e) => e.stopPropagation()}>
                  <div className="grid g-2" style={{ marginBottom: 14 }}>
                    <div>
                      <div className="bar-compare">
                        <div className="bar-compare-bar">
                          <div className="bar-compare-fill" style={{ width: `${Math.round(r.plannedRatio * 100)}%`, background: 'var(--ok)' }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11 }}>{Math.round(r.plannedRatio * 100)}% planned</span>
                      </div>
                      <div className="bar-compare">
                        <div className="bar-compare-bar">
                          <div className="bar-compare-fill" style={{ width: `${r.onTimeRate ?? 0}%`, background: 'var(--accent)' }} />
                        </div>
                        <span className="mono" style={{ fontSize: 11 }}>{r.onTimeRate ?? 0}% on time</span>
                      </div>
                      {(earlyCount > 0 || lateCount > 0) && (
                        <div style={{ marginTop: 8, fontSize: 11.5 }}>
                          {earlyCount > 0 && <span style={{ color: 'var(--ok)', marginRight: 12 }}>↑ {earlyCount} early</span>}
                          {lateCount > 0 && <span style={{ color: 'var(--danger)' }}>↓ {lateCount} late</span>}
                        </div>
                      )}
                    </div>
                    <div style={{ color: 'var(--fg-2)', fontSize: 12.5, lineHeight: 1.5 }}>
                      {r.note || <span style={{ color: 'var(--fg-4)' }}>No observations recorded.</span>}
                    </div>
                  </div>

                  <div className="grid g-3" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                    <ReviewTaskList title="Completed" tone="ok" icon="check" tasks={completedTasks} showTiming />
                    <ReviewTaskList title="Delayed" tone="warn" icon="clock" tasks={delayedTasks} />
                    <ReviewTaskList title="Blocked" tone="danger" icon="block" tasks={blockedTasks} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewTaskList({ title, tone, icon, tasks, showTiming }) {
  return (
    <div>
      <div className="sh" style={{ marginBottom: 6 }}>
        <span className="sh-title" style={{ color: `var(--${tone})` }}>{title}</span>
        <span className="sh-meta">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <span style={{ color: 'var(--fg-4)', fontSize: 12 }}>None.</span>
      ) : tasks.map((t) => {
        const timing = showTiming && t.daysEarlyLate != null
          ? t.daysEarlyLate > 0 ? { label: `${t.daysEarlyLate}d early`, color: 'var(--ok)' }
          : t.daysEarlyLate < 0 ? { label: `${Math.abs(t.daysEarlyLate)}d late`, color: 'var(--danger)' }
          : { label: 'on time', color: 'var(--fg-4)' }
          : null;
        return (
          <div key={t.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <Icon name={icon} size={11} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fg-2)', lineHeight: 1.4 }}>{t.title}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                  {t.priority && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)' }}>{t.priority}</span>}
                  {timing && <span className="mono" style={{ fontSize: 10, color: timing.color }}>{timing.label}</span>}
                </div>
              </div>
            </div>
            {t.completionNote && (
              <div style={{ marginLeft: 17, marginTop: 3, fontSize: 11.5, color: 'var(--fg-3)', lineHeight: 1.5, fontStyle: 'italic' }}>
                "{t.completionNote}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrendCell({ label, values, latest, tone = 'accent' }) {
  return (
    <div>
      <div className="metric-label" style={{ marginBottom: 6 }}>{label}</div>
      <div className="row-flex" style={{ gap: 14 }}>
        <span style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{latest}</span>
        <Sparkline values={values.length ? values : [0]} tone={tone} />
      </div>
    </div>
  );
}

Object.assign(window, { ReviewView });
