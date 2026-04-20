// Global search.

const { useState: useStateSearch, useMemo: useMemoSearch } = React;

function SearchView({ state, initialQ = '' }) {
  const [q, setQ] = useStateSearch(initialQ);
  const results = useMemoSearch(() => globalSearch(state, q), [state, q]);
  const total = results.projects.length + results.tasks.length + results.notes.length +
    results.risks.length + results.milestones.length + results.meetings.length +
    results.blockers.length + results.jira.length + results.pages.length;

  const noteDisplayId = (n) => {
    const num = n.id.replace(/^n-/, '');
    if (n.kind === 'question') return `Q-${num}`;
    if (n.kind === 'decision') return `D-${num}`;
    return n.id.toUpperCase();
  };

  return (
    <div className="search-wrap">
      <div className="page-hd">
        <div style={{ width: '100%' }}>
          <div className="page-title">Search</div>
          <input
            autoFocus
            className="search-big"
            placeholder="Search by title, ID, tag, assignee, status, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="page-sub">{q.length < 2 ? 'Type at least 2 characters' : `${total} result${total !== 1 ? 's' : ''}`}</div>
        </div>
      </div>

      {q.length >= 2 && (
        <div className="search-results">
          {results.projects.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Projects <span>{results.projects.length}</span></div>
              {results.projects.map((p) => (
                <div key={p.id} className="search-row" onClick={() => actions.setActiveProject(p.id)}>
                  <span className="dot" style={{ background: p.color }} />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--fg-4)', flexShrink: 0 }}>{p.code}</span>
                  <span className="truncate">{p.name}</span>
                  <span style={{ color: 'var(--fg-4)', fontSize: 11 }} className="truncate">{p.objective}</span>
                </div>
              ))}
            </div>
          )}

          {results.tasks.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Tasks <span>{results.tasks.length}</span></div>
              {results.tasks.slice(0, 25).map((t) => {
                const p = state.projects.find((pp) => pp.id === t.projectId);
                return (
                  <div key={t.id} className="search-row" onClick={() => actions.openTask(t.id)}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{t.id.toUpperCase()}</span>
                    <PriorityBadge priority={t.priority} />
                    <span className="truncate">{t.title}</span>
                    {p && <ProjectChip project={p} />}
                    <DueChip date={t.dueDate} small />
                  </div>
                );
              })}
            </div>
          )}

          {results.notes.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Decisions &amp; Questions <span>{results.notes.length}</span></div>
              {results.notes.slice(0, 20).map((n) => {
                const p = state.projects.find((pp) => pp.id === n.projectId);
                const tab = n.kind === 'decision' ? 'decisions' : n.kind === 'question' ? 'questions' : 'notes';
                return (
                  <div key={n.id} className="search-row" onClick={() => { actions.setActiveProject(n.projectId); actions.setActiveView('project-detail', { tab }); }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{noteDisplayId(n)}</span>
                    <span className="pill pill-ghost" style={{ flexShrink: 0 }}>{n.kind}</span>
                    <span className="truncate" style={{ fontWeight: 500 }}>{n.title}</span>
                    {p && <ProjectChip project={p} />}
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>{fmtDate(n.date)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results.risks.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Risks <span>{results.risks.length}</span></div>
              {results.risks.slice(0, 15).map((r) => {
                const p = state.projects.find((pp) => pp.id === r.projectId);
                return (
                  <div key={r.id} className="search-row" onClick={() => { actions.setActiveProject(r.projectId); actions.setActiveView('project-detail', { tab: 'risks' }); }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{r.id.toUpperCase()}</span>
                    <span className="pill pill-warn" style={{ flexShrink: 0 }}>risk</span>
                    <span className="truncate">{r.title}</span>
                    {p && <ProjectChip project={p} />}
                    <span style={{ color: 'var(--fg-4)', fontSize: 11, flexShrink: 0 }}>sev {r.severity} · {r.category}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results.milestones.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Milestones <span>{results.milestones.length}</span></div>
              {results.milestones.slice(0, 15).map((ms) => {
                const p = state.projects.find((pp) => pp.id === ms.projectId);
                return (
                  <div key={ms.id} className="search-row" onClick={() => { actions.setActiveProject(ms.projectId); actions.setActiveView('project-detail', { tab: 'overview' }); }}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{ms.id.toUpperCase()}</span>
                    <Icon name="milestone" size={12} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                    <span className="truncate">{ms.title}</span>
                    {p && <ProjectChip project={p} />}
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>{fmtDate(ms.date)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results.meetings.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Meetings <span>{results.meetings.length}</span></div>
              {results.meetings.slice(0, 15).map((mt) => {
                const firstProject = mt.projectIds && mt.projectIds[0] ? state.projects.find((pp) => pp.id === mt.projectIds[0]) : null;
                return (
                  <div key={mt.id} className="search-row" onClick={() => actions.setActiveView('meetings')}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{mt.id.toUpperCase()}</span>
                    <Icon name="calendar" size={12} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
                    <span className="truncate">{mt.title}</span>
                    {firstProject && <ProjectChip project={firstProject} />}
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>{fmtDate(mt.date)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {results.blockers.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Blockers <span>{results.blockers.length}</span></div>
              {results.blockers.slice(0, 15).map((b) => {
                const task = state.tasks.find((t) => t.id === b.taskId);
                return (
                  <div key={b.id} className="search-row" onClick={() => task && actions.openTask(task.id)}>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{b.id.toUpperCase()}</span>
                    <span className="pill pill-danger" style={{ flexShrink: 0 }}>blocker</span>
                    <span className="truncate">{b.description}</span>
                    {b.waitingOn && <span style={{ color: 'var(--fg-4)', fontSize: 11, flexShrink: 0 }}>↪ {b.waitingOn}</span>}
                    {task && <span className="mono" style={{ fontSize: 10, color: 'var(--fg-4)', flexShrink: 0 }}>{task.id.toUpperCase()}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {results.jira.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Jira issues <span>{results.jira.length}</span></div>
              {results.jira.slice(0, 15).map((i) => (
                <div key={i.key} className="search-row" onClick={() => actions.setActiveView('jira')}>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)', flexShrink: 0 }}>{i.key}</span>
                  <span className="truncate">{i.summary}</span>
                  <span className="pill pill-ghost" style={{ flexShrink: 0 }}>{i.status}</span>
                  {i.assignee && <span style={{ color: 'var(--fg-4)', fontSize: 11, flexShrink: 0 }}>{i.assignee}</span>}
                </div>
              ))}
            </div>
          )}

          {results.pages.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Confluence pages <span>{results.pages.length}</span></div>
              {results.pages.slice(0, 15).map((p) => (
                <div key={p.id} className="search-row" onClick={() => actions.setActiveView('confluence', { pageId: p.id })}>
                  <Icon name="doc" size={12} style={{ flexShrink: 0 }} />
                  <span className="truncate">{p.title}</span>
                  <span style={{ color: 'var(--fg-4)', fontSize: 11 }} className="truncate">{p.space}</span>
                </div>
              ))}
            </div>
          )}

          {total === 0 && <div className="empty">No results.</div>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SearchView });
