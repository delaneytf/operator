// Global search.

const { useState: useStateSearch, useMemo: useMemoSearch } = React;

function SearchView({ state, initialQ = '' }) {
  const [q, setQ] = useStateSearch(initialQ);
  const results = useMemoSearch(() => globalSearch(state, q), [state, q]);
  const total = results.projects.length + results.tasks.length + results.notes.length + results.risks.length + results.jira.length + results.pages.length;

  return (
    <div className="search-wrap">
      <div className="page-hd">
        <div style={{ width: '100%' }}>
          <div className="page-title">Search</div>
          <input
            autoFocus
            className="search-big"
            placeholder="Search projects, tasks, notes, Jira, Confluence…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="page-sub">{q.length < 2 ? 'Type at least 2 characters' : `${total} results`}</div>
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
                  <span className="mono" style={{ fontSize: 11 }}>{p.code}</span>
                  <span className="truncate">{p.name}</span>
                  <span style={{ color: 'var(--fg-4)', fontSize: 11 }} className="truncate">{p.objective}</span>
                </div>
              ))}
            </div>
          )}
          {results.tasks.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Tasks <span>{results.tasks.length}</span></div>
              {results.tasks.slice(0, 20).map((t) => {
                const p = state.projects.find((pp) => pp.id === t.projectId);
                return (
                  <div key={t.id} className="search-row" onClick={() => actions.openTask(t.id)}>
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
              <div className="search-group-hd">Notes <span>{results.notes.length}</span></div>
              {results.notes.slice(0, 20).map((n) => {
                const p = state.projects.find((pp) => pp.id === n.projectId);
                return (
                  <div key={n.id} className="search-row" onClick={() => { actions.setActiveProject(n.projectId); actions.setActiveView('project-detail', { tab: 'notes' }); }}>
                    <span className="pill pill-ghost">{n.kind}</span>
                    <span className="truncate" style={{ fontWeight: 500 }}>{n.title}</span>
                    {p && <ProjectChip project={p} />}
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{fmtDate(n.date)}</span>
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
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--fg-4)' }}>{i.key}</span>
                  <span className="truncate">{i.summary}</span>
                  <span className="pill pill-ghost">{i.status}</span>
                </div>
              ))}
            </div>
          )}
          {results.pages.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Confluence pages <span>{results.pages.length}</span></div>
              {results.pages.slice(0, 15).map((p) => (
                <div key={p.id} className="search-row" onClick={() => actions.setActiveView('confluence', { pageId: p.id })}>
                  <Icon name="doc" size={12} />
                  <span className="truncate">{p.title}</span>
                  <span style={{ color: 'var(--fg-4)', fontSize: 11 }} className="truncate">{p.space}</span>
                </div>
              ))}
            </div>
          )}
          {results.risks.length > 0 && (
            <div className="search-group">
              <div className="search-group-hd">Risks <span>{results.risks.length}</span></div>
              {results.risks.slice(0, 15).map((r) => {
                const p = state.projects.find((pp) => pp.id === r.projectId);
                return (
                  <div key={r.id} className="search-row" onClick={() => { actions.setActiveProject(r.projectId); actions.setActiveView('project-detail', { tab: 'risks' }); }}>
                    <span className="pill pill-warn">risk</span>
                    <span className="truncate">{r.title}</span>
                    {p && <ProjectChip project={p} />}
                    <span style={{ color: 'var(--fg-4)', fontSize: 11 }}>sev {r.severity} · lik {r.likelihood}</span>
                  </div>
                );
              })}
            </div>
          )}
          {total === 0 && <div className="empty">No results.</div>}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SearchView });
